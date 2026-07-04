import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Paperclip, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/** Cap tĩnh 20MB chung mọi loại — khớp ConversationAttachmentController::MAX_UPLOAD_KB. */
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

interface PendingAttachment {
    id: string;
    filename: string;
    mediaKind: string;
    previewUrl: string | null; // objectURL cho ảnh — revoke khi thay/clear
}

interface Props {
    conversationId: string;
    disabled?: boolean;
    /** Gọi sau khi gửi thành công — parent reload thread. */
    onSent: () => void;
}

function xsrfToken(): string {
    return decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
}

/** ponytail: alert thay toast — cùng lý do showToast ở inbox/index.tsx */
function notify(msg: string) {
    alert(msg);
}

/** Composer channel-agnostic: text + đính kèm (chọn file / paste ảnh) + preview. */
export function MessageComposer({ conversationId, disabled, onSent }: Props) {
    const [text, setText] = useState('');
    const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            body: JSON.stringify({ text: trimmed || null, attachment_id: attachment?.id ?? null }),
        })
            .then(async (r) => {
                const json = await r.json().catch(() => ({}));
                if (!r.ok) {
                    setText(restoreText); // giữ nội dung để user gửi lại
                    notify(json.message ?? 'Không gửi được tin nhắn. Vui lòng thử lại.');
                    return;
                }
                clearAttachment();
                onSent();
            })
            .catch(() => {
                setText(restoreText);
                notify('Không kết nối được server.');
            })
            .finally(() => setSending(false));
    }

    return (
        <div className="border-t">
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
