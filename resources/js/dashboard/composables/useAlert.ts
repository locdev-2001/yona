import { BUS_EVENTS, emitter } from 'shared/helpers/emitter';

export interface ToastAction {
    message: string;
    onClick?: () => void;
}

export function useAlert(message: string, action?: ToastAction): void {
    emitter.emit(BUS_EVENTS.SHOW_TOAST, { message, action });
}
