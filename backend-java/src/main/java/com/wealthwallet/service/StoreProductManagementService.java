package com.wealthwallet.service;

import com.wealthwallet.domain.entity.Category;
import com.wealthwallet.domain.entity.Product;
import com.wealthwallet.domain.entity.ProductVariant;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.StoreProductCreateRequest;
import com.wealthwallet.dto.StoreProductDetailResponse;
import com.wealthwallet.dto.StoreProductVariantRequest;
import com.wealthwallet.dto.StoreProductVariantResponse;
import com.wealthwallet.dto.StoreProductUpdateRequest;
import com.wealthwallet.dto.StoreProductVariantUpdateRequest;
import com.wealthwallet.repository.CategoryRepository;
import com.wealthwallet.repository.ProductRepository;
import com.wealthwallet.repository.ProductVariantRepository;
import com.wealthwallet.utils.SlugUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;

import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class StoreProductManagementService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductVariantRepository productVariantRepository;

    @Transactional
    public StoreProductDetailResponse create(UserAccount user, StoreProductCreateRequest request) {
        ensureCanManageProducts(user);

        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Category not found"));

        String slug = buildUniqueSlug(request.name());
        Product product = Product.builder()
                .name(request.name().trim())
                .slug(slug)
                .description(trimToNull(request.description()))
                .gender(request.gender())
                .brand(trimToNull(request.brand()))
                .material(trimToNull(request.material()))
                .fit(trimToNull(request.fit()))
                .basePrice(request.basePrice())
                .salePrice(request.salePrice())
                .featured(Boolean.TRUE.equals(request.featured()))
                .active(true)
                .category(category)
                .seller(user)
                .imageUrls(sanitizeImageUrls(request.imageUrls()))
                .build();

        List<ProductVariant> variants = new ArrayList<>();
        for (StoreProductVariantRequest variantRequest : request.variants()) {
            ProductVariant variant = ProductVariant.builder()
                    .product(product)
                    .size(variantRequest.size().trim())
                    .color(variantRequest.color().trim())
                    .priceOverride(variantRequest.priceOverride())
                    .stockQty(variantRequest.stockQty() != null ? variantRequest.stockQty() : 0)
                    .imageUrl(trimToNull(variantRequest.imageUrl()))
                    .build();
            variants.add(variant);
        }
        product.setVariants(variants);

        Product saved = productRepository.save(product);
        return mapDetail(saved);
    }

    @Transactional
    public StoreProductDetailResponse update(UserAccount user, Long productId, StoreProductUpdateRequest request) {
        ensureCanManageProducts(user);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Product not found"));
        ensureOwnerOrAdmin(user, product);

        if (request.name() != null && !request.name().isBlank()) {
            String trimmedName = request.name().trim();
            if (!trimmedName.equals(product.getName())) {
                product.setName(trimmedName);
                product.setSlug(buildUniqueSlug(trimmedName));
            }
        }
        if (request.description() != null) {
            product.setDescription(trimToNull(request.description()));
        }
        if (request.gender() != null) {
            product.setGender(request.gender());
        }
        if (request.categoryId() != null) {
            Category category = categoryRepository.findById(request.categoryId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Category not found"));
            product.setCategory(category);
        }
        if (request.brand() != null) {
            product.setBrand(trimToNull(request.brand()));
        }
        if (request.material() != null) {
            product.setMaterial(trimToNull(request.material()));
        }
        if (request.fit() != null) {
            product.setFit(trimToNull(request.fit()));
        }
        if (request.basePrice() != null) {
            product.setBasePrice(request.basePrice());
        }
        if (request.salePrice() != null) {
            product.setSalePrice(request.salePrice());
        }
        if (request.featured() != null) {
            product.setFeatured(request.featured());
        }
        if (request.active() != null) {
            product.setActive(request.active());
        }
        if (request.imageUrls() != null) {
            product.setImageUrls(sanitizeImageUrls(request.imageUrls()));
        }
        Product saved = productRepository.save(product);
        return mapDetail(saved);
    }

    @Transactional
    public void delete(UserAccount user, Long productId) {
        ensureCanManageProducts(user);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Product not found"));
        ensureOwnerOrAdmin(user, product);
        product.setActive(false);
        productRepository.save(product);
    }

    @Transactional
    public StoreProductVariantResponse updateVariant(
            UserAccount user,
            Long productId,
            Long variantId,
            StoreProductVariantUpdateRequest request
    ) {
        ensureCanManageProducts(user);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Product not found"));
        ensureOwnerOrAdmin(user, product);
        ProductVariant variant = product.getVariants().stream()
                .filter(item -> item.getId().equals(variantId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Variant not found"));

        if (request.size() != null && !request.size().isBlank()) {
            variant.setSize(request.size().trim());
        }
        if (request.color() != null && !request.color().isBlank()) {
            variant.setColor(request.color().trim());
        }
        if (request.priceOverride() != null) {
            variant.setPriceOverride(request.priceOverride());
        }
        if (request.stockQty() != null) {
            variant.setStockQty(request.stockQty());
        }
        if (request.imageUrl() != null) {
            variant.setImageUrl(trimToNull(request.imageUrl()));
        }
        ProductVariant saved = productVariantRepository.save(variant);
        return new StoreProductVariantResponse(
                saved.getId(),
                saved.getSize(),
                saved.getColor(),
                resolveVariantPrice(product, saved),
                saved.getStockQty(),
                saved.getImageUrl()
        );
    }

    @Transactional
    public StoreProductVariantResponse addVariant(
            UserAccount user,
            Long productId,
            StoreProductVariantRequest request
    ) {
        ensureCanManageProducts(user);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Product not found"));
        ensureOwnerOrAdmin(user, product);
        ProductVariant variant = ProductVariant.builder()
                .product(product)
                .size(request.size().trim())
                .color(request.color().trim())
                .priceOverride(request.priceOverride())
                .stockQty(request.stockQty() != null ? request.stockQty() : 0)
                .imageUrl(trimToNull(request.imageUrl()))
                .build();
        ProductVariant saved = productVariantRepository.save(variant);
        return new StoreProductVariantResponse(
                saved.getId(),
                saved.getSize(),
                saved.getColor(),
                resolveVariantPrice(product, saved),
                saved.getStockQty(),
                saved.getImageUrl()
        );
    }

    @Transactional
    public void deleteVariant(UserAccount user, Long productId, Long variantId) {
        ensureCanManageProducts(user);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Product not found"));
        ensureOwnerOrAdmin(user, product);
        Optional<ProductVariant> variant = product.getVariants().stream()
                .filter(item -> item.getId().equals(variantId))
                .findFirst();
        if (variant.isEmpty()) {
            throw new ResponseStatusException(NOT_FOUND, "Variant not found");
        }
        product.getVariants().remove(variant.get());
        productRepository.save(product);
    }

    private void ensureCanManageProducts(UserAccount user) {
        UserAccount.Role role = user.getRole();
        if (role == UserAccount.Role.USER) {
            throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền thêm sản phẩm");
        }
    }

    private void ensureOwnerOrAdmin(UserAccount user, Product product) {
        if (user.getRole() == UserAccount.Role.ADMIN) {
            return;
        }
        UserAccount seller = product.getSeller();
        if (seller == null || !seller.getId().equals(user.getId())) {
            throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền cập nhật sản phẩm này");
        }
    }

    private String buildUniqueSlug(String name) {
        String baseSlug = SlugUtils.toSlug(name);
        if (baseSlug.isBlank()) {
            baseSlug = "product";
        }
        String slug = baseSlug;
        int counter = 1;
        while (productRepository.existsBySlug(slug)) {
            counter += 1;
            slug = baseSlug + "-" + counter;
        }
        return slug;
    }

    private StoreProductDetailResponse mapDetail(Product product) {
        List<StoreProductVariantResponse> variants = product.getVariants().stream()
                .map(variant -> new StoreProductVariantResponse(
                        variant.getId(),
                        variant.getSize(),
                        variant.getColor(),
                        resolveVariantPrice(product, variant),
                        variant.getStockQty(),
                        trimToNull(variant.getImageUrl())
                ))
                .toList();
        return new StoreProductDetailResponse(
                product.getId(),
                product.getName(),
                product.getSlug(),
                product.getCategory() != null ? product.getCategory().getName() : null,
                product.getGender().name().toLowerCase(),
                product.getBasePrice(),
                product.getSalePrice(),
                product.getAverageRating(),
                product.getReviewCount(),
                product.getDescription(),
                product.getBrand(),
                product.getMaterial(),
                product.getFit(),
                List.copyOf(sanitizeImageUrls(product.getImageUrls())),
                variants
        );
    }

    private double resolveVariantPrice(Product product, ProductVariant variant) {
        if (variant.getPriceOverride() != null) {
            return variant.getPriceOverride();
        }
        if (product.getSalePrice() != null) {
            return product.getSalePrice();
        }
        return product.getBasePrice();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private ArrayList<String> sanitizeImageUrls(List<String> imageUrls) {
        if (imageUrls == null || imageUrls.isEmpty()) {
            return new ArrayList<>();
        }
        LinkedHashSet<String> uniqueUrls = new LinkedHashSet<>();
        imageUrls.stream()
                .map(this::trimToNull)
                .filter(value -> value != null)
                .forEach(uniqueUrls::add);
        return new ArrayList<>(uniqueUrls);
    }
}
