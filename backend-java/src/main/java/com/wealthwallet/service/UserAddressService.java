package com.wealthwallet.service;

import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.domain.entity.UserAddress;
import com.wealthwallet.dto.UserAddressResponse;
import com.wealthwallet.dto.UserAddressUpsertRequest;
import com.wealthwallet.dto.UserDefaultAddressRequest;
import com.wealthwallet.dto.UserDefaultAddressResponse;
import com.wealthwallet.repository.UserAddressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class UserAddressService {

    private final UserAddressRepository userAddressRepository;
    private final UserService userService;

    @Transactional(readOnly = true)
    public UserDefaultAddressResponse getDefaultAddress() {
        UserAccount user = currentCustomer();
        return listAddressEntities(user).stream()
                .findFirst()
                .map(this::mapResponse)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<UserAddressResponse> listAddresses() {
        return listAddressEntities(currentCustomer()).stream()
                .map(this::mapAddressResponse)
                .toList();
    }

    @Transactional
    public UserAddressResponse createAddress(UserAddressUpsertRequest request) {
        UserAccount user = currentCustomer();
        List<UserAddress> addresses = listAddressEntities(user);
        UserAddress address = UserAddress.builder().user(user).build();
        applyAddressPayload(address, request);

        boolean shouldDefault = Boolean.TRUE.equals(request.isDefault()) || addresses.isEmpty();
        if (shouldDefault) {
            resetDefault(addresses);
            address.setIsDefault(Boolean.TRUE);
        } else {
            address.setIsDefault(Boolean.FALSE);
        }

        if (!addresses.isEmpty()) {
            userAddressRepository.saveAll(addresses);
        }
        return mapAddressResponse(userAddressRepository.save(address));
    }

    @Transactional
    public UserAddressResponse updateAddress(Long id, UserAddressUpsertRequest request) {
        UserAccount user = currentCustomer();
        UserAddress address = userAddressRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Địa chỉ không tồn tại"));
        List<UserAddress> addresses = listAddressEntities(user);

        applyAddressPayload(address, request);
        if (Boolean.TRUE.equals(request.isDefault())) {
            resetDefault(addresses);
            address.setIsDefault(Boolean.TRUE);
            userAddressRepository.saveAll(addresses);
        }

        return mapAddressResponse(userAddressRepository.save(address));
    }

    @Transactional
    public UserAddressResponse setDefaultAddress(Long id) {
        UserAccount user = currentCustomer();
        List<UserAddress> addresses = listAddressEntities(user);
        UserAddress target = addresses.stream()
                .filter(address -> address.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Địa chỉ không tồn tại"));

        resetDefault(addresses);
        target.setIsDefault(Boolean.TRUE);
        userAddressRepository.saveAll(addresses);
        return mapAddressResponse(target);
    }

    @Transactional
    public void deleteAddress(Long id) {
        UserAccount user = currentCustomer();
        UserAddress target = userAddressRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Địa chỉ không tồn tại"));
        boolean wasDefault = Boolean.TRUE.equals(target.getIsDefault());

        userAddressRepository.delete(target);

        if (wasDefault) {
            List<UserAddress> remaining = listAddressEntities(user);
            if (!remaining.isEmpty()) {
                UserAddress nextDefault = remaining.get(0);
                nextDefault.setIsDefault(Boolean.TRUE);
                userAddressRepository.save(nextDefault);
            }
        }
    }

    @Transactional
    public UserDefaultAddressResponse saveDefaultAddress(UserDefaultAddressRequest request) {
        UserAccount user = currentCustomer();
        List<UserAddress> addresses = listAddressEntities(user);

        UserAddress target = addresses.stream()
                .filter(address -> Boolean.TRUE.equals(address.getIsDefault()))
                .findFirst()
                .orElseGet(() -> addresses.stream().findFirst().orElseGet(() -> UserAddress.builder().user(user).build()));

        resetDefault(addresses);
        target.setUser(user);
        target.setFullName(requireText(request.fullName(), "Họ tên người nhận là bắt buộc"));
        target.setPhone(requireText(request.phone(), "Số điện thoại là bắt buộc"));
        target.setAddressLine1(requireText(request.addressLine1(), "Địa chỉ là bắt buộc"));
        target.setAddressLine2(trimToNull(request.addressLine2()));
        target.setWard(trimToNull(request.ward()));
        target.setDistrict(trimToNull(request.district()));
        target.setCity(requireText(request.city(), "Thành phố là bắt buộc"));
        target.setProvince(trimToNull(request.province()));
        target.setPostalCode(trimToNull(request.postalCode()));
        target.setIsDefault(Boolean.TRUE);

        if (!addresses.isEmpty()) {
            userAddressRepository.saveAll(addresses);
        }
        UserAddress saved = userAddressRepository.save(target);
        return mapResponse(saved);
    }

    private UserDefaultAddressResponse mapResponse(UserAddress address) {
        return new UserDefaultAddressResponse(
                address.getId(),
                address.getFullName(),
                address.getPhone(),
                address.getAddressLine1(),
                address.getAddressLine2(),
                address.getWard(),
                address.getDistrict(),
                address.getCity(),
                address.getProvince(),
                address.getPostalCode(),
                address.getIsDefault()
        );
    }

    private UserAddressResponse mapAddressResponse(UserAddress address) {
        return new UserAddressResponse(
                address.getId(),
                address.getFullName(),
                address.getPhone(),
                address.getAddressLine1(),
                address.getAddressLine2(),
                address.getWard(),
                address.getDistrict(),
                address.getCity(),
                address.getProvince(),
                address.getPostalCode(),
                Boolean.TRUE.equals(address.getIsDefault()),
                address.getCreatedAt()
        );
    }

    private List<UserAddress> listAddressEntities(UserAccount user) {
        return userAddressRepository.findByUserOrderByIsDefaultDescCreatedAtDesc(user);
    }

    private void applyAddressPayload(UserAddress address, UserAddressUpsertRequest request) {
        address.setFullName(requireText(request.fullName(), "Họ tên người nhận là bắt buộc"));
        address.setPhone(requireText(request.phone(), "Số điện thoại là bắt buộc"));
        address.setAddressLine1(requireText(request.addressLine1(), "Địa chỉ là bắt buộc"));
        address.setAddressLine2(trimToNull(request.addressLine2()));
        address.setWard(trimToNull(request.ward()));
        address.setDistrict(trimToNull(request.district()));
        address.setCity(requireText(request.city(), "Thành phố là bắt buộc"));
        address.setProvince(trimToNull(request.province()));
        address.setPostalCode(trimToNull(request.postalCode()));
    }

    private void resetDefault(List<UserAddress> addresses) {
        for (UserAddress item : addresses) {
            item.setIsDefault(Boolean.FALSE);
        }
    }

    private String requireText(String value, String message) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            throw new ResponseStatusException(BAD_REQUEST, message);
        }
        return normalized;
    }

    private UserAccount currentCustomer() {
        UserAccount user = userService.getCurrentUser();
        userService.ensureStoreBuyer(user);
        return user;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
