import { AnnouncementBody } from '@/components/announcements/announcement-body';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAnnouncementModal } from '@/hooks/use-announcement-modal';
import { useTranslator } from '@/lib/i18n';
import type { SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';

/**
 * Auto-pops once per session when there is an unread announcement.
 *
 * Guard: sessionStorage key `announcement_modal_seen_<id>`.
 * Dismiss: POST /whats-new/<id>/read (idempotent) then sets the guard.
 * No re-pop on Inertia navigations or workspace switches.
 */
export function WhatsNewModal() {
    const t = useTranslator();
    const { latestUnreadAnnouncement } = usePage<SharedData>().props;
    const { isOpen, close } = useAnnouncementModal(latestUnreadAnnouncement?.id);

    if (!latestUnreadAnnouncement) return null;

    function handleGotIt() {
        close();
        router.post(route('announcements.read', { announcement: latestUnreadAnnouncement!.id }), {}, { preserveState: true, preserveScroll: true });
    }

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) close();
            }}
        >
            <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('platform.announcements.modal_title')}</DialogTitle>
                </DialogHeader>

                {latestUnreadAnnouncement.cover_image && (
                    <img src={latestUnreadAnnouncement.cover_image} alt="" aria-hidden="true" className="h-44 w-full rounded-md object-cover" />
                )}

                <h2 className="text-lg font-semibold">{latestUnreadAnnouncement.title}</h2>

                <AnnouncementBody bodyHtml={latestUnreadAnnouncement.body_html} />

                <DialogFooter>
                    <Button onClick={handleGotIt}>{t('platform.announcements.got_it')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
