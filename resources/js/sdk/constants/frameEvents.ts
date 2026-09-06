// Giao thức postMessage giữa trang chủ và iframe widget.
// Nguồn duy nhất cho cả SDK lẫn app trong iframe — đừng chép lại chuỗi ở nơi khác.
// Port: refs/chatwoot/app/javascript/shared/constants/sharedFrameEvents.js
export const FRAME_MESSAGE_PREFIX = 'chatwoot-widget:';
export const SDK_SET_BUBBLE_VISIBILITY = 'sdk-set-bubble-visibility';
