// hasOneDayPassed của shared/helpers/timeHelper.js (bản gốc) chưa được port sang
// resources/js/shared — dựng tại đây để không sửa file dùng chung ngoài phạm vi
// lô này; khi shared/timeHelper có hàm tương ứng thì gọi lại về đó.
const ONE_DAY_IN_SECONDS = 24 * 60 * 60;

export function hasOneDayPassed(createdAtInSeconds: number, nowInSeconds = Date.now() / 1000): boolean {
    if (!createdAtInSeconds) return true;

    return nowInSeconds - createdAtInSeconds >= ONE_DAY_IN_SECONDS;
}

export interface MessageExternalError {
    code?: string;
    message?: string;
}

/**
 * `content_attributes.external_error` tồn tại ở hai hình dạng cùng lúc
 * (reports/zalo-lo3-notes.md): chuỗi thô của kênh cũ, và `{code, message}` của
 * kênh khai `outbound_retry` — `message` đã dịch sẵn theo locale tài khoản.
 */
export function readExternalError(value: unknown): MessageExternalError | null {
    if (typeof value === 'string') return value.trim() ? { message: value } : null;

    if (value && typeof value === 'object') {
        const { code, message } = value as MessageExternalError;
        if (typeof message === 'string' && message.trim()) {
            return { code: typeof code === 'string' ? code : undefined, message };
        }
        if (typeof code === 'string' && code.trim()) return { code };
    }

    return null;
}

/** Mã lỗi mà bấm "Thử lại" chắc chắn vô ích (reports/zalo-lo3-notes.md). */
const CODES_WITHOUT_RETRY = ['secret_mismatch', 'email_bounced'];

/** Lỗi do chính địa chỉ người nhận: lý do phải đọc được ngay dưới bong bóng, không giấu trong tooltip. */
const CODES_SHOWN_INLINE = ['email_bounced'];

export function showsErrorInline(code?: string): boolean {
    return Boolean(code && CODES_SHOWN_INLINE.includes(code));
}

export function canRetryMessage({
    status,
    code,
    createdAt,
    hasContent,
    hasAttachments,
}: {
    status: string | null;
    code?: string;
    createdAt: number;
    hasContent: boolean;
    hasAttachments: boolean;
}): boolean {
    if (status !== 'failed') return false;
    if (code && CODES_WITHOUT_RETRY.includes(code)) return false;

    return !hasOneDayPassed(createdAt) && (hasContent || hasAttachments);
}
