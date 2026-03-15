import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { financeApi, storeApi } from '../services/api.ts';
import { useAuthStore } from '../store/auth.ts';

const STYLE_GUIDE_PRESET = 'style-fit-guide';
const STYLE_GUIDE_PROMPT =
  'Hướng dẫn chọn trang phục phù hợp theo màu da, vóc dáng, chiều cao và khuôn mặt.';

type ViewerRole = 'user' | 'seller' | 'warehouse' | 'admin';
type PartnerRole = 'user' | 'seller' | 'warehouse' | 'admin' | null;
type PartnerGroup = 'support' | 'customer' | 'seller';

const PARTNER_GROUP_LABELS: Record<PartnerGroup, string> = {
  support: 'CSKH / Vận hành',
  customer: 'Khách hàng',
  seller: 'Seller'
};

type QuickPrompt = {
  label: string;
  content: string;
};

const QUICK_PROMPTS: Record<PartnerGroup, QuickPrompt[]> = {
  support: [
    {
      label: 'Hỗ trợ đơn hàng',
      content: 'Mình cần hỗ trợ kiểm tra trạng thái đơn hàng gần nhất.'
    },
    {
      label: 'Đổi trả',
      content: 'Mình cần phối hợp xử lý một case đổi trả/hoàn hàng.'
    },
    {
      label: 'Xác minh thanh toán',
      content: 'Giúp mình kiểm tra đơn chuyển khoản chưa cập nhật thanh toán.'
    }
  ],
  customer: [
    {
      label: 'Xin mã đơn',
      content: 'Chào bạn, bạn vui lòng cung cấp mã đơn hàng để mình kiểm tra nhanh giúp bạn nhé.'
    },
    {
      label: 'Hướng dẫn đổi trả',
      content: 'Mình sẽ hỗ trợ bạn quy trình đổi trả. Bạn gửi giúp mã đơn và ảnh sản phẩm hiện tại nhé.'
    },
    {
      label: 'Cập nhật giao hàng',
      content: 'Mình đang kiểm tra trạng thái giao hàng và sẽ phản hồi bạn ngay khi có cập nhật.'
    }
  ],
  seller: [
    {
      label: 'Tiếp nhận ticket',
      content: 'Mình đã tiếp nhận ticket vận hành. Bạn gửi thêm mã đơn và mô tả ngắn để mình xử lý ngay.'
    },
    {
      label: 'Đề nghị bổ sung bằng chứng',
      content: 'Bạn bổ sung giúp ảnh/video bằng chứng và trạng thái hiện tại của đơn để xử lý nhanh hơn.'
    },
    {
      label: 'Cập nhật tiến độ',
      content: 'Case này đã chuyển bộ phận liên quan. Mình sẽ cập nhật tiến độ cho bạn trong phiên hôm nay.'
    }
  ]
};

const formatMessageTime = (value: string) =>
  new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  });

const formatMessageDate = (value: string) =>
  new Date(value).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

const parseErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    return candidate.response?.data?.message ?? candidate.message ?? 'Không thể gửi tin nhắn lúc này.';
  }
  return 'Không thể gửi tin nhắn lúc này.';
};

const normalizePartnerRole = (value: string | null | undefined): PartnerRole => {
  const normalized = (value ?? '').toLowerCase();
  if (normalized === 'styles') {
    return 'warehouse';
  }
  if (normalized === 'user' || normalized === 'seller' || normalized === 'warehouse' || normalized === 'admin') {
    return normalized;
  }
  return null;
};

const normalizeViewerRole = (value: string | null | undefined): ViewerRole => {
  const normalized = normalizePartnerRole(value);
  if (normalized === 'seller' || normalized === 'warehouse' || normalized === 'admin') {
    return normalized;
  }
  return 'user';
};

