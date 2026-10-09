import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';

import { t } from '../../../i18n';
import Loader from 'shared/components/loader/Loader';

// Primitive giao diện của màn kho sticker, chạy ở cả dashboard lẫn console Super Admin.
// Màu chỉ dùng token n-*; mọi <button> mang `reset-base` để CSS Administrate không tô
// xanh. Ô nhập dùng lớp chung `field-surface`/`field-invalid`, lớp nổi dùng `overlay-surface`.

export const MOBILE_QUERY = '(max-width: 767px)';
export const WIDE_QUERY = '(min-width: 1280px)';
const TOAST_DURATION_MS = 4000;
const MODAL_Z_CLASS = 'z-[60]';
const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-n-brand focus-visible:ring-offset-1';

export const INPUT_CLASS = `reset-base field-surface block h-11 w-full rounded-lg border-0 px-3 py-0 text-base text-n-slate-12 placeholder:text-n-slate-10 md:h-9 md:text-sm disabled:cursor-not-allowed disabled:opacity-50`;
export const INPUT_ERROR_CLASS = 'field-invalid';

const BUTTON_BASE = `reset-base inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-solid text-sm font-medium transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;

const BUTTON_TONES = {
    primary: 'border-transparent bg-n-brand text-white [@media(hover:hover)]:hover:bg-n-brand/90',
    secondary: 'border-transparent bg-n-surface-field text-n-slate-12 [@media(hover:hover)]:hover:bg-n-surface-field-hover',
    danger: 'border-transparent bg-n-ruby-9 text-white [@media(hover:hover)]:hover:bg-n-ruby-10',
    ghost: 'border-transparent bg-transparent text-n-slate-12 [@media(hover:hover)]:hover:bg-n-alpha-2',
    'ghost-danger': 'border-transparent bg-transparent text-n-ruby-11 [@media(hover:hover)]:hover:bg-n-ruby-3',
} as const;

export type ButtonTone = keyof typeof BUTTON_TONES;

const BUTTON_SIZES = {
    md: 'h-11 md:h-9',
    lg: 'h-12',
    // Bottom sheet trên điện thoại cần nút 48px, desktop giữ 36px.
    sheet: 'h-12 md:h-9',
} as const;

export function buttonClass(tone: ButtonTone = 'secondary', size: keyof typeof BUTTON_SIZES = 'md'): string {
    return `${BUTTON_BASE} px-3 ${BUTTON_SIZES[size]} ${BUTTON_TONES[tone]}`;
}

// Hằng lớp cũ trình chỉnh ảnh đang dùng; cùng nguồn với StickerButton.
export const PRIMARY_BUTTON_CLASS = buttonClass('primary');
export const SECONDARY_BUTTON_CLASS = buttonClass('secondary');
export const DANGER_BUTTON_CLASS = buttonClass('danger');

// Nền caro để thấy chỗ trong suốt.
export const CHECKERBOARD_STYLE = {
    backgroundColor: 'rgb(var(--solid-1))',
    backgroundImage: 'repeating-conic-gradient(rgb(var(--slate-4)) 0% 25%, transparent 0% 50%)',
    backgroundSize: '16px 16px',
} as const;

export function useMediaQuery(query: string): boolean {
    const read = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
    const [matches, setMatches] = useState(read);

    useEffect(() => {
        if (typeof window.matchMedia !== 'function') return undefined;
        const list = window.matchMedia(query);
        const update = () => setMatches(list.matches);
        update();
        list.addEventListener('change', update);

        return () => list.removeEventListener('change', update);
    }, [query]);

    return matches;
}

interface StickerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    tone?: ButtonTone;
    size?: keyof typeof BUTTON_SIZES;
    icon?: string;
    busy?: boolean;
}

export const StickerButton = forwardRef<HTMLButtonElement, StickerButtonProps>(function StickerButton(
    { tone = 'secondary', size = 'md', icon, busy = false, className = '', children, disabled, type = 'button', ...buttonProps },
    ref,
) {
    return (
        <button
            ref={ref}
            type={type}
            className={`${buttonClass(tone, size)} ${className}`.trim()}
            disabled={disabled || busy}
            aria-busy={busy || undefined}
            {...buttonProps}
        >
            {busy ? <Loader size={16} className="text-n-slate-11" /> : icon ? <span className={`${icon} size-4 shrink-0`} aria-hidden="true" /> : null}
            {children}
        </button>
    );
});

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon: string;
    label: string;
    tone?: 'ghost' | 'secondary' | 'ghost-danger';
    compact?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
    { icon, label, tone = 'ghost', compact = false, className = '', type = 'button', ...buttonProps },
    ref,
) {
    return (
    <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={`${BUTTON_BASE} ${BUTTON_TONES[tone]} ${compact ? 'size-8' : 'size-11 md:size-9'} ${className}`.trim()}
        {...buttonProps}
    >
        <span className={`${icon} size-4 shrink-0`} aria-hidden="true" />
    </button>
    );
});

interface SwitchProps {
    checked: boolean;
    label: string;
    disabled?: boolean;
    busy?: boolean;
    describedBy?: string;
    onChange: (checked: boolean) => void;
}

export function Switch({ checked, label, disabled = false, busy = false, describedBy, onChange }: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-describedby={describedBy}
            disabled={disabled || busy}
            onClick={() => onChange(!checked)}
            className={`reset-base inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border-0 bg-transparent px-1 text-sm font-medium text-n-slate-12 disabled:cursor-not-allowed disabled:opacity-50 md:h-9 ${FOCUS_RING}`}
        >
            <span
                aria-hidden="true"
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-n-brand' : 'bg-n-slate-7'}`}
            >
                <span
                    className={`absolute left-0.5 size-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
                />
            </span>
            {busy ? <Loader size={14} className="text-n-slate-11" /> : null}
            <span>{label}</span>
        </button>
    );
}

const BADGE_TONES = {
    neutral: 'bg-n-alpha-2 text-n-slate-11',
    success: 'bg-n-teal-3 text-n-teal-11',
    warning: 'bg-n-amber-3 text-n-amber-11',
    danger: 'bg-n-ruby-3 text-n-ruby-11',
} as const;

export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof BADGE_TONES; children: ReactNode }) {
    return (
        <span className={`inline-flex h-6 shrink-0 items-center rounded-md px-2 text-xs font-medium ${BADGE_TONES[tone]}`}>{children}</span>
    );
}

// Nút ⓘ bấm để bung/đóng lời giải thích (chạm được trên điện thoại, không chỉ rê chuột).
export function InfoTip({ text, label }: { text: string; label: string }) {
    const [open, setOpen] = useState(false);
    const tipId = useId();

    return (
        <span className="relative inline-flex">
            <IconButton
                icon="i-lucide-info"
                label={label}
                compact
                aria-expanded={open}
                aria-describedby={open ? tipId : undefined}
                onClick={() => setOpen(value => !value)}
                onBlur={() => setOpen(false)}
            />
            {open ? (
                <span
                    id={tipId}
                    role="tooltip"
                    className="overlay-surface absolute left-0 top-full z-20 mt-1 w-64 rounded-lg p-3 text-xs font-normal text-n-slate-12"
                >
                    {text}
                </span>
            ) : null}
        </span>
    );
}

// Modal chồng nhau: chỉ lớp trên cùng nhận Esc và bẫy focus; nền (mọi con khác của body) bị `inert`.
const modalStack: HTMLElement[] = [];

function setBackgroundInert(container: HTMLElement): HTMLElement[] {
    const changed: HTMLElement[] = [];
    for (const child of Array.from(document.body.children)) {
        if (!(child instanceof HTMLElement) || child === container || child.hasAttribute('inert')) continue;
        if (child.dataset.stickerToastRegion !== undefined) continue;
        child.setAttribute('inert', '');
        changed.push(child);
    }

    return changed;
}

function focusablesIn(element: HTMLElement): HTMLElement[] {
    return Array.from(element.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(node => !node.hasAttribute('inert'));
}

export type ModalVariant = 'dialog' | 'drawer' | 'sheet';
export type ModalCloseReason = 'escape' | 'backdrop' | 'button';

interface ModalProps {
    open: boolean;
    title: string;
    hideTitle?: boolean;
    variant?: ModalVariant;
    role?: 'dialog' | 'alertdialog';
    describedBy?: string;
    initialFocusRef?: RefObject<HTMLElement | null>;
    widthClassName?: string;
    onRequestClose: (reason: ModalCloseReason) => void;
    children: ReactNode;
    footer?: ReactNode;
}

const PANEL_LAYOUT: Record<ModalVariant, { overlay: string; panel: string }> = {
    // Giữa màn trên desktop, bottom sheet dưới 768px.
    dialog: {
        overlay: 'items-end md:items-center md:justify-center md:p-4',
        panel: 'w-full rounded-t-2xl md:rounded-xl max-h-[85dvh]',
    },
    // Ngăn phủ bên phải trên desktop, bottom sheet dưới 768px.
    drawer: {
        overlay: 'items-end md:items-stretch md:justify-end',
        panel: 'w-full rounded-t-2xl max-h-[85dvh] md:h-full md:max-h-none md:w-[360px] md:rounded-none',
    },
    sheet: {
        overlay: 'items-end',
        panel: 'w-full rounded-t-2xl max-h-[85dvh]',
    },
};

export function Modal({
    open,
    title,
    hideTitle = false,
    variant = 'dialog',
    role = 'dialog',
    describedBy,
    initialFocusRef,
    widthClassName = 'md:max-w-[400px]',
    onRequestClose,
    children,
    footer,
}: ModalProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const titleId = useId();
    const requestCloseRef = useRef(onRequestClose);
    requestCloseRef.current = onRequestClose;

    if (open && !containerRef.current && typeof document !== 'undefined') {
        containerRef.current = document.createElement('div');
    }

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!open || !container) return undefined;
        document.body.appendChild(container);
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const inerted = setBackgroundInert(container);
        modalStack.push(container);

        const panel = panelRef.current;
        const target = initialFocusRef?.current ?? (panel ? focusablesIn(panel)[0] : null) ?? panel;
        target?.focus();

        const onKeyDown = (event: KeyboardEvent) => {
            if (modalStack[modalStack.length - 1] !== container || !panel) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                requestCloseRef.current('escape');
                return;
            }
            if (event.key !== 'Tab') return;
            const focusables = focusablesIn(panel);
            if (focusables.length === 0) {
                event.preventDefault();
                return;
            }
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            } else if (!panel.contains(document.activeElement)) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', onKeyDown, true);

        return () => {
            document.removeEventListener('keydown', onKeyDown, true);
            modalStack.splice(modalStack.indexOf(container), 1);
            inerted.forEach(element => element.removeAttribute('inert'));
            container.remove();
            if (previouslyFocused?.isConnected) previouslyFocused.focus();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    if (!open || !containerRef.current) return null;
    const layout = PANEL_LAYOUT[variant];

    return createPortal(
        <div className={`fixed inset-0 ${MODAL_Z_CLASS} flex bg-modal-backdrop-light ${layout.overlay}`} onMouseDown={event => {
            if (event.target === event.currentTarget) requestCloseRef.current('backdrop');
        }}>
            <div
                ref={panelRef}
                role={role}
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={describedBy}
                tabIndex={-1}
                className={`overlay-surface flex flex-col overflow-hidden text-n-slate-12 outline-none ${layout.panel} ${variant === 'dialog' ? widthClassName : ''}`}
            >
                <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-n-slate-6 md:hidden" aria-hidden="true" />
                <h2 id={titleId} className={hideTitle ? 'sr-only' : 'm-0 shrink-0 px-5 pb-1 pt-4 text-base font-semibold text-n-slate-12'}>
                    {title}
                </h2>
                <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
                {footer ? (
                    <div className="shrink-0 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3">
                        {footer}
                    </div>
                ) : null}
            </div>
        </div>,
        containerRef.current,
    );
}

export interface MenuItem {
    key: string;
    label: string;
    icon: string;
    danger?: boolean;
    disabled?: boolean;
    separatorBefore?: boolean;
    onSelect: () => void;
}

interface MenuProps {
    label: string;
    items: MenuItem[];
    triggerClassName?: string;
    compact?: boolean;
    tone?: 'ghost' | 'secondary';
}

// Nút ⋯ mở menu: desktop là danh sách nổi cạnh nút, điện thoại là bottom sheet nút 48px.
export function Menu({ label, items, triggerClassName = '', compact = false, tone = 'ghost' }: MenuProps) {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const isMobile = useMediaQuery(MOBILE_QUERY);
    const visibleItems = items.filter(item => !item.disabled);

    const close = useCallback(() => {
        setOpen(false);
        triggerRef.current?.focus();
    }, []);

    const openMenu = () => {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (rect) {
            const menuWidth = 232;
            setPosition({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)) });
        }
        setOpen(true);
    };

    useEffect(() => {
        if (!open || isMobile) return undefined;
        listRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (!listRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
        };
        const onScroll = () => setOpen(false);
        document.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('resize', onScroll);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('resize', onScroll);
        };
    }, [open, isMobile]);

    const select = (item: MenuItem) => {
        setOpen(false);
        item.onSelect();
    };

    const onListKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        const entries = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
        const index = entries.indexOf(document.activeElement as HTMLElement);
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const step = event.key === 'ArrowDown' ? 1 : -1;
            entries[(index + step + entries.length) % entries.length]?.focus();
        } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            entries[event.key === 'Home' ? 0 : entries.length - 1]?.focus();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            close();
        } else if (event.key === 'Tab') {
            setOpen(false);
        }
    };

    const itemClass = (item: MenuItem, tall: boolean) =>
        `reset-base flex w-full items-center gap-2.5 rounded-lg border-0 bg-transparent px-3 text-left text-sm ${tall ? 'h-12' : 'h-9'} ${
            item.danger ? 'text-n-ruby-11' : 'text-n-slate-12'
        } [@media(hover:hover)]:hover:bg-n-alpha-2 focus-visible:bg-n-alpha-2 focus-visible:outline-none`;

    const renderItems = (tall: boolean) =>
        visibleItems.map(item => (
            <div key={item.key} role="none">
                {item.separatorBefore ? <div role="separator" className="my-1 h-px bg-n-weak" /> : null}
                <button type="button" role="menuitem" className={itemClass(item, tall)} onClick={() => select(item)}>
                    <span className={`${item.icon} size-4 shrink-0`} aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                </button>
            </div>
        ));

    return (
        <>
            <IconButton
                ref={triggerRef}
                icon="i-lucide-ellipsis"
                label={label}
                tone={tone}
                compact={compact}
                aria-haspopup="menu"
                aria-expanded={open}
                className={triggerClassName}
                onClick={() => (open ? setOpen(false) : openMenu())}
            />
            {open && isMobile ? (
                <Modal open title={label} hideTitle variant="sheet" onRequestClose={close}>
                    <div role="menu" aria-label={label} ref={listRef} onKeyDown={onListKeyDown} className="flex flex-col p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
                        {renderItems(true)}
                    </div>
                </Modal>
            ) : null}
            {open && !isMobile
                ? createPortal(
                      <div
                          ref={listRef}
                          role="menu"
                          aria-label={label}
                          onKeyDown={onListKeyDown}
                          style={{ top: position.top, left: position.left }}
                          className={`overlay-surface fixed ${MODAL_Z_CLASS} flex w-[232px] flex-col rounded-xl p-1`}
                      >
                          {renderItems(false)}
                      </div>,
                      document.body,
                  )
                : null}
        </>
    );
}

export interface ToastOptions {
    message: string;
    tone?: 'info' | 'error';
    action?: { label: string; onClick: () => void };
    // null = không tự ẩn (danh sách tệp bị loại cần đọc hết).
    durationMs?: number | null;
}

interface ToastEntry extends ToastOptions {
    id: number;
}

const ToastContext = createContext<(options: ToastOptions) => void>(() => undefined);

export const useStickerToast = () => useContext(ToastContext);

export function StickerToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastEntry[]>([]);
    const nextId = useRef(0);
    const timers = useRef(new Map<number, number>());

    const dismiss = useCallback((id: number) => {
        window.clearTimeout(timers.current.get(id));
        timers.current.delete(id);
        setToasts(current => current.filter(toast => toast.id !== id));
    }, []);

    const show = useCallback(
        (options: ToastOptions) => {
            const id = (nextId.current += 1);
            setToasts(current => [...current.slice(-2), { ...options, id }]);
            const duration = options.durationMs === undefined ? TOAST_DURATION_MS : options.durationMs;
            if (duration !== null) timers.current.set(id, window.setTimeout(() => dismiss(id), duration));
        },
        [dismiss],
    );

    useEffect(() => {
        const pending = timers.current;

        return () => pending.forEach(timer => window.clearTimeout(timer));
    }, []);

    return (
        <ToastContext.Provider value={show}>
            {children}
            {typeof document !== 'undefined'
                ? createPortal(
                      <div
                          data-sticker-toast-region=""
                          aria-live="polite"
                          className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6"
                      >
                          {toasts.map(toast => (
                              <div
                                  key={toast.id}
                                  role={toast.tone === 'error' ? 'alert' : 'status'}
                                  className={`pointer-events-auto flex max-w-[min(480px,100%)] items-center gap-3 rounded-xl px-4 py-2.5 text-sm shadow-lg ${
                                      toast.tone === 'error' ? 'bg-n-ruby-9 text-white' : 'bg-n-slate-12 text-n-slate-1'
                                  }`}
                              >
                                  <span className="min-w-0 flex-1">{toast.message}</span>
                                  {toast.action ? (
                                      <button
                                          type="button"
                                          className={`reset-base h-8 shrink-0 rounded-md border-0 bg-transparent px-2 text-sm font-semibold text-inherit underline ${FOCUS_RING}`}
                                          onClick={() => {
                                              dismiss(toast.id);
                                              toast.action?.onClick();
                                          }}
                                      >
                                          {toast.action.label}
                                      </button>
                                  ) : null}
                                  <button
                                      type="button"
                                      aria-label={t('STICKER_LIBRARY.DISMISS')}
                                      className={`reset-base inline-flex size-8 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-inherit opacity-80 ${FOCUS_RING}`}
                                      onClick={() => dismiss(toast.id)}
                                  >
                                      <span className="i-lucide-x size-4" aria-hidden="true" />
                                  </button>
                              </div>
                          ))}
                      </div>,
                      document.body,
                  )
                : null}
        </ToastContext.Provider>
    );
}
