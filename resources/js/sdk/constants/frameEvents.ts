import { LEGACY_FRAME_MESSAGE_PREFIX } from '../../shared/legacyContracts';

// Giao thức postMessage và tham số URL giữa trang chủ và iframe widget.
// Nguồn duy nhất cho cả SDK lẫn app trong iframe — đừng chép lại chuỗi ở nơi khác.
export const FRAME_MESSAGE_PREFIX = 'yona-widget:';
export const APP_FRAME_ID = 'yona_live_chat_widget';
// SDK gắn tham số này vào URL iframe để báo nó hiểu tiền tố mới. Iframe không thấy tham số
// (SDK đời trước còn nằm trong cache trình duyệt/CDN) thì nói giao thức đời trước.
export const FRAME_PROTOCOL_PARAM = 'sdk_protocol';
export const FRAME_PROTOCOL_VERSION = '2';
export const SDK_SET_BUBBLE_VISIBILITY = 'sdk-set-bubble-visibility';
// Widget xin SDK xoá phiên khách (nút "Bắt đầu cuộc trò chuyện mới").
export const RESET_SESSION_EVENT = 'resetSession';
// SDK dựng lại iframe kèm cờ này (giá trị là mã riêng từng lần xoá) để widget quên cả token nó tự lưu.
export const NEW_SESSION_URL_PARAM = 'new_session';

export type FrameMessage = { event: string } & Record<string, unknown>;

const ACCEPTED_FRAME_PREFIXES = [FRAME_MESSAGE_PREFIX, LEGACY_FRAME_MESSAGE_PREFIX];

export const encodeFrameMessage = (message: Record<string, unknown>, prefix = FRAME_MESSAGE_PREFIX): string =>
    `${prefix}${JSON.stringify({ ...message })}`;

// Nhận cả hai tiền tố; chuỗi lạ hoặc JSON hỏng trả null.
export const decodeFrameMessage = (data: unknown): FrameMessage | null => {
    if (typeof data !== 'string') return null;

    const prefix = ACCEPTED_FRAME_PREFIXES.find(candidate => data.startsWith(candidate));
    if (!prefix) return null;

    try {
        const message = JSON.parse(data.slice(prefix.length)) as unknown;

        return message && typeof message === 'object' ? (message as FrameMessage) : null;
    } catch {
        return null;
    }
};
