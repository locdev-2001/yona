import type { ReactNode } from 'react';

import { ICONS } from 'dashboard/icons';

import { t } from '../../../../i18n';

// Khối hướng dẫn từng bước dùng chung cho form kênh kiểu "dán mã" (Telegram, LINE…).
interface GuideStepProps {
    index: number;
    title: string;
    description: string;
    children?: ReactNode;
}

export function GuideStep({ index, title, description, children }: GuideStepProps) {
    return (
        <li className="flex gap-3">
            <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-n-alpha-2 text-label-small font-medium text-n-slate-12"
            >
                {index}
            </span>
            <div className="flex min-w-0 flex-col gap-1.5">
                <span className="sr-only">{t('INBOX_MGMT.CONNECT_GUIDE.STEP', { n: index })}</span>
                <h4 className="text-body-main font-medium text-n-slate-12">{title}</h4>
                <p className="text-body-main text-n-slate-11 break-words">{description}</p>
                {children}
            </div>
        </li>
    );
}

export function GuideSteps({ children }: { children: ReactNode }) {
    return <ol className="mb-6 flex max-w-2xl flex-col gap-5 p-0 list-none">{children}</ol>;
}

export function GuideLinkButton({ href, label }: { href: string; label: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-n-brand px-3 py-1.5 text-body-main font-medium text-white hover:opacity-90"
        >
            {label}
            <span aria-hidden="true" className={`${ICONS.externalLink} size-3.5`} />
        </a>
    );
}

export function ChannelFormError({ message }: { message: string | null }) {
    if (!message) return null;

    return (
        <p role="alert" className="mt-2 max-w-2xl rounded-lg bg-n-ruby-2 px-3 py-2 text-body-main text-n-ruby-11 break-words">
            {message}
        </p>
    );
}
