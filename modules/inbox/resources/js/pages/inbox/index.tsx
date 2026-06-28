import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { MessageCircle, Send, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Message {
    id: string;
    direction: 'in' | 'out';
    type: string;
    body: string | null;
    media_url: string | null;
    platform_sent_at: string | null;
    created_at: string;
    sender_name: string | null;
}

interface Conversation {
    id: string;
    channel: string;
    peer_uid: string;
    peer_name: string | null;
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
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function InboxIndex({ conversations, filters }: Props) {
    const [activeConv, setActiveConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [search, setSearch] = useState(filters.q ?? '');
    const [leadLoading, setLeadLoading] = useState(false);
    const [leadError, setLeadError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { data, setData, post, processing, reset, errors } = useForm({ text: '' });

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    function handleSelectConv(conv: Conversation) {
        setActiveConv(conv);
        setMessages([]);
        setLeadError(null);
        setLoadingMessages(true);

        fetch(route('inbox.messages', conv.id), {
            headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
        })
            .then((r) => r.json())
            .then((data) => {
                setMessages(data.data ?? []);
            })
            .finally(() => setLoadingMessages(false));
    }

    function handleSend(e: React.FormEvent) {
        e.preventDefault();
        if (!activeConv || !data.text.trim()) return;

        post(route('inbox.send', activeConv.id), {
            preserveState: true,
            onSuccess: () => {
                reset('text');
                handleSelectConv(activeConv);
            },
        });
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
                'X-XSRF-TOKEN': document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '',
            },
        })
            .then(async (r) => {
                const json = await r.json();
                if (!r.ok) {
                    setLeadError(json.message ?? 'Lỗi tạo Lead.');
                    return;
                }
                // Cập nhật conversation local để hiện nút "Xem Lead"
                setActiveConv({ ...activeConv, lead_id: json.lead_id });
                router.reload({ only: ['conversations'] });
            })
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

            <div className="flex h-[calc(100vh-64px)] overflow-hidden">
                {/* ── Cột trái: danh sách hội thoại ─────────────────────── */}
                <div className="flex w-80 flex-shrink-0 flex-col border-r">
                    <div className="border-b p-3">
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
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {conversations.data.length === 0 && (
                            <div className="text-muted-foreground p-6 text-center text-sm">
                                <MessageCircle className="mx-auto mb-2 h-8 w-8 opacity-30" />
                                Chưa có hội thoại nào.
                            </div>
                        )}

                        {conversations.data.map((conv) => (
                            <button
                                key={conv.id}
                                className={`w-full border-b px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                                    activeConv?.id === conv.id ? 'bg-muted' : ''
                                }`}
                                onClick={() => handleSelectConv(conv)}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="max-w-[160px] truncate text-sm font-medium">
                                        {conv.peer_name ?? conv.peer_phone ?? conv.peer_uid}
                                    </span>
                                    {conv.unread_count > 0 && (
                                        <Badge variant="default" className="h-4 min-w-4 px-1 text-[10px]">
                                            {conv.unread_count}
                                        </Badge>
                                    )}
                                </div>
                                {conv.last_message_preview && (
                                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                                        {conv.last_message_preview}
                                    </p>
                                )}
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
                            <div className="border-b px-4 py-2 text-sm font-medium">
                                {activeConv.peer_name ?? activeConv.peer_phone ?? activeConv.peer_uid}
                                {activeConv.peer_phone && (
                                    <span className="text-muted-foreground ml-2 text-xs">{activeConv.peer_phone}</span>
                                )}
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {loadingMessages && (
                                    <div className="text-muted-foreground text-center text-sm">Đang tải...</div>
                                )}
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.direction === 'out' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                                                msg.direction === 'out'
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted'
                                            }`}
                                        >
                                            {msg.media_url && (
                                                <div className="mb-1 text-xs opacity-70">[{msg.type}]</div>
                                            )}
                                            {msg.body && <p className="whitespace-pre-wrap">{msg.body}</p>}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Composer */}
                            <form onSubmit={handleSend} className="flex gap-2 border-t p-3">
                                <Input
                                    value={data.text}
                                    onChange={(e) => setData('text', e.target.value)}
                                    placeholder="Nhập tin nhắn..."
                                    className="flex-1"
                                    disabled={processing}
                                />
                                <Button type="submit" size="sm" disabled={processing || !data.text.trim()}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                            {errors.text && <p className="px-3 pb-2 text-xs text-red-500">{errors.text}</p>}
                        </>
                    )}
                </div>

                {/* ── Cột phải: thông tin peer + actions ────────────────── */}
                <div className="w-64 flex-shrink-0 border-l">
                    {activeConv ? (
                        <div className="p-4 space-y-4">
                            <div className="text-center">
                                <div className="bg-muted mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full">
                                    <User className="h-6 w-6" />
                                </div>
                                <p className="text-sm font-medium">
                                    {activeConv.peer_name ?? 'Không rõ tên'}
                                </p>
                                {activeConv.peer_phone && (
                                    <p className="text-muted-foreground text-xs">{activeConv.peer_phone}</p>
                                )}
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
                                    <span>{activeConv.lead_id ? 'Đã tạo' : 'Chưa có'}</span>
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
                                    Xem Lead
                                </Button>
                            ) : (
                                <>
                                    {activeConv.thread_type !== 1 && (
                                        <Button
                                            size="sm"
                                            className="w-full"
                                            disabled={leadLoading}
                                            onClick={handleCreateLead}
                                        >
                                            {leadLoading ? 'Đang tạo...' : 'Tạo Lead'}
                                        </Button>
                                    )}
                                    {leadError && (
                                        <p className="text-destructive text-xs">{leadError}</p>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="text-muted-foreground p-4 text-center text-sm">
                            Chọn hội thoại để xem thông tin
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
