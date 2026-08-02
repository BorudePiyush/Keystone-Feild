package com.meridian.keystone.dto;

import jakarta.validation.constraints.NotBlank;

public class OtpSendRequest {

    @NotBlank(message = "Identifier (email or mobile) is required")
    private String identifier;

    public OtpSendRequest() {}

    public OtpSendRequest(String identifier) {
        this.identifier = identifier;
    }

    public String getIdentifier() {
        return identifier;
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }
}
