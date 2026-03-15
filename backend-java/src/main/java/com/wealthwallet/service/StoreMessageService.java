package com.wealthwallet.service;

import com.wealthwallet.domain.entity.Cart;
import com.wealthwallet.domain.entity.CartItem;
import com.wealthwallet.domain.entity.Order;
import com.wealthwallet.domain.entity.Product;
import com.wealthwallet.domain.entity.StoreMessage;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.StoreMessagePartnerResponse;
import com.wealthwallet.dto.StoreMessageRequest;
import com.wealthwallet.dto.StoreMessageResponse;
import com.wealthwallet.repository.CartRepository;
import com.wealthwallet.repository.OrderRepository;
import com.wealthwallet.repository.ProductRepository;
import com.wealthwallet.repository.StoreMessageRepository;
import com.wealthwallet.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class StoreMessageService {

    private static final Logger log = LoggerFactory.getLogger(StoreMessageService.class);

    private enum StyleTopic {
        SKIN_TONE,
        BODY_SHAPE,
        HEIGHT,
        WEIGHT,
        FACE
    }

    private static final Pattern HEIGHT_PATTERN = Pattern.compile("\\b(?:1m\\d{1,2}|m\\d{2}|\\d{3}\\s?cm|\\d\\.\\d{2}\\s?m)\\b");
    private static final Pattern WEIGHT_PATTERN = Pattern.compile("\\b\\d{1,3}(?:\\.\\d)?\\s?kg\\b");

    private static final List<String> FULL_GUIDE_TRIGGER_KEYWORDS = List.of(
            "nhan moc mam",
            "huong dan chon trang phuc",
            "huong dan chon trang phuc phu hop theo mau da voc dang chieu cao va khuon mat"
    );

    private static final List<String> STYLE_CONTEXT_KEYWORDS = List.of(
            "tu van",
            "thoi trang",
            "trang phuc",
            "goi y",
            "phoi do",
            "mix do",
            "mix match",
            "outfit",
            "phong cach",
            "style",
            "di tiec",
            "di dam cuoi",
            "di su kien",
            "mac gi",
            "mac dep",
            "phoi mau",
            "ton dang",
            "ao gi",
            "quan gi",
            "chan vay",
            "vay"
    );

    private static final List<String> SUPPORT_CONTEXT_KEYWORDS = List.of(
            "don hang",
            "ma don",
            "ma don hang",
            "trang thai don",
            "van chuyen",
            "giao hang",
            "ship",
            "phi ship",
            "phi van chuyen",
            "thanh toan",
            "cod",
            "chuyen khoan",
            "bank transfer",
            "doi size",
            "doi tra",
            "tra hang",
            "hoan tien",
            "refund",
            "huy don",
            "cancel",
            "chinh sach"
    );

    private static final List<String> SKIN_TONE_KEYWORDS = List.of(
            "tong da",
            "mau da",
            "undertone",
            "da am",
            "da lanh",
            "da trung tinh",
            "da ngam",
            "da trang",
            "mau nao hop da",
            "hop mau nao"
    );

    private static final List<String> BODY_SHAPE_KEYWORDS = List.of(
            "voc dang",
            "dang nguoi",
            "dang chu nhat",
            "dang tao",
            "dang pear",
            "dang rectangle",
            "dang hourglass",
            "dong ho cat",
            "chu nhat",
            "qua le",
            "tam giac nguoc",
            "eo hong",
            "so do 3 vong",
            "bung to",
            "vai rong",
            "hong to"
    );

    private static final List<String> HEIGHT_KEYWORDS = List.of(
            "chieu cao",
            "cao bao nhieu",
            "cao met",
            "chan ngan",
            "nam lun",
            "petite",
            "nguoi thap"
    );

    private static final List<String> WEIGHT_KEYWORDS = List.of(
            "can nang",
            "plus size",
            "big size",
            "ngoai co",
            "manh khanh",
            "nguoi map",
            "nguoi beo",
            "mo bung",
            "than hinh day dan",
            "than hinh thon gon",
            "nguoi gay",
            "em gay"
    );

    private static final List<String> FACE_KEYWORDS = List.of(
            "khuon mat",
            "mat tron",
            "mat vuong",
            "mat dai",
            "mat trai tim",
            "co ao",
            "chon co ao",
            "kieu co ao",
            "co ao nao hop",
            "neckline",
            "co tim",
            "co v",
            "co vuong"
    );

    private static final String SKIN_TONE_RESPONSE = """
            Tông da:
            - Ấm: cam, nâu đất, xanh rêu.
            - Lạnh: xanh dương, tím than, xám.
            - Trung tính: be, kem, taupe.
            """;

    private static final String BODY_SHAPE_RESPONSE = """
            Vóc dáng:
            - Chữ nhật: wrap/A-line + thắt eo.
            - Đồng hồ cát: đồ vừa vặn, nhấn eo.
            - Quả lê: sáng ở trên, gọn/A-line ở dưới.
            - Tam giác ngược: tăng volume phần dưới, giảm nhấn vai.
            """;

    private static final String HEIGHT_RESPONSE = """
            Chiều cao:
            - Thấp: cạp cao, cổ V, set đơn sắc.
            - Cao: áo có cấu trúc, quần ống rộng, váy midi.
            - Trung bình: fit-and-flare hoặc A-line.
            """;

    private static final String WEIGHT_RESPONSE = """
            Cân nặng:
            - Plus size: cổ V, cạp cao, đường dọc, vải rủ.
            - Mảnh khảnh: thêm layer, blazer/cầu vai.
            - Muốn thon: màu tối + phom gọn.
            - Muốn đầy: thêm lớp + chất liệu đứng.
            """;

    private static final String FACE_RESPONSE = """
            Khuôn mặt (cổ áo):
            - Mặt tròn: cổ V/cổ vuông.
            - Mặt vuông: cổ tim/cổ tròn sâu.
            - Mặt dài: cổ thuyền/cổ vuông.
            - Mặt oval: hợp đa số kiểu cổ.
            """;

    private static final String FALLBACK_STYLE_RESPONSE = """
            Mình cần thêm thông tin để tư vấn chuẩn:
            1) Tông da
            2) Vóc dáng
            3) Chiều cao
            4) Cân nặng/độ đầy đặn
            5) Khuôn mặt
            Ví dụ: "Mình 1m55, dáng quả lê, da ấm".
            """;

    private static final String STYLES_ROUTE_TO_CSKH_RESPONSE = """
            Mình hỗ trợ tư vấn phối đồ ngay trên kênh hỗ trợ này.
            Nếu bạn cần hỗ trợ đơn hàng/đổi trả/thanh toán, bạn gửi thêm mã đơn hàng hoặc email đặt hàng để mình kiểm tra nhanh nhé.
            """;

    private static final String ADMIN_CLARIFY_INTENT_RESPONSE = "Bạn cần hỗ trợ đơn hàng hay tư vấn phối đồ?";

    private static final String ADMIN_SUPPORT_FALLBACK_RESPONSE = """
            Bạn cho mình xin mã đơn hàng hoặc email đặt hàng để mình hướng dẫn bước tiếp theo nhé.
            Bạn cũng có thể vào mục “Đơn hàng” trong tài khoản để xem trạng thái đơn gần nhất.
            """;

    private static final Set<String> STYLE_STOPWORDS = Set.of(
            "toi",
            "minh",
            "em",
            "anh",
            "chi",
            "ban",
            "la",
            "va",
            "voi",
            "nhung",
            "nay",
            "kia",
            "de",
            "cho",
            "can",
            "muon",
            "nhe",
            "nha",
            "khong",
            "co",
            "gi",
            "the",
            "nao",
            "duoc",
            "roi",
            "nua"
    );

    private static final Set<String> KNOWN_STYLE_TERMS = buildKnownStyleTerms();

    private final StoreMessageRepository storeMessageRepository;
    private final UserAccountRepository userAccountRepository;
    private final CartRepository cartRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final StoreAssistantAiService storeAssistantAiService;

    @Transactional(readOnly = true)
    public List<StoreMessagePartnerResponse> listPartners(UserAccount currentUser) {
        UserAccount.Role currentRole = currentUser.getRole();
        Long currentUserId = currentUser.getId();

        if (currentRole == UserAccount.Role.USER) {
            return userAccountRepository.findByRoleIn(List.of(
                            UserAccount.Role.STYLES,
                            UserAccount.Role.WAREHOUSE,
                            UserAccount.Role.ADMIN
                    )).stream()
                    .map(this::mapPartner)
                    .toList();
        }

        if (currentRole == UserAccount.Role.SELLER) {
            Set<Long> seenUserIds = new LinkedHashSet<>();
            List<StoreMessagePartnerResponse> partners = new ArrayList<>();

            storeMessageRepository.findBySenderIdOrReceiverIdOrderByCreatedAtDesc(currentUserId, currentUserId).stream()
                    .map(message -> {
                        if (message.getSender() != null && currentUserId.equals(message.getSender().getId())) {
                            return message.getReceiver();
                        }
                        return message.getSender();
                    })
                    .filter(user -> user != null && user.getId() != null)
                    .filter(user -> seenUserIds.add(user.getId()))
                    .filter(user -> isSupportRole(user.getRole()))
                    .forEach(user -> partners.add(mapPartner(user)));

            userAccountRepository.findByRoleIn(List.of(
                            UserAccount.Role.WAREHOUSE,
                            UserAccount.Role.ADMIN,
                            UserAccount.Role.STYLES
                    )).stream()
                    .filter(user -> user.getId() != null && !currentUserId.equals(user.getId()))
                    .filter(user -> seenUserIds.add(user.getId()))
                    .forEach(user -> partners.add(mapPartner(user)));

            return partners;
        }

        if (isStaffRole(currentRole)) {
            Set<Long> seenUserIds = new LinkedHashSet<>();
            List<StoreMessagePartnerResponse> partners = new ArrayList<>();

            storeMessageRepository.findBySenderIdOrReceiverIdOrderByCreatedAtDesc(currentUserId, currentUserId).stream()
                    .map(message -> {
                        if (message.getSender() != null && currentUserId.equals(message.getSender().getId())) {
                            return message.getReceiver();
                        }
                        return message.getSender();
                    })
                    .filter(user -> user != null && user.getId() != null)
                    .filter(user -> seenUserIds.add(user.getId()))
                    .filter(user -> canStaffTalkTo(user.getRole()))
                    .forEach(user -> partners.add(mapPartner(user)));

            userAccountRepository.findByRoleIn(List.of(UserAccount.Role.SELLER, UserAccount.Role.USER)).stream()
                    .filter(user -> user.getId() != null && !currentUserId.equals(user.getId()))
                    .filter(user -> seenUserIds.add(user.getId()))
                    .forEach(user -> partners.add(mapPartner(user)));

            return partners;
        }
        throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền nhắn tin");
    }

    @Transactional(readOnly = true)
    public List<StoreMessageResponse> listMessages(UserAccount currentUser, Long otherUserId) {
        UserAccount other = userAccountRepository.findById(otherUserId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
        validateConversation(currentUser, other);
        return storeMessageRepository.findConversation(currentUser, other).stream()
                .map(message -> new StoreMessageResponse(
                        message.getId(),
                        message.getSender().getId(),
                        message.getReceiver().getId(),
                        message.getContent(),
                        message.getCreatedAt(),
                        message.getSender().getId().equals(currentUser.getId())
                ))
                .toList();
    }

    @Transactional
    public StoreMessageResponse sendMessage(UserAccount currentUser, Long otherUserId, StoreMessageRequest request) {
        UserAccount other = userAccountRepository.findById(otherUserId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
        validateConversation(currentUser, other);
        String trimmedContent = request.content().trim();
        StoreMessage message = StoreMessage.builder()
                .sender(currentUser)
                .receiver(other)
                .content(trimmedContent)
                .build();
        StoreMessage saved = storeMessageRepository.save(message);

        maybeSendAutoReply(currentUser, other, trimmedContent);

        return new StoreMessageResponse(
                saved.getId(),
                saved.getSender().getId(),
                saved.getReceiver().getId(),
                saved.getContent(),
                saved.getCreatedAt(),
                Boolean.TRUE
        );
    }

    @Transactional
    public void sendSystemMessage(UserAccount sender, UserAccount receiver, String content) {
        if (content == null || content.isBlank()) {
            return;
        }
        validateConversation(sender, receiver);
        StoreMessage message = StoreMessage.builder()
                .sender(sender)
                .receiver(receiver)
                .content(content.trim())
                .build();
        storeMessageRepository.save(message);
    }

    private void validateConversation(UserAccount current, UserAccount other) {
        UserAccount.Role currentRole = current.getRole();
        UserAccount.Role otherRole = other.getRole();

        if (currentRole == UserAccount.Role.USER) {
            if (!isSupportRole(otherRole)) {
                throw new ResponseStatusException(BAD_REQUEST, "Chỉ nhắn tin với bộ phận hỗ trợ");
            }
            return;
        }

        if (currentRole == UserAccount.Role.SELLER) {
            if (!isSupportRole(otherRole)) {
                throw new ResponseStatusException(BAD_REQUEST, "Seller chỉ được nhắn với bộ phận vận hành/hỗ trợ");
            }
            return;
        }

        if (isStaffRole(currentRole)) {
            if (!canStaffTalkTo(otherRole)) {
                throw new ResponseStatusException(BAD_REQUEST, "Nhân viên chỉ nhắn tin với user hoặc seller");
            }
            return;
        }
        throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền nhắn tin");
    }

    private void maybeSendAutoReply(UserAccount sender, UserAccount receiver, String content) {
        if (sender.getRole() != UserAccount.Role.USER) {
            return;
        }
        if (content == null || content.isBlank()) {
            return;
        }

        String normalized = sanitizeForMatching(content);

        if (isSupportRole(receiver.getRole())) {
            maybeSendAdminAutoReply(sender, receiver, content, normalized);
        }
    }

    private void maybeSendStylesAutoReply(UserAccount user, UserAccount stylesPartner, String content, String normalized) {
        if (containsAny(normalized, FULL_GUIDE_TRIGGER_KEYWORDS)) {
            String baseReply = buildStyleGuideReply(EnumSet.allOf(StyleTopic.class));
            if (baseReply == null || baseReply.isBlank()) {
                return;
            }
            sendSystemMessage(stylesPartner, user, baseReply);
            return;
        }

        String baseReply;
        boolean isSupportIntent = isSupportConversation(normalized);
        boolean isStyleIntent = isStyleConversation(normalized);

        String aiReply = storeAssistantAiService.generateReply(
                StoreAssistantAiService.Persona.STYLES,
                content,
                buildRecentConversationForAi(user, stylesPartner),
                buildCartContextForAi(user),
                buildSuggestedProductsHintForAi(user),
                null
        ).orElse(null);

        if (aiReply != null && !aiReply.isBlank()) {
            baseReply = aiReply;
        } else if (isSupportIntent) {
            baseReply = STYLES_ROUTE_TO_CSKH_RESPONSE;
        } else if (!isStyleIntent) {
            baseReply = STYLES_ROUTE_TO_CSKH_RESPONSE;
        } else {
            EnumSet<StyleTopic> requestedTopics = detectRequestedTopics(normalized);

            if (!requestedTopics.isEmpty()) {
                baseReply = buildStyleGuideReply(requestedTopics);
            } else if (containsAny(normalized, STYLE_CONTEXT_KEYWORDS)) {
                baseReply = FALLBACK_STYLE_RESPONSE;
                logUnmatchedStyleIntent(user, stylesPartner, normalized);
            } else {
                return;
            }
        }

        boolean shouldAppendProducts = isStyleIntent && !isSupportIntent;
        String finalReply = shouldAppendProducts
                ? composeFinalReply(user, baseReply)
                : compactReply(baseReply, STYLES_ROUTE_TO_CSKH_RESPONSE);
        if (finalReply == null || finalReply.isBlank()) {
            return;
        }
        sendSystemMessage(stylesPartner, user, finalReply);
    }

    private void maybeSendAdminAutoReply(UserAccount user, UserAccount adminPartner, String content, String normalized) {
        if (containsAny(normalized, FULL_GUIDE_TRIGGER_KEYWORDS)) {
            String baseReply = buildStyleGuideReply(EnumSet.allOf(StyleTopic.class));
            if (baseReply == null || baseReply.isBlank()) {
                return;
            }
            sendSystemMessage(adminPartner, user, baseReply);
            return;
        }

        String baseReply;
        boolean isSupportIntent = isSupportConversation(normalized);
        boolean isStyleIntent = isStyleConversation(normalized);

        String aiReply = storeAssistantAiService.generateReply(
                StoreAssistantAiService.Persona.ADMIN_SUPPORT,
                content,
                buildRecentConversationForAi(user, adminPartner),
                buildCartContextForAdminAi(user),
                null,
                buildLatestOrderContextForAi(user)
        ).orElse(null);

        if (aiReply != null && !aiReply.isBlank()) {
            baseReply = aiReply;
        } else if (isSupportIntent) {
            baseReply = ADMIN_SUPPORT_FALLBACK_RESPONSE;
        } else if (isStyleIntent) {
            EnumSet<StyleTopic> requestedTopics = detectRequestedTopics(normalized);
            if (!requestedTopics.isEmpty()) {
                baseReply = buildStyleGuideReply(requestedTopics);
            } else if (containsAny(normalized, STYLE_CONTEXT_KEYWORDS)) {
                baseReply = FALLBACK_STYLE_RESPONSE;
                logUnmatchedStyleIntent(user, adminPartner, normalized);
            } else {
                baseReply = FALLBACK_STYLE_RESPONSE;
            }
        } else {
            baseReply = ADMIN_CLARIFY_INTENT_RESPONSE;
        }

        String finalReply = compactReply(baseReply, ADMIN_SUPPORT_FALLBACK_RESPONSE);
        if (finalReply == null || finalReply.isBlank()) {
            return;
        }
        sendSystemMessage(adminPartner, user, finalReply);
    }

    private boolean isStyleConversation(String normalizedContent) {
        if (normalizedContent == null || normalizedContent.isBlank()) {
            return false;
        }
        return containsAny(normalizedContent, FULL_GUIDE_TRIGGER_KEYWORDS)
                || containsAny(normalizedContent, STYLE_CONTEXT_KEYWORDS)
                || !detectRequestedTopics(normalizedContent).isEmpty();
    }

    private String buildStyleGuideReply(EnumSet<StyleTopic> requestedTopics) {
        StringBuilder builder = new StringBuilder("Gợi ý nhanh theo thông tin bạn gửi:\n");
        for (StyleTopic topic : StyleTopic.values()) {
            if (requestedTopics.contains(topic)) {
                builder.append("\n").append(sectionFor(topic)).append("\n");
            }
        }
        builder.append("\n").append(nextSuggestion(requestedTopics));
        return builder.toString().trim();
    }

    private String composeFinalReply(UserAccount user, String baseReply) {
        String concise = compactReply(baseReply, FALLBACK_STYLE_RESPONSE);
        String productSuggestion = buildCartProductSuggestion(user);
        if (productSuggestion == null || productSuggestion.isBlank()) {
            return concise;
        }
        return concise + "\n\n" + productSuggestion;
    }

    private String buildRecentConversationForAi(UserAccount user, UserAccount partner) {
        List<StoreMessage> conversation = storeMessageRepository.findConversation(user, partner);
        if (conversation == null || conversation.isEmpty()) {
            return "Chưa có lịch sử.";
        }
        int fromIndex = Math.max(0, conversation.size() - 6);
        String partnerLabel = isSupportRole(partner.getRole()) ? "CSKH" : "Đối tác";
        return conversation.subList(fromIndex, conversation.size()).stream()
                .map(message -> {
                    String role = message.getSender().getId().equals(user.getId()) ? "Khách" : partnerLabel;
                    String value = message.getContent() == null ? "" : message.getContent().trim();
                    if (value.length() > 180) {
                        value = value.substring(0, 180) + "...";
                    }
                    return role + ": " + value;
                })
                .collect(Collectors.joining("\n"));
    }

    private String buildCartContextForAi(UserAccount user) {
        Cart cart = cartRepository.findByUser(user).orElse(null);
        if (cart == null || cart.getItems() == null || cart.getItems().isEmpty()) {
            return "Giỏ hàng đang trống.";
        }
        return cart.getItems().stream()
                .limit(5)
                .map(item -> {
                    if (item == null || item.getVariant() == null || item.getVariant().getProduct() == null) {
                        return "- Item không xác định";
                    }
                    Product product = item.getVariant().getProduct();
                    String size = item.getVariant().getSize() == null ? "?" : item.getVariant().getSize();
                    String color = item.getVariant().getColor() == null ? "?" : item.getVariant().getColor();
                    int quantity = item.getQuantity() == null ? 1 : item.getQuantity();
                    return "- " + product.getName() + " | " + size + "/" + color + " x" + quantity;
                })
                .collect(Collectors.joining("\n"));
    }

    private String buildCartContextForAdminAi(UserAccount user) {
        Cart cart = cartRepository.findByUser(user).orElse(null);
        if (cart == null || cart.getItems() == null || cart.getItems().isEmpty()) {
            return "Giỏ hàng đang trống.";
        }
        return cart.getItems().stream()
                .limit(5)
                .map(item -> {
                    if (item == null || item.getVariant() == null) {
                        return "- Sản phẩm | ?/? x1";
                    }

                    Product product = item.getVariant().getProduct();
                    String label = "Sản phẩm";
                    if (product != null
                            && product.getCategory() != null
                            && product.getCategory().getName() != null
                            && !product.getCategory().getName().isBlank()) {
                        label = product.getCategory().getName().trim();
                    }

                    String size = item.getVariant().getSize() == null ? "?" : item.getVariant().getSize();
                    String color = item.getVariant().getColor() == null ? "?" : item.getVariant().getColor();
                    int quantity = item.getQuantity() == null ? 1 : item.getQuantity();
                    return "- " + label + " | " + size + "/" + color + " x" + quantity;
                })
                .collect(Collectors.joining("\n"));
    }

    private String buildSuggestedProductsHintForAi(UserAccount user) {
        String suggestion = buildCartProductSuggestion(user);
        if (suggestion == null || suggestion.isBlank()) {
            return "";
        }
        if (suggestion.length() > 500) {
            return suggestion.substring(0, 500) + "...";
        }
        return suggestion;
    }

    private String buildLatestOrderContextForAi(UserAccount user) {
        try {
            List<Order> orders = orderRepository.findByUserOrderByCreatedAtDesc(user);
            if (orders == null || orders.isEmpty()) {
                return "Chưa có đơn hàng.";
            }
            Order latest = orders.get(0);
            String orderNumber = latest.getOrderNumber() == null ? "?" : latest.getOrderNumber();
            String status = latest.getStatus() == null ? "?" : latest.getStatus().name();
            String paymentMethod = latest.getPaymentMethod() == null ? "?" : latest.getPaymentMethod().name();
            String paymentStatus = latest.getPaymentStatus() == null ? "?" : latest.getPaymentStatus().name();
            String total = latest.getTotal() == null ? "?" : String.format(Locale.forLanguageTag("vi-VN"), "%,.0fđ", latest.getTotal());
            String createdAt = latest.getCreatedAt() == null ? "?" : latest.getCreatedAt().toString();

            return """
                    Mã đơn: %s
                    Trạng thái: %s
                    Thanh toán: %s / %s
                    Tổng tiền: %s
                    Ngày tạo: %s
                    """.formatted(orderNumber, status, paymentMethod, paymentStatus, total, createdAt).trim();
        } catch (Exception exception) {
            log.warn("Failed to build order context: {}", exception.getMessage());
            return "Chưa có dữ liệu đơn hàng.";
        }
    }

    private void logUnmatchedStyleIntent(UserAccount sender, UserAccount receiver, String normalizedContent) {
        List<String> unknownTerms = extractUnknownTerms(normalizedContent);
        log.info(
                "Style chat fallback triggered: senderId={}, receiverId={}, unknownTerms={}, normalized='{}'",
                sender.getId(),
                receiver.getId(),
                unknownTerms,
                truncateForLog(normalizedContent, 220)
        );
    }

    private EnumSet<StyleTopic> detectRequestedTopics(String normalizedContent) {
        EnumSet<StyleTopic> topics = EnumSet.noneOf(StyleTopic.class);
        if (containsAny(normalizedContent, SKIN_TONE_KEYWORDS)) {
            topics.add(StyleTopic.SKIN_TONE);
        }
        if (containsAny(normalizedContent, BODY_SHAPE_KEYWORDS)) {
            topics.add(StyleTopic.BODY_SHAPE);
        }
        if (containsAny(normalizedContent, HEIGHT_KEYWORDS) || HEIGHT_PATTERN.matcher(normalizedContent).find()) {
            topics.add(StyleTopic.HEIGHT);
        }
        if (containsAny(normalizedContent, WEIGHT_KEYWORDS) || WEIGHT_PATTERN.matcher(normalizedContent).find()) {
            topics.add(StyleTopic.WEIGHT);
        }
        if (containsAny(normalizedContent, FACE_KEYWORDS)) {
            topics.add(StyleTopic.FACE);
        }
        return topics;
    }

    private String sectionFor(StyleTopic topic) {
        return switch (topic) {
            case SKIN_TONE -> SKIN_TONE_RESPONSE;
            case BODY_SHAPE -> BODY_SHAPE_RESPONSE;
            case HEIGHT -> HEIGHT_RESPONSE;
            case WEIGHT -> WEIGHT_RESPONSE;
            case FACE -> FACE_RESPONSE;
        };
    }

    private String nextSuggestion(EnumSet<StyleTopic> requestedTopics) {
        if (requestedTopics.size() == 1) {
            StyleTopic topic = requestedTopics.iterator().next();
            return switch (topic) {
                case SKIN_TONE -> "Bạn gửi thêm màu tóc + trang sức hay đeo để mình chốt bảng màu.";
                case BODY_SHAPE -> "Bạn gửi số đo vai-ngực-eo-hông để mình chốt form chuẩn.";
                case HEIGHT -> "Bạn gửi chiều cao chính xác để mình chốt tỷ lệ set đồ.";
                case WEIGHT -> "Bạn cho mình biết mục tiêu: thon hơn hay đầy đặn hơn.";
                case FACE -> "Bạn gửi thêm kiểu tóc/kính hay dùng để mình chốt cổ áo.";
            };
        }
        return "Bạn gửi thêm tông da + chiều cao + dáng người, mình gợi ý ngay 3 outfit cụ thể.";
    }

    private boolean isSupportConversation(String normalizedContent) {
        if (normalizedContent == null || normalizedContent.isBlank()) {
            return false;
        }
        return containsAny(normalizedContent, SUPPORT_CONTEXT_KEYWORDS);
    }

    private String compactReply(String reply, String fallback) {
        return compactReply(reply, fallback, 7);
    }

    private String compactReply(String reply, String fallback, int maxLines) {
        int safeMaxLines = maxLines <= 0 ? 7 : maxLines;
        if (fallback == null || fallback.isBlank()) {
            fallback = "Mình đã nhận tin nhắn. Bạn cho mình xin thêm thông tin để hỗ trợ nhé.";
        }
        if (reply == null || reply.isBlank()) {
            return fallback;
        }
        String normalized = reply.replace("\r", "").trim()
                .replace("•", "-");
        normalized = normalized.replaceAll("(?m)^\\s*\\d+[\\).:-]?\\s*", "");
        if (!normalized.contains("\n")) {
            normalized = normalized.replace(". ", ".\n").replace("; ", ";\n");
        }

        List<String> lines = Arrays.stream(normalized.split("\n"))
                .map(String::trim)
                .filter(line -> !line.isBlank())
                .map(line -> line.length() > 180 ? line.substring(0, 177) + "..." : line)
                .distinct()
                .limit(safeMaxLines)
                .toList();
        if (lines.isEmpty()) {
            return fallback;
        }
        String compact = String.join("\n", lines);
        if (compact.length() > 800) {
            return compact.substring(0, 797) + "...";
        }
        return compact;
    }

    private String buildCartProductSuggestion(UserAccount user) {
        Cart cart = cartRepository.findByUser(user).orElse(null);
        List<Product> pool = productRepository.findTop40ByActiveTrueOrderByFeaturedDescCreatedAtDesc();
        if (pool.isEmpty()) {
            return "";
        }

        if (cart == null || cart.getItems() == null || cart.getItems().isEmpty()) {
            List<Product> starter = pool.stream()
                    .filter(this::hasAvailableStock)
                    .limit(2)
                    .toList();
            if (starter.isEmpty()) {
                return "Gợi ý sản phẩm: hiện chưa có item phù hợp trong kho.";
            }
            return "Gợi ý sản phẩm:\n" + starter.stream()
                    .map(product -> "- " + product.getName() + " (" + formatPrice(product) + ")")
                    .collect(Collectors.joining("\n"));
        }

        Set<Long> cartProductIds = new LinkedHashSet<>();
        Set<Long> cartCategoryIds = new LinkedHashSet<>();
        List<String> cartNames = new java.util.ArrayList<>();

        for (CartItem item : cart.getItems()) {
            if (item == null || item.getVariant() == null || item.getVariant().getProduct() == null) {
                continue;
            }
            Product product = item.getVariant().getProduct();
            cartProductIds.add(product.getId());
            if (product.getCategory() != null && product.getCategory().getId() != null) {
                cartCategoryIds.add(product.getCategory().getId());
            }
            if (product.getName() != null && !product.getName().isBlank()) {
                cartNames.add(product.getName().trim());
            }
        }

        List<Product> sameCategory = pool.stream()
                .filter(this::hasAvailableStock)
                .filter(product -> product.getId() != null && !cartProductIds.contains(product.getId()))
                .filter(product -> product.getCategory() != null
                        && product.getCategory().getId() != null
                        && cartCategoryIds.contains(product.getCategory().getId()))
                .limit(2)
                .toList();

        List<Product> suggestions = new java.util.ArrayList<>(sameCategory);
        if (suggestions.size() < 2) {
            for (Product product : pool) {
                if (!hasAvailableStock(product) || product.getId() == null || cartProductIds.contains(product.getId())) {
                    continue;
                }
                if (suggestions.stream().anyMatch(existing -> existing.getId().equals(product.getId()))) {
                    continue;
                }
                suggestions.add(product);
                if (suggestions.size() == 2) {
                    break;
                }
            }
        }

        if (suggestions.isEmpty()) {
            return "Gợi ý theo giỏ hàng: hiện chưa có item bổ sung phù hợp.";
        }

        String cartSummary = cartNames.stream().distinct().limit(1).collect(Collectors.joining(", "));
        StringBuilder builder = new StringBuilder("Gợi ý theo giỏ");
        if (!cartSummary.isBlank()) {
            builder.append(" (đang có: ").append(cartSummary).append(")");
        }
        builder.append(":\n");
        builder.append(suggestions.stream()
                .map(product -> "- " + product.getName() + " (" + formatPrice(product) + ")")
                .collect(Collectors.joining("\n")));
        return builder.toString();
    }

    private boolean hasAvailableStock(Product product) {
        if (product == null || product.getVariants() == null) {
            return false;
        }
        return product.getVariants().stream()
                .anyMatch(variant -> variant.getStockQty() == null || variant.getStockQty() > 0);
    }

    private String formatPrice(Product product) {
        double rawPrice = product.getSalePrice() != null ? product.getSalePrice() : product.getBasePrice();
        return String.format(Locale.forLanguageTag("vi-VN"), "%,.0fđ", rawPrice);
    }

    private static Set<String> buildKnownStyleTerms() {
        Set<String> knownTerms = new HashSet<>();
        for (List<String> keywords : keywordGroups()) {
            for (String keyword : keywords) {
                String sanitized = sanitizeForMatching(keyword);
                if (sanitized.isBlank()) {
                    continue;
                }
                knownTerms.addAll(Arrays.asList(sanitized.split(" ")));
            }
        }
        return Set.copyOf(knownTerms);
    }

    private static List<List<String>> keywordGroups() {
        return List.of(
                FULL_GUIDE_TRIGGER_KEYWORDS,
                STYLE_CONTEXT_KEYWORDS,
                SKIN_TONE_KEYWORDS,
                BODY_SHAPE_KEYWORDS,
                HEIGHT_KEYWORDS,
                WEIGHT_KEYWORDS,
                FACE_KEYWORDS
        );
    }

    private List<String> extractUnknownTerms(String normalizedContent) {
        if (normalizedContent == null || normalizedContent.isBlank()) {
            return List.of();
        }
        return Arrays.stream(normalizedContent.split(" "))
                .map(String::trim)
                .filter(token -> token.length() >= 3)
                .filter(token -> !STYLE_STOPWORDS.contains(token))
                .filter(token -> !KNOWN_STYLE_TERMS.contains(token))
                .distinct()
                .limit(10)
                .toList();
    }

    private static String truncateForLog(String content, int maxLength) {
        if (content == null) {
            return "";
        }
        if (content.length() <= maxLength) {
            return content;
        }
        return content.substring(0, maxLength) + "...";
    }

    private static String normalizeText(String content) {
        return Normalizer.normalize(content, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase();
    }

    private static String sanitizeForMatching(String content) {
        return normalizeText(content)
                .replaceAll("[^a-z0-9.\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private boolean isStaffRole(UserAccount.Role role) {
        return role == UserAccount.Role.STYLES
                || role == UserAccount.Role.WAREHOUSE
                || role == UserAccount.Role.ADMIN;
    }

    private boolean isSupportRole(UserAccount.Role role) {
        return role == UserAccount.Role.STYLES
                || role == UserAccount.Role.WAREHOUSE
                || role == UserAccount.Role.ADMIN;
    }

    private boolean canStaffTalkTo(UserAccount.Role role) {
        return role == UserAccount.Role.USER || role == UserAccount.Role.SELLER;
    }

    private StoreMessagePartnerResponse mapPartner(UserAccount user) {
        return new StoreMessagePartnerResponse(
                user.getId(),
                user.getFullName(),
                normalizePartnerRole(user.getRole())
        );
    }

    private String normalizePartnerRole(UserAccount.Role role) {
        if (role == UserAccount.Role.STYLES) {
            return UserAccount.Role.WAREHOUSE.name().toLowerCase();
        }
        return role.name().toLowerCase();
    }

    private boolean containsAny(String normalizedContent, List<String> keywords) {
        if (normalizedContent == null || normalizedContent.isBlank()) {
            return false;
        }
        String paddedContent = " " + normalizedContent + " ";
        return keywords.stream()
                .map(StoreMessageService::sanitizeForMatching)
                .filter(keyword -> !keyword.isBlank())
                .anyMatch(keyword -> paddedContent.contains(" " + keyword + " "));
    }
}
