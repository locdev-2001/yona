// Hình dạng payload của `GET /public/api/v1/flows/{token}` — khớp
// `App\Services\Messaging\PublicFlowService::describe()` phía máy chủ.
export type FlowPurpose = 'schedule' | 'form' | 'order_tracking' | 'bank_transfer' | 'product';

export interface FlowResponse {
    purpose: FlowPurpose;
    org_name: string;
    message_id: number;
    title: string;
    subtitle?: string | null;
    data: Record<string, unknown>;
    /** Chỉ có ở trang "product": tin `cards` gốc để đối chiếu khi gửi order_request. */
    source_message_id?: number;
}

/**
 * Một khung giờ của trang "schedule". `value` là mã duy nhất máy chủ đối chiếu
 * khi gửi câu trả lời; `full` disable ô đó (đã hết chỗ).
 */
export interface ScheduleSlot {
    date: string;
    label: string;
    value: string;
    full?: boolean;
}
