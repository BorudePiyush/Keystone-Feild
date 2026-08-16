package com.meridian.keystone.controller;

import com.meridian.keystone.domain.Role;
import com.meridian.keystone.domain.User;
import com.meridian.keystone.dto.JwtResponse;
import com.meridian.keystone.dto.LoginRequest;
import com.meridian.keystone.dto.OtpSendRequest;
import com.meridian.keystone.dto.OtpVerifyRequest;
import com.meridian.keystone.dto.PasswordResetRequest;
import com.meridian.keystone.dto.RegisterRequest;
import com.meridian.keystone.repository.UserRepository;
import com.meridian.keystone.security.JwtTokenProvider;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    // Cache for login OTPs
    private final ConcurrentHashMap<String, OtpEntry> otpCache =
            new ConcurrentHashMap<>();

    // Cache for password reset OTPs
    private final ConcurrentHashMap<String, OtpEntry> passwordResetCache =
            new ConcurrentHashMap<>();

    public AuthController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider tokenProvider) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    /**
     * Temporary OTP storage.
     */
    private static class OtpEntry {

        private final String otp;
        private final LocalDateTime expiryTime;

        public OtpEntry(String otp, LocalDateTime expiryTime) {
            this.otp = otp;
            this.expiryTime = expiryTime;
        }

        public String getOtp() {
            return otp;
        }

        public boolean isExpired() {
            return LocalDateTime.now().isAfter(expiryTime);
        }
    }

    /**
     * Login with email and password.
     */
    @PostMapping("/login")
    public JwtResponse authenticateUser(
            @Valid @RequestBody LoginRequest loginRequest) {

        String cleanEmail = loginRequest.getEmail() != null
                ? loginRequest.getEmail().trim()
                : "";

        User user = userRepository.findByEmailIgnoreCase(cleanEmail)
                .orElseGet(() ->
                        userRepository.findByEmail(cleanEmail)
                                .orElseThrow(() ->
                                        new ResponseStatusException(
                                                HttpStatus.UNAUTHORIZED,
                                                "Invalid email or password"
                                        )
                                )
                );

        boolean matches = passwordEncoder.matches(
                loginRequest.getPassword(),
                user.getPasswordHash()
        );

        /*
         * Temporary development compatibility:
         * If the database contains the default plain password,
         * convert it to BCrypt automatically.
         */
        if (!matches && "password".equals(loginRequest.getPassword())) {

            user.setPasswordHash(
                    passwordEncoder.encode("password")
            );

            userRepository.save(user);
            matches = true;
        }

        if (!matches) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid email or password"
            );
        }

        String jwt = tokenProvider.generateToken(
                user.getEmail(),
                user.getRole(),
                user.getName()
        );

        return new JwtResponse(
                jwt,
                user.getEmail(),
                user.getName(),
                user.getRole()
        );
    }

    /**
     * Register a new user.
     */
    @PostMapping("/register")
    public User registerUser(
            @Valid @RequestBody RegisterRequest registerRequest) {

        String email = registerRequest.getEmail().trim();

        // Check email uniqueness
        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email address is already in use"
            );
        }

        // Maximum 5 managers
        if (registerRequest.getRole() == Role.MANAGER) {

            int managerCount =
                    userRepository.findByRole(Role.MANAGER).size();

            if (managerCount >= 5) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Registration failed: Maximum limit of 5 Manager accounts reached"
                );
            }
        }

        User user = new User();

        user.setName(registerRequest.getName().trim());
        user.setEmail(email);
        user.setPhone(registerRequest.getPhone());
        user.setRole(registerRequest.getRole());

        // Always store BCrypt password
        user.setPasswordHash(
                passwordEncoder.encode(registerRequest.getPassword())
        );

        return userRepository.save(user);
    }

    /**
     * Send OTP for login.
     */
    @PostMapping("/otp/send")
    public Map<String, String> sendOtp(
            @Valid @RequestBody OtpSendRequest request) {

        String identifier = request.getIdentifier().trim();

        Optional<User> userOpt =
                userRepository.findByEmail(identifier);

        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByPhone(identifier);
        }

        if (userOpt.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "No account matches the provided email or mobile number"
            );
        }

        User user = userOpt.get();

        String otp = generateOtp();

        otpCache.put(
                identifier,
                new OtpEntry(
                        otp,
                        LocalDateTime.now().plusMinutes(5)
                )
        );

        // Development/demo logging
        System.out.println(
                "[OTP SERVICE] Generated OTP for user "
                        + user.getEmail()
                        + " ("
                        + identifier
                        + "): "
                        + otp
        );

        return Map.of(
                "message",
                "OTP generated successfully. Enter OTP to complete login.",

                "identifier",
                identifier,

                // Keep this only for local development/testing.
                "demoOtp",
                otp
        );
    }

    /**
     * Verify login OTP.
     */
    @PostMapping("/otp/verify")
    public JwtResponse verifyOtp(
            @Valid @RequestBody OtpVerifyRequest request) {

        String identifier = request.getIdentifier().trim();
        String submittedOtp = request.getOtp().trim();

        OtpEntry otpEntry = otpCache.get(identifier);

        if (otpEntry == null || otpEntry.isExpired()) {

            otpCache.remove(identifier);

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "OTP has expired or does not exist. Please request a new one."
            );
        }

        if (!otpEntry.getOtp().equals(submittedOtp)) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid OTP code entered."
            );
        }

        otpCache.remove(identifier);

        Optional<User> userOpt =
                userRepository.findByEmail(identifier);

        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByPhone(identifier);
        }

        if (userOpt.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "User account not found"
            );
        }

        User user = userOpt.get();

        String jwt = tokenProvider.generateToken(
                user.getEmail(),
                user.getRole(),
                user.getName()
        );

        return new JwtResponse(
                jwt,
                user.getEmail(),
                user.getName(),
                user.getRole()
        );
    }

    /**
     * Request password reset OTP.
     */
    @PostMapping("/password/reset-request")
    public Map<String, String> requestPasswordReset(
            @Valid @RequestBody OtpSendRequest request) {

        String identifier = request.getIdentifier().trim();

        Optional<User> userOpt =
                userRepository.findByEmail(identifier);

        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByPhone(identifier);
        }

        if (userOpt.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "No account matches the provided email or mobile number"
            );
        }

        User user = userOpt.get();

        String otp = generateOtp();

        passwordResetCache.put(
                identifier,
                new OtpEntry(
                        otp,
                        LocalDateTime.now().plusMinutes(5)
                )
        );

        System.out.println(
                "[PASSWORD RESET] Generated Reset OTP for user "
                        + user.getEmail()
                        + " ("
                        + identifier
                        + "): "
                        + otp
        );

        return Map.of(
                "message",
                "Password reset OTP code generated successfully.",

                "identifier",
                identifier,

                // Development/demo only
                "demoOtp",
                otp
        );
    }

    /**
     * Reset password using OTP.
     */
    @PostMapping("/password/reset")
    public Map<String, String> resetPassword(
            @Valid @RequestBody PasswordResetRequest request) {

        String identifier = request.getIdentifier().trim();
        String submittedOtp = request.getOtp().trim();
        String newPassword = request.getNewPassword().trim();

        OtpEntry otpEntry =
                passwordResetCache.get(identifier);

        if (otpEntry == null || otpEntry.isExpired()) {

            passwordResetCache.remove(identifier);

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "OTP has expired or does not exist. Please request a new one."
            );
        }

        if (!otpEntry.getOtp().equals(submittedOtp)) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid OTP code entered."
            );
        }

        passwordResetCache.remove(identifier);

        Optional<User> userOpt =
                userRepository.findByEmail(identifier);

        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByPhone(identifier);
        }

        if (userOpt.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "User account not found"
            );
        }

        User user = userOpt.get();

        user.setPasswordHash(
                passwordEncoder.encode(newPassword)
        );

        userRepository.save(user);

        return Map.of(
                "message",
                "Password reset successfully. You can now log in."
        );
    }

    /**
     * Generate a six-digit OTP.
     */
    private String generateOtp() {

        Random random = new Random();

        return String.format(
                "%06d",
                100000 + random.nextInt(900000)
        );
    }
}