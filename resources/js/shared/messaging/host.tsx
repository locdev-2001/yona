import { createContext, useContext, type ReactNode } from 'react';

import type { StructuredAction, StructuredMessage, SubmittedValue } from './model';

/**
 * Bề mặt đang vẽ kit quyết định mọi side effect. Kit chỉ báo "người dùng muốn gì";
 * widget gửi câu trả lời, mở sheet, mở link; hộp thư chỉ cho xem.
 */
export interface MessageHost {
    surface: 'widget' | 'dashboard';
    interactive: boolean;
    /** Gửi câu trả lời (chip, nút trả lời, form). Reject thì kit hoàn tác lựa chọn đã hiện trước. */
    submit: (message: StructuredMessage, values: SubmittedValue[]) => Promise<void>;
    /** Hành động không phải trả lời: link, mở trang, đặt mua, chép, gọi, postback. */
    act: (action: StructuredAction, context: { message: StructuredMessage; itemId?: string }) => void;
}

const noop = () => undefined;

const readOnlyHost: MessageHost = {
    surface: 'dashboard',
    interactive: false,
    submit: () => Promise.resolve(),
    act: noop,
};

const HostContext = createContext<MessageHost>(readOnlyHost);

export function MessageHostProvider({ host, children }: { host: MessageHost; children: ReactNode }) {
    return <HostContext.Provider value={host}>{children}</HostContext.Provider>;
}

export const useMessageHost = (): MessageHost => useContext(HostContext);
