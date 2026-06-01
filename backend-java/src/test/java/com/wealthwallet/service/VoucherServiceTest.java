package com.wealthwallet.service;

import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.domain.entity.Voucher;
import com.wealthwallet.repository.VoucherRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.http.HttpStatus.BAD_REQUEST;

@ExtendWith(MockitoExtension.class)
class VoucherServiceTest {

    @Mock
    private VoucherRepository voucherRepository;

    @InjectMocks
    private VoucherService voucherService;

    @Test
    void validateVoucher_shouldRejectSellerVoucherForAnotherShop() {
        Voucher voucher = Voucher.builder()
                .id(1L)
                .code("SELLER10")
                .type(Voucher.Type.PERCENT)
                .value(10d)
                .minOrder(0d)
                .active(true)
                .seller(user(10L))
                .build();

        assertThatThrownBy(() -> voucherService.validateVoucher(voucher, 100_000d, 11L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> {
                    ResponseStatusException exception = (ResponseStatusException) error;
                    assertThat(exception.getStatusCode()).isEqualTo(BAD_REQUEST);
                    assertThat(exception.getReason()).contains("shop phát hành");
                });
    }

    @Test
    void validateVoucher_shouldAllowAdminVoucherForAnyShop() {
        Voucher voucher = Voucher.builder()
                .id(2L)
                .code("GLOBAL10")
                .type(Voucher.Type.PERCENT)
                .value(10d)
                .minOrder(0d)
                .active(true)
                .build();

        voucherService.validateVoucher(voucher, 100_000d, 11L);
    }

    private UserAccount user(Long id) {
        return UserAccount.builder()
                .id(id)
                .role(UserAccount.Role.SELLER)
                .email("seller-" + id + "@example.com")
                .passwordHash("hash")
                .build();
    }
}
