package com.wealthwallet.service;

import com.wealthwallet.domain.entity.Cart;
import com.wealthwallet.domain.entity.CartItem;
import com.wealthwallet.domain.entity.Product;
import com.wealthwallet.domain.entity.ProductVariant;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.CartItemRequest;
import com.wealthwallet.repository.CartRepository;
import com.wealthwallet.repository.ProductVariantRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.BAD_REQUEST;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private ProductVariantRepository variantRepository;

    @Mock
    private VoucherService voucherService;

    @InjectMocks
    private CartService cartService;

    @Test
    void addItem_shouldRejectProductsFromDifferentSellersInSameCart() {
        UserAccount customer = user(1L, UserAccount.Role.USER);
        UserAccount sellerA = user(10L, UserAccount.Role.SELLER);
        UserAccount sellerB = user(11L, UserAccount.Role.SELLER);

        ProductVariant existingVariant = variant(100L, product(200L, sellerA));
        ProductVariant nextVariant = variant(101L, product(201L, sellerB));

        Cart cart = Cart.builder()
                .id(20L)
                .user(customer)
                .items(new ArrayList<>())
                .build();
        cart.getItems().add(CartItem.builder().id(30L).cart(cart).variant(existingVariant).quantity(1).build());

        when(variantRepository.findById(101L)).thenReturn(Optional.of(nextVariant));
        when(cartRepository.findByUser(customer)).thenReturn(Optional.of(cart));

        assertThatThrownBy(() -> cartService.addItem(customer, new CartItemRequest(101L, 1)))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> {
                    ResponseStatusException exception = (ResponseStatusException) error;
                    assertThat(exception.getStatusCode()).isEqualTo(BAD_REQUEST);
                    assertThat(exception.getReason()).contains("một shop");
                });
    }

    private ProductVariant variant(Long id, Product product) {
        return ProductVariant.builder()
                .id(id)
                .product(product)
                .size("M")
                .color("Be")
                .stockQty(5)
                .build();
    }

    private Product product(Long id, UserAccount seller) {
        return Product.builder()
                .id(id)
                .name("Product " + id)
                .slug("product-" + id)
                .basePrice(100_000d)
                .seller(seller)
                .build();
    }

    private UserAccount user(Long id, UserAccount.Role role) {
        return UserAccount.builder()
                .id(id)
                .role(role)
                .email("user-" + id + "@example.com")
                .passwordHash("hash")
                .fullName("User " + id)
                .build();
    }
}
