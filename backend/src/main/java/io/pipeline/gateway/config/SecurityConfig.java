package io.pipeline.gateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Security configuration for Clerk JWT validation.
 * Validates JWT tokens from the Clerk frontend using JWKS endpoint.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${clerk.jwks-uri}")
    private String jwksUri;

    @Value("${clerk.issuer}")
    private String issuer;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authz -> authz
                // Public endpoints
                .requestMatchers("/actuator/health", "/api/v1/health").permitAll()
                // All other API endpoints require authentication
                .requestMatchers("/api/**").authenticated()
                .anyRequest().denyAll()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.decoder(jwtDecoder()))
            );

        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwksUri).build();
        // Validate the issuer claim matches Clerk
        decoder.setJwtValidator(new org.springframework.security.oauth2.jwt.JwtIssuerValidator(issuer));
        return decoder;
    }
}
