package com.wealthwallet.config;

import com.wealthwallet.domain.entity.Category;
import com.wealthwallet.domain.entity.Gender;
import com.wealthwallet.domain.entity.Lookbook;
import com.wealthwallet.domain.entity.Order;
import com.wealthwallet.domain.entity.OrderItem;
import com.wealthwallet.domain.entity.Product;
import com.wealthwallet.domain.entity.ProductReview;
import com.wealthwallet.domain.entity.ProductVariant;
import com.wealthwallet.domain.entity.ReturnRequest;
import com.wealthwallet.domain.entity.SellerRating;
import com.wealthwallet.domain.entity.ShippingAddress;
import com.wealthwallet.domain.entity.StoreMessage;
import com.wealthwallet.domain.entity.SupportTicket;
import com.wealthwallet.domain.entity.SupportTicketComment;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.domain.entity.UserAddress;
import com.wealthwallet.domain.entity.Voucher;
import com.wealthwallet.repository.CategoryRepository;
import com.wealthwallet.repository.LookbookRepository;
import com.wealthwallet.repository.OrderRepository;
import com.wealthwallet.repository.ProductRepository;
import com.wealthwallet.repository.ProductReviewRepository;
import com.wealthwallet.repository.ProductVariantRepository;
import com.wealthwallet.repository.ReturnRequestRepository;
import com.wealthwallet.repository.SellerRatingRepository;
import com.wealthwallet.repository.StoreMessageRepository;
import com.wealthwallet.repository.SupportTicketRepository;
import com.wealthwallet.repository.UserAccountRepository;
import com.wealthwallet.repository.UserAddressRepository;
import com.wealthwallet.repository.VoucherRepository;
import com.wealthwallet.utils.SlugUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

@Component
@ConditionalOnProperty(prefix = "app.seed", name = "demo-data", havingValue = "true")
@RequiredArgsConstructor
public class StoreSeedData implements CommandLineRunner {

    private static final int TARGET_GENERATED_DEMO_PRODUCTS = 0;
    private static final String DEMO_ARTWORK_MARKER = "moc-mam-demo-artwork";
    private static final String GENERATED_DEMO_DESCRIPTION_PREFIX = "Sản phẩm demo #";
    private static final String[] TONE_POOL = {
            "Kem", "Latte", "Mocha", "Cacao", "Caramel", "Be", "Nâu sữa", "Hạnh nhân",
            "Trà sữa", "Vanilla", "Xanh sage", "Oat", "Hồng dusty", "Olive", "Xám khói", "Gạch"
    };
    private static final String[] COLOR_POOL = {
            "Kem", "Nâu", "Trắng", "Đen", "Xám", "Xanh navy", "Hồng phấn", "Be",
            "Caramel", "Mocha", "Xanh sage", "Olive", "Oat", "Xám khói", "Hồng dusty", "Gạch"
    };
    private static final String[] WOMEN_TYPES = {
            "Váy midi", "Váy xoè", "Áo blouse", "Áo len", "Cardigan", "Chân váy", "Đầm công sở",
            "Áo sơ mi nữ", "Đầm linen", "Áo gile len", "Quần suông nữ", "Áo baby tee", "Set blazer nữ"
    };
    private static final String[] MEN_TYPES = {
            "Áo thun nam", "Áo polo", "Sơ mi nam", "Quần kaki", "Áo khoác bomber", "Quần jogger",
            "Áo len nam", "Áo sơ mi linen", "Quần jean straight", "Áo hoodie", "Blazer nam", "Quần short kaki"
    };
    private static final String[] ACCESSORY_TYPES = {
            "Túi đeo chéo", "Mũ lưỡi trai", "Khăn cổ", "Thắt lưng", "Ví mini", "Nón len",
            "Ba lô mini", "Túi tote", "Kẹp tóc", "Khuyên tai", "Vòng cổ", "Tất cao cổ"
    };
    private static final String[] SALE_TYPES = {
            "Set outfit", "Combo đi làm", "Combo đi chơi", "Set đôi", "Set mùa hè",
            "Set mùa thu", "Combo công sở", "Set picnic", "Combo năng động", "Set tối giản"
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
            "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80"
    };
    private static final List<String> TOP_PHOTO_POOL = List.of(
            IMAGE_POOL[0],
            IMAGE_POOL[2],
            IMAGE_POOL[3],
            IMAGE_POOL[11]
    );
    private static final List<String> SHIRT_PHOTO_POOL = List.of(
            IMAGE_POOL[7],
            IMAGE_POOL[11],
            IMAGE_POOL[0]
    );
    private static final List<String> OUTERWEAR_PHOTO_POOL = List.of(
            IMAGE_POOL[1],
            IMAGE_POOL[11]
    );
    private static final List<String> DRESS_PHOTO_POOL = List.of(
            IMAGE_POOL[9],
            IMAGE_POOL[10]
    );
    private static final List<String> COLD_WEATHER_ACCESSORY_PHOTO_POOL = List.of(
            IMAGE_POOL[12]
    );
    private static final List<String> SET_PHOTO_POOL = List.of(
            IMAGE_POOL[10],
            IMAGE_POOL[13],
            IMAGE_POOL[1]
    );

    private enum DemoArtworkKind {
        DRESS,
        SKIRT,
        TOP,
        OUTERWEAR,
        PANTS,
        BAG,
        SCARF,
        HAT,
        JEWELRY,
        BELT,
        SOCKS,
        SET
    }

    private record DemoArtworkPalette(
            String backgroundStart,
            String backgroundEnd,
            String surface,
            String primary,
            String secondary,
            String accent,
            String text,
            String muted
    ) {
    }

