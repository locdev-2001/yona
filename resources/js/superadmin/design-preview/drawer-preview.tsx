import { useRef, useState, type ReactNode } from 'react';
import {
    Bookmark,
    Check,
    ChevronsRight,
    Download,
    Ellipsis,
    FileSpreadsheet,
    FileText,
    History,
    Link2,
    MessageCircle,
    Pause,
    Pencil,
    Play,
} from '@admin/components/icons';
import { toast } from 'sonner';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetTitle,
    SheetTrigger,
} from '@admin/components/ui/sheet';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@admin/components/ui/dropdown-menu';
import { Textarea } from '@admin/components/ui/textarea';
import { Checkbox } from '@admin/components/ui/checkbox';
import { PreviewButton, StatusBadge } from './components';
import { previewCopy } from './copy';
import './drawer.css';

function PreviewDrawer({
    trigger,
    title,
    description,
    actions,
    children,
    footer,
}: {
    trigger: ReactNode;
    title: string;
    description: string;
    actions: ReactNode;
    children: ReactNode;
    footer: ReactNode;
}) {
    return (
        <Sheet>
            <SheetTrigger render={<PreviewButton />}>{trigger}</SheetTrigger>
            <SheetContent showCloseButton={false} className="catalogue-sheet preview-drawer">
                <div className="preview-drawer-toolbar">
                    <SheetClose
                        render={<PreviewButton appearance="ghost" className="drawer-icon-button" />}
                        aria-label={previewCopy.dong_bang_chi_tiet}
                        title={previewCopy.dong_bang_chi_tiet}
                    >
                        <ChevronsRight />
                    </SheetClose>
                    <span>{previewCopy.chi_tiet_ket_noi}</span>
                    <div className="drawer-toolbar-actions">{actions}</div>
                </div>
                <div className="preview-drawer-body">
                    <header className="drawer-identity">
                        <span className="drawer-record-id">
                            <Link2 /> KN-0042
                        </span>
                        <div className="drawer-title-row">
                            <span className="drawer-channel-icon">
                                <MessageCircle />
                            </span>
                            <SheetTitle>{title}</SheetTitle>
                        </div>
                        <SheetDescription>{description}</SheetDescription>
                    </header>
                    {children}
                </div>
                <footer className="preview-drawer-footer">{footer}</footer>
            </SheetContent>
        </Sheet>
    );
}

const defaultNote = previewCopy.drawer_note_default;
const checklistItems = [
    previewCopy.drawer_check_identity,
    previewCopy.drawer_check_inbound,
    previewCopy.drawer_check_outbound,
];
const activityItems = [
    {
        time: '09:41',
        title: previewCopy.drawer_activity_synced,
        description: previewCopy.drawer_activity_synced_description,
    },
    {
        time: '09:38',
        title: previewCopy.drawer_activity_checked,
        description: previewCopy.drawer_activity_checked_description,
    },
    {
        time: '08:52',
        title: previewCopy.drawer_activity_created,
        description: previewCopy.drawer_activity_created_description,
    },
];
const attachments = [
    {
        filename: 'huong-dan-ket-noi.txt',
        title: previewCopy.drawer_guide,
        format: 'TXT',
        Icon: FileText,
        content: previewCopy.drawer_guide_content,
    },
    {
        filename: 'nhat-ky-dong-bo.csv',
        title: previewCopy.drawer_sync_log,
        format: 'CSV',
        Icon: FileSpreadsheet,
        content: previewCopy.drawer_sync_content,
    },
];

function readSavedNote(): string {
    try {
        return localStorage.getItem('yona-preview-connection-note') ?? defaultNote;
    } catch {
        return defaultNote;
    }
}

