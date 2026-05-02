package com.wealthwallet.service;

import com.wealthwallet.config.JwtUtils;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.AdminCreateStaffRequest;
import com.wealthwallet.dto.BusinessRequestCreateRequest;
import com.wealthwallet.dto.ChangePasswordRequest;
import com.wealthwallet.dto.LoginRequest;
import com.wealthwallet.dto.RegisterRequest;
import com.wealthwallet.dto.SellerRegisterRequest;
import com.wealthwallet.dto.UserSettingsRequest;
import com.wealthwallet.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserAccountRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        UserAccount user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        return User.builder()
                .username(user.getEmail())
                .password(user.getPasswordHash())
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())))
                .build();
    }

    public UserAccount getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("Current user not found"));
    }

    public void ensureCustomer(UserAccount user) {
        if (user.getRole() != UserAccount.Role.USER) {
            throw new ResponseStatusException(FORBIDDEN, "Chức năng này chỉ dành cho tài khoản khách hàng");
        }
    }

    public void ensureStoreBuyer(UserAccount user) {
        if (user != null && user.getRole() == UserAccount.Role.USER) {
            return;
        }
        throw new ResponseStatusException(FORBIDDEN, "Chức năng mua hàng chỉ dành cho tài khoản khách hàng");
    }

    @Transactional
    public UserAccount register(RegisterRequest request) {
        UserAccount user = createUser(
                request.fullName(),
                request.email(),
                request.password(),
                UserAccount.Role.USER,
                request.monthlyIncome()
        );
        return userRepository.save(user);
    }

    @Transactional
    public UserAccount registerSeller(SellerRegisterRequest request) {
        UserAccount seller = createUser(
                request.fullName(),
                request.email(),
                request.password(),
                UserAccount.Role.USER,
                request.monthlyIncome()
        );
        applySellerStoreFields(
                seller,
                request.storeName(),
                request.storePhone(),
                request.storeAddress(),
                request.storeDescription()
        );
        seller.setBusinessRequestPending(true);
        seller.setBusinessRequestedAt(LocalDateTime.now());
        return userRepository.save(seller);
    }

    @Transactional
    public UserAccount createStaffAccount(AdminCreateStaffRequest request) {
        UserAccount.Role staffRole = parseStaffRole(request.role());
        UserAccount user = createUser(
                request.fullName(),
                request.email(),
                request.password(),
                staffRole,
                null
        );
        return userRepository.save(user);
    }

    public String login(LoginRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        UserAccount user = userRepository.findByEmail(normalizedEmail)
                .filter(u -> passwordEncoder.matches(request.password(), u.getPasswordHash()))
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        return jwtUtils.generateTokenFromUsername(user.getEmail());
    }

    @Transactional
    public UserAccount updateSettings(UserSettingsRequest request) {
        UserAccount user = getCurrentUser();
        if (request.fullName() != null && !request.fullName().isBlank()) {
            user.setFullName(request.fullName());
        }
        if (request.monthlyIncome() != null) {
            user.setMonthlyIncome(request.monthlyIncome());
        }
        if (request.monthlyExpenseTarget() != null) {
            user.setMonthlyExpenseTarget(request.monthlyExpenseTarget());
        }
        if (request.avatarUrl() != null && !request.avatarUrl().isBlank()) {
            user.setAvatarUrl(request.avatarUrl());
        }
        if (request.darkModeEnabled() != null) {
            user.setDarkModeEnabled(request.darkModeEnabled());
        }
        if (request.emailNotificationEnabled() != null) {
            user.setEmailNotificationEnabled(request.emailNotificationEnabled());
        }
        if (request.autoSyncEnabled() != null) {
            user.setAutoSyncEnabled(request.autoSyncEnabled());
        }
        return userRepository.save(user);
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        UserAccount user = getCurrentUser();
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(BAD_REQUEST, "Mật khẩu hiện tại chưa đúng");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    @Transactional
    public UserAccount requestBusinessAccess(BusinessRequestCreateRequest request) {
        UserAccount user = getCurrentUser();
        if (user.getRole() == UserAccount.Role.ADMIN
                || user.getRole() == UserAccount.Role.SELLER
                || user.getRole() == UserAccount.Role.STYLES
                || user.getRole() == UserAccount.Role.WAREHOUSE) {
            return user;
        }
        applySellerStoreFields(
                user,
                request.storeName(),
                request.storePhone(),
                request.storeAddress(),
                request.storeDescription()
        );
        if (!Boolean.TRUE.equals(user.getBusinessRequestPending())) {
            user.setBusinessRequestPending(true);
            user.setBusinessRequestedAt(LocalDateTime.now());
        }
        return userRepository.save(user);
    }

    private UserAccount createUser(
            String fullName,
            String email,
            String rawPassword,
            UserAccount.Role role,
            Double monthlyIncome
    ) {
        String normalizedEmail = normalizeEmail(email);
        ensureEmailAvailable(normalizedEmail);
        return UserAccount.builder()
                .fullName(fullName != null ? fullName.trim() : null)
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .monthlyIncome(monthlyIncome)
                .role(role)
                .build();
    }

    private void ensureEmailAvailable(String email) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email đã được sử dụng");
        }
    }

    private UserAccount.Role parseStaffRole(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Role nhân viên là bắt buộc");
        }
        UserAccount.Role parsed;
        try {
            parsed = UserAccount.Role.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Role nhân viên không hợp lệ");
        }
        if (parsed != UserAccount.Role.WAREHOUSE) {
            throw new IllegalArgumentException("Chỉ được tạo tài khoản nhân viên WAREHOUSE");
        }
        return parsed;
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void applySellerStoreFields(
            UserAccount user,
            String storeName,
            String storePhone,
            String storeAddress,
            String storeDescription
    ) {
        user.setStoreName(requiredSellerField(storeName, "Tên cửa hàng là bắt buộc"));
        user.setStorePhone(requiredSellerField(storePhone, "Số điện thoại cửa hàng là bắt buộc"));
        user.setStoreAddress(requiredSellerField(storeAddress, "Địa chỉ lấy hàng là bắt buộc"));
        user.setStoreDescription(requiredSellerField(storeDescription, "Mô tả cửa hàng là bắt buộc"));
    }

    private String requiredSellerField(String value, String message) {
        String trimmed = trimToNull(value);
        if (trimmed == null) {
            throw new ResponseStatusException(BAD_REQUEST, message);
        }
        return trimmed;
    }

}
