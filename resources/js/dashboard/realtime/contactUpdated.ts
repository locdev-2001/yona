import { useRealtimeEvent } from './hooks';

// Phong bì broadcast đi kèm sự kiện (account_id, performer khi nhân viên thao
// tác) — không thuộc về liên hệ nên không được trộn vào dữ liệu đang hiển thị.
interface BroadcastEnvelope {
    account_id?: number;
    performer?: unknown;
}

// Mọi màn hiển thị liên hệ (hộp thư, danh sách, chi tiết) nghe contact.updated
// qua đây: chỉ nhận payload có id và nhận các trường của liên hệ (push_event_data,
// snake_case) đã bỏ phong bì. Mỗi màn tự trộn vào dạng dữ liệu của mình.
export function useContactUpdatedEvent<TContact extends { id: number }>(onContactUpdated: (contact: TContact) => void): void {
    useRealtimeEvent<TContact & BroadcastEnvelope>('contact.updated', payload => {
        if (!payload?.id) return;

        const { account_id: _accountId, performer: _performer, ...contactFields } = payload;
        void _accountId;
        void _performer;
        onContactUpdated(contactFields as unknown as TContact);
    });
}
