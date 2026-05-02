package com.wealthwallet.config;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, ex) ->
                                response.sendError(HttpServletResponse.SC_UNAUTHORIZED))
                        .accessDeniedHandler((request, response, ex) ->
                                response.sendError(HttpServletResponse.SC_FORBIDDEN))
                )
                .authorizeHttpRequests(registry -> registry
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/login", "/api/register", "/api/register/seller", "/actuator/**").permitAll()
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/store/categories",
                                "/api/store/categories/**",
                                "/api/store/policy",
                                "/api/store/products",
                                "/api/store/products/**",
                                "/api/store/lookbooks",
                                "/api/store/lookbooks/**",
                                "/api/store/stylists"
                        ).permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/store/products", "/api/store/products/**")
                        .hasAnyRole("ADMIN", "SELLER", "WAREHOUSE", "STYLES")
                        .requestMatchers(HttpMethod.PUT, "/api/store/products", "/api/store/products/**")
                        .hasAnyRole("ADMIN", "SELLER", "WAREHOUSE", "STYLES")
                        .requestMatchers(HttpMethod.DELETE, "/api/store/products", "/api/store/products/**")
                        .hasAnyRole("ADMIN", "SELLER", "WAREHOUSE", "STYLES")
                        .requestMatchers(HttpMethod.POST, "/api/store/lookbooks", "/api/store/lookbooks/**")
                        .hasAnyRole("ADMIN", "WAREHOUSE", "STYLES")
                        .requestMatchers(HttpMethod.PUT, "/api/store/lookbooks", "/api/store/lookbooks/**")
                        .hasAnyRole("ADMIN", "WAREHOUSE", "STYLES")
                        .requestMatchers(HttpMethod.DELETE, "/api/store/lookbooks", "/api/store/lookbooks/**")
                        .hasAnyRole("ADMIN", "WAREHOUSE", "STYLES")
                        .requestMatchers(HttpMethod.POST, "/api/store/orders/manual")
                        .hasRole("ADMIN")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