const groupFromPartnerRole = (role: PartnerRole): PartnerGroup | null => {
  if (role === 'user') {
    return 'customer';
  }
  if (role === 'seller') {
    return 'seller';
  }
  if (role === 'warehouse' || role === 'admin') {
    return 'support';
  }
  return null;
};

const groupsForViewer = (role: ViewerRole): PartnerGroup[] => {
  if (role === 'warehouse' || role === 'admin') {
    return ['customer', 'seller'];
  }
  return ['support'];
};

const toPartnerRoleLabel = (role: PartnerRole) => {
  if (role === 'user') return 'Khách hàng';
  if (role === 'seller') return 'Seller';
  if (role === 'admin') return 'Admin hỗ trợ';
  if (role === 'warehouse') return 'CSKH / Vận hành';
  return 'Đối tác';
};

const groupConversationHint = (viewerRole: ViewerRole, group: PartnerGroup) => {
  if (group === 'support') {
    if (viewerRole === 'seller') {
      return 'Kênh phối hợp vận hành cho seller: giao thất bại, đổi trả, thanh toán và xác minh đơn.';
    }
    return 'CSKH hỗ trợ đơn hàng, chính sách đổi trả và tư vấn nhanh.';
  }
  if (group === 'customer') {
    return 'Hỗ trợ khách hàng về trạng thái đơn, đổi trả, thanh toán và các vấn đề sau mua.';
  }
  return 'Phối hợp với seller để xử lý ticket vận hành, khiếu nại và case phát sinh.';
};

