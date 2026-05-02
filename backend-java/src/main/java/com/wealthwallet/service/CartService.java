package com.wealthwallet.service;

import com.wealthwallet.domain.entity.Cart;
import com.wealthwallet.domain.entity.CartItem;
import com.wealthwallet.domain.entity.Product;
import com.wealthwallet.domain.entity.ProductVariant;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.domain.entity.Voucher;
import com.wealthwallet.dto.CartItemRequest;
import com.wealthwallet.dto.CartItemResponse;
import com.wealthwallet.dto.CartItemUpdateRequest;
import com.wealthwallet.dto.CartResponse;
import com.wealthwallet.repository.CartRepository;
import com.wealthwallet.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class CartService {

    private static final double FREE_SHIPPING_THRESHOLD = 500_000;
    private static final double BASE_SHIPPING_FEE = 30_000;

    private final CartRepository cartRepository;
    private final ProductVariantRepository variantRepository;
    private final VoucherService voucherService;

    @Transactional
    public CartResponse getCart(UserAccount user) {
        Cart cart = getOrCreateCart(user);
        return buildCartResponse(cart);
    }

    @Transactional
    public CartResponse addItem(UserAccount user, CartItemRequest request) {
        ProductVariant variant = variantRepository.findById(request.variantId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Variant not found"));
        validateStock(variant, request.quantity());

        Cart cart = getOrCreateCart(user);
        ensureSingleSellerCart(cart, variant);
        CartItem item = cart.getItems().stream()
                .filter(existing -> existing.getVariant().getId().equals(variant.getId()))
                .findFirst()
                .orElse(null);
        if (item == null) {
            item = CartItem.builder()
                    .cart(cart)
                    .variant(variant)
                    .quantity(request.quantity())
                    .build();
            cart.getItems().add(item);
        } else {
            int nextQty = item.getQuantity() + request.quantity();
            validateStock(variant, nextQty);
            item.setQuantity(nextQty);
        }
        cart.setUpdatedAt(LocalDateTime.now());
        cartRepository.save(cart);
        return buildCartResponse(cart);
    }

    @Transactional
    public CartResponse updateItem(UserAccount user, Long itemId, CartItemUpdateRequest request) {
        Cart cart = getOrCreateCart(user);
        CartItem item = findCartItem(cart, itemId);
        int quantity = request.quantity() != null ? request.quantity() : 0;
        if (quantity <= 0) {
            cart.getItems().remove(item);
        } else {
            validateStock(item.getVariant(), quantity);
            item.setQuantity(quantity);
        }
        if (cart.getItems().isEmpty()) {
            cart.setAppliedVoucher(null);
        }
        cart.setUpdatedAt(LocalDateTime.now());
        cartRepository.save(cart);
        return buildCartResponse(cart);
    }

    @Transactional
    public CartResponse removeItem(UserAccount user, Long itemId) {
        Cart cart = getOrCreateCart(user);
        CartItem item = findCartItem(cart, itemId);
        cart.getItems().remove(item);
        if (cart.getItems().isEmpty()) {
            cart.setAppliedVoucher(null);
        }
        cart.setUpdatedAt(LocalDateTime.now());
        cartRepository.save(cart);
        return buildCartResponse(cart);
    }

    @Transactional
    public CartResponse clear(UserAccount user) {
        Cart cart = getOrCreateCart(user);
        cart.getItems().clear();
        cart.setAppliedVoucher(null);
        cart.setUpdatedAt(LocalDateTime.now());
        cartRepository.save(cart);
        return buildCartResponse(cart);
    }

    @Transactional
    public CartResponse applyVoucher(UserAccount user, String code) {
        Cart cart = getOrCreateCart(user);
        if (cart.getItems().isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Giỏ hàng trống, chưa thể áp voucher");
        }
        double subtotal = calculateSubtotal(cart.getItems());
        Voucher voucher = voucherService.getValidVoucherOrThrow(code, subtotal);
        cart.setAppliedVoucher(voucher);
        cart.setUpdatedAt(LocalDateTime.now());
        cartRepository.save(cart);
        return buildCartResponse(cart);
    }

    @Transactional
    public CartResponse removeVoucher(UserAccount user) {
        Cart cart = getOrCreateCart(user);
        cart.setAppliedVoucher(null);
        cart.setUpdatedAt(LocalDateTime.now());
        cartRepository.save(cart);
        return buildCartResponse(cart);
    }

    private Cart getOrCreateCart(UserAccount user) {
        return cartRepository.findByUser(user)
                .orElseGet(() -> cartRepository.save(Cart.builder().user(user).build()));
    }

    private void ensureSingleSellerCart(Cart cart, ProductVariant candidateVariant) {
        Long currentSellerId = cart.getItems().stream()
                .map(CartItem::getVariant)
                .filter(Objects::nonNull)
                .map(this::resolveSellerId)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
        Long candidateSellerId = resolveSellerId(candidateVariant);
        if (currentSellerId == null || candidateSellerId == null || currentSellerId.equals(candidateSellerId)) {
            return;
        }
        throw new ResponseStatusException(
                BAD_REQUEST,
                "Giỏ hàng hiện chỉ hỗ trợ sản phẩm từ một shop trong mỗi đơn. Hãy thanh toán hoặc xóa sản phẩm hiện tại trước khi thêm shop khác."
        );
    }

    private CartItem findCartItem(Cart cart, Long itemId) {
        return cart.getItems().stream()
                .filter(item -> item.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Cart item not found"));
    }

    private CartResponse buildCartResponse(Cart cart) {
        List<CartItemResponse> items = cart.getItems().stream()
                .sorted(Comparator.comparing(CartItem::getId))
                .map(this::mapCartItem)
                .toList();
        double subtotalBeforeDiscount = items.stream()
                .mapToDouble(item -> item.lineTotal() != null ? item.lineTotal() : 0.0)
                .sum();
        double shippingFee = subtotalBeforeDiscount <= 0
                ? 0.0
                : (subtotalBeforeDiscount >= FREE_SHIPPING_THRESHOLD ? 0.0 : BASE_SHIPPING_FEE);
        Voucher appliedVoucher = cart.getAppliedVoucher();
        String appliedVoucherCode = appliedVoucher != null ? appliedVoucher.getCode() : null;
        double voucherDiscount = voucherService.calculateDiscount(appliedVoucher, subtotalBeforeDiscount);
        double discount = voucherDiscount;
        double total = subtotalBeforeDiscount + shippingFee - discount;

        return new CartResponse(
                cart.getId(),
                items,
                subtotalBeforeDiscount,
                voucherDiscount,
                appliedVoucherCode,
                subtotalBeforeDiscount,
                shippingFee,
                discount,
                total
        );
    }

    private CartItemResponse mapCartItem(CartItem item) {
        ProductVariant variant = item.getVariant();
        Product product = variant.getProduct();
        double unitPrice = resolveUnitPrice(variant);
        double lineTotal = unitPrice * item.getQuantity();
        String imageUrl = variant.getImageUrl();
        if ((imageUrl == null || imageUrl.isBlank()) && product != null && product.getImageUrls() != null) {
            imageUrl = product.getImageUrls().stream()
                    .filter(url -> url != null && !url.isBlank())
                    .findFirst()
                    .orElse(null);
        }
        return new CartItemResponse(
                item.getId(),
                variant.getId(),
                product != null ? product.getId() : null,
                product != null ? product.getName() : null,
                product != null ? product.getSlug() : null,
                imageUrl,
                variant.getSize(),
                variant.getColor(),
                unitPrice,
                item.getQuantity(),
                lineTotal,
                variant.getStockQty()
        );
    }

    private double resolveUnitPrice(ProductVariant variant) {
        if (variant.getPriceOverride() != null) {
            return variant.getPriceOverride();
        }
        Product product = variant.getProduct();
        if (product != null && product.getSalePrice() != null) {
            return product.getSalePrice();
        }
        return product != null ? product.getBasePrice() : 0.0;
    }

    private void validateStock(ProductVariant variant, int desiredQty) {
        if (variant.getStockQty() != null && desiredQty > variant.getStockQty()) {
            if (variant.getStockQty() <= 0) {
                throw new ResponseStatusException(BAD_REQUEST, "Biến thể bạn chọn hiện đã hết hàng");
            }
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Chỉ còn " + variant.getStockQty() + " sản phẩm trong kho"
            );
        }
    }

    private Long resolveSellerId(ProductVariant variant) {
        Product product = variant.getProduct();
        if (product == null || product.getSeller() == null) {
            return null;
        }
        return product.getSeller().getId();
    }

    private double calculateSubtotal(List<CartItem> items) {
        return items.stream()
                .mapToDouble(item -> {
                    ProductVariant variant = item.getVariant();
                    return resolveUnitPrice(variant) * item.getQuantity();
                })
                .sum();
    }
}
