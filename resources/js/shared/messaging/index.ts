// Message kit — lõi hiển thị tin có cấu trúc, dùng chung widget và hộp thư.
// Thêm loại tin: một file trong types/ + một dòng trong danh sách dưới đây.

import bankTransfer from './types/bank-transfer';
import { registerMessageTypes } from './registry';

registerMessageTypes([bankTransfer] as never[]);

export { MessageHostProvider, useMessageHost, type MessageHost } from './host';
export { messageTypeFor, resolveStructured, type MessageTypeDefinition } from './registry';
export { StructuredMessageView } from './StructuredMessageView';
export type { StructuredAction, StructuredMessage, SubmittedValue } from './model';
export { formatMoney } from './money';
