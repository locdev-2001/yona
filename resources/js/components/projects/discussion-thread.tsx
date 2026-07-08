import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useTranslator } from '@/lib/i18n';
import type { Project, ProjectDiscussion } from '@/types';
import { useForm } from '@inertiajs/react';
import { MessageSquare, Plus } from 'lucide-react';
import { useState } from 'react';

interface Props {
    project: Project;
    canComment: boolean;
}

export default function DiscussionThread({ project, canComment }: Props) {
    const t = useTranslator();
    const discussions = project.discussions ?? [];
    const [showForm, setShowForm] = useState(false);

    const { data, setData, post, processing, reset } = useForm({
        subject: '',
        body: '',
        show_to_customer: false,
    });

    function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        post(route('projects.discussions.store', project.id), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setShowForm(false);
            },
        });
    }

    return (
        <div className="space-y-4">
            {canComment && !showForm && (
                <Button size="sm" onClick={() => setShowForm(true)}>
                    <Plus className="mr-1 h-4 w-4" />
                    {t('projects.actions.new_discussion')}
                </Button>
            )}

            {showForm && (
                <form onSubmit={handleCreate} className="max-w-lg space-y-3 rounded-lg border p-4">
                    <div className="space-y-1">
                        <Label htmlFor="disc-subject">{t('projects.discussion.subject')}</Label>
                        <input
                            id="disc-subject"
                            className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm"
                            value={data.subject}
                            onChange={(e) => setData('subject', e.target.value)}
                            required
                            maxLength={191}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="disc-body">{t('projects.discussion.body')}</Label>
                        <Textarea id="disc-body" value={data.body} onChange={(e) => setData('body', e.target.value)} rows={3} />
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch id="disc-show" checked={data.show_to_customer} onCheckedChange={(v) => setData('show_to_customer', v)} />
                        <Label htmlFor="disc-show">{t('projects.discussion.show_to_customer')}</Label>
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={processing}>
                            {t('projects.actions.new_discussion')}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                            Cancel
                        </Button>
                    </div>
                </form>
            )}

            <div className="space-y-3">
                {discussions.length === 0 && <p className="text-muted-foreground text-sm">No discussions yet.</p>}
                {discussions.map((d) => (
                    <DiscussionCard key={d.id} discussion={d} project={project} canComment={canComment} />
                ))}
            </div>
        </div>
    );
}

function DiscussionCard({ discussion, project, canComment }: { discussion: ProjectDiscussion; project: Project; canComment: boolean }) {
    const t = useTranslator();
    const [showReply, setShowReply] = useState(false);

    const { data, setData, post, processing, reset } = useForm({ body: '', parent_id: null as string | null });

    function handleReply(e: React.FormEvent) {
        e.preventDefault();
        post(route('projects.discussions.reply', { project: project.id, discussion: discussion.id }), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setShowReply(false);
            },
        });
    }

    return (
        <div className="space-y-2 rounded-lg border p-4">
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-medium">{discussion.subject}</p>
                    <p className="text-muted-foreground text-xs">
                        {discussion.author?.name ?? '—'} · {new Date(discussion.created_at).toLocaleDateString()}
                    </p>
                </div>
                {discussion.show_to_customer && (
                    <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">{t('projects.discussion.show_to_customer')}</span>
                )}
            </div>
            {discussion.body && <p className="text-muted-foreground text-sm whitespace-pre-line">{discussion.body}</p>}

            {/* Replies */}
            {(discussion.comments ?? []).length > 0 && (
                <div className="ml-4 space-y-2 border-l pl-4">
                    {discussion.comments!.map((reply) => (
                        <div key={reply.id} className="text-sm">
                            <span className="font-medium">{reply.user?.name ?? '—'}</span>
                            <span className="text-muted-foreground mx-1">·</span>
                            <span className="whitespace-pre-line">{reply.body}</span>
                        </div>
                    ))}
                </div>
            )}

            {canComment && (
                <div>
                    {!showReply ? (
                        <Button size="sm" variant="ghost" onClick={() => setShowReply(true)}>
                            <MessageSquare className="mr-1 h-3.5 w-3.5" />
                            {t('projects.actions.reply')}
                        </Button>
                    ) : (
                        <form onSubmit={handleReply} className="mt-2 space-y-2">
                            <Textarea
                                value={data.body}
                                onChange={(e) => setData('body', e.target.value)}
                                rows={2}
                                placeholder="Write a reply..."
                                required
                            />
                            <div className="flex gap-2">
                                <Button type="submit" size="sm" disabled={processing}>
                                    {t('projects.actions.reply')}
                                </Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => setShowReply(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}
