// Message kit — lõi hiển thị tin có cấu trúc, dùng chung widget và hộp thư.
// Thêm loại tin: một file trong types/ + một dòng trong danh sách dưới đây.

import article from './types/article';
import bankTransfer from './types/bank-transfer';
import buttons from './types/buttons';
import cards from './types/cards';
import form from './types/form';
import orderRequest from './types/order-request';
import orderStatus from './types/order-status';
import quickReplies from './types/quick-replies';
import webview from './types/webview';
import { registerMessageTypes } from './registry';

registerMessageTypes([quickReplies, buttons, cards, article, form, webview, orderStatus, orderRequest, bankTransfer] as never[]);

export { MessageHostProvider, useMessageHost, type MessageHost } from './host';
export { messageTypeFor, resolveStructured, type MessageTypeDefinition } from './registry';
export { StructuredMessageView } from './StructuredMessageView';
export type { StructuredAction, StructuredMessage, SubmittedValue } from './model';
export { formatMoney } from './money';
