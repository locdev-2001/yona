import { ChatAvatar } from '@/components/inbox/chat-avatar';
import { ChatThread } from '@/components/inbox/chat-thread';
import { ConnectionBanner, type ConnectionInfo } from '@/components/inbox/connection-banner';
import { messagePreview, type ChatMessage } from '@/components/inbox/message-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type SharedData } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { MessageCircle, RefreshCw, Send } from 'lucide-react';
import { useEffect, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

/** Payload từ MessageReceived.broadcastWith() */
interface MessageReceivedPayload {
    message: ChatMessage;
    conversation_id: string;
    last_message_at: string | null;
    unread_count: number;
}

interface Conversation {
    id: string;
    channel: string;
    peer_uid: string;
    peer_name: string | null;
    peer_avatar_url: string | null;
    peer_phone: string | null;
    thread_type: number;
    unread_count: number;
    last_message_at: string | null;
    last_message_preview: string | null;
    contact_id: string | null;
    lead_id: string | null;
}

interface PaginatedConversations {
    data: Conversation[];
    current_page: number;
    last_page: number;
    next_page_url: string | null;
    prev_page_url: string | null;
}

interface Props {
    conversations: PaginatedConversations;
    filters: { q?: string; unread?: string; channel?: string };
    selectedConversation?: Conversation | null;
    zaloConnection?: ConnectionInfo | null;
    channelsAvailable?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const ZALO_QUOTA_KEY = 'quota.conversations.zalo_personal';

/** Hiển thị toast lỗi nhẹ — dùng alert vì chưa có toast component chung */
function showToast(msg: string) {
    // ponytail: alert thay toast — thêm toaster lib khi có shared toast infra
    alert(msg);
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function InboxIndex({ conversations, filters, selectedConversation, zaloConnection }: Props) {
    const { auth, activeWorkspace } = usePage<SharedData>().props;

    const [convList, setConvList] = useState<Conversation[]>(conversations.data);
    const [activeConv, setActiveConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [search, setSearch] = useState(filters.q ?? '');
    const [leadLoading, setLeadLoading] = useState(false);
    const [leadError, setLeadError] = useState<string | null>(null);

    const { data, setData } = useForm({ text: '' });
    const [sending, setSending] = useState(false);
    const [syncing, setSyncing] = useState(false);

    // Đồng bộ lại tin nhóm (kéo lịch sử qua getGroupChatHistory) — luôn sẵn, không cần gap.
    function handleResync() {
        if (syncing) return;
        setSyncing(true);
        fetch(route('inbox.resync'), {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'application/json',
                'X-XSRF-TOKEN': decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? ''),
            },
        })
            .then(async (r) => {
                const json = await r.json().catch(() => ({}));
                if (!r.ok) {
                    showToast(json.message ?? 'Không đồng bộ được. Kiểm tra bridge đã chạy chưa.');
                    return;
                }
                showToast(`Đã đồng bộ ${json.fetched ?? 0} tin nhóm.`);
                router.reload({ only: ['conversations'] });
            })
            .catch(() => showToast('Không kết nối được server.'))
            .finally(() => setSyncing(false));
    }

    // Entitlements snapshot từ Inertia shared data
    const entitlements = auth.membership?.entitlements ?? null;
    const zaloLimit = entitlements?.quotas[ZALO_QUOTA_KEY] ?? null;
    const zaloRemaining = entitlements?.remaining[ZALO_QUOTA_KEY] ?? null;
    // Chỉ gate khi có quota rõ ràng VÀ remaining = 0
    const quotaExhausted = zaloRemaining !== null && zaloRemaining <= 0;

    // Sync convList khi Inertia reload conversations prop
    useEffect(() => {
        setConvList(conversations.data);
    }, [conversations.data]);

    // Deep-link: preselect hội thoại từ URL /inbox/{id} khi mở/reload trang
    useEffect(() => {
        if (selectedConversation) handleSelectConv(selectedConversation);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Echo realtime subscribe ────────────────────────────────────────────────
    useEffect(() => {
        const workspaceId = activeWorkspace?.id;
        // Guard: Echo có thể undefined nếu Reverb tắt local
        if (!workspaceId || typeof window === 'undefined' || !window.Echo) return;

        const channel = window.Echo.private(`workspace.${workspaceId}.conversations`);

        channel.listen('MessageReceived', (payload: MessageReceivedPayload) => {
            const { message, conversation_id, last_message_at, unread_count } = payload;

            // Cập nhật message thread nếu đang mở đúng conversation
            setActiveConv((current) => {
                if (current?.id === conversation_id) {
                    setMessages((prev) => {
                        // Tránh duplicate nếu message đã có (outbound vừa gửi)
                        if (prev.some((m) => m.id === message.id)) return prev;
                        return [...prev, message];
                    });
                }
                return current;
            });

            // Cập nhật list: bump unread+preview rồi đẩy hội thoại lên đầu (mới nhất trước, kiểu Zalo).
            // Hội thoại chưa có trong list (người mới nhắn) → reload nhẹ vì payload thiếu data hội thoại đầy đủ.
            setConvList((prev) => {
                if (!prev.some((c) => c.id === conversation_id)) {
                    queueMicrotask(() => router.reload({ only: ['conversations'], preserveState: true, preserveScroll: true }));
                    return prev;
                }
                const updated = prev.map((c) =>
                    c.id === conversation_id ? { ...c, unread_count, last_message_at, last_message_preview: messagePreview(message) } : c,
                );
                return [...updated].sort((a, b) => (b.last_message_at ?? '').localeCompare(a.last_message_at ?? ''));
            });
        });

        return () => {
            window.Echo.leave(`workspace.${workspaceId}.conversations`);
        };
    }, [activeWorkspace?.id]);

    // ── Handlers ───────────────────────────────────────────────────────────────

    function handleSelectConv(conv: Conversation) {
        setActiveConv(conv);
        // Phản chiếu URL → reload/share giữ đúng hội thoại (route inbox.show preselect). Không round-trip.
        window.history.replaceState(window.history.state, '', route('inbox.show', conv.id));
        setMessages([]);
        setLeadError(null);
        setLoadingMessages(true);

        // Reset unread cục bộ ngay khi click
        setConvList((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c)));

        fetch(route('inbox.messages', conv.id), {
            headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
        })
            .then((r) => r.json())
            .then((responseData) => {
                setMessages(responseData.data ?? []);
            })
            .catch(() => showToast('Không tải được tin nhắn. Vui lòng thử lại.'))
            .finally(() => setLoadingMessages(false));
    }

    function handleSend(e: React.FormEvent) {
        e.preventDefault();
        if (!activeConv || !data.text.trim() || sending) return;

        // The send endpoint is a JSON API (returns the created message / {message,error_code} on 422),
        // not an Inertia page — use fetch, mirroring handleSelectConv/handleCreateLead.
        const text = data.text;
        const conv = activeConv;
        setSending(true);
        setData('text', '');

        fetch(route('inbox.send', conv.id), {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-XSRF-TOKEN': decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? ''),
            },
            body: JSON.stringify({ text }),
        })
            .then(async (r) => {
                const json = await r.json().catch(() => ({}));
                if (!r.ok) {
                    setData('text', text); // restore input so the user can retry
                    showToast(json.message ?? 'Không gửi được tin nhắn. Vui lòng thử lại.');
                    return;
                }
                handleSelectConv(conv); // reload thread to show the sent message
            })
            .catch(() => {
                setData('text', text);
                showToast('Không kết nối được server.');
            })
            .finally(() => setSending(false));
    }

    function handleCreateLead() {
        if (!activeConv) return;
        setLeadLoading(true);
        setLeadError(null);

        fetch(route('inbox.lead.store', activeConv.id), {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-XSRF-TOKEN': decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? ''),
            },
        })
            .then(async (r) => {
                const json = await r.json();
                if (!r.ok) {
                    setLeadError(json.message ?? 'Lỗi tạo Lead.');
                    return;
                }
                // Cập nhật local state để hiện nút "Xem Lead"
                setActiveConv((prev) => (prev ? { ...prev, lead_id: json.lead_id } : prev));
                setConvList((prev) => prev.map((c) => (c.id === activeConv.id ? { ...c, lead_id: json.lead_id } : c)));
            })
            .catch(() => setLeadError('Không kết nối được server.'))
            .finally(() => setLeadLoading(false));
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get(route('inbox.index'), { ...filters, q: search }, { preserveState: true, replace: true });
    }

    const breadcrumbs = [{ title: 'Inbox', href: route('inbox.index') }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inbox" />

            <ConnectionBanner connection={zaloConnection ?? null} />
            <div className="flex h-[calc(100vh-64px)] overflow-hidden">
                {/* ── Cột trái: danh sách hội thoại ─────────────────────── */}
                <div className="flex w-80 flex-shrink-0 flex-col border-r">
                    {/* Header: search + usage badge */}
                    <div className="space-y-2 border-b p-3">
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <Input
                                placeholder="Tìm hội thoại..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-8 text-sm"
                            />
                            <Button type="submit" size="sm" variant="secondary">
                                Tìm
                            </Button>
                        </form>

                        {/* Đồng bộ lại tin nhóm — luôn sẵn (không chờ banner gap). Cần bridge đang chạy. */}
                        <Button type="button" size="sm" variant="outline" className="w-full" disabled={syncing} onClick={handleResync}>
                            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Đang đồng bộ...' : 'Đồng bộ tin nhóm'}
                        </Button>

                        {/* Usage badge — chỉ hiện khi có quota data */}
                        {zaloLimit !== null && zaloRemaining !== null && (
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Hội thoại tháng này</span>
                                <Badge variant={quotaExhausted ? 'destructive' : 'secondary'} className="text-[10px]">
                                    {zaloLimit - zaloRemaining}/{zaloLimit}
                                </Badge>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {convList.length === 0 && (
                            <div className="text-muted-foreground p-6 text-center text-sm">
                                <MessageCircle className="mx-auto mb-2 h-8 w-8 opacity-30" />
                                Chưa có hội thoại nào.
                            </div>
                        )}

                        {convList.map((conv) => (
                            <button
                                key={conv.id}
                                className={`hover:bg-muted/50 w-full border-b px-4 py-3 text-left transition-colors ${
                                    activeConv?.id === conv.id ? 'bg-muted' : ''
                                }`}
                                onClick={() => handleSelectConv(conv)}
                            >
                                <div className="flex items-center gap-3">
                                    <ChatAvatar name={conv.peer_name ?? conv.peer_uid} src={conv.peer_avatar_url} className="h-9 w-9 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-sm font-medium">{conv.peer_name ?? conv.peer_phone ?? conv.peer_uid}</span>
                                            {conv.unread_count > 0 && (
                                                <Badge variant="default" className="h-4 min-w-4 shrink-0 px-1 text-[10px]">
                                                    {conv.unread_count}
                                                </Badge>
                                            )}
                                        </div>
                                        {conv.last_message_preview && (
                                            <p className="text-muted-foreground mt-0.5 truncate text-xs">{conv.last_message_preview}</p>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Pagination */}
                    {conversations.last_page > 1 && (
                        <div className="flex justify-center gap-2 border-t p-2">
                            {conversations.prev_page_url && (
                                <Button variant="ghost" size="sm" onClick={() => router.get(conversations.prev_page_url!)}>
                                    ←
                                </Button>
                            )}
                            <span className="text-muted-foreground flex items-center text-xs">
                                {conversations.current_page}/{conversations.last_page}
                            </span>
                            {conversations.next_page_url && (
                                <Button variant="ghost" size="sm" onClick={() => router.get(conversations.next_page_url!)}>
                                    →
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Cột giữa: thread messages + composer ──────────────── */}
                <div className="flex flex-1 flex-col">
                    {!activeConv ? (
                        <div className="text-muted-foreground flex flex-1 items-center justify-center">
                            <div className="text-center">
                                <MessageCircle className="mx-auto mb-3 h-12 w-12 opacity-20" />
                                <p className="text-sm">Chọn một hội thoại để bắt đầu</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 border-b px-4 py-2">
                                <ChatAvatar name={activeConv.peer_name ?? activeConv.peer_uid} src={activeConv.peer_avatar_url} />
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-medium">
                                        {activeConv.peer_name ?? activeConv.peer_phone ?? activeConv.peer_uid}
                                    </div>
                                    {activeConv.peer_phone && <div className="text-muted-foreground text-xs">{activeConv.peer_phone}</div>}
                                </div>
                            </div>

                            <ChatThread messages={messages} peer={activeConv} loading={loadingMessages} />

                            {/* Composer — disabled khi quota hết VÀ conversation MỚI (chưa có tin) */}
                            {quotaExhausted && messages.length === 0 ? (
                                <div className="border-t p-3 text-center">
                                    <p className="text-muted-foreground mb-2 text-xs">Đã đạt giới hạn hội thoại tháng này ({zaloLimit} hội thoại).</p>
                                    <Button size="sm" variant="default" onClick={() => router.visit('/admin/billing/upgrade')}>
                                        Nâng gói
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <form onSubmit={handleSend} className="flex gap-2 border-t p-3">
                                        <Input
                                            value={data.text}
                                            onChange={(e) => setData('text', e.target.value)}
                                            placeholder="Nhập tin nhắn..."
                                            className="flex-1"
                                            disabled={sending}
                                        />
                                        <Button type="submit" size="sm" disabled={sending || !data.text.trim()}>
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </form>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* ── Cột phải: thông tin peer + actions ────────────────── */}
                <div className="w-64 flex-shrink-0 border-l">
                    {activeConv ? (
                        <div className="space-y-4 p-4">
                            <div className="text-center">
                                <ChatAvatar
                                    name={activeConv.peer_name ?? activeConv.peer_uid}
                                    src={activeConv.peer_avatar_url}
                                    className="mx-auto mb-2 h-12 w-12"
                                />
                                <p className="text-sm font-medium">{activeConv.peer_name ?? 'Không rõ tên'}</p>
                                {activeConv.peer_phone && <p className="text-muted-foreground text-xs">{activeConv.peer_phone}</p>}
                            </div>

                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Kênh</span>
                                    <span className="font-medium">{activeConv.channel}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Liên hệ</span>
                                    <span>{activeConv.contact_id ? 'Đã lưu' : 'Nháp'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Lead</span>
                                    <span>{activeConv.lead_id ? `#${activeConv.lead_id.slice(0, 8)}` : 'Chưa có'}</span>
                                </div>
                            </div>

                            {/* CTA Tạo/Xem Lead */}
                            {activeConv.lead_id ? (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => router.visit(route('leads.show', activeConv.lead_id!))}
                                >
                                    Xem Lead #{activeConv.lead_id.slice(0, 8)}
                                </Button>
                            ) : (
                                <>
                                    {/* thread_type 1 = nhóm → không tạo Lead */}
                                    {activeConv.thread_type !== 1 ? (
                                        <Button size="sm" className="w-full" disabled={leadLoading} onClick={handleCreateLead}>
                                            {leadLoading ? 'Đang tạo...' : 'Tạo Lead'}
                                        </Button>
                                    ) : (
                                        <p className="text-muted-foreground text-center text-xs">Hội thoại nhóm — không tạo Lead</p>
                                    )}
                                    {leadError && <p className="text-destructive text-xs">{leadError}</p>}
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="text-muted-foreground p-4 text-center text-sm">Chọn hội thoại để xem thông tin</div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
