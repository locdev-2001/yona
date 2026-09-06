import { useEffect } from 'react';

import { replaceRoute, WIDGET_ROUTES } from '../router';

// Chỗ cắm cho C3 (form tiền chat). Cho tới khi C3 dựng form thật, vào route này
// sẽ rơi thẳng về màn tin nhắn để luồng chat không bị chặn.
export default function PreChatForm() {
    useEffect(() => {
        replaceRoute(WIDGET_ROUTES.MESSAGES);
    }, []);

    return null;
}
