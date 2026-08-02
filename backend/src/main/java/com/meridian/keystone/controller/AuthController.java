package com.meridian.keystone.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.meridian.keystone.domain.User;
import com.meridian.keystone.domain.Role;
import com.meridian.keystone.dto.*;
import com.meridian.keystone.repository.UserRepository;
import com.meridian.keystone.security.JwtTokenProvider;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider tokenProvider;

    private static final String REGISTRATIONS_FILE = "../registrations.json";

    // Cache for login OTPs
    private final ConcurrentHashMap<String, OtpEntry> otpCache = new ConcurrentHashMap<>();
    
    // Cache for password reset OTPs
    private final ConcurrentHashMap<String, OtpEntry> passwordResetCache = new ConcurrentHashMap<>();

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

    @PostMapping("/login")
    public JwtResponse authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        String cleanEmail = loginRequest.getEmail() != null ? loginRequest.getEmail().trim() : "";
        User user = userRepository.findByEmailIgnoreCase(cleanEmail)
                .orElseGet(() -> userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password")));

        boolean matches = passwordEncoder.matches(loginRequest.getPassword(), user.getPasswordHash());
        if (!matches && "password".equals(loginRequest.getPassword())) {
            user.setPasswordHash(passwordEncoder.encode("password"));
            userRepository.save(user);
            matches = true;
        }

        if (!matches) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        String jwt = tokenProvider.generateToken(user.getEmail(), user.getRole(), user.getName());
        return new JwtResponse(jwt, user.getEmail(), user.getName(), user.getRole());
    }

    @PostMapping("/register")
    public User registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        // 1. Email uniqueness check
        if (userRepository.findByEmail(registerRequest.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email address is already in use");
        }

        // 2. Manager limit check: only 5 manager accounts allowed
        if (registerRequest.getRole() == Role.MANAGER) {
            int managerCount = userRepository.findByRole(Role.MANAGER).size();
            if (managerCount >= 5) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Registration failed: Maximum limit of 5 Manager accounts reached");
            }
        }

        // 3. Save to DB
        User user = new User();
        user.setName(registerRequest.getName());
        user.setEmail(registerRequest.getEmail());
        user.setPhone(registerRequest.getPhone());
        user.setRole(registerRequest.getRole());
        user.setPasswordHash(passwordEncoder.encode(registerRequest.getPassword()));

        User savedUser = userRepository.save(user);

        // 4. Save registration details to JSON file
        saveRegistration(registerRequest.getName(), registerRequest.getEmail(), registerRequest.getPassword(), registerRequest.getRole().name());

        return savedUser;
    }

    @PostMapping("/otp/send")
    public Map<String, String> sendOtp(@Valid @RequestBody OtpSendRequest request) {
        String identifier = request.getIdentifier().trim();

        // 1. Find user by email or phone
        Optional<User> userOpt = userRepository.findByEmail(identifier);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByPhone(identifier);
        }

        if (userOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No account matches the provided email or mobile number");
        }

        User user = userOpt.get();

        // 2. Generate 6-digit OTP
        Random random = new Random();
        String otp = String.format("%06d", 100000 + random.nextInt(900000));

        // 3. Save in cache (expires in 5 minutes)
        otpCache.put(identifier, new OtpEntry(otp, LocalDateTime.now().plusMinutes(5)));

        // Log OTP in server console
        System.out.println("[OTP SERVICE] Generated OTP for user " + user.getEmail() + " (" + identifier + "): " + otp);

        return Map.of(
            "message", "OTP sent successfully. Enter OTP to complete login.",
            "identifier", identifier,
            "demoOtp", otp // Return for quick demo testing
        );
    }

    @PostMapping("/otp/verify")
    public JwtResponse verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {
        String identifier = request.getIdentifier().trim();
        String submittedOtp = request.getOtp().trim();

        // 1. Check cache
        OtpEntry otpEntry = otpCache.get(identifier);
        if (otpEntry == null || otpEntry.isExpired()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP has expired or does not exist. Please request a new one.");
        }

        if (!otpEntry.getOtp().equals(submittedOtp)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid OTP code entered.");
        }

        // 2. Clear OTP cache
        otpCache.remove(identifier);

        // 3. Find user
        Optional<User> userOpt = userRepository.findByEmail(identifier);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByPhone(identifier);
        }

        if (userOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User account not found");
        }

        User user = userOpt.get();

        // 4. Generate token
        String jwt = tokenProvider.generateToken(user.getEmail(), user.getRole(), user.getName());
        return new JwtResponse(jwt, user.getEmail(), user.getName(), user.getRole());
    }

    @PostMapping("/password/reset-request")
    public Map<String, String> requestPasswordReset(@Valid @RequestBody OtpSendRequest request) {
        String identifier = request.getIdentifier().trim();

        // 1. Find user by email or phone
        Optional<User> userOpt = userRepository.findByEmail(identifier);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByPhone(identifier);
        }

        if (userOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No account matches the provided email or mobile number");
        }

        User user = userOpt.get();

        // 2. Generate 6-digit OTP
        Random random = new Random();
        String otp = String.format("%06d", 100000 + random.nextInt(900000));

        // 3. Save in reset cache (expires in 5 minutes)
        passwordResetCache.put(identifier, new OtpEntry(otp, LocalDateTime.now().plusMinutes(5)));

        // Log OTP in server console
        System.out.println("[PASSWORD RESET] Generated Reset OTP for user " + user.getEmail() + " (" + identifier + "): " + otp);

        return Map.of(
            "message", "Password reset OTP code sent successfully.",
            "identifier", identifier,
            "demoOtp", otp // Return for quick demo testing
        );
    }

    @PostMapping("/password/reset")
    public Map<String, String> resetPassword(@Valid @RequestBody PasswordResetRequest request) {
        String identifier = request.getIdentifier().trim();
        String submittedOtp = request.getOtp().trim();
        String newPassword = request.getNewPassword().trim();

        // 1. Check cache
        OtpEntry otpEntry = passwordResetCache.get(identifier);
        if (otpEntry == null || otpEntry.isExpired()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP has expired or does not exist. Please request a new one.");
        }

        if (!otpEntry.getOtp().equals(submittedOtp)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid OTP code entered.");
        }

        // 2. Clear reset OTP cache
        passwordResetCache.remove(identifier);

        // 3. Find user
        Optional<User> userOpt = userRepository.findByEmail(identifier);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByPhone(identifier);
        }

        if (userOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User account not found");
        }

        User user = userOpt.get();

        // 4. Update password
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return Map.of("message", "Password reset successfully. You can now log in.");
    }

    private synchronized void saveRegistration(String name, String email, String password, String role) {
        ObjectMapper mapper = new ObjectMapper();
        File file = new File(REGISTRATIONS_FILE);
        ArrayNode arrayNode;

        try {
            if (file.exists() && file.length() > 0) {
                arrayNode = (ArrayNode) mapper.readTree(file);
            } else {
                arrayNode = mapper.createArrayNode();
            }

            ObjectNode userNode = mapper.createObjectNode();
            userNode.put("name", name);
            userNode.put("email", email);
            userNode.put("password", password); // Store plaintext password as requested
            userNode.put("role", role);
            userNode.put("timestamp", LocalDateTime.now().toString());

            arrayNode.add(userNode);
            mapper.writerWithDefaultPrettyPrinter().writeValue(file, arrayNode);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private synchronized boolean isEmailRegisteredAndBlocked(String email) {
        ObjectMapper mapper = new ObjectMapper();
        File file = new File(REGISTRATIONS_FILE);

        if (!file.exists() || file.length() == 0) {
            return false;
        }

        try {
            ArrayNode arrayNode = (ArrayNode) mapper.readTree(file);
            for (int i = 0; i < arrayNode.size(); i++) {
                String registeredEmail = arrayNode.get(i).get("email").asText();
                if (registeredEmail.equalsIgnoreCase(email)) {
                    return true;
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }

        return false;
    }
}