export function ConnectionDrawerDemo() {
    const [savedNote, setSavedNote] = useState(readSavedNote);
    const [note, setNote] = useState(savedNote);
    const [bookmarked, setBookmarked] = useState(false);
    const [paused, setPaused] = useState(false);
    const [completed, setCompleted] = useState([true, true, false]);
    const noteRef = useRef<HTMLTextAreaElement>(null);
    const activityRef = useRef<HTMLElement>(null);
    const dirty = note !== savedNote;

    function saveNote() {
        try {
            localStorage.setItem('yona-preview-connection-note', note);
            setSavedNote(note);
            toast.success(previewCopy.drawer_saved);
        } catch {
            toast.error(previewCopy.drawer_save_failed);
        }
    }

    return (
        <PreviewDrawer
            trigger={
                <>
                    <MessageCircle />
                    {previewCopy.mo_bang_chi_tiet}
                </>
            }
            title={previewCopy.zalo_ca_nhan}
            description={previewCopy.drawer_description}
            actions={
                <>
                    <PreviewButton
                        appearance="ghost"
                        className="drawer-icon-button"
                        aria-label={previewCopy.drawer_edit_note}
                        title={previewCopy.drawer_edit_note}
                        onClick={() => noteRef.current?.focus()}
                    >
                        <Pencil />
                    </PreviewButton>
                    <PreviewButton
                        appearance="ghost"
                        className="drawer-icon-button"
                        aria-label={previewCopy.drawer_bookmark}
                        title={previewCopy.drawer_bookmark}
                        aria-pressed={bookmarked}
                        onClick={() => setBookmarked(!bookmarked)}
                    >
                        <Bookmark fill={bookmarked ? 'currentColor' : 'none'} />
                    </PreviewButton>
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={<PreviewButton appearance="ghost" className="drawer-icon-button" />}
                            aria-label={previewCopy.drawer_more}
                            title={previewCopy.drawer_more}
                        >
                            <Ellipsis />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="catalogue-popup">
                            <DropdownMenuItem onClick={() => setPaused(!paused)}>
                                {paused ? <Play /> : <Pause />}
                                {paused ? previewCopy.drawer_resume : previewCopy.drawer_pause}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() =>
                                    activityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                }
                            >
                                <History />
                                {previewCopy.drawer_view_activity}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </>
            }
            footer={
                <>
                    <span className="drawer-save-state" role="status">
                        <span className={dirty ? 'is-unsaved' : ''} />
                        {dirty ? previewCopy.drawer_unsaved : previewCopy.drawer_saved_state}
                    </span>
                    <SheetClose render={<PreviewButton appearance="ghost" />}>{previewCopy.drawer_close}</SheetClose>
                    <PreviewButton appearance="primary" disabled={!dirty} onClick={saveNote}>
                        <Check />
                        {previewCopy.luu_thay_doi}
                    </PreviewButton>
                </>
            }
        >
            <dl className="drawer-metadata">
                <div>
                    <dt>{previewCopy.trang_thai}</dt>
                    <dd>
                        <StatusBadge tone={paused ? 'warning' : 'positive'}>
                            {paused ? previewCopy.tam_dung : previewCopy.dang_hoat_dong}
                        </StatusBadge>
                    </dd>
                </div>
                <div>
                    <dt>{previewCopy.drawer_owner}</dt>
                    <dd>
                        <span className="drawer-avatar">NA</span>Ngọc Anh
                    </dd>
                </div>
                <div>
                    <dt>{previewCopy.drawer_synced}</dt>
                    <dd>{previewCopy.hom_nay_09_41}</dd>
                </div>
                <div>
                    <dt>{previewCopy.drawer_created}</dt>
                    <dd>22/10/2026</dd>
                </div>
            </dl>
            <section className="drawer-section">
                <div className="drawer-section-heading">
                    <label htmlFor="drawer-connection-note">{previewCopy.drawer_note}</label>
                    <span>{previewCopy.drawer_private}</span>
                </div>
                <Textarea
                    ref={noteRef}
                    id="drawer-connection-note"
                    aria-label={previewCopy.drawer_note}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                />
            </section>
            <section className="drawer-section">
                <h3>
                    {previewCopy.drawer_attachments}
                    <span className="drawer-count">02</span>
                </h3>
                <div className="drawer-attachments">
                    {attachments.map(({ filename, title, format, Icon, content }) => (
                        <a
                            key={filename}
                            className="drawer-attachment"
                            download={filename}
                            href={`data:text/plain;charset=utf-8,${encodeURIComponent(content)}`}
                        >
                            <span className={`drawer-file-icon drawer-file-icon--${format.toLowerCase()}`}>
                                <Icon />
                            </span>
                            <span className="drawer-file-name">
                                <strong>{title}</strong>
                                <small>
                                    {format} · {previewCopy.drawer_sample_file}
                                </small>
                            </span>
                            <Download aria-label={previewCopy.drawer_download} />
                        </a>
                    ))}
                </div>
            </section>
            <section className="drawer-section">
                <h3>
                    {previewCopy.drawer_checklist}
                    <span className="drawer-section-count">{completed.filter(Boolean).length}/3</span>
                </h3>
                <div className="drawer-checklist">
                    {checklistItems.map((label, index) => (
                        <label key={label} className="drawer-checklist-item" data-completed={completed[index]}>
                            <Checkbox
                                checked={completed[index]}
                                onCheckedChange={(checked) =>
                                    setCompleted(
                                        completed.map((value, position) => (position === index ? checked : value)),
                                    )
                                }
                            />
                            <span>{label}</span>
                            <span className="drawer-check-state">
                                {completed[index] ? previewCopy.drawer_done : previewCopy.drawer_pending}
                            </span>
                        </label>
                    ))}
                </div>
            </section>
            <section className="drawer-section" ref={activityRef}>
                <h3>
                    {previewCopy.drawer_activity}
                    <span className="drawer-section-count">{previewCopy.hom_nay}</span>
                </h3>
                <ol className="drawer-activity">
                    {activityItems.map(({ time, title, description }) => (
                        <li key={time}>
                            <time>{time}</time>
                            <span className="drawer-timeline-marker" />
                            <div>
                                <strong>{title}</strong>
                                <p>{description}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            </section>
        </PreviewDrawer>
    );
}
