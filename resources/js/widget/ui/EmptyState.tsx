import type { ReactNode } from 'react';

/** Màn chưa có gì (chưa có tin, chưa có bài) hoặc tải lỗi: icon + tiêu đề + một câu + hành động tuỳ chọn. */
export default function EmptyState({ icon, title, body, action }: { icon: string; title: string; body?: string; action?: ReactNode }) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-10 py-10 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-[var(--yona-chat-field)] text-[var(--yona-chat-ink-soft)]">
                <span className={`${icon} size-6`} />
            </span>
            <h2 className="m-0 text-[17px] font-semibold text-[var(--yona-chat-ink)]">{title}</h2>
            {body ? <p className="m-0 text-[14px] leading-[21px] text-[var(--yona-chat-ink-soft)]">{body}</p> : null}
            {action}
        </div>
    );
}