const StyleMessagesPage = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedGroup, setSelectedGroup] = useState<PartnerGroup>('support');
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const hasSentPresetRef = useRef(false);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    enabled: isAuthenticated,
    retry: 1
  });
  const viewerRole = normalizeViewerRole(profile?.role ?? null);
  const allowedGroups = useMemo(() => groupsForViewer(viewerRole), [viewerRole]);

  const { data: partners = [], isLoading: partnersLoading } = useQuery({
    queryKey: ['store-message-partners'],
    queryFn: storeApi.messagePartners,
    enabled: isAuthenticated,
    refetchInterval: 30_000
  });

  const availableGroups = useMemo(
    () =>
      allowedGroups.filter((group) =>
        partners.some((partner) => groupFromPartnerRole(normalizePartnerRole(partner.role)) === group)
      ),
    [allowedGroups, partners]
  );

  useEffect(() => {
    if (!allowedGroups.includes(selectedGroup)) {
      setSelectedGroup(allowedGroups[0]);
    }
  }, [allowedGroups, selectedGroup]);

  useEffect(() => {
    const partnerRoleQuery = normalizePartnerRole(searchParams.get('partner'));
    const requestedGroup = groupFromPartnerRole(partnerRoleQuery);
    if (!requestedGroup || !allowedGroups.includes(requestedGroup)) {
      return;
    }
    if (partnerRoleQuery && partners.length > 0 && !partners.some((partner) => normalizePartnerRole(partner.role) === partnerRoleQuery)) {
      return;
    }
    if (requestedGroup !== selectedGroup) {
      setSelectedGroup(requestedGroup);
    }
  }, [allowedGroups, partners, searchParams, selectedGroup]);

  const filteredPartners = useMemo(
    () =>
      partners.filter((partner) => {
        const role = normalizePartnerRole(partner.role);
        return groupFromPartnerRole(role) === selectedGroup;
      }),
    [partners, selectedGroup]
  );

  useEffect(() => {
    if (filteredPartners.length === 0) {
      const fallbackGroup = availableGroups[0];
      if (fallbackGroup && fallbackGroup !== selectedGroup) {
        setSelectedGroup(fallbackGroup);
      }
      if (!fallbackGroup) {
        setSelectedPartnerId(null);
      }
      return;
    }

    const hasSelectedInCurrentGroup = filteredPartners.some((partner) => partner.id === selectedPartnerId);
    if (!hasSelectedInCurrentGroup) {
      setSelectedPartnerId(filteredPartners[0].id);
    }
  }, [availableGroups, filteredPartners, selectedGroup, selectedPartnerId]);

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['store-messages', selectedPartnerId],
    queryFn: () => storeApi.messages(selectedPartnerId as number),
    enabled: isAuthenticated && selectedPartnerId != null,
    refetchInterval: selectedPartnerId != null ? 5_000 : false
  });

  const sendMutation = useMutation({
    mutationFn: (payload: { partnerId: number; content: string }) =>
      storeApi.sendMessage(payload.partnerId, payload.content),
    onSuccess: (_saved, payload) => {
      setMessage('');
      setInputError(null);
      queryClient.invalidateQueries({ queryKey: ['store-messages', payload.partnerId] });
      queryClient.invalidateQueries({ queryKey: ['store-message-partners'] });
    },
    onError: (error) => {
      setInputError(parseErrorMessage(error));
    }
  });

  const selectedPartner = useMemo(
    () => partners.find((partner) => partner.id === selectedPartnerId) ?? null,
    [partners, selectedPartnerId]
  );

  const quickPrompts = useMemo(() => QUICK_PROMPTS[selectedGroup], [selectedGroup]);

  const messagesWithDateSeparator = useMemo(
    () =>
      messages.map((msg, index) => {
        const previous = messages[index - 1];
        const showDate = !previous || formatMessageDate(previous.createdAt) !== formatMessageDate(msg.createdAt);
        return { msg, showDate };
      }),
    [messages]
  );

  useEffect(() => {
    if (!messageListRef.current) return;
    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [messagesWithDateSeparator.length, selectedPartnerId]);

  const handleSend = (rawContent?: string) => {
    const content = (rawContent ?? message).trim();
    if (!content || selectedPartnerId == null) return;
    if (content.length < 2) {
      setInputError('Tin nhắn quá ngắn. Hãy nhập ít nhất 2 ký tự.');
      return;
    }
    if (content.length > 1000) {
      setInputError('Tin nhắn quá dài. Vui lòng giữ dưới 1000 ký tự.');
      return;
    }
    setInputError(null);
    sendMutation.mutate({ partnerId: selectedPartnerId, content });
  };

  const handleMessageKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleApplyPrompt = (prompt: string) => {
    setMessage(prompt);
    setInputError(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  useEffect(() => {
    const partnerRoleQuery = normalizePartnerRole(searchParams.get('partner'));
    const requestedGroup = groupFromPartnerRole(partnerRoleQuery);
    const preset = searchParams.get('preset');
    if (preset !== STYLE_GUIDE_PRESET) {
      hasSentPresetRef.current = false;
      return;
    }

    if (requestedGroup && requestedGroup !== selectedGroup) {
      return;
    }

    const requestedPartnerAvailable =
      partnerRoleQuery == null || partners.some((partner) => normalizePartnerRole(partner.role) === partnerRoleQuery);
    const shouldEnforcePartner =
      partnerRoleQuery != null && (partners.length === 0 || requestedPartnerAvailable);

    if (shouldEnforcePartner && normalizePartnerRole(selectedPartner?.role) !== partnerRoleQuery) {
      return;
    }
    if (hasSentPresetRef.current || selectedPartnerId == null) {
      return;
    }

    hasSentPresetRef.current = true;
    setInputError(null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('preset');
    nextParams.delete('partner');
    setSearchParams(nextParams, { replace: true });
    sendMutation.mutate({ partnerId: selectedPartnerId, content: STYLE_GUIDE_PROMPT });
  }, [partners, searchParams, selectedGroup, selectedPartner, selectedPartnerId, sendMutation, setSearchParams]);

  if (!isAuthenticated) {
    return <div className="sticker-card p-6 text-sm text-cocoa/70">Vui lòng đăng nhập để nhắn tin.</div>;
  }

  const selectedGroupLabel = PARTNER_GROUP_LABELS[selectedGroup];
  const selectedPartnerRole = normalizePartnerRole(selectedPartner?.role);
  const conversationHint = groupConversationHint(viewerRole, selectedGroup);
  const selectedTag =
    selectedGroup === 'support'
      ? 'Kênh hỗ trợ'
      : selectedGroup === 'customer'
        ? 'Khách hàng'
        : 'Kênh Seller';

  return (
    <div className="grid gap-5 pb-8 lg:grid-cols-[300px,1fr] xl:grid-cols-[320px,1fr]">
      <aside className="sticker-card space-y-4 p-4 lg:h-[calc(100vh-210px)] lg:min-h-[560px] lg:max-h-[760px] lg:overflow-y-auto">
        <div>
          <h1 className="font-display text-2xl text-mocha">Tin nhắn</h1>
          <p className="text-xs text-cocoa/60">Chọn đúng nhóm đối tác để xử lý hội thoại nhanh hơn.</p>
        </div>
        <div className={`grid gap-2 ${allowedGroups.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {allowedGroups.map((group) => {
            const isActive = selectedGroup === group;
            const isAvailable = availableGroups.includes(group);
            return (
              <button
                key={group}
                type="button"
                onClick={() => {
                  setSelectedGroup(group);
                  setInputError(null);
                }}
                className={`rounded-xl border px-2 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                  isActive
                    ? 'border-mocha bg-mocha/10 text-mocha'
                    : 'border-caramel/30 text-cocoa/60 hover:border-mocha/40'
                } ${isAvailable ? '' : 'opacity-50'}`}
              >
                {PARTNER_GROUP_LABELS[group]}
              </button>
            );
          })}
        </div>
        {partnersLoading ? (
          <div className="text-sm text-cocoa/60">Đang tải danh sách...</div>
        ) : partners.length === 0 ? (
          <div className="text-sm text-cocoa/60">Chưa có đối tác để nhắn tin.</div>
        ) : filteredPartners.length === 0 ? (
          <div className="text-sm text-cocoa/60">Chưa có đối tác trong nhóm {selectedGroupLabel}.</div>
        ) : (
          <div className="space-y-2">
            {filteredPartners.map((partner) => (
              <button
                key={partner.id}
                type="button"
                onClick={() => {
                  setSelectedPartnerId(partner.id);
                  setInputError(null);
                }}
                className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition ${
                  partner.id === selectedPartnerId
                    ? 'border-mocha bg-mocha/10 text-mocha'
                    : 'border-caramel/30 text-cocoa/70 hover:border-mocha/40'
                }`}
              >
                <p className="font-semibold">{partner.fullName}</p>
                <p className="text-xs uppercase text-cocoa/50">{toPartnerRoleLabel(normalizePartnerRole(partner.role))}</p>
              </button>
            ))}
          </div>
        )}
      </aside>

      <section className="sticker-card flex h-[calc(100vh-210px)] min-h-[560px] max-h-[760px] flex-col">
        <div className="border-b border-caramel/20 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-cocoa/50">Đoạn chat hiện tại</p>
              <p className="font-display text-lg text-mocha sm:text-xl">
                {selectedPartner ? selectedPartner.fullName : 'Chọn đối tác để bắt đầu'}
              </p>
              <p className="text-xs text-cocoa/60">{selectedPartner ? conversationHint : `Bạn có thể chọn ${selectedGroupLabel} để bắt đầu.`}</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {selectedPartner ? (
                <span className="tag">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {selectedTag}
                </span>
              ) : null}
              {sendMutation.isPending && <span className="tag">Đang gửi...</span>}
            </div>
          </div>
        </div>

        <div
          ref={messageListRef}
          className="flex-1 space-y-4 overflow-y-auto border-b border-caramel/10 bg-cream/20 px-4 py-4 sm:px-6"
        >
          {messagesLoading ? (
            <div className="text-sm text-cocoa/60">Đang tải tin nhắn...</div>
          ) : selectedPartnerId == null ? (
            <div className="grid h-full place-items-center rounded-2xl border border-dashed border-caramel/35 bg-white/60 p-6 text-center">
              <div className="max-w-md space-y-3">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-caramel/30 bg-cream text-mocha">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-cocoa">Hãy chọn đối tác để bắt đầu cuộc trò chuyện</p>
                <p className="text-xs text-cocoa/60">Bạn có thể chọn nhóm {selectedGroupLabel} để xử lý yêu cầu phù hợp.</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="grid h-full place-items-center rounded-2xl border border-dashed border-caramel/35 bg-white/60 p-6 text-center">
              <div className="max-w-xl space-y-4">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-caramel/30 bg-cream text-mocha">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-cocoa">Chưa có tin nhắn trong cuộc trò chuyện này</p>
                <p className="text-xs text-cocoa/60">Chọn một mẫu câu bên dưới để bắt đầu nhanh.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt.label}
                      type="button"
                      onClick={() => handleApplyPrompt(prompt.content)}
                      className="rounded-full border border-caramel/30 bg-white/80 px-3 py-1.5 text-xs font-semibold text-cocoa transition hover:border-mocha/40 hover:text-mocha"
                    >
                      {prompt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messagesWithDateSeparator.map(({ msg, showDate }) => (
              <div key={msg.id} className="space-y-2">
                {showDate && (
                  <div className="flex justify-center">
                    <span className="rounded-full border border-caramel/30 bg-white/80 px-3 py-1 text-[11px] font-semibold text-cocoa/70">
                      {formatMessageDate(msg.createdAt)}
                    </span>
                  </div>
                )}
                <div className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[88%] rounded-2xl border px-4 py-2 text-sm shadow-sm md:max-w-[78%] xl:max-w-[68%] ${
                      msg.fromMe
                        ? 'border-mocha/25 bg-gradient-to-br from-mocha to-[#a87754] text-white'
                        : 'border-caramel/30 bg-white/90 text-cocoa'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <p className={`mt-1 text-[11px] ${msg.fromMe ? 'text-cream/80' : 'text-cocoa/50'}`}>
                      {formatMessageTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-3 px-4 py-4 sm:px-6">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                onClick={() => handleApplyPrompt(prompt.content)}
                className="whitespace-nowrap rounded-full border border-caramel/30 bg-white/80 px-3 py-1.5 text-xs font-semibold text-cocoa transition hover:border-mocha/40 hover:text-mocha"
                disabled={selectedPartnerId == null}
              >
                {prompt.label}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleMessageKeyDown}
              placeholder={selectedPartnerId == null ? 'Vui lòng chọn đối tác trước...' : 'Nhập tin nhắn...'}
              className="min-h-[52px] flex-1 resize-none rounded-2xl border-2 border-caramel/30 bg-white/85 px-4 py-3 text-sm text-cocoa outline-none transition focus:border-mocha disabled:cursor-not-allowed disabled:bg-cream/40"
              disabled={selectedPartnerId == null || sendMutation.isPending}
              rows={2}
            />
            <button
              type="button"
              className="btn-primary h-[52px] px-5"
              onClick={() => handleSend()}
              disabled={sendMutation.isPending || selectedPartnerId == null || message.trim().length === 0}
            >
              <Send className="h-4 w-4" />
              Gửi
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-cocoa/55">Enter để gửi, Shift + Enter để xuống dòng.</p>
            <p className="text-[11px] font-semibold text-cocoa/55">{message.length}/1000</p>
          </div>
          {inputError && <p className="text-xs font-medium text-rose-500">{inputError}</p>}
          {selectedPartner && selectedPartnerRole ? (
            <p className="text-[11px] text-cocoa/50">
              Đang chat với {toPartnerRoleLabel(selectedPartnerRole).toLowerCase()}.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default StyleMessagesPage;
