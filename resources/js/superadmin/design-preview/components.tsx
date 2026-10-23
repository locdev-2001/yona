import { dimensionTokens } from './tokens';
import { previewCopy, useDesignCopy } from './copy';
import {
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    Check,
    MoreHorizontal,
    Search,
    X,
    Users,
    MessageSquare,
    PlugZap,
    CircleCheck,
} from '@admin/components/icons';
import { useEffect, useId, useState } from 'react';
import type { ComponentProps, ReactNode, RefObject } from 'react';
import { Button } from '@admin/components/ui/button';
import { WidgetCard } from './widget-card';

export type Tone = 'positive' | 'warning' | 'system' | 'danger' | 'brand' | 'peak' | 'activity';
export type MetricPurpose = 'users' | 'messages' | 'connections' | 'delivery';
export type MetricTrend = 'up' | 'down' | 'flat';

export function PreviewButton({
    appearance = 'secondary',
    className = '',
    ...props
}: ComponentProps<typeof Button> & { appearance?: 'primary' | 'secondary' | 'ghost' }) {
    return <Button {...props} className={`preview-button preview-button--${appearance} ${className}`} />;
}

export function SearchField({
    value,
    onChange,
    label,
    placeholder,
    clearLabel,
    inputRef,
    className = '',
    shortcut = false,
    onClick,
    onKeyDown,
}: {
    value: string;
    onChange: (value: string) => void;
    label: string;
    placeholder: string;
    clearLabel?: string;
    inputRef?: RefObject<HTMLInputElement | null>;
    className?: string;
    shortcut?: boolean;
    onClick?: ComponentProps<'input'>['onClick'];
    onKeyDown?: ComponentProps<'input'>['onKeyDown'];
}) {
    const { copy: previewCopy, text: previewText } = useDesignCopy();
    const [shortcutModifier, setShortcutModifier] = useState('Ctrl');
    useEffect(() => {
        if (shortcut && /Mac|iPhone|iPad/.test(navigator.platform)) setShortcutModifier('⌘');
    }, [shortcut]);
    return (
        <div className={`preview-search ${className}`} role="search" aria-label={label}>
            <Search />
            <input
                ref={inputRef}
                type="search"
                onClick={onClick}
                onKeyDown={onKeyDown}
                aria-keyshortcuts={shortcut ? 'Control+k Meta+k' : undefined}
                aria-label={label}
                placeholder={placeholder}
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
            {value ? (
                <PreviewButton
                    type="button"
                    appearance="ghost"
                    className="preview-search-clear"
                    aria-label={clearLabel ?? previewCopy.xoa_tim_kiem}
                    onClick={() => {
                        onChange('');
                        inputRef?.current?.focus();
                    }}
                >
                    <X />
                </PreviewButton>
            ) : shortcut ? (
                <kbd aria-hidden="true">
                    <span>{shortcutModifier}</span>
                    <span>K</span>
                </kbd>
            ) : null}
        </div>
    );
}

export function Panel({
    title,
    description,
    action,
    children,
    className = '',
    id,
}: {
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    id?: string;
}) {
    const headingId = useId();
    return (
        <section id={id} className={`preview-panel ${className}`} aria-labelledby={headingId}>
            <header className="panel-heading">
                <div>
                    <h2 id={headingId}>{title}</h2>
                    {description && <p>{description}</p>}
                </div>
                {action}
            </header>
            {children}
        </section>
    );
}

export function StatusBadge({ tone = 'positive', children }: { tone?: Tone; children: ReactNode }) {
    return (
        <span className={`status-badge tone-${tone}`}>
            <i aria-hidden="true" />
            {children}
        </span>
    );
}

export function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
    label,
    getLabel = (option) => option,
}: {
    options: readonly T[];
    value: T;
    onChange: (value: T) => void;
    label: string;
    getLabel?: (option: T) => string;
}) {
    return (
        <div className="segmented-control" role="group" aria-label={label}>
            {options.map((option) => (
                <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)}>
                    {getLabel(option)}
                </button>
            ))}
        </div>
    );
}

export function Sparkline({
    points,
    tone = 'positive',
    stretch = false,
}: {
    points: number[];
    tone?: Tone;
    stretch?: boolean;
}) {
    const path = points.map((point, index) => `${(index * 100) / (points.length - 1)},${70 - point}`).join(' ');
    return (
        <svg
            className={`sparkline tone-${tone}`}
            viewBox="0 0 100 72"
            preserveAspectRatio={stretch ? 'none' : undefined}
            aria-hidden="true"
        >
            <polyline
                points={path}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect={stretch ? 'non-scaling-stroke' : undefined}
            />
        </svg>
    );
}

export function MetricCard({
    label,
    value,
    change,
    tone,
    points = [],
    comparison,
    purpose = 'users',
    trend = 'up',
}: {
    label: string;
    value: string;
    change: string;
    tone: Tone;
    points?: number[];
    comparison?: string;
    purpose?: MetricPurpose;
    trend?: MetricTrend;
}) {
    const { copy: previewCopy, text: previewText } = useDesignCopy();
    const PurposeIcon = { users: Users, messages: MessageSquare, connections: PlugZap, delivery: CircleCheck }[purpose];
    const TrendIcon = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus }[trend];
    return (
        <WidgetCard
            title={label}
            seed={`metric-${purpose}`}
            cutoutSize={Number.parseFloat(dimensionTokens['control-height'])}
            className={`metric-widget metric-widget--${purpose} ${value.length > 8 ? 'metric-widget--compact' : ''}`}
            action={
                <span className="metric-widget-icon">
                    <PurposeIcon aria-hidden="true" />
                </span>
            }
            footer={
                <div className="metric-widget-comparison">
                    {change && <span className="metric-widget-delta" data-trend={trend}>
                        <TrendIcon aria-hidden="true" />
                        {change}
                    </span>}
                    <span>{comparison ?? previewCopy.so_voi_ky_truoc}</span>
                </div>
            }
        >
            <strong className="metric-widget-value">{value}</strong>
            {points.length > 1 && <div className="metric-widget-chart">
                <Sparkline points={points} tone={tone} stretch />
            </div>}
        </WidgetCard>
    );
}

export function TaskRow({
    title,
    description,
    tone,
    label,
    done,
    onToggle,
}: {
    title: string;
    description: string;
    tone: Tone;
    label: string;
    done: boolean;
    onToggle: () => void;
}) {
    return (
        <div className={`task-row ${done ? 'task-row--done' : ''}`}>
            <button
                type="button"
                className="task-toggle"
                role="checkbox"
                aria-checked={done}
                aria-label={title}
                onClick={onToggle}
            >
                {done && <Check />}
            </button>
            <div>
                <StatusBadge tone={tone}>{label}</StatusBadge>
                <h3>{title}</h3>
                <p>{description}</p>
            </div>
            <MoreHorizontal className="muted" aria-hidden="true" />
        </div>
    );
}

export function SkeletonBlock({ className = '' }: { className?: string }) {
    return <span className={`skeleton-block ${className}`} aria-hidden="true" />;
}
