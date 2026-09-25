import { AlertCircleIcon } from './icons';

interface FailureBlockProps {
    title: string;
    reason?: string;
    actionLabel: string;
    onAction: () => void;
}

// Khối đỏ báo gửi hỏng theo design: tiêu đề, lý do, nút hành động bên phải.
// Dùng cho tin gửi hỏng trong luồng tin và cho tệp bị chặn ngay ở ô nhập.
export default function FailureBlock({ title, reason, actionLabel, onAction }: FailureBlockProps) {
    return (
        <div
            role="alert"
            className="yona-failed-send flex max-w-full items-center gap-[9px] rounded-[14px] border border-[var(--yona-chat-danger-line)] bg-[var(--yona-chat-danger-bg)] px-3 py-[11px]"
        >
            <span className="flex-none text-[var(--yona-chat-danger)]">
                <AlertCircleIcon />
            </span>
            <div className="min-w-0 flex-1 leading-[1.35]">
                <div className="text-[12.5px] font-medium text-[var(--yona-chat-danger-ink)]">{title}</div>
                {reason ? <div className="text-[11px] text-[var(--yona-chat-danger-soft)]">{reason}</div> : null}
            </div>
            <button
                type="button"
                className="-my-3 -me-1 inline-flex min-h-11 min-w-11 flex-none items-center justify-center whitespace-nowrap rounded-[10px] px-2 text-[11.5px] font-semibold text-[var(--yona-chat-danger)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--yona-chat-danger)] active:scale-[0.97]"
                onClick={onAction}
            >
                {actionLabel}
            </button>
        </div>
    );
}
