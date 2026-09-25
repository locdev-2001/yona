import { useLayoutEffect, useState } from 'react';

import { BUS_EVENTS, emitter } from 'shared/helpers/emitter';
import SnackbarItem, { type SnackbarAction } from './Item';

interface SnackbarMessage {
    key: number;
    message: string;
    action?: SnackbarAction;
}

const DEFAULT_DURATION = 2500;

// Port từ v3/components/SnackBar/Container.vue
export default function SnackbarContainer({ duration = DEFAULT_DURATION }: { duration?: number }) {
    const [snackbarMessages, setSnackbarMessages] = useState<SnackbarMessage[]>([]);

    // Nghe từ lượt layout effect: chạy trước mọi useEffect của trang con, nên thông báo
    // trang bắn ngay lúc dựng (ví dụ sau khi tải lại để đổi ngôn ngữ) không bị mất.
    useLayoutEffect(() => {
        const onNewToastMessage = (payload: unknown) => {
            const { message, action } = payload as { message: string; action?: SnackbarAction };
            setSnackbarMessages(messages => [...messages, { key: Date.now(), message, action }]);
            window.setTimeout(() => {
                setSnackbarMessages(messages => messages.slice(1));
            }, duration);
        };

        emitter.on(BUS_EVENTS.SHOW_TOAST, onNewToastMessage);
        return () => emitter.off(BUS_EVENTS.SHOW_TOAST, onNewToastMessage);
    }, [duration]);

    return (
        <div className="fixed left-0 right-0 mx-auto overflow-hidden text-center top-10 z-50 max-w-[40rem]">
            {snackbarMessages.map(snackbarMessage => (
                <SnackbarItem
                    key={snackbarMessage.key}
                    message={snackbarMessage.message}
                    action={snackbarMessage.action}
                />
            ))}
        </div>
    );
}
