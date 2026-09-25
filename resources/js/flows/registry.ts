import type { ComponentType } from 'react';

import type { FlowResponse } from './types';
import ScheduleFlow from './pages/ScheduleFlow';
import FormFlow from './pages/FormFlow';
import OrderTrackingFlow from './pages/OrderTrackingFlow';
import BankTransferFlow from './pages/BankTransferFlow';
import ProductFlow from './pages/ProductFlow';

export interface FlowPageProps {
    flow: FlowResponse;
    token: string;
    onSubmitted: () => void;
}

// Một trang = một module, đăng ký ở đây (phase-05 §C). Trang chỉ xem
// (order_tracking, bank_transfer) không đọc `token`/`onSubmitted` nhưng vẫn nhận
// chung props — TypeScript cho phép bỏ qua props thừa khi khai hàm.
export const FLOW_PAGES: Record<FlowResponse['purpose'], ComponentType<FlowPageProps>> = {
    schedule: ScheduleFlow,
    form: FormFlow,
    order_tracking: OrderTrackingFlow,
    bank_transfer: BankTransferFlow,
    product: ProductFlow,
};
