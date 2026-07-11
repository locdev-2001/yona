import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StickyNote, Tag, UserCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

/** P07 — panel CRM channel-agnostic: gán phụ trách + label + note nội bộ. */

interface PanelData {
    assigned_user: { id: number; name: string } | null;
    tags: { id: string; name: string; color: string | null }[];
    notes: { id: string; body: string; author_name: string | null; created_at: string }[];
    members: { id: number; name: string }[];
}

interface Props {
    conversationId: string;
}

function xsrf(): string {
    return decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
}

const JSON_HEADERS = () => ({
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-XSRF-TOKEN': xsrf(),
});

export function ConversationPanel({ conversationId }: Props) {
    const [data, setData] = useState<PanelData | null>(null);
    const [noteInput, setNoteInput] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [busy, setBusy] = useState(false);

    const reload = useCallback(() => {
        fetch(route('inbox.panel', conversationId), {
            headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
        })
            .then((r) => r.json())
            .then(setData)
            .catch(() => {});
    }, [conversationId]);

    useEffect(reload, [reload]);

    function assign(userId: number | null) {
        setBusy(true);
        fetch(route('inbox.assign', conversationId), {
            method: 'PATCH',
            headers: JSON_HEADERS(),
            body: JSON.stringify({ user_id: userId }),
        })
            .then(async (r) => {
                const json = await r.json().catch(() => ({}));
                if (!r.ok) {
                    alert(json.message ?? 'Không gán được.');
                    return;
                }
                setData((prev) => (prev ? { ...prev, assigned_user: json.assigned_user } : prev));
            })
            .catch(() => alert('Không kết nối được server.'))
            .finally(() => setBusy(false));
    }

    // tags.sync = full replace set — gửi danh sách tên hiện tại ± thay đổi
    function syncTags(names: string[]) {
        setBusy(true);
        fetch(route('tags.sync'), {
            method: 'POST',
            headers: JSON_HEADERS(),
            body: JSON.stringify({ attachable_type: 'conversation', attachable_id: conversationId, tags: names }),
        })
            .then((r) => {
                if (r.status === 403) alert('Bạn không có quyền quản lý label.');
                reload();
            })
            .catch(() => alert('Không kết nối được server.'))
            .finally(() => setBusy(false));
    }

    function addNote() {
        const body = noteInput.trim();
        if (!body) return;
        setBusy(true);
        fetch(route('notes.store'), {
            method: 'POST',
            headers: JSON_HEADERS(),
            body: JSON.stringify({ noteable_type: 'conversation', noteable_id: conversationId, body }),
        })
            .then(() => {
                setNoteInput('');
                reload();
            })
            .catch(() => alert('Không kết nối được server.'))
            .finally(() => setBusy(false));
    }

    if (!data) return null;

    return (
        <div className="space-y-4 border-t pt-3">
            {/* Gán phụ trách */}
            <div className="space-y-1">
                <p className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
                    <UserCheck className="h-3.5 w-3.5" /> Phụ trách
                </p>
                <select
                    className="border-input bg-background h-8 w-full rounded-md border px-2 text-xs"
                    value={data.assigned_user?.id ?? ''}
                    disabled={busy}
                    onChange={(e) => assign(e.target.value === '' ? null : Number(e.target.value))}
                >
                    <option value="">— Chưa gán —</option>
                    {data.members.map((m) => (
                        <option key={m.id} value={m.id}>
                            {m.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Labels (tags polymorphic — thuần gắn-lọc, không side effect) */}
            <div className="space-y-1">
                <p className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
                    <Tag className="h-3.5 w-3.5" /> Label
                </p>
                <div className="flex flex-wrap gap-1">
                    {data.tags.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            className="rounded-full border px-2 py-0.5 text-[11px] hover:line-through"
                            style={t.color ? { borderColor: t.color, color: t.color } : undefined}
                            title="Bấm để gỡ"
                            disabled={busy}
                            onClick={() => syncTags(data.tags.filter((x) => x.id !== t.id).map((x) => x.name))}
                        >
                            {t.name}
                        </button>
                    ))}
                </div>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const name = tagInput.trim();
                        if (!name) return;
                        setTagInput('');
                        syncTags([...data.tags.map((t) => t.name), name]);
                    }}
                    className="flex gap-1"
                >
                    <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Thêm label..." className="h-7 text-xs" />
                    <Button type="submit" size="sm" variant="secondary" className="h-7 text-xs" disabled={busy || !tagInput.trim()}>
                        +
                    </Button>
                </form>
            </div>

            {/* Note nội bộ — KHÔNG vào stream tin, KHÔNG gửi ra kênh */}
            <div className="space-y-1">
                <p className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
                    <StickyNote className="h-3.5 w-3.5" /> Note nội bộ
                </p>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                    {data.notes.map((n) => (
                        <div key={n.id} className="rounded border border-amber-200 bg-amber-50 p-1.5 text-xs dark:border-amber-900 dark:bg-amber-950">
                            <p className="whitespace-pre-wrap">{n.body}</p>
                            <p className="text-muted-foreground mt-0.5 text-[10px]">
                                {n.author_name} · {new Date(n.created_at).toLocaleString('vi-VN')}
                            </p>
                        </div>
                    ))}
                </div>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        addNote();
                    }}
                    className="flex gap-1"
                >
                    <Input
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Ghi chú riêng cho team..."
                        className="h-7 text-xs"
                    />
                    <Button type="submit" size="sm" variant="secondary" className="h-7 text-xs" disabled={busy || !noteInput.trim()}>
                        Lưu
                    </Button>
                </form>
            </div>
        </div>
    );
}
