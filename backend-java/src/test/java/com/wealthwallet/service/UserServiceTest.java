package com.wealthwallet.service;

import com.wealthwallet.config.JwtUtils;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.BusinessRequestCreateRequest;
import com.wealthwallet.dto.SellerRegisterRequest;
import com.wealthwallet.repository.UserAccountRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserAccountRepository userAccountRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtils jwtUtils;

    @InjectMocks
    private UserService userService;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void registerSeller_shouldTrimAndPersistRequiredStoreFields() {
        when(userAccountRepository.findByEmail("seller@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("secret123")).thenReturn("encoded-password");
        when(userAccountRepository.save(any(UserAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserAccount seller = userService.registerSeller(new SellerRegisterRequest(
                "  Nguyen Van A  ",
                "  Seller@Example.com  ",
                "secret123",
                15_000_000d,
                "  Moc Mam Boutique  ",
                " 0901234567 ",
                " 12 Nguyen Hue, Quan 1 ",
                "  Chuyen do linen va casual  "
        ));

        assertThat(seller.getFullName()).isEqualTo("Nguyen Van A");
        assertThat(seller.getEmail()).isEqualTo("seller@example.com");
        assertThat(seller.getStoreName()).isEqualTo("Moc Mam Boutique");
        assertThat(seller.getStorePhone()).isEqualTo("0901234567");
        assertThat(seller.getStoreAddress()).isEqualTo("12 Nguyen Hue, Quan 1");
        assertThat(seller.getStoreDescription()).isEqualTo("Chuyen do linen va casual");
        assertThat(seller.getBusinessRequestPending()).isTrue();
        assertThat(seller.getBusinessRequestedAt()).isNotNull();
    }

    @Test
    void requestBusinessAccess_shouldRejectBlankStoreDescription() {
        UserAccount customer = user(10L, "customer@example.com");
        SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken(customer.getEmail(), null));
        when(userAccountRepository.findByEmail(customer.getEmail())).thenReturn(Optional.of(customer));

        assertThatThrownBy(() -> userService.requestBusinessAccess(new BusinessRequestCreateRequest(
                "Moc Mam Boutique",
                "0901234567",
                "12 Nguyen Hue, Quan 1",
                "   "
        )))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> {
                    ResponseStatusException exception = (ResponseStatusException) error;
                    assertThat(exception.getStatusCode()).isEqualTo(BAD_REQUEST);
                    assertThat(exception.getReason()).contains("Mô tả cửa hàng");
                });
    }

    @Test
    void requestBusinessAccess_shouldAllowPendingUserToUpdateSellerProfile() {
        LocalDateTime requestedAt = LocalDateTime.now().minusDays(1);
        UserAccount customer = user(11L, "pending@example.com");
        customer.setBusinessRequestPending(true);
        customer.setBusinessRequestedAt(requestedAt);
        customer.setStoreName(null);

        SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken(customer.getEmail(), null));
        when(userAccountRepository.findByEmail(customer.getEmail())).thenReturn(Optional.of(customer));
        when(userAccountRepository.save(any(UserAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserAccount updated = userService.requestBusinessAccess(new BusinessRequestCreateRequest(
                "Vanilla Linen House",
                "0911222333",
                "45 Le Loi, Quan 1",
                "Ban do cong so va picnic cho bai demo"
        ));

        assertThat(updated.getStoreName()).isEqualTo("Vanilla Linen House");
        assertThat(updated.getStorePhone()).isEqualTo("0911222333");
        assertThat(updated.getStoreAddress()).isEqualTo("45 Le Loi, Quan 1");
        assertThat(updated.getStoreDescription()).isEqualTo("Ban do cong so va picnic cho bai demo");
        assertThat(updated.getBusinessRequestPending()).isTrue();
        assertThat(updated.getBusinessRequestedAt()).isEqualTo(requestedAt);
    }

    @Test
    void ensureStoreBuyer_shouldAllowOnlyCustomerAccounts() {
        userService.ensureStoreBuyer(user(20L, "customer@example.com"));

        UserAccount seller = user(21L, "seller@example.com");
        seller.setRole(UserAccount.Role.SELLER);

        assertThatThrownBy(() -> userService.ensureStoreBuyer(seller))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> {
                    ResponseStatusException exception = (ResponseStatusException) error;
                    assertThat(exception.getStatusCode()).isEqualTo(FORBIDDEN);
                    assertThat(exception.getReason()).contains("tài khoản khách hàng");
                });
    }

    private UserAccount user(Long id, String email) {
        return UserAccount.builder()
                .id(id)
                .role(UserAccount.Role.USER)
                .email(email)
                .passwordHash("hash")
                .fullName("User " + id)
                .build();
    }
}
