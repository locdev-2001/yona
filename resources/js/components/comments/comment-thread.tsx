import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { useTranslator } from '@/lib/i18n';
import { useForm } from '@inertiajs/react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { useState } from 'react';

export interface Comment {
    id: string;
    body: string;
    visible_to_customer: boolean;
    created_at: string;
    author?: { id: number; name: string } | null;
    replies?: Comment[];
}

interface CommentFormProps {
    commentableType: string;
    commentableId: string;
    parentId?: string | null;
    onCancel?: () => void;
    showVisibilityToggle?: boolean;
}

function CommentForm({ commentableType, commentableId, parentId = null, onCancel, showVisibilityToggle = false }: CommentFormProps) {
    const t = useTranslator();
    const { data, setData, post, processing, errors, reset } = useForm({
        commentable_type: commentableType,
        commentable_id: commentableId,
        parent_id: parentId,
        body: '',
        visible_to_customer: false,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('comments.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset('body');
                onCancel?.();
            },
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-2">
            <textarea
                value={data.body}
                onChange={(e) => setData('body', e.target.value)}
                placeholder={t('comments.write_comment')}
                rows={3}
                className="focus:ring-ring w-full resize-none rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
            />
            <InputError message={errors.body} />
            {showVisibilityToggle && (
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={data.visible_to_customer} onChange={(e) => setData('visible_to_customer', e.target.checked)} />
                    {t('comments.visible_to_customer')}
                </label>
            )}
            <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={!data.body.trim() || processing}>
                    {t('comments.save')}
                </Button>
                {onCancel && (
                    <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                        {t('comments.cancel')}
                    </Button>
                )}
            </div>
        </form>
    );
}

interface CommentItemProps {
    comment: Comment;
    commentableType: string;
    commentableId: string;
    currentUserId?: number | null;
    canManage?: boolean;
}

function CommentItem({ comment, commentableType, commentableId, currentUserId, canManage }: CommentItemProps) {
    const t = useTranslator();
    const [showReplyForm, setShowReplyForm] = useState(false);
    const { delete: destroy, processing } = useForm();

    const canEdit = canManage || comment.author?.id === currentUserId;

    return (
        <div className="space-y-2">
            <div className="rounded-md border p-3">
                <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium">{comment.author?.name ?? '—'}</span>
                    <span className="text-muted-foreground text-xs">{comment.created_at}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                <div className="mt-2 flex gap-2">
                    <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowReplyForm((v) => !v)}>
                        {t('comments.reply')}
                    </Button>
                    {canEdit && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive h-6 text-xs"
                            disabled={processing}
                            onClick={() => {
                                if (confirm(t('comments.delete_confirm'))) {
                                    destroy(route('comments.destroy', { comment: comment.id }), {
                                        preserveScroll: true,
                                    });
                                }
                            }}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            </div>

            {showReplyForm && (
                <div className="ml-6">
                    <CommentForm
                        commentableType={commentableType}
                        commentableId={commentableId}
                        parentId={comment.id}
                        onCancel={() => setShowReplyForm(false)}
                    />
                </div>
            )}

            {comment.replies && comment.replies.length > 0 && (
                <div className="ml-6 space-y-2">
                    {comment.replies.map((reply) => (
                        <div key={reply.id} className="bg-muted/30 rounded-md border p-3">
                            <div className="mb-1 flex items-center justify-between">
                                <span className="text-xs font-medium">{reply.author?.name ?? '—'}</span>
                                <span className="text-muted-foreground text-xs">{reply.created_at}</span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

interface Props {
    comments: Comment[];
    commentableType: string;
    commentableId: string;
    currentUserId?: number | null;
    canManage?: boolean;
    showVisibilityToggle?: boolean;
}

/**
 * Full comment thread component (top-level + 1-level replies).
 * Embed in any entity detail page (P06-P09).
 */
export default function CommentThread({
    comments,
    commentableType,
    commentableId,
    currentUserId,
    canManage = false,
    showVisibilityToggle = false,
}: Props) {
    const t = useTranslator();

    return (
        <div className="space-y-4">
            <CommentForm commentableType={commentableType} commentableId={commentableId} showVisibilityToggle={showVisibilityToggle} />

            {comments.length === 0 ? (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4" />
                    {t('comments.no_comments')}
                </div>
            ) : (
                <div className="space-y-3">
                    {comments.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            commentableType={commentableType}
                            commentableId={commentableId}
                            currentUserId={currentUserId}
                            canManage={canManage}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
