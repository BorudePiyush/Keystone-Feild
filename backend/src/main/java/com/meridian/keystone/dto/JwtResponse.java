package com.meridian.keystone.dto;

import com.meridian.keystone.domain.Role;

public class JwtResponse {

    private String token;
    private String email;
    private String name;
    private Role role;

    public JwtResponse() {}

    public JwtResponse(String token, String email, String name, Role role) {
        this.token = token;
        this.email = email;
        this.name = name;
        this.role = role;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }
}
