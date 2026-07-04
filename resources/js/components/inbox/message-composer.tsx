import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Paperclip, Send, SmilePlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { StickerItem } from './message-types';

/** Cap tĩnh 20MB chung mọi loại — khớp ConversationAttachmentController::MAX_UPLOAD_KB. */
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

interface PendingAttachment {
    id: string;
    filename: string;
    mediaKind: string;
    previewUrl: string | null; // objectURL cho ảnh — revoke khi thay/clear
}

/** P06a — tin đang được trả lời (reply bar). */
export interface ReplyTarget {
    id: string;
    text: string;
    senderName: string;
}

interface Props {
    conversationId: string;
    disabled?: boolean;
    /** Gọi sau khi gửi thành công — parent reload thread. */
    onSent: () => void;
    /** P06a — reply bar (null = không trả lời). */
    replyTo?: ReplyTarget | null;
    onClearReply?: () => void;
    /** P07 — thay placeholder {ten_khach} trong canned reply. */
    peerName?: string | null;
    /** P11 — capability flags: kênh không hỗ trợ → ẨN nút (không assume Zalo). */
    canSendMedia?: boolean;
    canSendSticker?: boolean;
}

interface QuickReplyItem {
    id: string;
    title: string;
    body: string;
}

function xsrfToken(): string {
    return decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
}

/** ponytail: alert thay toast — cùng lý do showToast ở inbox/index.tsx */
function notify(msg: string) {
    alert(msg);
}