    private record DemoOrderLineSeed(
            Product product,
            ProductVariant variant,
            int quantity
    ) {
    }

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final UserAccountRepository userAccountRepository;
    private final LookbookRepository lookbookRepository;
    private final OrderRepository orderRepository;
    private final SupportTicketRepository supportTicketRepository;
    private final ReturnRequestRepository returnRequestRepository;
    private final SellerRatingRepository sellerRatingRepository;
    private final StoreMessageRepository storeMessageRepository;
    private final ProductReviewRepository productReviewRepository;
    private final VoucherRepository voucherRepository;
    private final UserAddressRepository userAddressRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        UserAccount admin = getOrCreateDemoUser("Mộc Mầm Admin", "admin@shopvui.local", UserAccount.Role.ADMIN);
        UserAccount seller = getOrCreateDemoUser("Mộc Mầm Seller", "seller@shopvui.local", UserAccount.Role.SELLER);
        UserAccount sellerSage = getOrCreateDemoUser("Sage Avenue Seller", "seller.sage@shopvui.local", UserAccount.Role.SELLER);
        UserAccount sellerCanvas = getOrCreateDemoUser("Canvas Corner Seller", "seller.canvas@shopvui.local", UserAccount.Role.SELLER);
        UserAccount warehouse = getOrCreateDemoUser("Mộc Mầm Staff", "warehouse@shopvui.local", UserAccount.Role.WAREHOUSE);
        UserAccount customer = getOrCreateDemoUser("Mộc Mầm User", "user@shopvui.local", UserAccount.Role.USER);
        UserAccount vipCustomer = getOrCreateDemoUser("Khách VIP Mộc Mầm", "vip@shopvui.local", UserAccount.Role.USER);
        UserAccount dayOneCustomer = getOrCreateDemoUser("Khách Hàng Ngày Mới", "buyer@shopvui.local", UserAccount.Role.USER);
        UserAccount applicantOne = getOrCreateDemoUser("Linen Lab Applicant", "apply.seller1@shopvui.local", UserAccount.Role.USER);
        UserAccount applicantTwo = getOrCreateDemoUser("Olive House Applicant", "apply.seller2@shopvui.local", UserAccount.Role.USER);

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
            ensureMinimumDemoProducts(seller, women, men, accessories, sale);
            seedShowcaseProducts(seller, women, men, accessories, sale);
        }
        ensureDemoStoreProfile(
                seller,
                "Mộc Mầm Boutique",
                "Gian hàng chủ lực với các dòng váy, áo, set đồ và phụ kiện tone trung tính dịu nhẹ.",
                "0909 123 456",
                "12 Nguyễn Huệ, Quận 1, TP.HCM"
        );
        ensureDemoStoreProfile(
                sellerSage,
                "Sage Avenue",
                "Chuyên đồ đi làm và outfit commute tối giản cho nam lẫn unisex.",
                "0911 223 344",
                "88 Lê Lợi, Quận 1, TP.HCM"
        );
        ensureDemoStoreProfile(
                sellerCanvas,
                "Canvas Corner",
                "Tập trung các thiết kế mềm, sáng màu cho khách thích vibe nữ tính và weekend.",
                "0933 445 566",
                "25 Hai Bà Trưng, Quận 3, TP.HCM"
        );
        ensureDemoBusinessApplicant(
                applicantOne,
                "Linen Lab",
                "0901 888 112",
                "41 Trần Hưng Đạo, Quận 5, TP.HCM",
                "Muốn mở gian hàng thời trang linen công sở và casual tối giản.",
                2
        );
        ensureDemoBusinessApplicant(
                applicantTwo,
                "Olive House",
                "0907 222 338",
                "79 Võ Văn Tần, Quận 3, TP.HCM",
                "Xin duyệt seller để bán set đồ picnic, phụ kiện canvas và outfit cuối tuần.",
                5
        );
        Map<String, List<String>> localProductImageOverrides = loadWorkspaceProductImageOverrides();
        seedPartnerSellerCatalog(sellerSage, women, men, accessories, sale, "sage");
        seedPartnerSellerCatalog(sellerCanvas, women, men, accessories, sale, "canvas");
        trimGeneratedDemoCatalog(seller);
        syncDemoProductArtwork(seller, localProductImageOverrides);
        syncDemoProductArtwork(sellerSage, localProductImageOverrides);
        syncDemoProductArtwork(sellerCanvas, localProductImageOverrides);

        createLookbookIfMissing(
                "Tủ đồ nâu kem cho mọi ngày",
                "Gợi ý phối đồ tone nâu kem nhẹ nhàng cho đi làm và dạo phố.",
                "Nhẹ nhàng",
                "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80",
                List.of("Latte", "Kem sữa", "Cardigan"),
                warehouse
        );
        createLookbookIfMissing(
                "Layer ấm áp ngày se lạnh",
                "Phối cardigan và áo khoác mocha để giữ ấm tinh tế.",
                "Ấm áp",
                "https://images.unsplash.com/photo-1523381294911-8d3cead13475?auto=format&fit=crop&w=1200&q=80",
                List.of("Mocha", "Cardigan", "Phụ kiện"),
                warehouse
        );
        createLookbookIfMissing(
                "Set đôi nâu kem",
                "Gợi ý mix đôi cho những buổi hẹn nhẹ nhàng.",
                "Ngọt ngào",
                "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
                List.of("Set đôi", "Nâu kem", "Sale"),
                warehouse
        );
        createLookbookIfMissing(
                "Vanilla linen cho ngay nang nhe",
                "Đầm linen vanilla đi cùng tote canvas be tạo cảm giác sáng, thoáng và rất hợp cafe sáng cuối tuần.",
                "Cafe sang",
                "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80",
                List.of("Đầm linen vanilla", "Tote canvas be", "Vanilla", "Be"),
                warehouse
        );
        createLookbookIfMissing(
                "Sage weekend cho chang",
                "Polo sage weekend phối jean straight khói giúp outfit nam gọn gàng, trẻ trung nhưng vẫn lịch sự.",
                "Weekend",
                "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80",
                List.of("Polo sage weekend", "Jean straight khói", "Sơ mi linen oat"),
                warehouse
        );
        createLookbookIfMissing(
                "Picnic latte ngoai troi",
                "Set picnic sage latte mix cùng baby tee hồng dusty và vòng cổ bạc tối giản cho những buổi dạo chơi lên hình rất xinh.",
                "Di choi",
                "https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=1200&q=80",
                List.of("Set picnic sage latte", "Baby tee hồng dusty", "Vòng cổ bạc tối giản"),
                warehouse
        );

        List<UserAccount> demoCustomers = List.of(customer, vipCustomer, dayOneCustomer);
        List<UserAccount> demoSellers = List.of(seller, sellerSage, sellerCanvas);

        seedUserAddresses(demoCustomers);
        List<Order> seededOrders = seedOrderAndSupportData(
                demoCustomers,
                demoSellers,
                warehouse,
                admin
        );
        seedSellerRatings(demoCustomers, demoSellers);
        seedStoreMessages(demoCustomers, demoSellers, warehouse, admin);
        seedProductReviews(seededOrders, demoCustomers);
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
        return createProduct(name, category, gender, description, basePrice, salePrice, featured, seller, imageUrls,
                "Mộc Mầm", "Cotton/Len", "Relaxed");
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
            List<String> imageUrls,
            String brand,
            String material,
            String fit
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
                .brand(brand)
                .material(material)
                .fit(fit)
                .active(true)
                .seller(seller)
                .imageUrls(new ArrayList<>(imageUrls))
                .build();
        return productRepository.save(product);
    }

    private void seedShowcaseProducts(
            UserAccount seller,
            Category women,
            Category men,
            Category accessories,
            Category sale
    ) {
        // ── NỮ (12 sản phẩm) ──────────────────────────────────────────────
        Product sweater = createProduct(
                "Áo len mây kem",
                women,
                Gender.WOMEN,
                "Len mềm pha cotton, co giãn nhẹ, giữ ấm vừa phải — mặc thoáng cả ngày dài.",
                320_000.0,
                null,
                true,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Atelier",
                "Len mềm pha cotton",
                "Relaxed"
        );
        addVariant(sweater, "S", "Kem", 18, null, sweater.getImageUrls().get(0));
        addVariant(sweater, "M", "Kem", 20, null, sweater.getImageUrls().get(0));
        addVariant(sweater, "L", "Kem", 12, null, sweater.getImageUrls().get(0));

        Product cardigan = createProduct(
                "Cardigan mocha dài tà",
                women,
                Gender.WOMEN,
                "Dáng dài qua hông, phối layering cực dễ — mặc trong nhà hay ra phố đều ổn.",
                290_000.0,
                260_000.0,
                true,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1551232864-3f0890e580d9?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1523381294911-8d3cead13475?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Atelier",
                "Len gân mềm",
                "Relaxed"
        );
        addVariant(cardigan, "S", "Mocha", 12, null, cardigan.getImageUrls().get(0));
        addVariant(cardigan, "M", "Mocha", 14, null, cardigan.getImageUrls().get(0));
        addVariant(cardigan, "L", "Caramel", 10, null, cardigan.getImageUrls().get(0));

        Product floralDress = createProduct(
                "Váy xoè hoa nhí linen kem",
                women,
                Gender.WOMEN,
                "Dáng xoè duyên dáng, chất linen nhẹ mát — hợp đi cafe, dạo phố và du lịch.",
                360_000.0,
                330_000.0,
                true,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Atelier",
                "Linen blend",
                "A-line"
        );
        addVariant(floralDress, "S", "Kem sữa", 10, null, floralDress.getImageUrls().get(0));
        addVariant(floralDress, "M", "Kem sữa", 14, null, floralDress.getImageUrls().get(0));
        addVariant(floralDress, "L", "Kem sữa", 8, null, floralDress.getImageUrls().get(0));

        Product linenDress = createProduct(
                "Đầm linen vanilla suông",
                women,
                Gender.WOMEN,
                "Dáng suông nhẹ buông, chất linen mát và lên hình rất sáng da — mix giày bệt hay sandal đều xinh.",
                420_000.0,
                379_000.0,
                true,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Atelier",
                "Linen pha cotton",
                "Relaxed"
        );
        addVariant(linenDress, "S", "Vanilla", 11, null, linenDress.getImageUrls().get(0));
        addVariant(linenDress, "M", "Vanilla", 13, null, linenDress.getImageUrls().get(0));
        addVariant(linenDress, "L", "Be", 9, null, linenDress.getImageUrls().get(0));

        Product cacaoSkirt = createProduct(
                "Chân váy chữ A cacao",
                women,
                Gender.WOMEN,
                "Dáng chữ A xoè nhẹ, tôn eo, phối áo tucked-in hay blouse đều hợp mắt.",
                260_000.0,
                null,
                false,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Basics",
                "Twill nhẹ",
                "A-line"
        );
        addVariant(cacaoSkirt, "S", "Cacao", 14, null, cacaoSkirt.getImageUrls().get(0));
        addVariant(cacaoSkirt, "M", "Cacao", 16, null, cacaoSkirt.getImageUrls().get(0));
        addVariant(cacaoSkirt, "L", "Nâu sữa", 10, null, cacaoSkirt.getImageUrls().get(0));

        Product knitVest = createProduct(
                "Gile len hạnh nhân",
                women,
                Gender.WOMEN,
                "Layer cùng sơ mi, váy hai dây hoặc áo thun ôm — nhìn bao nhiêu cũng đẹp.",
                260_000.0,
                null,
                true,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Atelier",
                "Len dệt mềm",
                "Cropped"
        );
        addVariant(knitVest, "S", "Hạnh nhân", 16, null, knitVest.getImageUrls().get(0));
        addVariant(knitVest, "M", "Hạnh nhân", 15, null, knitVest.getImageUrls().get(0));

        Product oliveTrousers = createProduct(
                "Quần suông ống rộng olive",
                women,
                Gender.WOMEN,
                "Cạp cao, ống đứng rộng — hợp công sở lẫn outfit dạo phố cuối tuần.",
                340_000.0,
                299_000.0,
                true,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1548624313-0396a0a3e3a8?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Studio",
                "Twill mềm",
                "Wide-leg"
        );
        addVariant(oliveTrousers, "S", "Olive", 12, null, oliveTrousers.getImageUrls().get(0));
        addVariant(oliveTrousers, "M", "Olive", 14, null, oliveTrousers.getImageUrls().get(0));
        addVariant(oliveTrousers, "L", "Be", 8, null, oliveTrousers.getImageUrls().get(0));

        Product babyTee = createProduct(
                "Baby tee hồng dusty",
                women,
                Gender.WOMEN,
                "Áo ôm nhẹ form baby, phối với chân váy hoặc jean đều xinh và trẻ trung.",
                210_000.0,
                null,
                true,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Basics",
                "Cotton rib",
                "Slim"
        );
        addVariant(babyTee, "S", "Hồng dusty", 18, null, babyTee.getImageUrls().get(0));
        addVariant(babyTee, "M", "Kem", 20, null, babyTee.getImageUrls().get(0));

        Product blouse = createProduct(
                "Áo blouse bèo ngực kem trắng",
                women,
                Gender.WOMEN,
                "Cổ tròn điểm bèo nhỏ, chất voan nhẹ — vừa thơ vừa sang, dễ mặc đi làm.",
                280_000.0,
                null,
                true,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Atelier",
                "Voan mềm",
                "Regular"
        );
        addVariant(blouse, "S", "Kem trắng", 15, null, blouse.getImageUrls().get(0));
        addVariant(blouse, "M", "Kem trắng", 18, null, blouse.getImageUrls().get(0));
        addVariant(blouse, "L", "Hồng phấn", 10, null, blouse.getImageUrls().get(0));

        Product womenShirt = createProduct(
                "Áo sơ mi nữ kẻ be",
                women,
                Gender.WOMEN,
                "Kẻ sọc mảnh nhẹ nhàng, form suông — tucked hay untucked đều gọn gàng.",
                260_000.0,
                229_000.0,
                false,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Basics",
                "Cotton poplin",
                "Relaxed"
        );
        addVariant(womenShirt, "S", "Be", 14, null, womenShirt.getImageUrls().get(0));
        addVariant(womenShirt, "M", "Be", 16, null, womenShirt.getImageUrls().get(0));
        addVariant(womenShirt, "L", "Trắng", 10, null, womenShirt.getImageUrls().get(0));

        Product sageOfficeSet = createProduct(
                "Set blazer nữ be công sở",
                women,
                Gender.WOMEN,
                "Set blazer + quần suông cùng tông be — vừa nghiêm túc vừa không kém phần thời thượng.",
                650_000.0,
                579_000.0,
                true,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Studio",
                "Gabardine nhẹ",
                "Tailored"
        );
        addVariant(sageOfficeSet, "S", "Be", 8, null, sageOfficeSet.getImageUrls().get(0));
        addVariant(sageOfficeSet, "M", "Be", 10, null, sageOfficeSet.getImageUrls().get(0));
        addVariant(sageOfficeSet, "L", "Kem", 7, null, sageOfficeSet.getImageUrls().get(0));

        Product midiDress = createProduct(
                "Đầm midi xanh sage tối giản",
                women,
                Gender.WOMEN,
                "Dáng midi thẳng buông, gam sage dịu — cực hợp mix sneaker hay block heel.",
                390_000.0,
                349_000.0,
                true,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Atelier",
                "Viscose mềm",
                "Straight"
        );
        addVariant(midiDress, "S", "Xanh sage", 12, null, midiDress.getImageUrls().get(0));
        addVariant(midiDress, "M", "Xanh sage", 14, null, midiDress.getImageUrls().get(0));
        addVariant(midiDress, "L", "Olive", 9, null, midiDress.getImageUrls().get(0));

        // ── NAM (10 sản phẩm) ─────────────────────────────────────────────
        Product tshirt = createProduct(
                "Áo thun hạt dẻ cotton",
                men,
                Gender.MEN,
                "Cotton 2 chiều dày dặn, thấm hút tốt — mặc cả ngày không nhão, không phai màu.",
                190_000.0,
                null,
                true,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Homme",
                "Cotton 2 chiều",
                "Regular"
        );
        addVariant(tshirt, "M", "Hạt dẻ", 24, null, tshirt.getImageUrls().get(0));
        addVariant(tshirt, "L", "Hạt dẻ", 20, null, tshirt.getImageUrls().get(0));
        addVariant(tshirt, "XL", "Hạt dẻ", 16, null, tshirt.getImageUrls().get(0));

        Product shirt = createProduct(
                "Sơ mi latte Oxford",
                men,
                Gender.MEN,
                "Vải Oxford mềm ít nhăn, form suông vừa — mặc đi làm hay tucked nhẹ đều ổn.",
                320_000.0,
                null,
                false,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1602810316693-3667c854239a?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Homme",
                "Oxford mềm",
                "Relaxed"
        );
        addVariant(shirt, "M", "Latte", 16, null, shirt.getImageUrls().get(0));
        addVariant(shirt, "L", "Latte", 18, null, shirt.getImageUrls().get(0));
        addVariant(shirt, "XL", "Kem", 10, null, shirt.getImageUrls().get(0));

        Product kakiPants = createProduct(
                "Quần kaki cacao ống đứng",
                men,
                Gender.MEN,
                "Ống thẳng đứng, cạp vừa — hợp loafer, sneaker, đi làm hay cuối tuần.",
                360_000.0,
                null,
                false,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Homme",
                "Cotton twill",
                "Straight"
        );
        addVariant(kakiPants, "M", "Cacao", 12, null, kakiPants.getImageUrls().get(0));
        addVariant(kakiPants, "L", "Cacao", 10, null, kakiPants.getImageUrls().get(0));
        addVariant(kakiPants, "XL", "Be", 8, null, kakiPants.getImageUrls().get(0));

        Product jacket = createProduct(
                "Áo khoác bomber mocha",
                men,
                Gender.MEN,
                "Bomber cổ tròn, lót cotton nhẹ — form gọn, ấm vừa, mặc từ sáng đến tối.",
                490_000.0,
                420_000.0,
                true,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Homme",
                "Cotton canvas",
                "Regular"
        );
        addVariant(jacket, "M", "Mocha", 10, null, jacket.getImageUrls().get(0));
        addVariant(jacket, "L", "Mocha", 8, null, jacket.getImageUrls().get(0));
        addVariant(jacket, "XL", "Đen", 6, null, jacket.getImageUrls().get(0));

        Product poloSage = createProduct(
                "Polo sage weekend",
                men,
                Gender.MEN,
                "Dệt pique dày, gam xanh sage tươi — nhìn rất sạch outfit dù mặc mình hay layer.",
                280_000.0,
                null,
                true,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Homme",
                "Cotton pique",
                "Regular"
        );
        addVariant(poloSage, "M", "Xanh sage", 16, null, poloSage.getImageUrls().get(0));
        addVariant(poloSage, "L", "Xanh sage", 18, null, poloSage.getImageUrls().get(0));
        addVariant(poloSage, "XL", "Trắng", 10, null, poloSage.getImageUrls().get(0));

        Product straightJeans = createProduct(
                "Jean straight xám khói",
                men,
                Gender.MEN,
                "Form đứng vừa, denim mềm — lên dáng gọn và hợp cả sneaker lẫn loafer.",
                390_000.0,
                349_000.0,
                true,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Homme",
                "Denim cotton",
                "Straight"
        );
        addVariant(straightJeans, "M", "Xám khói", 11, null, straightJeans.getImageUrls().get(0));
        addVariant(straightJeans, "L", "Xám khói", 13, null, straightJeans.getImageUrls().get(0));
        addVariant(straightJeans, "XL", "Đen", 9, null, straightJeans.getImageUrls().get(0));

        Product linenShirt = createProduct(
                "Sơ mi linen oat thoáng mát",
                men,
                Gender.MEN,
                "Linen blend thoáng gió, ít nhăn — hợp đi làm, đi cafe hoặc đi biển.",
                360_000.0,
                320_000.0,
                true,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1602810316693-3667c854239a?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1617196034183-421b4040ed20?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Homme",
                "Linen blend",
                "Relaxed"
        );
        addVariant(linenShirt, "M", "Oat", 14, null, linenShirt.getImageUrls().get(0));
        addVariant(linenShirt, "L", "Oat", 16, null, linenShirt.getImageUrls().get(0));
        addVariant(linenShirt, "XL", "Kem", 8, null, linenShirt.getImageUrls().get(0));

        Product hoodie = createProduct(
                "Áo hoodie xám khói oversize",
                men,
                Gender.MEN,
                "Form oversize thoải mái, nỉ bông bên trong giữ ấm — mặc ở nhà hay ra đường đều chill.",
                350_000.0,
                null,
                false,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1556821840-3a63f15732ce?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1509942774463-acf339cf87d5?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Homme",
                "Nỉ bông 3 lớp",
                "Oversized"
        );
        addVariant(hoodie, "M", "Xám khói", 14, null, hoodie.getImageUrls().get(0));
        addVariant(hoodie, "L", "Xám khói", 12, null, hoodie.getImageUrls().get(0));
        addVariant(hoodie, "XL", "Đen", 10, null, hoodie.getImageUrls().get(0));

        Product blazer = createProduct(
                "Blazer nam kem tối giản",
                men,
                Gender.MEN,
                "Blazer single-breasted gọn, form slim vừa — mặc đi làm hay sự kiện đều chỉn chu.",
                590_000.0,
                499_000.0,
                true,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1594938298603-c8148c4b4087?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1617196034183-421b4040ed20?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Homme",
                "Gabardine nhẹ",
                "Slim"
        );
        addVariant(blazer, "M", "Kem", 8, null, blazer.getImageUrls().get(0));
        addVariant(blazer, "L", "Kem", 10, null, blazer.getImageUrls().get(0));
        addVariant(blazer, "XL", "Mocha", 6, null, blazer.getImageUrls().get(0));

        Product jogger = createProduct(
                "Quần jogger be thể thao",
                men,
                Gender.MEN,
                "Lưng thun, ống côn nhẹ — đi tập, đi phố hay ở nhà đều ổn.",
                270_000.0,
                null,
                false,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Homme",
                "Cotton fleece",
                "Tapered"
        );
        addVariant(jogger, "M", "Be", 18, null, jogger.getImageUrls().get(0));
        addVariant(jogger, "L", "Be", 16, null, jogger.getImageUrls().get(0));
        addVariant(jogger, "XL", "Xám", 12, null, jogger.getImageUrls().get(0));

        // ── PHỤ KIỆN (5 sản phẩm) ────────────────────────────────────────
        Product miniBag = createProduct(
                "Túi đeo chéo da mini kem",
                accessories,
                Gender.UNISEX,
                "Da vegan mềm, khoá bấm chắc — vừa điện thoại, ví, son; mix mọi outfit đều gọn.",
                290_000.0,
                220_000.0,
                true,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Goods",
                "Da vegan",
                "Structured"
        );
        addVariant(miniBag, "Free", "Kem", 30, null, miniBag.getImageUrls().get(0));
        addVariant(miniBag, "Free", "Mocha", 20, null, miniBag.getImageUrls().get(0));

        Product tote = createProduct(
                "Tote canvas be đứng form",
                accessories,
                Gender.UNISEX,
                "Canvas dày, quai chắc — đựng vừa laptop 13 inch, sách và đồ hằng ngày.",
                240_000.0,
                null,
                true,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Goods",
                "Canvas dày",
                "Structured"
        );
        addVariant(tote, "Free", "Be", 24, null, tote.getImageUrls().get(0));
        addVariant(tote, "Free", "Đen", 18, null, tote.getImageUrls().get(0));

        Product scarf = createProduct(
                "Khăn cổ dệt caramel",
                accessories,
                Gender.UNISEX,
                "Len dệt mềm, điểm nhấn ấm áp — quấn cổ hay buộc túi đều ra style.",
                120_000.0,
                null,
                false,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Goods",
                "Len dệt",
                "Soft"
        );
        addVariant(scarf, "Free", "Caramel", 40, null, scarf.getImageUrls().get(0));
        addVariant(scarf, "Free", "Kem", 30, null, scarf.getImageUrls().get(0));

        Product beanie = createProduct(
                "Mũ len latte",
                accessories,
                Gender.UNISEX,
                "Len dày, co giãn vừa đầu — giữ ấm nhẹ nhàng, hợp mix với mọi outfit mùa lạnh.",
                150_000.0,
                null,
                false,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1510598155919-b7f6ee5a81af?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Goods",
                "Len knit",
                "Soft"
        );
        addVariant(beanie, "Free", "Latte", 28, null, beanie.getImageUrls().get(0));
        addVariant(beanie, "Free", "Xám khói", 20, null, beanie.getImageUrls().get(0));

        Product necklace = createProduct(
                "Vòng cổ bạc tối giản",
                accessories,
                Gender.UNISEX,
                "Thép không gỉ mạ bạc, thiết kế nhỏ gọn — đeo đơn hay phối layer đều đẹp.",
                180_000.0,
                149_000.0,
                true,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Goods",
                "Thép không gỉ",
                "Minimal"
        );
        addVariant(necklace, "Free", "Bạc", 32, null, necklace.getImageUrls().get(0));
        addVariant(necklace, "Free", "Vàng", 22, null, necklace.getImageUrls().get(0));

        // ── ƯU ĐÃI (3 sản phẩm) ──────────────────────────────────────────
        Product coupleSet = createProduct(
                "Set đôi nâu kem ngày hẹn",
                sale,
                Gender.UNISEX,
                "Áo thun + cardigan tone nâu kem — lên hình cực ngọt, mix đôi hay mặc mình đều ổn.",
                410_000.0,
                330_000.0,
                true,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Capsule",
                "Cotton phối knit",
                "Relaxed"
        );
        addVariant(coupleSet, "M", "Nâu kem", 12, null, coupleSet.getImageUrls().get(0));
        addVariant(coupleSet, "L", "Nâu kem", 10, null, coupleSet.getImageUrls().get(0));

        Product officeSet = createProduct(
                "Combo công sở kem mocha",
                sale,
                Gender.UNISEX,
                "Sơ mi + quần suông tone trung tính — mặc cả tuần không lặp, chỉnh tề mà vẫn dễ chịu.",
                520_000.0,
                449_000.0,
                true,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1594938298603-c8148c4b4087?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Capsule",
                "Cotton twill phối poplin",
                "Regular"
        );
        addVariant(officeSet, "M", "Kem mocha", 10, null, officeSet.getImageUrls().get(0));
        addVariant(officeSet, "L", "Kem mocha", 8, null, officeSet.getImageUrls().get(0));

        Product picnicSet = createProduct(
                "Set picnic sage latte cuối tuần",
                sale,
                Gender.UNISEX,
                "Váy midi + áo polo sage latte — lên hình sáng, hợp vibe dịu nhẹ đi công viên hay đi chơi.",
                480_000.0,
                399_000.0,
                true,
                seller,
                List.of(
                        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
                        "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=80"
                ),
                "Mộc Mầm Capsule",
                "Linen blend phối pique",
                "Relaxed"
        );
        addVariant(picnicSet, "M", "Sage latte", 12, null, picnicSet.getImageUrls().get(0));
        addVariant(picnicSet, "L", "Sage latte", 10, null, picnicSet.getImageUrls().get(0));
    }

    private void syncDemoProductArtwork(UserAccount seller, Map<String, List<String>> localProductImageOverrides) {
        List<Product> demoProducts = productRepository.findBySellerIdOrderByCreatedAtDesc(seller.getId());
        if (demoProducts.isEmpty()) {
            return;
        }

        Map<Long, Product> productById = new HashMap<>();
        Map<Long, ProductVariant> variantById = new HashMap<>();

        for (Product product : demoProducts) {
            if (product.getId() != null) {
                productById.put(product.getId(), product);
            }

            List<String> desiredProductImages = resolveDesiredProductImageUrls(product, localProductImageOverrides);
            if (!sameImageUrlCollection(product.getImageUrls(), desiredProductImages)) {
                product.setImageUrls(new ArrayList<>(desiredProductImages));
            }
            String primaryProductImage = desiredProductImages.isEmpty() ? null : desiredProductImages.get(0);
            boolean useArtworkForProduct = primaryProductImage != null && containsDemoArtworkMarker(primaryProductImage);

            List<ProductVariant> productVariants = product.getId() == null
                    ? product.getVariants()
                    : productVariantRepository.findByProductId(product.getId());
            for (ProductVariant variant : productVariants) {
                if (variant.getId() != null) {
                    variantById.put(variant.getId(), variant);
                }
                String desiredVariantImage = resolveDesiredVariantImageUrl(product, variant, primaryProductImage, useArtworkForProduct);
                if (!equalsTrimmed(variant.getImageUrl(), desiredVariantImage)) {
                    variant.setImageUrl(desiredVariantImage);
                }
            }
        }

        for (Order order : orderRepository.findAll()) {
            for (OrderItem item : order.getItems()) {
                if (!shouldRefreshDemoImageUrl(item.getImageUrl()) || item.getProductId() == null) {
                    continue;
                }
                Product product = productById.get(item.getProductId());
                if (product == null) {
                    continue;
                }
                ProductVariant variant = item.getVariantId() != null ? variantById.get(item.getVariantId()) : null;
                String desiredItemImage = resolveDesiredOrderItemImageUrl(product, item, variant, localProductImageOverrides);
                if (!equalsTrimmed(item.getImageUrl(), desiredItemImage)) {
                    item.setImageUrl(desiredItemImage);
                }
            }
        }
    }

    private List<String> resolveDesiredProductImageUrls(Product product, Map<String, List<String>> localProductImageOverrides) {
        if (product != null && product.getSlug() != null) {
            List<String> localImages = localProductImageOverrides.get(product.getSlug());
            if (localImages != null && !localImages.isEmpty()) {
                return localImages;
            }
        }

        List<String> currentImages = normalizeImageUrls(product.getImageUrls());
        if (currentImages.stream().anyMatch(url -> !shouldRefreshDemoImageUrl(url))) {
            return currentImages;
        }

        String curatedPhoto = resolveCuratedPhotographyUrl(product);
        if (curatedPhoto != null) {
            return List.of(curatedPhoto);
        }
        return List.of(buildProductArtworkUrl(product));
    }

    private String resolveDesiredVariantImageUrl(
            Product product,
            ProductVariant variant,
            String primaryProductImage,
            boolean useArtworkForProduct
    ) {
        if (isLocalProductImageUrl(primaryProductImage)) {
            return primaryProductImage;
        }

        String currentVariantImage = trimText(variant.getImageUrl());
        if (currentVariantImage != null && !shouldRefreshDemoImageUrl(currentVariantImage)) {
            return currentVariantImage;
        }
        if (!useArtworkForProduct && primaryProductImage != null) {
            return primaryProductImage;
        }
        return buildVariantArtworkUrl(product, variant);
    }

    private String resolveDesiredOrderItemImageUrl(
            Product product,
            OrderItem item,
            ProductVariant variant,
            Map<String, List<String>> localProductImageOverrides
    ) {
        String currentItemImage = trimText(item.getImageUrl());
        if (currentItemImage != null && !shouldRefreshDemoImageUrl(currentItemImage)) {
            return currentItemImage;
        }

        List<String> desiredProductImages = resolveDesiredProductImageUrls(product, localProductImageOverrides);
        String primaryProductImage = desiredProductImages.isEmpty() ? null : desiredProductImages.get(0);
        if (primaryProductImage != null && !containsDemoArtworkMarker(primaryProductImage)) {
            return primaryProductImage;
        }
        return buildOrderItemArtworkUrl(product, item, variant);
    }

    private Map<String, List<String>> loadWorkspaceProductImageOverrides() {
        Path imageDirectory = resolveWorkspaceProductImageDirectory();
        if (imageDirectory == null) {
            return Map.of();
        }

        Map<String, List<ProductImageFile>> filesBySlug = new LinkedHashMap<>();
        try (Stream<Path> paths = Files.list(imageDirectory)) {
            paths.filter(Files::isRegularFile)
                    .map(Path::getFileName)
                    .map(Path::toString)
                    .map(this::parseWorkspaceProductImageFile)
                    .filter(parsed -> parsed != null)
                    .forEach(parsed -> filesBySlug.computeIfAbsent(parsed.slug(), ignored -> new ArrayList<>()).add(parsed));
        } catch (Exception ignored) {
            return Map.of();
        }

        Map<String, List<String>> urlsBySlug = new LinkedHashMap<>();
        for (Map.Entry<String, List<ProductImageFile>> entry : filesBySlug.entrySet()) {
            List<ProductImageFile> files = new ArrayList<>(entry.getValue());
            files.sort(Comparator
                    .comparingInt(ProductImageFile::order)
                    .thenComparing(ProductImageFile::fileName, String.CASE_INSENSITIVE_ORDER));
            urlsBySlug.put(
                    entry.getKey(),
                    files.stream().map(file -> "/product-images/" + file.fileName()).toList()
            );
        }
        return urlsBySlug;
    }

    private Path resolveWorkspaceProductImageDirectory() {
        List<Path> candidates = List.of(
                Paths.get("../frontend-react/public/product-images"),
                Paths.get("frontend-react/public/product-images"),
                Paths.get("public/product-images")
        );
        for (Path candidate : candidates) {
            Path normalized = candidate.toAbsolutePath().normalize();
            if (Files.isDirectory(normalized)) {
                return normalized;
            }
        }
        return null;
    }

    private ProductImageFile parseWorkspaceProductImageFile(String fileName) {
        String trimmed = trimText(fileName);
        if (trimmed == null) {
            return null;
        }

        String lower = trimmed.toLowerCase(Locale.ROOT);
        if (!(lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp") || lower.endsWith(".avif"))) {
            return null;
        }

        int extensionIndex = trimmed.lastIndexOf('.');
        if (extensionIndex <= 0) {
            return null;
        }

        String baseName = trimmed.substring(0, extensionIndex);
        if (baseName.contains("__")) {
            return null;
        }
        int order = 0;
        String slug = baseName;

        String normalizedSlug = SlugUtils.toSlug(slug);
        if (normalizedSlug.isBlank()) {
            return null;
        }
        return new ProductImageFile(normalizedSlug, trimmed, order);
    }

    private String resolveCuratedPhotographyUrl(Product product) {
        if (product == null) {
            return null;
        }

        String seed = product.getSlug() != null && !product.getSlug().isBlank()
                ? product.getSlug()
                : product.getName();
        DemoArtworkKind kind = resolveArtworkKind(product.getName(), product.getGender());
        return pickPhotoFromPool(resolveLocalPhotographyPool(kind), seed);
    }

    private List<String> resolveLocalPhotographyPool(DemoArtworkKind kind) {
        return switch (kind) {
            case DRESS -> List.of(
                    "/product-images/dam-linen-vanilla-suong.jpg",
                    "/product-images/dam-butter-bloom.jpg",
                    "/product-images/vay-xoe-hoa-nhi-linen-kem.jpg",
                    "/product-images/dam-midi-xanh-sage-toi-gian.jpg"
            );
            case SKIRT -> List.of(
                    "/product-images/chan-vay-chu-a-cacao.jpg",
                    "/product-images/chan-vay-pebble-midi.jpg"
            );
            case TOP -> List.of(
                    "/product-images/ao-len-may-kem.jpg",
                    "/product-images/baby-tee-hong-dusty.jpg",
                    "/product-images/ao-blouse-beo-nguc-kem-trang.jpg",
                    "/product-images/ao-thun-hat-de-cotton.jpg",
                    "/product-images/so-mi-cloud-stripe.jpg",
                    "/product-images/polo-sage-weekend.jpg",
                    "/product-images/ao-polo-clay-club.jpg",
                    "/product-images/ao-so-mi-nu-ke-be.jpg",
                    "/product-images/so-mi-latte-oxford.jpg",
                    "/product-images/so-mi-linen-oat-thoang-mat.jpg"
            );
            case OUTERWEAR -> List.of(
                    "/product-images/cardigan-mocha-dai-ta.jpg",
                    "/product-images/gile-knit-nougat.jpg",
                    "/product-images/gile-len-hanh-nhan.jpg",
                    "/product-images/ao-khoac-bomber-mocha.jpg",
                    "/product-images/ao-hoodie-xam-khoi-oversize.jpg",
                    "/product-images/blazer-oat-commute.jpg",
                    "/product-images/blazer-nam-kem-toi-gian.jpg"
            );
            case PANTS -> List.of(
                    "/product-images/quan-suong-ong-rong-olive.jpg",
                    "/product-images/quan-kaki-cacao-ong-dung.jpg",
                    "/product-images/jean-straight-xam-khoi.jpg",
                    "/product-images/quan-jogger-be-the-thao.jpg",
                    "/product-images/quan-tay-moss-line.jpg"
            );
            case BAG -> List.of(
                    "/product-images/tui-mini-cocoa-fold.jpg",
                    "/product-images/tui-commuter-olive.jpg",
                    "/product-images/tote-canvas-be-dung-form.jpg",
                    "/product-images/tui-deo-cheo-da-mini-kem.jpg"
            );
            case SCARF -> List.of(
                    "/product-images/khan-co-det-caramel.jpg",
                    "/product-images/khan-lua-vanilla-trim.jpg"
            );
            case HAT -> List.of(
                    "/product-images/mu-len-latte.jpg"
            );
            case JEWELRY -> List.of(
                    "/product-images/vong-co-bac-toi-gian.jpg"
            );
            case BELT, SOCKS -> List.of(
                    "/product-images/tote-canvas-be-dung-form.jpg",
                    "/product-images/khan-co-det-caramel.jpg"
            );
            case SET -> List.of(
                    "/product-images/set-weekend-sand.jpg",
                    "/product-images/set-workday-caramel.jpg",
                    "/product-images/set-picnic-sage-latte-cuoi-tuan.jpg",
                    "/product-images/set-doi-nau-kem-ngay-hen.jpg",
                    "/product-images/combo-cong-so-kem-mocha.jpg",
                    "/product-images/set-blazer-nu-be-cong-so.jpg"
            );
        };
    }

    private String pickPhotoFromPool(List<String> pool, String seed) {
        if (pool == null || pool.isEmpty()) {
            return null;
        }
        String safeSeed = seed == null ? "" : seed;
        int index = Math.floorMod(safeSeed.hashCode(), pool.size());
        return pool.get(index);
    }

    private void trimGeneratedDemoCatalog(UserAccount seller) {
        List<Product> sellerProducts = productRepository.findBySellerIdOrderByCreatedAtDesc(seller.getId());
        if (sellerProducts.isEmpty()) {
            return;
        }

        int keptGenerated = 0;
        for (Product product : sellerProducts) {
            if (!Boolean.TRUE.equals(product.getActive()) || !isGeneratedDemoProduct(product)) {
                continue;
            }

            if (keptGenerated < TARGET_GENERATED_DEMO_PRODUCTS) {
                keptGenerated++;
                continue;
            }

            product.setActive(false);
        }
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
        product.getVariants().add(variant);
    }

    private void ensureMinimumDemoProducts(
            UserAccount seller,
            Category women,
            Category men,
            Category accessories,
            Category sale
    ) {
        long currentCount = productRepository.count();
        if (currentCount >= TARGET_GENERATED_DEMO_PRODUCTS) {
            return;
        }

        int missing = (int) (TARGET_GENERATED_DEMO_PRODUCTS - currentCount);
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

    private boolean shouldRefreshDemoImageUrls(List<String> imageUrls) {
        if (imageUrls == null || imageUrls.isEmpty()) {
            return true;
        }
        return imageUrls.stream().allMatch(this::shouldRefreshDemoImageUrl);
    }

    private boolean shouldRefreshDemoImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return true;
        }
        String lower = imageUrl.toLowerCase(Locale.ROOT);
        return containsDemoArtworkMarker(imageUrl)
                || lower.contains("images.unsplash.com")
                || lower.contains("source.unsplash.com")
                || lower.contains("unsplash.com");
    }

    private boolean isLocalProductImageUrl(String imageUrl) {
        String trimmed = trimText(imageUrl);
        return trimmed != null && trimmed.startsWith("/product-images/");
    }

    private boolean containsDemoArtworkMarker(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return false;
        }
        if (!imageUrl.startsWith("data:image/svg+xml;base64,")) {
            return false;
        }
        try {
            String base64 = imageUrl.substring("data:image/svg+xml;base64,".length());
            String decoded = new String(Base64.getDecoder().decode(base64), StandardCharsets.UTF_8);
            return decoded.contains(DEMO_ARTWORK_MARKER);
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private List<String> normalizeImageUrls(List<String> imageUrls) {
        if (imageUrls == null || imageUrls.isEmpty()) {
            return List.of();
        }

        List<String> normalized = new ArrayList<>();
        for (String imageUrl : imageUrls) {
            String trimmed = trimText(imageUrl);
            if (trimmed == null || normalized.contains(trimmed)) {
                continue;
            }
            normalized.add(trimmed);
        }
        return normalized;
    }

    private boolean sameImageUrlCollection(List<String> current, List<String> expected) {
        List<String> normalizedCurrent = normalizeImageUrls(current);
        List<String> normalizedExpected = normalizeImageUrls(expected);
        if (normalizedCurrent.size() != normalizedExpected.size()) {
            return false;
        }
        for (int index = 0; index < normalizedCurrent.size(); index++) {
            if (!equalsTrimmed(normalizedCurrent.get(index), normalizedExpected.get(index))) {
                return false;
            }
        }
        return true;
    }

    private boolean isGeneratedDemoProduct(Product product) {
        if (product == null) {
            return false;
        }
        String description = product.getDescription();
        if (description != null && description.startsWith(GENERATED_DEMO_DESCRIPTION_PREFIX)) {
            return true;
        }
        String name = product.getName();
        return name != null && name.matches(".*\\bMM-\\d{4,}\\b.*");
    }

    private String buildProductArtworkUrl(Product product) {
        String title = product.getName() != null ? product.getName() : "Sản phẩm demo";
        String detail = product.getCategory() != null && product.getCategory().getName() != null
                ? product.getCategory().getName()
                : resolveKindLabel(resolveArtworkKind(title, product.getGender()));
        return buildArtworkDataUrl(
                title,
                detail,
                resolveKindLabel(resolveArtworkKind(title, product.getGender())),
                resolveArtworkKind(title, product.getGender()),
                resolvePalette(title)
        );
    }

    private String buildVariantArtworkUrl(Product product, ProductVariant variant) {
        String title = product.getName() != null ? product.getName() : "Sản phẩm demo";
        String size = variant.getSize() != null && !variant.getSize().isBlank() ? variant.getSize() : "Free";
        String color = variant.getColor() != null && !variant.getColor().isBlank() ? variant.getColor() : "Màu chuẩn";
        return buildArtworkDataUrl(
                title,
                size + " • " + color,
                color,
                resolveArtworkKind(title, product.getGender()),
                resolvePalette(color + " " + title)
        );
    }

    private String buildOrderItemArtworkUrl(Product product, OrderItem item, ProductVariant variant) {
        String title = item.getProductName() != null && !item.getProductName().isBlank()
                ? item.getProductName()
                : product.getName();
        String size = item.getSize() != null && !item.getSize().isBlank()
                ? item.getSize()
                : (variant != null && variant.getSize() != null ? variant.getSize() : "Free");
        String color = item.getColor() != null && !item.getColor().isBlank()
                ? item.getColor()
                : (variant != null && variant.getColor() != null ? variant.getColor() : "Màu chuẩn");
        return buildArtworkDataUrl(
                title,
                size + " • " + color,
                color,
                resolveArtworkKind(title, product.getGender()),
                resolvePalette(color + " " + title)
        );
    }

    private String buildArtworkDataUrl(
            String title,
            String detail,
            String badge,
            DemoArtworkKind kind,
            DemoArtworkPalette palette
    ) {
        List<String> titleLines = wrapText(title, 22, 2);
        StringBuilder svg = new StringBuilder();
        svg.append("<svg xmlns='http://www.w3.org/2000/svg' width='900' height='1100' viewBox='0 0 900 1100'>");
        svg.append("<defs>");
        svg.append("<linearGradient id='bg' x1='0%' y1='0%' x2='100%' y2='100%'>");
        svg.append("<stop offset='0%' stop-color='").append(palette.backgroundStart()).append("'/>");
        svg.append("<stop offset='100%' stop-color='").append(palette.backgroundEnd()).append("'/>");
        svg.append("</linearGradient>");
        svg.append("<filter id='shadow' x='-20%' y='-20%' width='140%' height='140%'>");
        svg.append("<feDropShadow dx='0' dy='16' stdDeviation='18' flood-color='").append(palette.text()).append("' flood-opacity='0.16'/>");
        svg.append("</filter>");
        svg.append("</defs>");
        svg.append("<rect width='900' height='1100' rx='48' fill='url(#bg)'/>");
        svg.append("<rect x='42' y='42' width='816' height='1016' rx='40' fill='").append(palette.surface()).append("' fill-opacity='0.94'/>");
        svg.append("<circle cx='760' cy='160' r='120' fill='").append(palette.primary()).append("' fill-opacity='0.18'/>");
        svg.append("<circle cx='138' cy='910' r='130' fill='").append(palette.secondary()).append("' fill-opacity='0.16'/>");
        svg.append("<text x='92' y='118' font-family='Segoe UI,Arial,sans-serif' font-size='28' font-weight='700' fill='")
                .append(palette.text()).append("'>Moc Mam Select</text>");
        svg.append("<text x='92' y='154' font-family='Segoe UI,Arial,sans-serif' font-size='20' fill='")
                .append(palette.muted()).append("'>")
                .append(escapeXml(resolveKindLabel(kind)))
                .append("</text>");
        svg.append(renderArtworkShape(kind, palette));
        svg.append("<rect x='92' y='760' width='716' height='1' fill='").append(palette.text()).append("' fill-opacity='0.14'/>");

        int titleY = 828;
        for (int i = 0; i < titleLines.size(); i++) {
            svg.append("<text x='92' y='").append(titleY + (i * 48))
                    .append("' font-family='Segoe UI,Arial,sans-serif' font-size='44' font-weight='700' fill='")
                    .append(palette.text()).append("'>")
                    .append(escapeXml(titleLines.get(i)))
                    .append("</text>");
        }

        svg.append("<rect x='92' y='924' rx='20' ry='20' width='236' height='68' fill='").append(palette.accent()).append("'/>");
        svg.append("<text x='122' y='966' font-family='Segoe UI,Arial,sans-serif' font-size='23' font-weight='700' fill='")
                .append(palette.surface()).append("'>")
                .append(escapeXml(badge))
                .append("</text>");
        svg.append("<rect x='350' y='924' rx='20' ry='20' width='458' height='68' fill='").append(palette.primary()).append("' fill-opacity='0.18'/>");
        svg.append("<text x='382' y='966' font-family='Segoe UI,Arial,sans-serif' font-size='22' font-weight='600' fill='")
                .append(palette.text()).append("'>")
                .append(escapeXml(detail))
                .append("</text>");
        svg.append("<desc>").append(DEMO_ARTWORK_MARKER).append("</desc>");
        svg.append("</svg>");
        return "data:image/svg+xml;base64," + Base64.getEncoder().encodeToString(svg.toString().getBytes(StandardCharsets.UTF_8));
    }

    private String renderArtworkShape(DemoArtworkKind kind, DemoArtworkPalette palette) {
        return switch (kind) {
            case DRESS -> ""
                    + "<g filter='url(#shadow)'>"
                    + "<ellipse cx='450' cy='666' rx='176' ry='26' fill='" + palette.text() + "' fill-opacity='0.15'/>"
                    + "<path d='M392 250 L508 250 L540 338 L628 622 Q450 744 272 622 L360 338 Z' fill='" + palette.primary() + "'/>"
                    + "<path d='M392 250 L360 338 L328 316 Q352 258 392 250 Z' fill='" + palette.secondary() + "'/>"
                    + "<path d='M508 250 L540 338 L572 316 Q548 258 508 250 Z' fill='" + palette.secondary() + "'/>"
                    + "<path d='M420 248 Q450 210 480 248' fill='none' stroke='" + palette.accent() + "' stroke-width='16' stroke-linecap='round'/>"
                    + "<path d='M394 404 Q450 440 506 404' fill='none' stroke='" + palette.surface() + "' stroke-width='12' stroke-linecap='round' opacity='0.65'/>"
                    + "</g>";
            case SKIRT -> ""
                    + "<g filter='url(#shadow)'>"
                    + "<ellipse cx='450' cy='668' rx='176' ry='26' fill='" + palette.text() + "' fill-opacity='0.15'/>"
                    + "<rect x='350' y='254' width='200' height='54' rx='22' fill='" + palette.secondary() + "'/>"
                    + "<path d='M370 306 H530 L620 636 Q450 736 280 636 Z' fill='" + palette.primary() + "'/>"
                    + "<path d='M408 330 L376 626' stroke='" + palette.surface() + "' stroke-width='10' stroke-linecap='round' opacity='0.52'/>"
                    + "<path d='M492 330 L524 626' stroke='" + palette.surface() + "' stroke-width='10' stroke-linecap='round' opacity='0.52'/>"
                    + "<path d='M342 454 Q450 496 558 454' fill='none' stroke='" + palette.accent() + "' stroke-width='12' stroke-linecap='round' opacity='0.52'/>"
                    + "</g>";
            case TOP -> ""
                    + "<g filter='url(#shadow)'>"
                    + "<ellipse cx='450' cy='666' rx='166' ry='24' fill='" + palette.text() + "' fill-opacity='0.15'/>"
                    + "<path d='M320 336 L366 252 H406 L428 292 H472 L494 252 H534 L580 336 L534 382 L516 636 H384 L366 382 Z' fill='" + palette.primary() + "'/>"
                    + "<path d='M414 252 Q450 214 486 252' fill='none' stroke='" + palette.accent() + "' stroke-width='16' stroke-linecap='round'/>"
                    + "<rect x='400' y='430' width='100' height='122' rx='24' fill='" + palette.secondary() + "' fill-opacity='0.28'/>"
                    + "</g>";
            case OUTERWEAR -> ""
                    + "<g filter='url(#shadow)'>"
                    + "<ellipse cx='450' cy='676' rx='176' ry='24' fill='" + palette.text() + "' fill-opacity='0.15'/>"
                    + "<path d='M314 328 L378 240 H420 L434 298 H466 L480 240 H522 L586 328 L544 372 L532 650 H370 L356 372 Z' fill='" + palette.primary() + "'/>"
                    + "<path d='M448 298 V648' stroke='" + palette.surface() + "' stroke-width='14' stroke-linecap='round' opacity='0.85'/>"
                    + "<rect x='372' y='452' width='58' height='82' rx='18' fill='" + palette.secondary() + "' fill-opacity='0.28'/>"
                    + "<rect x='470' y='452' width='58' height='82' rx='18' fill='" + palette.secondary() + "' fill-opacity='0.28'/>"
                    + "</g>";
            case PANTS -> ""
                    + "<g filter='url(#shadow)'>"
                    + "<ellipse cx='450' cy='688' rx='160' ry='24' fill='" + palette.text() + "' fill-opacity='0.15'/>"
                    + "<path d='M350 246 H550 L516 664 H450 L430 482 L402 664 H336 Z' fill='" + palette.primary() + "'/>"
                    + "<rect x='350' y='246' width='200' height='42' rx='18' fill='" + palette.secondary() + "' fill-opacity='0.42'/>"
                    + "<path d='M450 288 V662' stroke='" + palette.accent() + "' stroke-width='10' stroke-linecap='round' opacity='0.52'/>"
                    + "</g>";
            case BAG -> ""
                    + "<g filter='url(#shadow)'>"
                    + "<ellipse cx='450' cy='684' rx='156' ry='24' fill='" + palette.text() + "' fill-opacity='0.15'/>"
                    + "<path d='M306 364 Q306 316 352 316 H548 Q594 316 594 364 V640 Q594 692 548 692 H352 Q306 692 306 640 Z' fill='" + palette.primary() + "'/>"
                    + "<path d='M374 318 Q386 244 450 244 Q514 244 526 318' fill='none' stroke='" + palette.accent() + "' stroke-width='18' stroke-linecap='round'/>"
                    + "<rect x='364' y='428' width='172' height='108' rx='28' fill='" + palette.secondary() + "' fill-opacity='0.28'/>"
                    + "</g>";
            case SCARF -> ""
                    + "<g filter='url(#shadow)'>"
                    + "<ellipse cx='450' cy='676' rx='156' ry='24' fill='" + palette.text() + "' fill-opacity='0.15'/>"
                    + "<path d='M372 240 Q450 316 372 418 Q334 468 346 534 L368 666 Q372 688 394 688 H428 Q448 688 444 666 L428 528 Q420 468 454 426 Q536 326 474 240 Z' fill='" + palette.primary() + "'/>"
                    + "<path d='M528 240 Q446 320 528 424 Q564 470 552 532 L532 666 Q528 688 506 688 H472 Q452 688 456 666 L474 520 Q482 470 448 428 Q366 328 428 240 Z' fill='" + palette.secondary() + "'/>"
                    + "</g>";
            case HAT -> ""
                    + "<g filter='url(#shadow)'>"
                    + "<ellipse cx='450' cy='658' rx='164' ry='22' fill='" + palette.text() + "' fill-opacity='0.15'/>"
                    + "<path d='M320 468 Q338 326 450 326 Q562 326 580 468 Z' fill='" + palette.primary() + "'/>"
                    + "<path d='M294 500 Q450 456 606 500 Q594 568 450 568 Q306 568 294 500 Z' fill='" + palette.secondary() + "'/>"
                    + "<path d='M352 444 Q450 396 548 444' fill='none' stroke='" + palette.accent() + "' stroke-width='12' stroke-linecap='round' opacity='0.58'/>"
                    + "</g>";
            case JEWELRY -> ""
                    + "<g filter='url(#shadow)'>"
                    + "<ellipse cx='450' cy='654' rx='150' ry='20' fill='" + palette.text() + "' fill-opacity='0.15'/>"
                    + "<path d='M336 358 Q450 248 564 358' fill='none' stroke='" + palette.primary() + "' stroke-width='24' stroke-linecap='round'/>"
                    + "<path d='M372 396 Q450 322 528 396' fill='none' stroke='" + palette.secondary() + "' stroke-width='18' stroke-linecap='round' opacity='0.78'/>"
                    + "<circle cx='450' cy='458' r='54' fill='" + palette.accent() + "'/>"
                    + "<circle cx='450' cy='458' r='24' fill='" + palette.surface() + "' fill-opacity='0.84'/>"
                    + "</g>";
            case BELT -> ""
                    + "<g filter='url(#shadow)'>"
                    + "<ellipse cx='450' cy='650' rx='154' ry='20' fill='" + palette.text() + "' fill-opacity='0.15'/>"
                    + "<rect x='254' y='432' width='392' height='84' rx='42' fill='" + palette.primary() + "'/>"
                    + "<rect x='516' y='416' width='112' height='116' rx='28' fill='" + palette.secondary() + "'/>"
                    + "<rect x='542' y='446' width='60' height='56' rx='12' fill='" + palette.surface() + "'/>"
                    + "<rect x='300' y='456' width='174' height='20' rx='10' fill='" + palette.accent() + "' fill-opacity='0.42'/>"
                    + "</g>";
            case SOCKS -> ""
                    + "<g filter='url(#shadow)'>"
                    + "<ellipse cx='450' cy='676' rx='154' ry='22' fill='" + palette.text() + "' fill-opacity='0.15'/>"
                    + "<path d='M342 258 H430 V504 Q430 554 382 568 L318 586 Q294 592 286 568 L276 536 Q270 516 292 506 L340 484 Q342 454 342 258 Z' fill='" + palette.primary() + "'/>"
                    + "<path d='M470 258 H558 V504 Q558 554 510 568 L446 586 Q422 592 414 568 L404 536 Q398 516 420 506 L468 484 Q470 454 470 258 Z' fill='" + palette.secondary() + "'/>"
                    + "<rect x='342' y='258' width='88' height='46' rx='12' fill='" + palette.accent() + "' fill-opacity='0.62'/>"
                    + "<rect x='470' y='258' width='88' height='46' rx='12' fill='" + palette.accent() + "' fill-opacity='0.62'/>"
                    + "<path d='M344 390 H430 M472 390 H558' stroke='" + palette.surface() + "' stroke-width='10' stroke-linecap='round' opacity='0.68'/>"
                    + "</g>";
            case SET -> ""
                    + "<g filter='url(#shadow)'>"
                    + "<ellipse cx='450' cy='684' rx='176' ry='24' fill='" + palette.text() + "' fill-opacity='0.15'/>"
                    + "<path d='M268 350 L306 274 H338 L354 302 H390 L408 274 H438 L476 350 L440 384 L428 592 H316 L302 384 Z' fill='" + palette.primary() + "'/>"
                    + "<path d='M482 286 H634 L608 646 H552 L536 484 L514 646 H458 Z' fill='" + palette.secondary() + "'/>"
                    + "<path d='M330 274 Q370 236 408 274' fill='none' stroke='" + palette.accent() + "' stroke-width='14' stroke-linecap='round'/>"
                    + "<rect x='506' y='286' width='102' height='32' rx='14' fill='" + palette.accent() + "' fill-opacity='0.28'/>"
                    + "</g>";
        };
    }

    private DemoArtworkKind resolveArtworkKind(String name, Gender gender) {
        String slug = SlugUtils.toSlug(name == null ? "" : name);
        if (slug.contains("chan-vay")) {
            return DemoArtworkKind.SKIRT;
        }
        if (slug.contains("dam") || slug.contains("vay")) {
            return DemoArtworkKind.DRESS;
        }
        if (slug.contains("quan") || slug.contains("jean")) {
            return DemoArtworkKind.PANTS;
        }
        if (slug.contains("cardigan") || slug.contains("ao-khoac") || slug.contains("hoodie")
                || slug.contains("blazer") || slug.contains("gile")) {
            return DemoArtworkKind.OUTERWEAR;
        }
        if (slug.contains("tui") || slug.contains("tote") || slug.contains("vi") || slug.contains("ba-lo")) {
            return DemoArtworkKind.BAG;
        }
        if (slug.contains("khan")) {
            return DemoArtworkKind.SCARF;
        }
        if (slug.contains("mu") || slug.contains("non")) {
            return DemoArtworkKind.HAT;
        }
        if (slug.contains("vong-co") || slug.contains("khuyen-tai") || slug.contains("kep-toc")) {
            return DemoArtworkKind.JEWELRY;
        }
        if (slug.contains("that-lung")) {
            return DemoArtworkKind.BELT;
        }
        if (slug.contains("tat")) {
            return DemoArtworkKind.SOCKS;
        }
        if (slug.contains("set") || slug.contains("combo")) {
            return DemoArtworkKind.SET;
        }
        if (slug.contains("baby-tee") || slug.contains("ao-thun") || slug.contains("ao-blouse")
                || slug.contains("ao-len") || slug.contains("polo") || slug.contains("so-mi")) {
            return DemoArtworkKind.TOP;
        }
        if (slug.contains("ao")) {
            return DemoArtworkKind.OUTERWEAR;
        }
        return gender == Gender.UNISEX ? DemoArtworkKind.SET : DemoArtworkKind.TOP;
    }

    private String resolveKindLabel(DemoArtworkKind kind) {
        return switch (kind) {
            case DRESS -> "Look vay dam";
            case SKIRT -> "Look chan vay";
            case TOP -> "Look ao";
            case OUTERWEAR -> "Look layering";
            case PANTS -> "Look quan";
            case BAG -> "Phu kien tui";
            case SCARF -> "Phu kien khan";
            case HAT -> "Phu kien non mu";
            case JEWELRY -> "Phu kien trang suc";
            case BELT -> "Phu kien that lung";
            case SOCKS -> "Phu kien tat";
            case SET -> "Outfit set";
        };
    }

    private DemoArtworkPalette resolvePalette(String seed) {
        String slug = SlugUtils.toSlug(seed == null ? "" : seed);
        if (slug.contains("sage") || slug.contains("olive")) {
            return new DemoArtworkPalette("#eef6ea", "#d7e8d1", "#fffef9", "#88a677", "#b8ccb1", "#5f7754", "#3d352d", "#6b6157");
        }
        if (slug.contains("hong") || slug.contains("dusty")) {
            return new DemoArtworkPalette("#fff1f2", "#f6d5dd", "#fffdfb", "#d98fa2", "#efc4cf", "#af6077", "#4f3a3f", "#7d646a");
        }
        if (slug.contains("xam") || slug.contains("khoi") || slug.contains("bac")) {
            return new DemoArtworkPalette("#f3f4f6", "#dde1e7", "#ffffff", "#8e97a5", "#c4cad4", "#626b79", "#2d3440", "#697280");
        }
        if (slug.contains("navy")) {
            return new DemoArtworkPalette("#eef3fb", "#d6e0f0", "#fffefc", "#57739a", "#8ca6c7", "#314969", "#243041", "#5f6c7d");
        }
        if (slug.contains("den")) {
            return new DemoArtworkPalette("#f5f4f3", "#ddd7d2", "#fffdf8", "#4f4742", "#8b8078", "#2c2622", "#231f1c", "#5e554f");
        }
        if (slug.contains("gach")) {
            return new DemoArtworkPalette("#fff3ec", "#f0d1c0", "#fffdf8", "#cb7e5f", "#e5b199", "#9b5a3c", "#4d3428", "#7a5f51");
        }
        if (slug.contains("mocha") || slug.contains("cacao") || slug.contains("caramel") || slug.contains("nau") || slug.contains("hat-de")) {
            return new DemoArtworkPalette("#fbf3e9", "#e7d5c2", "#fffdf8", "#9b7556", "#d0b59a", "#6f5038", "#433126", "#705d50");
        }
        return new DemoArtworkPalette("#fff7ef", "#efe0cc", "#fffdfa", "#c8a57a", "#e4cfb3", "#8a6747", "#48362b", "#7f6c5d");
    }

    private List<String> wrapText(String value, int maxCharsPerLine, int maxLines) {
        if (value == null || value.isBlank()) {
            return List.of("San pham demo");
        }

        String[] words = value.trim().split("\\s+");
        List<String> lines = new ArrayList<>();
        StringBuilder current = new StringBuilder();

        for (int index = 0; index < words.length; index++) {
            String word = words[index];
            String candidate = current.isEmpty() ? word : current + " " + word;
            if (candidate.length() <= maxCharsPerLine) {
                current.setLength(0);
                current.append(candidate);
                continue;
            }

            if (!current.isEmpty()) {
                lines.add(current.toString());
                current.setLength(0);
            }

            if (lines.size() == maxLines - 1) {
                String remaining = word;
                for (int i = index + 1; i < words.length; i++) {
                    remaining += " " + words[i];
                }
                lines.add(truncateText(remaining, maxCharsPerLine));
                return lines;
            }

            if (word.length() > maxCharsPerLine) {
                lines.add(truncateText(word, maxCharsPerLine));
            } else {
                current.append(word);
            }
        }

        if (!current.isEmpty() && lines.size() < maxLines) {
            lines.add(current.toString());
        }

        if (lines.isEmpty()) {
            lines.add(truncateText(value, maxCharsPerLine));
        }
        return lines;
    }

    private String truncateText(String value, int maxChars) {
        if (value.length() <= maxChars) {
            return value;
        }
        if (maxChars <= 3) {
            return value.substring(0, maxChars);
        }
        return value.substring(0, maxChars - 3) + "...";
    }

    private String escapeXml(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
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

    private void createLookbookIfMissing(
            String title,
            String description,
            String mood,
            String coverImageUrl,
            List<String> tags,
            UserAccount creator
    ) {
        boolean exists = lookbookRepository.findAll().stream()
                .anyMatch(lookbook -> lookbook.getTitle() != null && lookbook.getTitle().equalsIgnoreCase(title));
        if (exists) {
            return;
        }
        createLookbook(title, description, mood, coverImageUrl, tags, creator);
    }

    private List<Order> seedOrderAndSupportData(
            List<UserAccount> customers,
            List<UserAccount> sellers,
            UserAccount warehouse,
            UserAccount admin
    ) {
        List<Order> orders = seedOrders(customers, sellers);
        seedSupportTickets(orders, customers, sellers, warehouse, admin);
        seedReturnRequests(orders, customers, warehouse);
        return sortOrdersNewestFirst(orderRepository.findAll());
    }

    private List<Order> seedOrders(List<UserAccount> customers, List<UserAccount> sellers) {
        List<Order> existingOrders = sortOrdersNewestFirst(orderRepository.findAll());
        Map<String, Order> existingByNumber = new HashMap<>();
        for (Order order : existingOrders) {
            if (order.getOrderNumber() != null && !order.getOrderNumber().isBlank()) {
                existingByNumber.put(order.getOrderNumber(), order);
            }
        }

        if (customers.isEmpty() || sellers.isEmpty()) {
            return existingOrders;
        }

        seedDemoOrderSeries(existingByNumber, customers, sellers.get(0), "MMB", 2201, 18, 3);
        if (sellers.size() > 1) {
            seedDemoOrderSeries(existingByNumber, customers, sellers.get(1), "SGE", 2301, 10, 4);
        }
        if (sellers.size() > 2) {
            seedDemoOrderSeries(existingByNumber, customers, sellers.get(2), "CNV", 2401, 8, 5);
        }

        return sortOrdersNewestFirst(orderRepository.findAll());
    }

    private void seedDemoOrderSeries(
            Map<String, Order> existingByNumber,
            List<UserAccount> customers,
            UserAccount seller,
            String seriesCode,
            int startSerial,
            int count,
            int spacingDays
    ) {
        List<ProductVariant> variants = collectSellerVariants(seller);
        List<Product> products = collectSellerProducts(seller);
        if (variants.isEmpty() && products.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        for (int index = 0; index < count; index++) {
            int historyIndex = count - index - 1;
            int daysAgo = historyIndex <= 5
                    ? historyIndex
                    : 6 + ((historyIndex - 6) * spacingDays) + (historyIndex % 2);
            LocalDateTime createdAt = now.minusDays(daysAgo)
                    .minusHours((index * 3L) % 10)
                    .minusMinutes((index * 11L) % 47);

            Order.Status status = resolveDemoOrderStatus(index, count);
            Order.PaymentMethod paymentMethod = resolveDemoPaymentMethod(index, status);
            Order.PaymentStatus paymentStatus = resolveDemoPaymentStatus(index, status, paymentMethod);

            List<DemoOrderLineSeed> lines = new ArrayList<>();
            if (!variants.isEmpty()) {
                ProductVariant primaryVariant = variants.get(index % variants.size());
                lines.add(new DemoOrderLineSeed(primaryVariant.getProduct(), primaryVariant, 1 + (index % 2)));

                if (variants.size() > 2 && index % 4 == 0) {
                    ProductVariant secondaryVariant = variants.get((index + 3) % variants.size());
                    if (secondaryVariant.getId() == null || !secondaryVariant.getId().equals(primaryVariant.getId())) {
                        lines.add(new DemoOrderLineSeed(secondaryVariant.getProduct(), secondaryVariant, 1));
                    }
                }
            } else {
                Product primaryProduct = products.get(index % products.size());
                lines.add(new DemoOrderLineSeed(primaryProduct, null, 1 + (index % 2)));

                if (products.size() > 2 && index % 4 == 0) {
                    Product secondaryProduct = products.get((index + 3) % products.size());
                    if (secondaryProduct.getId() == null || !secondaryProduct.getId().equals(primaryProduct.getId())) {
                        lines.add(new DemoOrderLineSeed(secondaryProduct, null, 1));
                    }
                }
            }

            UserAccount customer = customers.get(index % customers.size());
            createDemoOrderIfMissing(
                    existingByNumber,
                    "DH-DEMO-" + seriesCode + "-" + String.format("%04d", startSerial + index),
                    customer,
                    lines,
                    status,
                    paymentMethod,
                    paymentStatus,
                    createdAt,
                    buildDemoOrderNote(status, seller, index)
            );
        }
    }

    private Order createDemoOrderIfMissing(
            Map<String, Order> existingByNumber,
            String orderNumber,
            UserAccount customer,
            List<DemoOrderLineSeed> lines,
            Order.Status status,
            Order.PaymentMethod paymentMethod,
            Order.PaymentStatus paymentStatus,
            LocalDateTime createdAt,
            String notes
    ) {
        Order existing = existingByNumber.get(orderNumber);
        if (existing != null) {
            return existing;
        }
        if (lines.isEmpty()) {
            return null;
        }

        double subtotal = 0;
        List<OrderItem> items = new ArrayList<>();

        Order order = Order.builder()
                .orderNumber(orderNumber)
                .status(status)
                .paymentMethod(paymentMethod)
                .paymentStatus(paymentStatus)
                .subtotal(0.0)
                .shippingFee(0.0)
                .discount(0.0)
                .total(0.0)
                .notes(notes)
                .user(customer)
                .createdAt(createdAt)
                .updatedAt(resolveDemoUpdatedAt(status, createdAt))
                .deliveredAt(status == Order.Status.DELIVERED ? createdAt.plusDays(2) : null)
                .build();

        for (DemoOrderLineSeed line : lines) {
            Product product = line.product();
            ProductVariant variant = line.variant();
            int quantity = Math.max(1, line.quantity());
            double unitPrice = resolveDemoLineUnitPrice(product, variant);
            double lineTotal = unitPrice * quantity;
            subtotal += lineTotal;

            String imageUrl = variant != null && variant.getImageUrl() != null && !variant.getImageUrl().isBlank()
                    ? variant.getImageUrl()
                    : (product.getImageUrls().isEmpty() ? buildProductArtworkUrl(product) : product.getImageUrls().get(0));

            OrderItem item = OrderItem.builder()
                    .order(order)
                    .productId(product.getId())
                    .variantId(variant != null ? variant.getId() : null)
                    .productName(product.getName())
                    .productSlug(product.getSlug())
                    .size(variant != null && variant.getSize() != null ? variant.getSize() : "Free")
                    .color(variant != null && variant.getColor() != null ? variant.getColor() : "Màu chuẩn")
                    .unitPrice(unitPrice)
                    .quantity(quantity)
                    .lineTotal(lineTotal)
                    .imageUrl(imageUrl)
                    .build();
            items.add(item);
        }

        double shippingFee = subtotal >= 500_000 ? 0 : 30_000;
        double discount = status == Order.Status.CANCELLED ? 0 : (subtotal >= 850_000 ? 25_000 : 0);
        double total = subtotal + shippingFee - discount;

        order.setSubtotal(subtotal);
        order.setShippingFee(shippingFee);
        order.setDiscount(discount);
        order.setTotal(total);
        order.getItems().addAll(items);

        ShippingAddress address = ShippingAddress.builder()
                .order(order)
                .fullName(customer.getFullName())
                .phone(customer.getEmail() != null && customer.getEmail().contains("vip") ? "0908 222 333" : "0909 123 456")
                .addressLine1(customer.getEmail() != null && customer.getEmail().contains("buyer")
                        ? "88 Nguyễn Thái Học"
                        : "12 Đường Mộc Mầm")
                .district(customer.getEmail() != null && customer.getEmail().contains("vip") ? "Quận 1" : "Quận 3")
                .city("TP.HCM")
                .province("TP.HCM")
                .note("Địa chỉ demo cho dashboard")
                .build();
        order.setShippingAddress(address);
        Order saved = orderRepository.save(order);
        existingByNumber.put(orderNumber, saved);
        return saved;
    }

    private List<Product> collectSellerProducts(UserAccount seller) {
        List<Product> products = productRepository.findBySellerIdAndActiveTrueOrderByCreatedAtDesc(seller.getId());
        if (!products.isEmpty()) {
            return products;
        }
        return productRepository.findTop40ByActiveTrueOrderByFeaturedDescCreatedAtDesc();
    }

    private void seedSupportTickets(
            List<Order> orders,
            List<UserAccount> customers,
            List<UserAccount> sellers,
            UserAccount warehouse,
            UserAccount admin
    ) {
        if (orders.isEmpty() || customers.isEmpty() || sellers.isEmpty()) {
            return;
        }

        List<Order> newestOrders = sortOrdersNewestFirst(orders);
        List<Order> openOrders = newestOrders.stream()
                .filter(order -> order.getStatus() != Order.Status.CANCELLED && order.getStatus() != Order.Status.DELIVERED)
                .toList();
        List<Order> deliveredOrders = newestOrders.stream()
                .filter(order -> order.getStatus() == Order.Status.DELIVERED)
                .toList();
        List<Order> refundedOrders = newestOrders.stream()
                .filter(order -> order.getPaymentStatus() == Order.PaymentStatus.REFUNDED)
                .toList();

        LocalDateTime now = LocalDateTime.now();

        createSupportTicketIfMissing(
                "TK-DEMO-0101",
                openOrders.isEmpty() ? null : openOrders.get(0),
                customers.get(0),
                warehouse,
                "Chậm xác nhận đơn",
                "Khách cần shop cập nhật ngay tình trạng đơn mới tạo trong ngày.",
                SupportTicket.Priority.HIGH,
                SupportTicket.Status.NEW,
                now.minusHours(2),
                List.of(
                        new TicketCommentDraft(customers.get(0), "Mình cần đơn này đi sớm, nhờ shop kiểm tra giúp.", now.minusHours(2)),
                        new TicketCommentDraft(warehouse, "Đã tiếp nhận ticket và đang kiểm tra trong ca.", now.minusMinutes(55))
                )
        );
        createSupportTicketIfMissing(
                "TK-DEMO-0102",
                openOrders.size() > 1 ? openOrders.get(1) : (openOrders.isEmpty() ? null : openOrders.get(0)),
                customers.size() > 1 ? customers.get(1) : customers.get(0),
                warehouse,
                "Cập nhật ETA giao hàng",
                "Khách cần ETA mới vì đơn đã qua bước xác nhận nhưng chưa thấy vận đơn.",
                SupportTicket.Priority.MEDIUM,
                SupportTicket.Status.PROCESSING,
                now.minusHours(9),
                List.of(
                        new TicketCommentDraft(customers.size() > 1 ? customers.get(1) : customers.get(0), "Nhờ cập nhật thời gian giao giúp mình.", now.minusHours(9)),
                        new TicketCommentDraft(warehouse, "Kho đang phối hợp đơn vị vận chuyển, sẽ phản hồi tiếp trong ca.", now.minusHours(1))
                )
        );
        createSupportTicketIfMissing(
                "TK-DEMO-0103",
                refundedOrders.isEmpty() ? (deliveredOrders.isEmpty() ? null : deliveredOrders.get(0)) : refundedOrders.get(0),
                sellers.get(0),
                admin,
                "Đối soát hoàn tiền",
                "Seller cần xác nhận đối soát cho đơn hoàn tiền và cập nhật doanh thu cuối ngày.",
                SupportTicket.Priority.MEDIUM,
                SupportTicket.Status.WAITING,
                now.minusHours(14),
                List.of(
                        new TicketCommentDraft(sellers.get(0), "Đơn đã hoàn nhưng dashboard doanh thu chưa khớp.", now.minusHours(14)),
                        new TicketCommentDraft(admin, "Finance đang kiểm tra lại giao dịch và sẽ phản hồi trong ca chiều.", now.minusHours(4))
                )
        );
        createSupportTicketIfMissing(
                "TK-DEMO-0104",
                openOrders.size() > 2 ? openOrders.get(2) : (openOrders.isEmpty() ? null : openOrders.get(0)),
                sellers.size() > 1 ? sellers.get(1) : sellers.get(0),
                admin,
                "Thanh toán chuyển khoản cần kiểm tra",
                "Seller báo có đơn chuyển khoản đã nhận tiền nhưng trạng thái chưa phản ánh lên dashboard.",
                SupportTicket.Priority.HIGH,
                SupportTicket.Status.WAITING,
                now.minusHours(18),
                List.of(
                        new TicketCommentDraft(sellers.size() > 1 ? sellers.get(1) : sellers.get(0), "Mình cần đối soát để kịp chốt ca.", now.minusHours(18)),
                        new TicketCommentDraft(admin, "Đã chuyển bộ phận tài chính đối soát, vui lòng chờ thêm.", now.minusHours(6))
                )
        );
        createSupportTicketIfMissing(
                "TK-DEMO-0105",
                deliveredOrders.size() > 1 ? deliveredOrders.get(1) : (deliveredOrders.isEmpty() ? null : deliveredOrders.get(0)),
                customers.size() > 2 ? customers.get(2) : customers.get(0),
                warehouse,
                "Hỏi đổi địa chỉ đơn tiếp theo",
                "Khách muốn lưu lại yêu cầu đổi địa chỉ cho đơn kế tiếp sau khi vừa nhận hàng.",
                SupportTicket.Priority.LOW,
                SupportTicket.Status.RESOLVED,
                now.minusDays(1).minusHours(5),
                List.of(
                        new TicketCommentDraft(customers.size() > 2 ? customers.get(2) : customers.get(0), "Mình muốn lần sau giao sang địa chỉ công ty.", now.minusDays(1).minusHours(5)),
                        new TicketCommentDraft(warehouse, "Đã hướng dẫn khách cập nhật sổ địa chỉ trước lần mua tiếp theo.", now.minusHours(20))
                )
        );
        createSupportTicketIfMissing(
                "TK-DEMO-0106",
                deliveredOrders.size() > 2 ? deliveredOrders.get(2) : (deliveredOrders.isEmpty() ? null : deliveredOrders.get(0)),
                sellers.size() > 2 ? sellers.get(2) : sellers.get(0),
                admin,
                "Hỗ trợ điều chỉnh nội dung mô tả sản phẩm",
                "Seller xin hỗ trợ cập nhật nhanh thông tin một sản phẩm vừa lên campaign.",
                SupportTicket.Priority.LOW,
                SupportTicket.Status.CLOSED,
                now.minusDays(2).minusHours(3),
                List.of(
                        new TicketCommentDraft(sellers.size() > 2 ? sellers.get(2) : sellers.get(0), "Nhờ admin hỗ trợ review nội dung campaign mới.", now.minusDays(2).minusHours(3)),
                        new TicketCommentDraft(admin, "Đã kiểm tra và phản hồi xong, ticket đóng.", now.minusDays(1).minusHours(8))
                )
        );
        createSupportTicketIfMissing(
                "TK-DEMO-0107",
                openOrders.size() > 3 ? openOrders.get(3) : (openOrders.isEmpty() ? null : openOrders.get(0)),
                customers.get(0),
                warehouse,
                "Thiếu phụ kiện trong đơn",
                "Khách cần kho kiểm tra lại phụ kiện đi kèm trước khi bàn giao vận chuyển.",
                SupportTicket.Priority.HIGH,
                SupportTicket.Status.PROCESSING,
                now.minusHours(27),
                List.of(
                        new TicketCommentDraft(customers.get(0), "Mình đặt set đồ nhưng chưa thấy phụ kiện đi kèm.", now.minusHours(27)),
                        new TicketCommentDraft(warehouse, "Kho đang đối chiếu phiếu pick để kiểm tra phụ kiện.", now.minusHours(8))
                )
        );
        createSupportTicketIfMissing(
                "TK-DEMO-0108",
                null,
                customers.size() > 1 ? customers.get(1) : customers.get(0),
                warehouse,
                "Tư vấn hậu mãi",
                "Khách cần hướng dẫn về cách bảo quản chất liệu linen sau khi nhận hàng.",
                SupportTicket.Priority.LOW,
                SupportTicket.Status.NEW,
                now.minusMinutes(70),
                List.of(
                        new TicketCommentDraft(customers.size() > 1 ? customers.get(1) : customers.get(0), "Shop cho mình xin cách giặt và bảo quản linen với ạ.", now.minusMinutes(70))
                )
        );
    }

    private void createSupportTicketIfMissing(
            String ticketCode,
            Order order,
            UserAccount createdBy,
            UserAccount assignee,
            String issueType,
            String description,
            SupportTicket.Priority priority,
            SupportTicket.Status status,
            LocalDateTime createdAt,
            List<TicketCommentDraft> comments
    ) {
        if (supportTicketRepository.existsByTicketCode(ticketCode)) {
            return;
        }

        SupportTicket ticket = SupportTicket.builder()
                .ticketCode(ticketCode)
                .order(order)
                .createdBy(createdBy)
                .assignee(assignee)
                .issueType(issueType)
                .description(description)
                .priority(priority)
                .status(status)
                .createdAt(createdAt)
                .updatedAt(comments.isEmpty() ? createdAt : comments.get(comments.size() - 1).createdAt())
                .build();

        for (TicketCommentDraft comment : comments) {
            addTicketComment(ticket, comment.actor(), comment.message(), comment.createdAt());
        }

        supportTicketRepository.save(ticket);
    }

    private void addTicketComment(SupportTicket ticket, UserAccount actor, String message, LocalDateTime createdAt) {
        SupportTicketComment comment = SupportTicketComment.builder()
                .ticket(ticket)
                .actor(actor)
                .message(message)
                .createdAt(createdAt)
                .build();
        ticket.getComments().add(comment);
    }

    private void seedReturnRequests(List<Order> orders, List<UserAccount> customers, UserAccount warehouse) {
        if (orders.isEmpty() || customers.isEmpty()) {
            return;
        }

        List<Order> deliveredOrders = orders.stream()
                .filter(order -> order.getStatus() == Order.Status.DELIVERED)
                .sorted(Comparator.comparing(Order::getCreatedAt).reversed())
                .toList();
        List<Order> activeOrders = orders.stream()
                .filter(order -> order.getStatus() == Order.Status.PACKING
                        || order.getStatus() == Order.Status.SHIPPED
                        || order.getStatus() == Order.Status.CONFIRMED
                        || order.getStatus() == Order.Status.PENDING)
                .sorted(Comparator.comparing(Order::getCreatedAt).reversed())
                .toList();

        if (deliveredOrders.size() < 4 || activeOrders.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        createReturnRequestIfMissing(
                "RT-DEMO-0101",
                activeOrders.get(0),
                customers.get(0),
                warehouse,
                "Khách muốn kho kiểm tra lại phụ kiện trước khi bàn giao vận chuyển.",
                "https://example.com/evidence/missing-accessory.jpg",
                ReturnRequest.Status.PENDING_VERIFICATION,
                null,
                "Cần kiểm tra phiếu pick và xác nhận đủ phụ kiện.",
                now.minusHours(10),
                now.minusHours(2)
        );
        createReturnRequestIfMissing(
                "RT-DEMO-0102",
                deliveredOrders.get(0),
                customers.size() > 1 ? customers.get(1) : customers.get(0),
                warehouse,
                "Khách báo sản phẩm mặc chưa vừa và muốn chuyển admin duyệt đổi trả.",
                null,
                ReturnRequest.Status.PENDING_ADMIN,
                null,
                "Đã xác minh ảnh và chờ admin phê duyệt.",
                now.minusDays(2),
                now.minusHours(14)
        );
        createReturnRequestIfMissing(
                "RT-DEMO-0103",
                deliveredOrders.get(1),
                customers.size() > 2 ? customers.get(2) : customers.get(0),
                warehouse,
                "Khách đã xác nhận hoàn tất đóng gói hoàn và chờ đơn vị tới lấy.",
                null,
                ReturnRequest.Status.COLLECTING,
                null,
                "Đã tạo phiếu lấy hàng hoàn trong ca sáng.",
                now.minusDays(4),
                now.minusDays(3)
        );
        createReturnRequestIfMissing(
                "RT-DEMO-0104",
                deliveredOrders.get(2),
                customers.get(0),
                warehouse,
                "Kho đã nhận hàng hoàn và đang chờ kế toán hoàn tiền.",
                null,
                ReturnRequest.Status.RECEIVED,
                null,
                "Hàng hoàn đã nhập kho, chờ bút toán cuối ngày.",
                now.minusDays(6),
                now.minusDays(5)
        );
        createReturnRequestIfMissing(
                "RT-DEMO-0105",
                deliveredOrders.get(3),
                customers.size() > 1 ? customers.get(1) : customers.get(0),
                warehouse,
                "Sản phẩm lỗi ngoại quan sau khi nhận hàng.",
                null,
                ReturnRequest.Status.REFUNDED,
                "Đã chấp nhận trả hàng và hoàn tiền.",
                "Đã xác nhận hoàn tiền cho khách.",
                now.minusDays(10),
                now.minusDays(8)
        );
        createReturnRequestIfMissing(
                "RT-DEMO-0106",
                deliveredOrders.size() > 4 ? deliveredOrders.get(4) : deliveredOrders.get(0),
                customers.get(0),
                warehouse,
                "Khách đổi ý sau khi mua nhưng không đủ điều kiện đổi trả.",
                null,
                ReturnRequest.Status.REJECTED,
                "Không đủ điều kiện đổi trả do sản phẩm đã qua sử dụng.",
                "Đã phản hồi và đóng yêu cầu.",
                now.minusDays(14),
                now.minusDays(12)
        );
    }

    private void createReturnRequestIfMissing(
            String requestCode,
            Order order,
            UserAccount createdBy,
            UserAccount handledBy,
            String reason,
            String evidenceUrl,
            ReturnRequest.Status status,
            String verdict,
            String note,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        if (returnRequestRepository.existsByRequestCode(requestCode) || returnRequestRepository.existsByOrder(order)) {
            return;
        }

        if (status == ReturnRequest.Status.REFUNDED) {
            order.setPaymentStatus(Order.PaymentStatus.REFUNDED);
            order.setUpdatedAt(updatedAt);
            orderRepository.save(order);
        }

        ReturnRequest request = ReturnRequest.builder()
                .requestCode(requestCode)
                .order(order)
                .createdBy(createdBy)
                .handledBy(handledBy)
                .reason(reason)
                .evidenceUrl(evidenceUrl)
                .status(status)
                .verdict(verdict)
                .note(note)
                .createdAt(createdAt)
                .updatedAt(updatedAt)
                .build();
        returnRequestRepository.save(request);
    }

    private void seedUserAddresses(List<UserAccount> customers) {
        if (customers.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        createUserAddressIfMissing(
                customers.get(0),
                "Mộc Mầm User",
                "0909 123 456",
                "12 Đường Mộc Mầm",
                "Tầng 2, căn hộ hoa nâu",
                "Phường 6",
                "Quận 3",
                "TP.HCM",
                "TP.HCM",
                "700000",
                true,
                now.minusMonths(4)
        );

        if (customers.size() > 1) {
            createUserAddressIfMissing(
                    customers.get(1),
                    "Khách VIP Mộc Mầm",
                    "0908 222 333",
                    "88 Đồng Khởi",
                    "Landmark suite",
                    "Bến Nghé",
                    "Quận 1",
                    "TP.HCM",
                    "TP.HCM",
                    "700000",
                    true,
                    now.minusMonths(3)
            );
            createUserAddressIfMissing(
                    customers.get(1),
                    "Khách VIP Mộc Mầm",
                    "0908 222 333",
                    "21 Nguyễn Trung Ngạn",
                    "Tầng 5",
                    "Bến Nghé",
                    "Quận 1",
                    "TP.HCM",
                    "TP.HCM",
                    "700000",
                    false,
                    now.minusWeeks(5)
            );
        }

        if (customers.size() > 2) {
            createUserAddressIfMissing(
                    customers.get(2),
                    "Khách Hàng Ngày Mới",
                    "0907 456 789",
                    "25 Hai Bà Trưng",
                    "Khu văn phòng",
                    "Phường Võ Thị Sáu",
                    "Quận 3",
                    "TP.HCM",
                    "TP.HCM",
                    "700000",
                    true,
                    now.minusWeeks(8)
            );
        }
    }

    private void createUserAddressIfMissing(
            UserAccount user,
            String fullName,
            String phone,
            String addressLine1,
            String addressLine2,
            String ward,
            String district,
            String city,
            String province,
            String postalCode,
            boolean isDefault,
            LocalDateTime createdAt
    ) {
        List<UserAddress> addresses = userAddressRepository.findByUserOrderByIsDefaultDescCreatedAtDesc(user);
        UserAddress existing = addresses.stream()
                .filter(address -> equalsTrimmed(address.getAddressLine1(), addressLine1))
                .filter(address -> equalsTrimmed(address.getDistrict(), district))
                .filter(address -> equalsTrimmed(address.getPhone(), phone))
                .findFirst()
                .orElse(null);

        if (isDefault) {
            for (UserAddress address : addresses) {
                if (existing != null && address.getId() != null && address.getId().equals(existing.getId())) {
                    continue;
                }
                if (Boolean.TRUE.equals(address.getIsDefault())) {
                    address.setIsDefault(Boolean.FALSE);
                    userAddressRepository.save(address);
                }
            }
        }

        UserAddress target = existing != null
                ? existing
                : UserAddress.builder()
                        .user(user)
                        .createdAt(createdAt)
                        .build();

        boolean shouldSave = existing == null;
        if (!equalsTrimmed(target.getFullName(), fullName)) {
            target.setFullName(trimText(fullName));
            shouldSave = true;
        }
        if (!equalsTrimmed(target.getPhone(), phone)) {
            target.setPhone(trimText(phone));
            shouldSave = true;
        }
        if (!equalsTrimmed(target.getAddressLine1(), addressLine1)) {
            target.setAddressLine1(trimText(addressLine1));
            shouldSave = true;
        }
        if (!equalsTrimmed(target.getAddressLine2(), addressLine2)) {
            target.setAddressLine2(trimText(addressLine2));
            shouldSave = true;
        }
        if (!equalsTrimmed(target.getWard(), ward)) {
            target.setWard(trimText(ward));
            shouldSave = true;
        }
        if (!equalsTrimmed(target.getDistrict(), district)) {
            target.setDistrict(trimText(district));
            shouldSave = true;
        }
        if (!equalsTrimmed(target.getCity(), city)) {
            target.setCity(trimText(city));
            shouldSave = true;
        }
        if (!equalsTrimmed(target.getProvince(), province)) {
            target.setProvince(trimText(province));
            shouldSave = true;
        }
        if (!equalsTrimmed(target.getPostalCode(), postalCode)) {
            target.setPostalCode(trimText(postalCode));
            shouldSave = true;
        }

        Boolean targetDefault = isDefault ? Boolean.TRUE : Boolean.FALSE;
        if (!targetDefault.equals(target.getIsDefault())) {
            target.setIsDefault(targetDefault);
            shouldSave = true;
        }

        if (shouldSave) {
            userAddressRepository.save(target);
        }
    }

    private void seedSellerRatings(List<UserAccount> customers, List<UserAccount> sellers) {
        if (customers.isEmpty() || sellers.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        int[][] starMatrix = {
                {5, 4, 5},
                {4, 5, 4},
                {5, 4, 3}
        };

        for (int customerIndex = 0; customerIndex < customers.size(); customerIndex++) {
            UserAccount customer = customers.get(customerIndex);
            for (int sellerIndex = 0; sellerIndex < sellers.size(); sellerIndex++) {
                UserAccount seller = sellers.get(sellerIndex);
                int stars = starMatrix[customerIndex % starMatrix.length][sellerIndex % starMatrix[0].length];
                createSellerRatingIfMissing(
                        customer,
                        seller,
                        stars,
                        now.minusDays((customerIndex * 2L) + sellerIndex + 1L)
                );
            }
        }
    }

    private void createSellerRatingIfMissing(
            UserAccount customer,
            UserAccount seller,
            int stars,
            LocalDateTime createdAt
    ) {
        if (sellerRatingRepository.findByUserAndSeller(customer, seller).isPresent()) {
            return;
        }

        sellerRatingRepository.save(SellerRating.builder()
                .user(customer)
                .seller(seller)
                .stars(stars)
                .createdAt(createdAt)
                .updatedAt(createdAt)
                .build());
    }

    private void seedStoreMessages(
            List<UserAccount> customers,
            List<UserAccount> sellers,
            UserAccount warehouse,
            UserAccount admin
    ) {
        if (customers.isEmpty() || sellers.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();

        createStoreMessageIfMissing(
                customers.get(0),
                warehouse,
                "Chào shop, mình muốn kiểm tra đơn gần nhất đã được xác nhận chưa ạ?",
                now.minusHours(22)
        );
        createStoreMessageIfMissing(
                warehouse,
                customers.get(0),
                "Bên mình đã tiếp nhận và đang ưu tiên xử lý đơn cho bạn trong ca sáng nhé.",
                now.minusHours(21)
        );

        if (customers.size() > 1) {
            createStoreMessageIfMissing(
                    customers.get(1),
                    admin,
                    "Mình cần hỗ trợ đổi trả vì sản phẩm mặc chưa vừa, nhờ shop hướng dẫn giúp.",
                    now.minusHours(16)
            );
            createStoreMessageIfMissing(
                    admin,
                    customers.get(1),
                    "Bạn gửi giúp mình mã đơn và 1-2 ảnh hiện trạng để mình kiểm tra điều kiện đổi trả ngay nhé.",
                    now.minusHours(15)
            );
        }

        createStoreMessageIfMissing(
                sellers.get(0),
                warehouse,
                "Nhờ kho ưu tiên check một đơn đang cần đóng gói gấp trong chiều nay.",
                now.minusHours(12)
        );
        createStoreMessageIfMissing(
                warehouse,
                sellers.get(0),
                "Mình đã đánh dấu ưu tiên cho đơn này, sẽ cập nhật lại khi hoàn tất đóng gói.",
                now.minusHours(11)
        );

        createStoreMessageIfMissing(
                sellers.get(0),
                admin,
                "Cho mình nhờ đối soát một đơn chuyển khoản chưa nhảy trạng thái thanh toán.",
                now.minusHours(9)
        );
        createStoreMessageIfMissing(
                admin,
                sellers.get(0),
                "Finance đang rà soát giao dịch, mình sẽ cập nhật cho bạn trước cuối ca hôm nay.",
                now.minusHours(8)
        );

        if (sellers.size() > 1) {
            createStoreMessageIfMissing(
                    sellers.get(1),
                    admin,
                    "Mình cần hỗ trợ case khách khiếu nại giao thiếu phụ kiện trong combo.",
                    now.minusHours(6)
            );
            createStoreMessageIfMissing(
                    admin,
                    sellers.get(1),
                    "Mình đã mở luồng kiểm tra nội bộ và sẽ phản hồi sau khi kho xác minh phiếu pick.",
                    now.minusHours(5)
            );
        }
    }

    private void createStoreMessageIfMissing(
            UserAccount sender,
            UserAccount receiver,
            String content,
            LocalDateTime createdAt
    ) {
        boolean exists = storeMessageRepository.findConversation(sender, receiver).stream()
                .anyMatch(message -> message.getSender() != null
                        && message.getReceiver() != null
                        && message.getSender().getId().equals(sender.getId())
                        && message.getReceiver().getId().equals(receiver.getId())
                        && content.equals(message.getContent()));
        if (exists) {
            return;
        }

        storeMessageRepository.save(StoreMessage.builder()
                .sender(sender)
                .receiver(receiver)
                .content(content)
                .createdAt(createdAt)
                .build());
    }

    private void seedProductReviews(List<Order> orders, List<UserAccount> customers) {
        if (orders.isEmpty() || customers.isEmpty()) {
            return;
        }

        List<Order> deliveredOrders = orders.stream()
                .filter(order -> order.getStatus() == Order.Status.DELIVERED)
                .sorted(Comparator.comparing(Order::getCreatedAt).reversed())
                .toList();
        if (deliveredOrders.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        Set<Long> touchedProductIds = new java.util.LinkedHashSet<>();

        for (int index = 0; index < deliveredOrders.size(); index++) {
            Order order = deliveredOrders.get(index);
            UserAccount reviewer = order.getUser();
            if (reviewer == null || reviewer.getRole() != UserAccount.Role.USER) {
                reviewer = customers.get(index % customers.size());
            }
            if (order.getItems() == null || order.getItems().isEmpty()) {
                continue;
            }

            for (int itemIndex = 0; itemIndex < order.getItems().size() && itemIndex < 2; itemIndex++) {
                OrderItem item = order.getItems().get(itemIndex);
                if (item.getId() == null) {
                    continue;
                }
                if (productReviewRepository.existsByUserAndOrderItemId(reviewer, item.getId())) {
                    continue;
                }
                if (item.getProductId() == null) {
                    continue;
                }
                Product product = productRepository.findById(item.getProductId()).orElse(null);
                if (product == null) {
                    continue;
                }
                int rating = resolveDemoReviewRating(index, itemIndex);
                LocalDateTime createdAt = now.minusDays(index + itemIndex + 2L).minusHours((index * 3L) % 7);
                productReviewRepository.save(ProductReview.builder()
                        .product(product)
                        .order(order)
                        .user(reviewer)
                        .orderItemId(item.getId())
                        .rating(rating)
                        .comment(buildDemoReviewComment(product.getName(), rating))
                        .createdAt(createdAt)
                        .updatedAt(createdAt)
                        .build());
                touchedProductIds.add(product.getId());
            }
        }

        refreshProductReviewStats(touchedProductIds);
    }

    private int resolveDemoReviewRating(int orderIndex, int itemIndex) {
        int[] ratings = {5, 4, 5, 3, 4, 5, 4, 5};
        return ratings[(orderIndex + itemIndex) % ratings.length];
    }

    private String buildDemoReviewComment(String productName, int rating) {
        String label = productName != null && !productName.isBlank() ? productName : "Sản phẩm";
        return switch (rating) {
            case 5 -> label + " mặc lên đẹp hơn mong đợi, form ổn và shop xử lý đơn rất nhanh.";
            case 4 -> label + " đúng mô tả, đóng gói cẩn thận, chỉ cần theo sát giao hàng thêm chút.";
            case 3 -> label + " ổn nhưng mình mong phần tư vấn size và cập nhật giao hàng rõ hơn.";
            default -> label + " cần hỗ trợ thêm sau mua, mong shop theo sát phần đổi trả tốt hơn.";
        };
    }

    private void refreshProductReviewStats(Set<Long> productIds) {
        for (Long productId : productIds) {
            Product product = productRepository.findById(productId).orElse(null);
            if (product == null) {
                continue;
            }
            List<ProductReview> reviews = productReviewRepository.findByProductOrderByCreatedAtDesc(product);
            int reviewCount = reviews.size();
            double averageRating = reviewCount == 0
                    ? 0.0
                    : reviews.stream().mapToInt(ProductReview::getRating).average().orElse(0.0);
            product.setReviewCount(reviewCount);
            product.setAverageRating(averageRating);
            productRepository.save(product);
        }
    }

    private List<ProductVariant> collectSellerVariants(UserAccount seller) {
        List<ProductVariant> variants = productRepository.findBySellerIdAndActiveTrueOrderByCreatedAtDesc(seller.getId()).stream()
                .flatMap(product -> product.getVariants().stream())
                .filter(variant -> variant.getStockQty() != null && variant.getStockQty() > 0)
                .sorted(Comparator
                        .comparing((ProductVariant variant) -> variant.getProduct().getName(), String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(ProductVariant::getColor, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                        .thenComparing(ProductVariant::getSize, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();
        if (!variants.isEmpty()) {
            return variants;
        }

        // Some local datasets keep the demo catalog but lose seller linkage, which would otherwise
        // leave the admin dashboard with no seeded orders at all.
        return productRepository.findTop40ByActiveTrueOrderByFeaturedDescCreatedAtDesc().stream()
                .flatMap(product -> product.getVariants().stream())
                .filter(variant -> variant.getStockQty() != null && variant.getStockQty() > 0)
                .sorted(Comparator
                        .comparing((ProductVariant variant) -> variant.getProduct().getName(), String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(ProductVariant::getColor, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                        .thenComparing(ProductVariant::getSize, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();
    }

    private Order.Status resolveDemoOrderStatus(int index, int count) {
        int remaining = count - index;
        if (remaining == 1 || remaining == 2) {
            return Order.Status.PENDING;
        }
        if (remaining == 3) {
            return Order.Status.CONFIRMED;
        }
        if (remaining == 4) {
            return Order.Status.PACKING;
        }
        if (remaining == 5) {
            return Order.Status.SHIPPED;
        }

        int mod = index % 10;
        if (mod == 0) {
            return Order.Status.CANCELLED;
        }
        if (mod == 1 || mod == 6) {
            return Order.Status.CONFIRMED;
        }
        if (mod == 2 || mod == 7) {
            return Order.Status.SHIPPED;
        }
        if (mod == 5) {
            return Order.Status.PACKING;
        }
        return Order.Status.DELIVERED;
    }

    private Order.PaymentMethod resolveDemoPaymentMethod(int index, Order.Status status) {
        return switch (status) {
            case PENDING -> index % 4 == 0 ? Order.PaymentMethod.BANK_TRANSFER : Order.PaymentMethod.COD;
            case CONFIRMED, PACKING -> index % 3 == 0
                    ? Order.PaymentMethod.BANK_TRANSFER
                    : (index % 2 == 0 ? Order.PaymentMethod.COD : Order.PaymentMethod.BANK_TRANSFER);
            case CANCELLED -> index % 2 == 0 ? Order.PaymentMethod.BANK_TRANSFER : Order.PaymentMethod.COD;
            case SHIPPED, DELIVERED, PROCESSING -> index % 2 == 0 ? Order.PaymentMethod.BANK_TRANSFER : Order.PaymentMethod.COD;
        };
    }

    private Order.PaymentStatus resolveDemoPaymentStatus(
            int index,
            Order.Status status,
            Order.PaymentMethod paymentMethod
    ) {
        if (status == Order.Status.CANCELLED) {
            return paymentMethod == Order.PaymentMethod.BANK_TRANSFER && index % 4 == 0
                    ? Order.PaymentStatus.REFUNDED
                    : Order.PaymentStatus.UNPAID;
        }
        if (status == Order.Status.PENDING || status == Order.Status.PROCESSING) {
            return Order.PaymentStatus.UNPAID;
        }
        if (status == Order.Status.DELIVERED) {
            return index % 5 == 0 ? Order.PaymentStatus.REFUNDED : Order.PaymentStatus.PAID;
        }
        if (status == Order.Status.SHIPPED) {
            return paymentMethod == Order.PaymentMethod.BANK_TRANSFER
                    ? Order.PaymentStatus.PAID
                    : Order.PaymentStatus.UNPAID;
        }
        if (status == Order.Status.PACKING) {
            if (paymentMethod == Order.PaymentMethod.BANK_TRANSFER) {
                return index % 4 == 0 ? Order.PaymentStatus.UNPAID : Order.PaymentStatus.PAID;
            }
            return Order.PaymentStatus.UNPAID;
        }
        if (paymentMethod == Order.PaymentMethod.BANK_TRANSFER) {
            return status == Order.Status.CONFIRMED && index % 3 != 1
                    ? Order.PaymentStatus.UNPAID
                    : Order.PaymentStatus.PAID;
        }
        return Order.PaymentStatus.UNPAID;
    }

    private double resolveDemoLineUnitPrice(Product product, ProductVariant variant) {
        if (variant != null && variant.getPriceOverride() != null) {
            return variant.getPriceOverride();
        }
        if (product.getSalePrice() != null) {
            return product.getSalePrice();
        }
        return product.getBasePrice();
    }

    private LocalDateTime resolveDemoUpdatedAt(Order.Status status, LocalDateTime createdAt) {
        return switch (status) {
            case PENDING -> createdAt.plusMinutes(18);
            case CONFIRMED -> createdAt.plusHours(4);
            case PACKING -> createdAt.plusHours(8);
            case SHIPPED -> createdAt.plusHours(18);
            case DELIVERED -> createdAt.plusDays(2);
            case CANCELLED -> createdAt.plusHours(6);
            case PROCESSING -> createdAt.plusMinutes(25);
        };
    }

    private String buildDemoOrderNote(Order.Status status, UserAccount seller, int index) {
        String storeName = seller.getStoreName() != null ? seller.getStoreName() : seller.getFullName();
        return switch (status) {
            case PENDING -> "Đơn demo mới tạo cho gian hàng " + storeName + ".";
            case CONFIRMED -> "Đơn demo đã xác nhận, chờ kho tiếp nhận.";
            case PACKING -> "Đơn demo đang QC và đóng gói tại kho.";
            case SHIPPED -> "Đơn demo đã bàn giao vận chuyển.";
            case DELIVERED -> "Đơn demo giao thành công, dùng cho báo cáo doanh thu.";
            case CANCELLED -> "Đơn demo hủy do khách đổi lịch nhận hàng ở phiên " + (index + 1) + ".";
            case PROCESSING -> "Đơn demo đang xử lý nội bộ.";
        };
    }

    private List<Order> sortOrdersNewestFirst(List<Order> orders) {
        return orders.stream()
                .sorted(Comparator.comparing(Order::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .toList();
    }

    private void ensureDemoStoreProfile(
            UserAccount user,
            String storeName,
            String storeDescription,
            String storePhone,
            String storeAddress
    ) {
        boolean shouldSave = false;
        String nextStoreName = trimText(storeName);
        String nextStoreDescription = trimText(storeDescription);
        String nextStorePhone = trimText(storePhone);
        String nextStoreAddress = trimText(storeAddress);

        if (!equalsTrimmed(user.getStoreName(), nextStoreName)) {
            user.setStoreName(nextStoreName);
            shouldSave = true;
        }
        if (!equalsTrimmed(user.getStorePhone(), nextStorePhone)) {
            user.setStorePhone(nextStorePhone);
            shouldSave = true;
        }
        if (!equalsTrimmed(user.getStoreAddress(), nextStoreAddress)) {
            user.setStoreAddress(nextStoreAddress);
            shouldSave = true;
        }
        if (!equalsTrimmed(user.getStoreDescription(), nextStoreDescription)) {
            user.setStoreDescription(nextStoreDescription);
            shouldSave = true;
        }
        if (Boolean.TRUE.equals(user.getBusinessRequestPending())) {
            user.setBusinessRequestPending(false);
            shouldSave = true;
        }
        if (user.getBusinessRequestedAt() != null) {
            user.setBusinessRequestedAt(null);
            shouldSave = true;
        }

        if (shouldSave) {
            userAccountRepository.save(user);
        }
    }

    private void ensureDemoBusinessApplicant(
            UserAccount user,
            String storeName,
            String storePhone,
            String storeAddress,
            String storeDescription,
            int requestedDaysAgo
    ) {
        boolean shouldSave = false;
        if (user.getRole() != UserAccount.Role.USER) {
            user.setRole(UserAccount.Role.USER);
            shouldSave = true;
        }
        if (!equalsTrimmed(user.getStoreName(), trimText(storeName))) {
            user.setStoreName(trimText(storeName));
            shouldSave = true;
        }
        if (!equalsTrimmed(user.getStorePhone(), trimText(storePhone))) {
            user.setStorePhone(trimText(storePhone));
            shouldSave = true;
        }
        if (!equalsTrimmed(user.getStoreAddress(), trimText(storeAddress))) {
            user.setStoreAddress(trimText(storeAddress));
            shouldSave = true;
        }
        if (!equalsTrimmed(user.getStoreDescription(), trimText(storeDescription))) {
            user.setStoreDescription(trimText(storeDescription));
            shouldSave = true;
        }
        if (!Boolean.TRUE.equals(user.getBusinessRequestPending())) {
            user.setBusinessRequestPending(true);
            shouldSave = true;
        }
        LocalDateTime requestedAt = LocalDateTime.now().minusDays(Math.max(1, requestedDaysAgo)).minusHours(3);
        if (user.getBusinessRequestedAt() == null || Math.abs(java.time.Duration.between(user.getBusinessRequestedAt(), requestedAt).toHours()) > 1) {
            user.setBusinessRequestedAt(requestedAt);
            shouldSave = true;
        }
        if (shouldSave) {
            userAccountRepository.save(user);
        }
    }

    private void seedPartnerSellerCatalog(
            UserAccount seller,
            Category women,
            Category men,
            Category accessories,
            Category sale,
            String family
    ) {
        List<String> existingNames = new ArrayList<>(productRepository.findBySellerIdOrderByCreatedAtDesc(seller.getId()).stream()
                .map(Product::getName)
                .map(name -> name == null ? "" : name.toLowerCase(Locale.ROOT))
                .toList());

        if ("sage".equalsIgnoreCase(family)) {
            createSellerProductIfMissing(existingNames, seller, "Blazer oat commute", women, Gender.WOMEN,
                    "Mẫu blazer trung tính cho ngày đi làm gọn gàng.", 520_000.0, 469_000.0, true,
                    List.of(IMAGE_POOL[0]), List.of(
                            new VariantDraft("S", "Oat", 9),
                            new VariantDraft("M", "Oat", 12),
                            new VariantDraft("L", "Be", 8)
                    ));
            createSellerProductIfMissing(existingNames, seller, "Quần tây moss line", men, Gender.MEN,
                    "Quần tây form đứng, hợp outfit commute và meeting.", 390_000.0, null, false,
                    List.of(IMAGE_POOL[5]), List.of(
                            new VariantDraft("M", "Olive", 10),
                            new VariantDraft("L", "Olive", 12),
                            new VariantDraft("XL", "Xám khói", 7)
                    ));
            createSellerProductIfMissing(existingNames, seller, "Sơ mi cloud stripe", men, Gender.MEN,
                    "Sơ mi sọc nhẹ, dễ phối với quần tây hoặc jean.", 360_000.0, 329_000.0, true,
                    List.of(IMAGE_POOL[6]), List.of(
                            new VariantDraft("M", "Trắng", 11),
                            new VariantDraft("L", "Xanh navy", 9),
                            new VariantDraft("XL", "Trắng", 7)
                    ));
            createSellerProductIfMissing(existingNames, seller, "Túi commuter olive", accessories, Gender.UNISEX,
                    "Túi đi làm form đứng, đựng vừa laptop và tài liệu.", 310_000.0, null, true,
                    List.of(IMAGE_POOL[4]), List.of(
                            new VariantDraft("Free", "Olive", 16),
                            new VariantDraft("Free", "Be", 12)
                    ));
            createSellerProductIfMissing(existingNames, seller, "Set workday caramel", sale, Gender.UNISEX,
                    "Set đi làm trung tính, chụp lookbook và lên dashboard rất đẹp.", 560_000.0, 489_000.0, true,
                    List.of(IMAGE_POOL[2]), List.of(
                            new VariantDraft("M", "Caramel", 8),
                            new VariantDraft("L", "Caramel", 9)
                    ));
            createSellerProductIfMissing(existingNames, seller, "Áo polo clay club", men, Gender.MEN,
                    "Áo polo tông đất, form regular dễ mặc cho khách nam.", 295_000.0, null, false,
                    List.of(IMAGE_POOL[3]), List.of(
                            new VariantDraft("M", "Gạch", 14),
                            new VariantDraft("L", "Gạch", 13),
                            new VariantDraft("XL", "Kem", 8)
                    ));
            return;
        }

        createSellerProductIfMissing(existingNames, seller, "Đầm butter bloom", women, Gender.WOMEN,
                "Đầm nhẹ, gam bơ sáng phù hợp chụp campaign cuối tuần.", 430_000.0, 389_000.0, true,
                List.of(IMAGE_POOL[9]), List.of(
                        new VariantDraft("S", "Vanilla", 10),
                        new VariantDraft("M", "Kem", 12),
                        new VariantDraft("L", "Be", 8)
                ));
        createSellerProductIfMissing(existingNames, seller, "Chân váy pebble midi", women, Gender.WOMEN,
                "Chân váy midi dễ phối với knitwear, sơ mi hoặc baby tee.", 285_000.0, null, false,
                List.of(IMAGE_POOL[10]), List.of(
                        new VariantDraft("S", "Xám khói", 12),
                        new VariantDraft("M", "Be", 11),
                        new VariantDraft("L", "Kem", 7)
                ));
        createSellerProductIfMissing(existingNames, seller, "Gile knit nougat", women, Gender.WOMEN,
                "Gile knit mềm, lên outfit nhẹ và dễ layer cho mùa chuyển mùa.", 255_000.0, null, true,
                List.of(IMAGE_POOL[12]), List.of(
                        new VariantDraft("S", "Hạnh nhân", 14),
                        new VariantDraft("M", "Mocha", 12)
                ));
        createSellerProductIfMissing(existingNames, seller, "Túi mini cocoa fold", accessories, Gender.UNISEX,
                "Túi mini gập, hợp look cuối tuần và dạo phố.", 260_000.0, 219_000.0, true,
                List.of(IMAGE_POOL[4]), List.of(
                        new VariantDraft("Free", "Mocha", 15),
                        new VariantDraft("Free", "Kem", 10)
                ));
        createSellerProductIfMissing(existingNames, seller, "Khăn lụa vanilla trim", accessories, Gender.UNISEX,
                "Khăn lụa viền sáng, làm điểm nhấn nhẹ cho outfit.", 150_000.0, null, false,
                List.of(IMAGE_POOL[7]), List.of(
                        new VariantDraft("Free", "Vanilla", 18),
                        new VariantDraft("Free", "Hồng dusty", 11)
                ));
        createSellerProductIfMissing(existingNames, seller, "Set weekend sand", sale, Gender.UNISEX,
                "Set weekend tông sand dành cho campaign đi chơi và picnic.", 495_000.0, 425_000.0, true,
                List.of(IMAGE_POOL[11]), List.of(
                        new VariantDraft("M", "Be", 9),
                        new VariantDraft("L", "Oat", 8)
                ));
    }

    private void createSellerProductIfMissing(
            List<String> existingNames,
            UserAccount seller,
            String name,
            Category category,
            Gender gender,
            String description,
            Double basePrice,
            Double salePrice,
            boolean featured,
            List<String> imageUrls,
            List<VariantDraft> variants
    ) {
        String normalizedName = name.toLowerCase(Locale.ROOT);
        if (existingNames.contains(normalizedName)) {
            return;
        }

        Product product = createProduct(
                name,
                category,
                gender,
                description,
                basePrice,
                salePrice,
                featured,
                seller,
                imageUrls
        );
        for (VariantDraft variant : variants) {
            addVariant(product, variant.size(), variant.color(), variant.stockQty(), null, imageUrls.get(0));
        }
        existingNames.add(normalizedName);
    }

    private boolean equalsTrimmed(String current, String expected) {
        String currentTrimmed = trimText(current);
        String expectedTrimmed = trimText(expected);
        if (currentTrimmed == null) {
            return expectedTrimmed == null;
        }
        return currentTrimmed.equals(expectedTrimmed);
    }

    private String trimText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private record VariantDraft(String size, String color, int stockQty) {
    }

    private record ProductImageFile(String slug, String fileName, int order) {
    }

    private record TicketCommentDraft(UserAccount actor, String message, LocalDateTime createdAt) {
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

    private UserAccount getOrCreateDemoUser(String fullName, String email, UserAccount.Role role) {
        return userAccountRepository.findByEmail(email)
                .map(existing -> {
                    boolean shouldSave = false;
                    String normalizedEmail = email == null ? null : email.trim().toLowerCase(Locale.ROOT);
                    if (existing.getRole() != role) {
                        existing.setRole(role);
                        shouldSave = true;
                    }
                    if (normalizedEmail != null && !normalizedEmail.equals(existing.getEmail())) {
                        existing.setEmail(normalizedEmail);
                        shouldSave = true;
                    }
                    if (existing.getFullName() == null || existing.getFullName().isBlank()) {
                        existing.setFullName(fullName);
                        shouldSave = true;
                    }
                    if (existing.getPasswordHash() == null
                            || existing.getPasswordHash().isBlank()
                            || !passwordEncoder.matches("password", existing.getPasswordHash())) {
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
                        .email(email == null ? null : email.trim().toLowerCase(Locale.ROOT))
                        .passwordHash(passwordEncoder.encode("password"))
                        .role(role)
                        .monthlyIncome(15_000_000.0)
                        .build()));
    }
}
