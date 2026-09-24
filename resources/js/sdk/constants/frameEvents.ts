// Giao thức postMessage và tham số URL giữa trang chủ và iframe widget.
// Nguồn duy nhất cho cả SDK lẫn app trong iframe — đừng chép lại chuỗi ở nơi khác.
// Port: refs/chatwoot/app/javascript/shared/constants/sharedFrameEvents.js
export const FRAME_MESSAGE_PREFIX = 'chatwoot-widget:';
export const SDK_SET_BUBBLE_VISIBILITY = 'sdk-set-bubble-visibility';
// SDK dựng lại iframe kèm cờ này (giá trị là mã riêng từng lần xoá) để widget quên cả token nó tự lưu.
export const NEW_SESSION_URL_PARAM = 'new_session';