/** Composer channel-agnostic: text + đính kèm + paste ảnh + reply bar + sticker + canned "/". */
export function MessageComposer({
    conversationId,
    disabled,
    onSent,
    replyTo,
    onClearReply,
    peerName,
    canSendMedia = false,
    canSendSticker = false,
}: Props) {
    const [text, setText] = useState('');
    const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // P06a — sticker picker = ô SEARCH (không browse-bộ: zca chỉ có getStickers(keyword))
    const [stickerOpen, setStickerOpen] = useState(false);
    const [stickerQuery, setStickerQuery] = useState('');
    const [stickerResults, setStickerResults] = useState<StickerItem[]>([]);
    const [stickerLoading, setStickerLoading] = useState(false);
    // P07 — canned replies: gõ "/" đầu ô → dropdown search title
    const [quickReplies, setQuickReplies] = useState<QuickReplyItem[] | null>(null);

    const slashQuery = text.startsWith('/') ? text.slice(1).toLowerCase() : null;
    const slashMatches =
        slashQuery !== null && quickReplies !== null
            ? quickReplies.filter((q) => q.title.toLowerCase().includes(slashQuery)).slice(0, 8)
            : [];

    // Lazy-load danh sách canned lần đầu gõ "/"
    useEffect(() => {
        if (slashQuery === null || quickReplies !== null) return;
        fetch(route('inbox.quick-replies.index'), {
            headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
        })
            .then((r) => r.json())
            .then((json) => setQuickReplies(Array.isArray(json) ? json : []))
            .catch(() => setQuickReplies([]));
    }, [slashQuery, quickReplies]);

    function insertQuickReply(item: QuickReplyItem) {
        setText(item.body.replaceAll('{ten_khach}', peerName ?? 'bạn'));
    }

    // Revoke objectURL khi unmount/thay attachment — tránh leak
    useEffect(() => {
        return () => {
            if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
        };
    }, [attachment]);

    function clearAttachment() {
        setAttachment((prev) => {
            if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
            return null;
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function uploadFile(file: File) {
        if (file.size > MAX_UPLOAD_BYTES) {
            notify('Tệp vượt giới hạn 20MB.');
            return;
        }
        setUploading(true);
        const form = new FormData();
        form.append('file', file);

        fetch(route('inbox.attachments.store', conversationId), {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'application/json',
                'X-XSRF-TOKEN': xsrfToken(),
            },
            body: form,
        })
            .then(async (r) => {
                const json = await r.json().catch(() => ({}));
                if (!r.ok) {
                    notify(json.message ?? 'Không tải được tệp lên.');
                    return;
                }
                clearAttachment();
                setAttachment({
                    id: json.attachment_id,
                    filename: json.filename,
                    mediaKind: json.media_kind,
                    previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
                });
            })
            .catch(() => notify('Không kết nối được server.'))
            .finally(() => setUploading(false));
    }

    function handlePaste(e: React.ClipboardEvent) {
        const file = e.clipboardData?.files?.[0];
        if (file && file.type.startsWith('image/')) {
            e.preventDefault();
            uploadFile(file);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = text.trim();
        if ((!trimmed && !attachment) || sending || uploading) return;

        setSending(true);
        const restoreText = text;
        setText('');

        fetch(route('inbox.send', conversationId), {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-XSRF-TOKEN': xsrfToken(),
            },
            body: JSON.stringify({
                text: trimmed || null,
                attachment_id: attachment?.id ?? null,
                reply_to_message_id: replyTo?.id ?? null,
            }),
        })
            .then(async (r) => {
                const json = await r.json().catch(() => ({}));
                if (!r.ok) {
                    setText(restoreText); // giữ nội dung để user gửi lại
                    notify(json.message ?? 'Không gửi được tin nhắn. Vui lòng thử lại.');
                    return;
                }
                clearAttachment();
                onClearReply?.();
                onSent();
            })
            .catch(() => {
                setText(restoreText);
                notify('Không kết nối được server.');
            })
            .finally(() => setSending(false));
    }

    // P06a — sticker: search → grid → click gửi luôn (OUTBOUND đường send thường)
    function searchStickers() {
        const q = stickerQuery.trim();
        if (!q || stickerLoading) return;
        setStickerLoading(true);

        fetch(`${route('inbox.stickers', conversationId)}?q=${encodeURIComponent(q)}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
        })
            .then(async (r) => {
                const json = await r.json().catch(() => ({}));
                if (!r.ok) {
                    notify(json.message ?? 'Không tìm được sticker.');
                    return;
                }
                setStickerResults(json.stickers ?? []);
            })
            .catch(() => notify('Không kết nối được server.'))
            .finally(() => setStickerLoading(false));
    }

    function sendSticker(sticker: StickerItem) {
        if (sending) return;
        setSending(true);
        setStickerOpen(false);

        fetch(route('inbox.send', conversationId), {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-XSRF-TOKEN': xsrfToken(),
            },
            body: JSON.stringify({
                sticker: {
                    id: sticker.id,
                    cate_id: sticker.cateId,
                    type: sticker.type,
                    url: sticker.url,
                    thumbnail: sticker.thumbnail,
                },
            }),
        })
            .then(async (r) => {
                const json = await r.json().catch(() => ({}));
                if (!r.ok) {
                    notify(json.message ?? 'Không gửi được sticker.');
                    return;
                }
                onSent();
            })
            .catch(() => notify('Không kết nối được server.'))
            .finally(() => setSending(false));
    }

    return (
        <div className="border-t">
            {/* P06a — reply bar */}
            {replyTo && (
                <div className="border-primary bg-muted/50 mx-3 mt-2 flex items-center gap-2 rounded border-l-2 px-2 py-1">
                    <div className="min-w-0 flex-1">
                        <p className="text-primary text-[11px] font-medium">Trả lời {replyTo.senderName}</p>
                        <p className="text-muted-foreground truncate text-xs">{replyTo.text}</p>
                    </div>
                    <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onClearReply} aria-label="Bỏ trả lời">
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>
            )}

            {/* P06a — sticker panel: search-only (zca không có API browse bộ) */}
            {stickerOpen && (
                <div className="mx-3 mt-2 rounded border p-2">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            searchStickers();
                        }}
                        className="flex gap-1"
                    >
                        <Input
                            value={stickerQuery}
                            onChange={(e) => setStickerQuery(e.target.value)}
                            placeholder="Tìm sticker (vd: hello, cảm ơn)..."
                            className="h-7 text-xs"
                            autoFocus
                        />
                        <Button type="submit" size="sm" variant="secondary" className="h-7 text-xs" disabled={stickerLoading || !stickerQuery.trim()}>
                            {stickerLoading ? '...' : 'Tìm'}
                        </Button>
                    </form>
                    {stickerResults.length > 0 && (
                        <div className="mt-2 grid max-h-40 grid-cols-6 gap-1 overflow-y-auto">
                            {stickerResults.map((s) => (
                                <button key={s.id} type="button" className="hover:bg-muted rounded p-1" onClick={() => sendSticker(s)} disabled={sending}>
                                    {s.url || s.thumbnail ? (
                                        <img src={s.url ?? s.thumbnail ?? ''} alt={s.description ?? 'sticker'} className="h-12 w-12 object-contain" loading="lazy" />
                                    ) : (
                                        <span className="text-xs">#{s.id}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* P07 — canned reply dropdown khi gõ "/" */}
            {slashMatches.length > 0 && (
                <div className="mx-3 mt-2 rounded border">
                    {slashMatches.map((q) => (
                        <button
                            key={q.id}
                            type="button"
                            className="hover:bg-muted block w-full px-2 py-1.5 text-left"
                            onClick={() => insertQuickReply(q)}
                        >
                            <span className="text-xs font-medium">/{q.title}</span>
                            <span className="text-muted-foreground ml-2 truncate text-xs">{q.body.slice(0, 60)}</span>
                        </button>
                    ))}
                </div>
            )}

            {attachment && (
                <div className="flex items-center gap-2 px-3 pt-2">
                    {attachment.previewUrl ? (
                        <img src={attachment.previewUrl} alt={attachment.filename} className="h-14 w-14 rounded-md object-cover" />
                    ) : (
                        <FileText className="text-muted-foreground h-8 w-8" />
                    )}
                    <span className="text-muted-foreground max-w-[240px] truncate text-xs">{attachment.filename}</span>
                    <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={clearAttachment} aria-label="Bỏ đính kèm">
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-2 p-3">
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadFile(file);
                    }}
                />
                {canSendMedia && (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={disabled || uploading || sending}
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Đính kèm tệp"
                    >
                        <Paperclip className={`h-4 w-4 ${uploading ? 'animate-pulse' : ''}`} />
                    </Button>
                )}
                {canSendSticker && (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={disabled || sending}
                        onClick={() => setStickerOpen(!stickerOpen)}
                        aria-label="Gửi sticker"
                    >
                        <SmilePlus className="h-4 w-4" />
                    </Button>
                )}
                <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onPaste={handlePaste}
                    placeholder={uploading ? 'Đang tải tệp lên...' : 'Nhập tin nhắn...'}
                    className="flex-1"
                    disabled={disabled || sending}
                />
                <Button type="submit" size="sm" disabled={disabled || sending || uploading || (!text.trim() && !attachment)}>
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    );
}
