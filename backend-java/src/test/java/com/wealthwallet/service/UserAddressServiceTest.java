package com.wealthwallet.service;

import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.domain.entity.UserAddress;
import com.wealthwallet.dto.UserDefaultAddressRequest;
import com.wealthwallet.dto.UserDefaultAddressResponse;
import com.wealthwallet.repository.UserAddressRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserAddressServiceTest {

    @Mock
    private UserAddressRepository userAddressRepository;

    @Mock
    private UserService userService;

    @InjectMocks
    private UserAddressService userAddressService;

    @Test
    void getDefaultAddress_shouldReturnNullWhenUserHasNoSavedAddress() {
        UserAccount user = user(1L);
        when(userService.getCurrentUser()).thenReturn(user);
        when(userAddressRepository.findByUserOrderByIsDefaultDescCreatedAtDesc(user)).thenReturn(List.of());

        UserDefaultAddressResponse response = userAddressService.getDefaultAddress();

        assertThat(response).isNull();
    }

    @Test
    void saveDefaultAddress_shouldReuseExistingDefaultAddress() {
        UserAccount user = user(2L);
        UserAddress existingDefault = UserAddress.builder()
                .id(11L)
                .user(user)
                .fullName("Old Name")
                .phone("0900000000")
                .addressLine1("Old Address")
                .city("HCM")
                .isDefault(true)
                .build();

        when(userService.getCurrentUser()).thenReturn(user);
        when(userAddressRepository.findByUserOrderByIsDefaultDescCreatedAtDesc(user)).thenReturn(List.of(existingDefault));
        when(userAddressRepository.save(any(UserAddress.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserDefaultAddressResponse response = userAddressService.saveDefaultAddress(new UserDefaultAddressRequest(
                "Nguyen Van A",
                "0911222333",
                "12 Nguyen Hue",
                "Tang 2",
                "Ben Nghe",
                "Quan 1",
                "TP.HCM",
                "HCM",
                "700000"
        ));

        assertThat(response.id()).isEqualTo(11L);
        assertThat(response.fullName()).isEqualTo("Nguyen Van A");
        assertThat(response.phone()).isEqualTo("0911222333");
        assertThat(response.addressLine1()).isEqualTo("12 Nguyen Hue");
        assertThat(response.city()).isEqualTo("TP.HCM");
        assertThat(response.isDefault()).isTrue();
    }

    private UserAccount user(Long id) {
        return UserAccount.builder()
                .id(id)
                .role(UserAccount.Role.USER)
                .email("user-" + id + "@example.com")
                .passwordHash("hash")
                .fullName("User " + id)
                .build();
    }
}
