// Vùng chạm tối thiểu 44px trên điện thoại và màn cảm ứng cho các màn gọi. Tính bằng px chứ không
// bằng rem: người dùng chọn cỡ chữ nhỏ thì rem co lại (44 → 41px), vùng chạm không được co theo.
export const PHONE_TOUCH_SIZE = 'max-md:!size-[44px] touch:!size-[44px]';
export const TOUCH_HEIGHT = '!h-[44px]';
export const TOUCH_MIN_HEIGHT = 'min-h-[44px]';
export const PHONE_TOUCH_HEIGHT = 'max-md:!h-[44px] touch:!h-[44px]';
export const PHONE_TOUCH_MIN_WIDTH = 'max-md:!min-w-[44px] touch:!min-w-[44px]';

// Thẻ nổi của cuộc gọi trên máy tính (gọi đến, đang gọi đi khi xem trang khác): cùng góc, cùng bề
// ngang, đặt cao hơn ô soạn tin để không che nút Gửi.
export const FLOATING_CALL_CARD = 'fixed bottom-24 end-6 z-50 w-[400px] max-w-[calc(100vw-3rem)]';
