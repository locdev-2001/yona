import type { UISettings } from 'dashboard/composables/useUISettings';

// Vị trí hộp báo tin mới trong trang, lưu theo người dùng ở ui_settings.
export const MESSAGE_TOAST_POSITION_KEY = 'message_toast_position';

export const MESSAGE_TOAST_POSITIONS = ['top-right', 'bottom-right', 'bottom-left', 'top-left'] as const;

export type MessageToastPosition = (typeof MESSAGE_TOAST_POSITIONS)[number];

const DEFAULT_POSITION: MessageToastPosition = 'top-right';

export const MESSAGE_TOAST_POSITION_CLASSES: Record<MessageToastPosition, string> = {
    'top-right': 'top-4 end-4 flex-col',
    'bottom-right': 'bottom-4 end-4 flex-col-reverse',
    'bottom-left': 'bottom-4 start-4 flex-col-reverse',
    'top-left': 'top-4 start-4 flex-col',
};

export function messageToastPositionOf(uiSettings: UISettings | undefined): MessageToastPosition {
    const saved = uiSettings?.[MESSAGE_TOAST_POSITION_KEY];
    return MESSAGE_TOAST_POSITIONS.includes(saved as MessageToastPosition) ? (saved as MessageToastPosition) : DEFAULT_POSITION;
}
