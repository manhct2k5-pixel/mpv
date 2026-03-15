package com.wealthwallet.config;

import com.wealthwallet.domain.entity.Category;
import com.wealthwallet.domain.entity.Gender;
import com.wealthwallet.domain.entity.Lookbook;
import com.wealthwallet.domain.entity.Order;
import com.wealthwallet.domain.entity.OrderItem;
import com.wealthwallet.domain.entity.Product;
import com.wealthwallet.domain.entity.ProductVariant;
import com.wealthwallet.domain.entity.ReturnRequest;
import com.wealthwallet.domain.entity.ShippingAddress;
import com.wealthwallet.domain.entity.SupportTicket;
import com.wealthwallet.domain.entity.SupportTicketComment;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.domain.entity.Voucher;
import com.wealthwallet.repository.CategoryRepository;
import com.wealthwallet.repository.LookbookRepository;
import com.wealthwallet.repository.OrderRepository;
import com.wealthwallet.repository.ProductRepository;
import com.wealthwallet.repository.ProductVariantRepository;
import com.wealthwallet.repository.ReturnRequestRepository;
import com.wealthwallet.repository.SupportTicketRepository;
import com.wealthwallet.repository.UserAccountRepository;
import com.wealthwallet.repository.VoucherRepository;
import com.wealthwallet.utils.SlugUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class StoreSeedData implements CommandLineRunner {

    private static final int MIN_DEMO_PRODUCTS = 1000;
    private static final String[] TONE_POOL = {
            "Kem", "Latte", "Mocha", "Cacao", "Caramel", "Be", "Nâu sữa", "Hạnh nhân", "Trà sữa", "Vanilla"
    };
    private static final String[] COLOR_POOL = {
            "Kem", "Nâu", "Trắng", "Đen", "Xám", "Xanh navy", "Hồng phấn", "Be", "Caramel", "Mocha"
    };
    private static final String[] WOMEN_TYPES = {
            "Váy midi", "Váy xoè", "Áo blouse", "Áo len", "Cardigan", "Chân váy", "Đầm công sở", "Áo sơ mi nữ"
    };
    private static final String[] MEN_TYPES = {
            "Áo thun nam", "Áo polo", "Sơ mi nam", "Quần kaki", "Áo khoác bomber", "Quần jogger", "Áo len nam"
    };
    private static final String[] ACCESSORY_TYPES = {
            "Túi đeo chéo", "Mũ lưỡi trai", "Khăn cổ", "Thắt lưng", "Ví mini", "Nón len", "Ba lô mini"
    };
    private static final String[] SALE_TYPES = {
            "Set outfit", "Combo đi làm", "Combo đi chơi", "Set đôi", "Set mùa hè", "Set mùa thu"
    };
    private static final String[] IMAGE_POOL = {
            "https://images.unsplash.com/photo-1523381294911-8d3cead13475?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80"
    };

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final UserAccountRepository userAccountRepository;
    private final LookbookRepository lookbookRepository;
    private final OrderRepository orderRepository;
    private final SupportTicketRepository supportTicketRepository;
    private final ReturnRequestRepository returnRequestRepository;
    private final VoucherRepository voucherRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        UserAccount admin = getOrCreateDemoUser("Mộc Mầm Admin", "admin@shopvui.local", UserAccount.Role.ADMIN, true);
        UserAccount seller = getOrCreateDemoUser("Mộc Mầm Seller", "seller@shopvui.local", UserAccount.Role.SELLER, true);
        UserAccount warehouse = getOrCreateDemoUser("Mộc Mầm Staff", "warehouse@shopvui.local", UserAccount.Role.WAREHOUSE, true);
        UserAccount customer = getOrCreateDemoUser("Mộc Mầm User", "user@shopvui.local", UserAccount.Role.USER, true);

        Category women = getOrCreateCategory(
                "Nữ dịu dàng",
                "nu",
                Gender.WOMEN,
                "Váy xoè, sơ mi kẹo bông, cardigan mềm mịn.",
                "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80"
        );
        Category men = getOrCreateCategory(
                "Nam ấm áp",
                "nam",
                Gender.MEN,
                "Áo thun nâu latte, quần ống suông gọn gàng.",
                "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80"
        );
        Category accessories = getOrCreateCategory(
                "Phụ kiện đáng yêu",
                "phu-kien",
                Gender.UNISEX,
                "Túi mini, khăn cổ, mũ len - mix dễ dàng.",
                "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80"
        );
        Category sale = getOrCreateCategory(
                "Ưu đãi ngọt ngào",
                "sale",
                Gender.UNISEX,
                "Ưu đãi tuần này, số lượng giới hạn.",
                "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80"
        );

        if (productRepository.count() == 0) {
            Product sweater = createProduct(
                    "Áo len mây kem",
                    women,
                    Gender.WOMEN,
                    "Len mềm, co giãn nhẹ, mặc thoáng mát.",
                    320_000.0,
                    null,
                    true,
                    seller,
                    List.of(
                            "https://images.unsplash.com/photo-1523381294911-8d3cead13475?auto=format&fit=crop&w=900&q=80",
                            "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80"
                    )
            );
            addVariant(sweater, "S", "Kem", 18, null, sweater.getImageUrls().get(0));
            addVariant(sweater, "M", "Kem", 20, null, sweater.getImageUrls().get(0));
            addVariant(sweater, "L", "Kem", 12, null, sweater.getImageUrls().get(0));

            Product floralDress = createProduct(
                    "Váy hoa kem sữa",
                    women,
                    Gender.WOMEN,
                    "Dáng xoè nhẹ, chất liệu mềm rủ.",
                    360_000.0,
                    330_000.0,
                    true,
                    seller,
                    List.of(
                            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
                            "https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=900&q=80"
                    )
            );
            addVariant(floralDress, "S", "Kem sữa", 10, null, floralDress.getImageUrls().get(0));
            addVariant(floralDress, "M", "Kem sữa", 14, null, floralDress.getImageUrls().get(0));

            Product cacaoSkirt = createProduct(
                    "Chân váy cacao",
                    women,
                    Gender.WOMEN,
                    "Dáng chữ A, tôn dáng nhẹ nhàng.",
                    260_000.0,
                    null,
                    false,
                    seller,
                    List.of("https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80")
            );
            addVariant(cacaoSkirt, "S", "Cacao", 14, null, cacaoSkirt.getImageUrls().get(0));
            addVariant(cacaoSkirt, "M", "Cacao", 16, null, cacaoSkirt.getImageUrls().get(0));

            Product cardigan = createProduct(
                    "Cardigan mocha",
                    women,
                    Gender.WOMEN,
                    "Len mềm, giữ ấm vừa phải.",
                    290_000.0,
                    260_000.0,
                    true,
                    seller,
                    List.of("https://images.unsplash.com/photo-1523381294911-8d3cead13475?auto=format&fit=crop&w=900&q=80")
            );
            addVariant(cardigan, "S", "Mocha", 12, null, cardigan.getImageUrls().get(0));
            addVariant(cardigan, "M", "Mocha", 14, null, cardigan.getImageUrls().get(0));

            Product tshirt = createProduct(
                    "Áo thun hạt dẻ",
                    men,
                    Gender.MEN,
                    "Cotton 2 chiều, thấm hút tốt.",
                    190_000.0,
                    null,
                    true,
                    seller,
                    List.of("https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80")
            );
            addVariant(tshirt, "M", "Hạt dẻ", 24, null, tshirt.getImageUrls().get(0));
            addVariant(tshirt, "L", "Hạt dẻ", 20, null, tshirt.getImageUrls().get(0));
            addVariant(tshirt, "XL", "Hạt dẻ", 16, null, tshirt.getImageUrls().get(0));

            Product shirt = createProduct(
                    "Sơ mi latte",
                    men,
                    Gender.MEN,
                    "Form suông dễ mặc, ít nhăn.",
                    320_000.0,
                    null,
                    false,
                    seller,
                    List.of("https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80")
            );
            addVariant(shirt, "M", "Latte", 16, null, shirt.getImageUrls().get(0));
            addVariant(shirt, "L", "Latte", 18, null, shirt.getImageUrls().get(0));

            Product pants = createProduct(
                    "Quần kaki cacao",
                    men,
                    Gender.MEN,
                    "Ống đứng, tôn dáng, dễ phối.",
                    360_000.0,
                    null,
                    false,
                    seller,
                    List.of("https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80")
            );
            addVariant(pants, "M", "Cacao", 12, null, pants.getImageUrls().get(0));
            addVariant(pants, "L", "Cacao", 10, null, pants.getImageUrls().get(0));

            Product jacket = createProduct(
                    "Áo khoác mocha",
                    men,
                    Gender.MEN,
                    "Lót cotton, ấm nhẹ, form gọn.",
                    490_000.0,
                    420_000.0,
                    true,
                    seller,
                    List.of("https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80")
            );
            addVariant(jacket, "M", "Mocha", 10, null, jacket.getImageUrls().get(0));
            addVariant(jacket, "L", "Mocha", 8, null, jacket.getImageUrls().get(0));

            Product miniBag = createProduct(
                    "Túi mini kem",
                    accessories,
                    Gender.UNISEX,
                    "Mix dễ với mọi outfit, đeo chéo hoặc vai.",
                    290_000.0,
                    220_000.0,
                    true,
                    seller,
                    List.of("https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80")
            );
            addVariant(miniBag, "Free", "Kem", 30, null, miniBag.getImageUrls().get(0));

            Product scarf = createProduct(
                    "Khăn cổ caramel",
                    accessories,
                    Gender.UNISEX,
                    "Điểm nhấn ấm áp, chất len mềm.",
                    120_000.0,
                    null,
                    false,
                    seller,
                    List.of("https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80")
            );
            addVariant(scarf, "Free", "Caramel", 40, null, scarf.getImageUrls().get(0));

            Product beanie = createProduct(
                    "Mũ len latte",
                    accessories,
                    Gender.UNISEX,
                    "Mũ len mềm, giữ ấm nhẹ nhàng.",
                    150_000.0,
                    null,
                    false,
                    seller,
                    List.of("https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80")
            );
            addVariant(beanie, "Free", "Latte", 28, null, beanie.getImageUrls().get(0));

            Product coupleSet = createProduct(
                    "Set đôi nâu kem",
                    sale,
                    Gender.UNISEX,
                    "Set đôi cho ngày hẹn, gam màu nâu kem ngọt ngào.",
                    410_000.0,
                    330_000.0,
                    true,
                    seller,
                    List.of(
                            "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80",
                            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80"
                    )
            );
            addVariant(coupleSet, "M", "Nâu kem", 12, null, coupleSet.getImageUrls().get(0));
            addVariant(coupleSet, "L", "Nâu kem", 10, null, coupleSet.getImageUrls().get(0));
        }
        ensureMinimumDemoProducts(seller, women, men, accessories, sale);

        if (lookbookRepository.count() == 0) {
            createLookbook(
                    "Tủ đồ nâu kem cho mọi ngày",
                    "Gợi ý phối đồ tone nâu kem nhẹ nhàng cho đi làm và dạo phố.",
                    "Nhẹ nhàng",
                    "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80",
                    List.of("Latte", "Kem sữa", "Cardigan"),
                    warehouse
            );
            createLookbook(
                    "Layer ấm áp ngày se lạnh",
                    "Phối cardigan và áo khoác mocha để giữ ấm tinh tế.",
                    "Ấm áp",
                    "https://images.unsplash.com/photo-1523381294911-8d3cead13475?auto=format&fit=crop&w=1200&q=80",
                    List.of("Mocha", "Cardigan", "Phụ kiện"),
                    warehouse
            );
            createLookbook(
                    "Set đôi nâu kem",
                    "Gợi ý mix đôi cho những buổi hẹn nhẹ nhàng.",
                    "Ngọt ngào",
                    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
                    List.of("Set đôi", "Nâu kem", "Sale"),
                    warehouse
            );
        }

        seedOrderAndSupportData(customer, seller, warehouse, admin);
        seedVouchers();
    }

    private Category getOrCreateCategory(
            String name,
            String slug,
            Gender gender,
            String description,
            String imageUrl
    ) {
        return categoryRepository.findBySlug(slug)
                .orElseGet(() -> categoryRepository.save(Category.builder()
                        .name(name)
                        .slug(slug)
                        .gender(gender)
                        .description(description)
                        .imageUrl(imageUrl)
                        .active(true)
                        .build()));
    }

    private Product createProduct(
            String name,
            Category category,
            Gender gender,
            String description,
            Double basePrice,
            Double salePrice,
            boolean featured,
            UserAccount seller,
            List<String> imageUrls
    ) {
        String slug = SlugUtils.toSlug(name);
        Product product = Product.builder()
                .name(name)
                .slug(slug)
                .description(description)
                .gender(gender)
                .category(category)
                .basePrice(basePrice)
                .salePrice(salePrice)
                .featured(featured)
                .brand("Mộc Mầm")
                .material("Cotton/Len")
                .fit("Relaxed")
                .active(true)
                .seller(seller)
                .imageUrls(new ArrayList<>(imageUrls))
                .build();
        return productRepository.save(product);
    }

    private void addVariant(
            Product product,
            String size,
            String color,
            Integer stockQty,
            Double priceOverride,
            String imageUrl
    ) {
        ProductVariant variant = ProductVariant.builder()
                .product(product)
                .size(size)
                .color(color)
                .priceOverride(priceOverride)
                .stockQty(stockQty)
                .imageUrl(imageUrl)
                .build();
        productVariantRepository.save(variant);
    }

    private void ensureMinimumDemoProducts(
            UserAccount seller,
            Category women,
            Category men,
            Category accessories,
            Category sale
    ) {
        long currentCount = productRepository.count();
        if (currentCount >= MIN_DEMO_PRODUCTS) {
            return;
        }

        int missing = (int) (MIN_DEMO_PRODUCTS - currentCount);
        for (int i = 0; i < missing; i++) {
            long serial = currentCount + i + 1;
            seedGeneratedProduct(serial, i, seller, women, men, accessories, sale);
        }
    }

    private void seedGeneratedProduct(
            long serial,
            int offset,
            UserAccount seller,
            Category women,
            Category men,
            Category accessories,
            Category sale
    ) {
        int bucket = offset % 4;
        Category category = switch (bucket) {
            case 0 -> women;
            case 1 -> men;
            case 2 -> accessories;
            default -> sale;
        };
        Gender gender = switch (bucket) {
            case 0 -> Gender.WOMEN;
            case 1 -> Gender.MEN;
            default -> Gender.UNISEX;
        };

        String type = pickTypeByBucket(bucket, offset);
        String tone = TONE_POOL[offset % TONE_POOL.length];
        String serialCode = String.format("%04d", serial);
        String name = type + " " + tone + " MM-" + serialCode;
        double basePrice = pickBasePriceByBucket(bucket, offset);
        Double salePrice = pickSalePriceByBucket(bucket, basePrice, offset);
        boolean featured = offset % 11 == 0;
        String imageUrl = IMAGE_POOL[offset % IMAGE_POOL.length];

        Product product = createProduct(
                name,
                category,
                gender,
                "Sản phẩm demo #" + serialCode + " dùng cho bài tập lớn TMĐT.",
                basePrice,
                salePrice,
                featured,
                seller,
                List.of(imageUrl)
        );

        addVariantsForGeneratedProduct(product, bucket, offset, imageUrl);
    }

    private void addVariantsForGeneratedProduct(Product product, int bucket, int offset, String imageUrl) {
        String primaryColor = COLOR_POOL[offset % COLOR_POOL.length];
        String secondaryColor = COLOR_POOL[(offset + 3) % COLOR_POOL.length];

        if (bucket == 2) { // accessories
            addVariant(product, "Free", primaryColor, 18 + (offset % 40), null, imageUrl);
            addVariant(product, "Free", secondaryColor, 14 + (offset % 32), null, imageUrl);
            return;
        }

        List<String> sizes = bucket == 1 ? List.of("M", "L", "XL") : List.of("S", "M", "L");
        addVariant(product, sizes.get(0), primaryColor, 10 + (offset % 35), null, imageUrl);
        addVariant(product, sizes.get(1), primaryColor, 12 + ((offset + 5) % 35), null, imageUrl);
        addVariant(product, sizes.get(2), secondaryColor, 8 + ((offset + 9) % 35), null, imageUrl);
    }

    private String pickTypeByBucket(int bucket, int offset) {
        return switch (bucket) {
            case 0 -> WOMEN_TYPES[offset % WOMEN_TYPES.length];
            case 1 -> MEN_TYPES[offset % MEN_TYPES.length];
            case 2 -> ACCESSORY_TYPES[offset % ACCESSORY_TYPES.length];
            default -> SALE_TYPES[offset % SALE_TYPES.length];
        };
    }

    private double pickBasePriceByBucket(int bucket, int offset) {
        return switch (bucket) {
            case 0 -> 240_000 + (offset % 11) * 35_000; // women
            case 1 -> 210_000 + (offset % 12) * 33_000; // men
            case 2 -> 90_000 + (offset % 9) * 24_000; // accessories
            default -> 280_000 + (offset % 10) * 38_000; // sale sets
        };
    }

    private Double pickSalePriceByBucket(int bucket, double basePrice, int offset) {
        if (bucket == 3) { // sale category always has discounted price
            return Math.max(49_000, basePrice - (40_000 + (offset % 6) * 8_000));
        }
        if (bucket == 0 && offset % 6 == 0) {
            return Math.max(59_000, basePrice - 35_000);
        }
        if (bucket == 1 && offset % 8 == 0) {
            return Math.max(59_000, basePrice - 30_000);
        }
        if (bucket == 2 && offset % 5 == 0) {
            return Math.max(29_000, basePrice - 20_000);
        }
        return null;
    }

    private void createLookbook(
            String title,
            String description,
            String mood,
            String coverImageUrl,
            List<String> tags,
            UserAccount creator
    ) {
        Lookbook lookbook = Lookbook.builder()
                .title(title)
                .description(description)
                .mood(mood)
                .coverImageUrl(coverImageUrl)
                .tags(new ArrayList<>(tags))
                .active(true)
                .createdBy(creator)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        lookbookRepository.save(lookbook);
    }

    private void seedOrderAndSupportData(
            UserAccount customer,
            UserAccount seller,
            UserAccount warehouse,
            UserAccount admin
    ) {
        List<Order> orders = seedOrders(customer, seller);
        seedSupportTickets(orders, customer, seller, warehouse, admin);
        seedReturnRequests(orders, customer, warehouse);
    }

    private List<Order> seedOrders(UserAccount customer, UserAccount seller) {
        if (orderRepository.count() > 0) {
            return orderRepository.findAll();
        }

        List<Product> sellerProducts = productRepository.findBySellerIdOrderByCreatedAtDesc(seller.getId());
        if (sellerProducts.isEmpty()) {
            return List.of();
        }

        List<ProductVariant> variants = sellerProducts.stream()
                .flatMap(product -> product.getVariants().stream())
                .toList();
        if (variants.isEmpty()) {
            return List.of();
        }

        ProductVariant firstVariant = variants.get(0);
        ProductVariant secondVariant = variants.size() > 1 ? variants.get(1) : firstVariant;
        ProductVariant thirdVariant = variants.size() > 2 ? variants.get(2) : firstVariant;

        List<Order> created = new ArrayList<>();
        created.add(createDemoOrder(
                "DH-DEMO-1001",
                customer,
                firstVariant,
                2,
                Order.Status.DELIVERED,
                Order.PaymentMethod.COD,
                Order.PaymentStatus.PAID,
                LocalDateTime.now().minusDays(5),
                "Đơn demo đã hoàn tất"
        ));
        created.add(createDemoOrder(
                "DH-DEMO-1002",
                customer,
                secondVariant,
                1,
                Order.Status.PACKING,
                Order.PaymentMethod.BANK_TRANSFER,
                Order.PaymentStatus.PAID,
                LocalDateTime.now().minusDays(2),
                "Đơn demo đang đóng gói"
        ));
        created.add(createDemoOrder(
                "DH-DEMO-1003",
                customer,
                thirdVariant,
                1,
                Order.Status.CONFIRMED,
                Order.PaymentMethod.BANK_TRANSFER,
                Order.PaymentStatus.UNPAID,
                LocalDateTime.now().minusHours(20),
                "Đơn demo chờ QC"
        ));
        created.add(createDemoOrder(
                "DH-DEMO-1004",
                customer,
                firstVariant,
                1,
                Order.Status.PENDING,
                Order.PaymentMethod.COD,
                Order.PaymentStatus.UNPAID,
                LocalDateTime.now().minusHours(8),
                "Đơn demo mới tạo"
        ));
        return created;
    }

    private Order createDemoOrder(
            String orderNumber,
            UserAccount customer,
            ProductVariant variant,
            int quantity,
            Order.Status status,
            Order.PaymentMethod paymentMethod,
            Order.PaymentStatus paymentStatus,
            LocalDateTime createdAt,
            String notes
    ) {
        Product product = variant.getProduct();
        double unitPrice = variant.getPriceOverride() != null
                ? variant.getPriceOverride()
                : (product.getSalePrice() != null ? product.getSalePrice() : product.getBasePrice());
        double subtotal = unitPrice * quantity;
        double shippingFee = subtotal >= 500_000 ? 0 : 30_000;
        double discount = 0;
        double total = subtotal + shippingFee - discount;

        Order order = Order.builder()
                .orderNumber(orderNumber)
                .status(status)
                .paymentMethod(paymentMethod)
                .paymentStatus(paymentStatus)
                .subtotal(subtotal)
                .shippingFee(shippingFee)
                .discount(discount)
                .total(total)
                .notes(notes)
                .user(customer)
                .createdAt(createdAt)
                .updatedAt(createdAt)
                .deliveredAt(status == Order.Status.DELIVERED ? createdAt.plusDays(1) : null)
                .build();

        OrderItem item = OrderItem.builder()
                .order(order)
                .productId(product.getId())
                .variantId(variant.getId())
                .productName(product.getName())
                .productSlug(product.getSlug())
                .size(variant.getSize())
                .color(variant.getColor())
                .unitPrice(unitPrice)
                .quantity(quantity)
                .lineTotal(subtotal)
                .imageUrl(variant.getImageUrl())
                .build();
        order.getItems().add(item);

        ShippingAddress address = ShippingAddress.builder()
                .order(order)
                .fullName(customer.getFullName())
                .phone("0909123456")
                .addressLine1("12 Đường Mộc Mầm")
                .district("Quận 3")
                .city("TP.HCM")
                .province("TP.HCM")
                .note("Địa chỉ demo")
                .build();
        order.setShippingAddress(address);
        return orderRepository.save(order);
    }

    private void seedSupportTickets(
            List<Order> orders,
            UserAccount customer,
            UserAccount seller,
            UserAccount warehouse,
            UserAccount admin
    ) {
        if (supportTicketRepository.count() > 0) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();

        SupportTicket ticket1 = SupportTicket.builder()
                .ticketCode("TK-DEMO-0001")
                .order(orders.isEmpty() ? null : orders.get(0))
                .createdBy(customer)
                .assignee(warehouse)
                .issueType("Chậm giao hàng")
                .description("Khách cần kiểm tra lý do giao chậm và cập nhật ETA.")
                .priority(SupportTicket.Priority.HIGH)
                .status(SupportTicket.Status.PROCESSING)
                .createdAt(now.minusHours(18))
                .updatedAt(now.minusHours(2))
                .build();
        addTicketComment(ticket1, customer, "Mình chưa nhận được hàng, nhờ shop kiểm tra giúp.");
        addTicketComment(ticket1, warehouse, "Đã tiếp nhận và đang làm việc với đơn vị vận chuyển.");

        SupportTicket ticket2 = SupportTicket.builder()
                .ticketCode("TK-DEMO-0002")
                .order(orders.size() > 1 ? orders.get(1) : null)
                .createdBy(seller)
                .assignee(admin)
                .issueType("Thanh toán lỗi")
                .description("Seller cần hỗ trợ đối soát đơn chuyển khoản.")
                .priority(SupportTicket.Priority.MEDIUM)
                .status(SupportTicket.Status.WAITING)
                .createdAt(now.minusHours(10))
                .updatedAt(now.minusHours(1))
                .build();
        addTicketComment(ticket2, seller, "Đơn đã đóng gói nhưng payment chưa khớp trên hệ thống.");
        addTicketComment(ticket2, admin, "Đã chuyển bộ phận tài chính kiểm tra và sẽ phản hồi trong ca.");

        SupportTicket ticket3 = SupportTicket.builder()
                .ticketCode("TK-DEMO-0003")
                .order(null)
                .createdBy(customer)
                .assignee(warehouse)
                .issueType("Yêu cầu hỗ trợ khác")
                .description("Khách cần tư vấn đổi địa chỉ giao hàng.")
                .priority(SupportTicket.Priority.LOW)
                .status(SupportTicket.Status.NEW)
                .createdAt(now.minusHours(4))
                .updatedAt(now.minusHours(4))
                .build();

        supportTicketRepository.save(ticket1);
        supportTicketRepository.save(ticket2);
        supportTicketRepository.save(ticket3);
    }

    private void addTicketComment(SupportTicket ticket, UserAccount actor, String message) {
        SupportTicketComment comment = SupportTicketComment.builder()
                .ticket(ticket)
                .actor(actor)
                .message(message)
                .createdAt(LocalDateTime.now())
                .build();
        ticket.getComments().add(comment);
    }

    private void seedReturnRequests(List<Order> orders, UserAccount customer, UserAccount warehouse) {
        if (returnRequestRepository.count() > 0 || orders.isEmpty()) {
            return;
        }

        Order deliveredOrder = orders.stream()
                .filter(order -> order.getStatus() == Order.Status.DELIVERED)
                .findFirst()
                .orElse(orders.get(0));
        Order processingOrder = orders.stream()
                .filter(order -> order.getStatus() == Order.Status.PACKING || order.getStatus() == Order.Status.SHIPPED)
                .findFirst()
                .orElse(orders.get(0));

        ReturnRequest request1 = ReturnRequest.builder()
                .requestCode("RT-DEMO-0001")
                .order(processingOrder)
                .createdBy(customer)
                .handledBy(warehouse)
                .reason("Sản phẩm bị thiếu phụ kiện đi kèm.")
                .evidenceUrl("https://example.com/evidence/missing-accessory.jpg")
                .status(ReturnRequest.Status.PENDING_VERIFICATION)
                .note("Cần kiểm tra kho trước khi phản hồi khách.")
                .createdAt(LocalDateTime.now().minusHours(9))
                .updatedAt(LocalDateTime.now().minusHours(2))
                .build();

        deliveredOrder.setPaymentStatus(Order.PaymentStatus.REFUNDED);
        deliveredOrder.setUpdatedAt(LocalDateTime.now().minusDays(1));
        orderRepository.save(deliveredOrder);

        ReturnRequest request2 = ReturnRequest.builder()
                .requestCode("RT-DEMO-0002")
                .order(deliveredOrder)
                .createdBy(customer)
                .handledBy(warehouse)
                .reason("Sản phẩm lỗi ngoại quan sau khi nhận hàng.")
                .status(ReturnRequest.Status.REFUNDED)
                .verdict("Đã chấp nhận trả hàng và hoàn tiền.")
                .note("Đã xác nhận hoàn tiền cho khách.")
                .createdAt(LocalDateTime.now().minusDays(2))
                .updatedAt(LocalDateTime.now().minusDays(1))
                .build();

        returnRequestRepository.save(request1);
        returnRequestRepository.save(request2);
    }

    private void seedVouchers() {
        if (voucherRepository.count() > 0) {
            return;
        }

        voucherRepository.save(Voucher.builder()
                .code("WELCOME10")
                .type(Voucher.Type.PERCENT)
                .value(10.0)
                .minOrder(200_000.0)
                .expireAt(LocalDateTime.now().plusMonths(6))
                .active(true)
                .build());

        voucherRepository.save(Voucher.builder()
                .code("FREESHIP30K")
                .type(Voucher.Type.FIXED)
                .value(30_000.0)
                .minOrder(300_000.0)
                .expireAt(LocalDateTime.now().plusMonths(6))
                .active(true)
                .build());
    }

    private UserAccount getOrCreateDemoUser(String fullName, String email, UserAccount.Role role, boolean forceDefaultPassword) {
        return userAccountRepository.findByEmail(email)
                .map(existing -> {
                    boolean shouldSave = false;
                    if (existing.getRole() != role) {
                        existing.setRole(role);
                        shouldSave = true;
                    }
                    if (existing.getFullName() == null || existing.getFullName().isBlank()) {
                        existing.setFullName(fullName);
                        shouldSave = true;
                    }
                    if (forceDefaultPassword || existing.getPasswordHash() == null || existing.getPasswordHash().isBlank()) {
                        existing.setPasswordHash(passwordEncoder.encode("password"));
                        shouldSave = true;
                    }
                    if (existing.getMonthlyIncome() == null) {
                        existing.setMonthlyIncome(15_000_000.0);
                        shouldSave = true;
                    }
                    return shouldSave ? userAccountRepository.save(existing) : existing;
                })
                .orElseGet(() -> userAccountRepository.save(UserAccount.builder()
                        .fullName(fullName)
                        .email(email)
                        .passwordHash(passwordEncoder.encode("password"))
                        .role(role)
                        .monthlyIncome(15_000_000.0)
                        .build()));
    }
}
