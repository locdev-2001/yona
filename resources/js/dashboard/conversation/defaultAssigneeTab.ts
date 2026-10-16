import { ASSIGNEE_TAB_VALUES, ASSIGNEE_TYPE } from './constants';
import type { AssigneeTab } from './types';

// Workspace một người: mọi hội thoại là của chủ shop, "Tất cả" mới cho thấy khách đang chờ.
// Từ hai người: mỗi người trực bắt đầu từ việc của mình. Lựa chọn đã lưu luôn thắng.
export function defaultAssigneeTab(savedTab: unknown, memberCount: number | undefined): AssigneeTab {
    if (ASSIGNEE_TAB_VALUES.includes(savedTab as AssigneeTab)) return savedTab as AssigneeTab;

    return (memberCount ?? 1) >= 2 ? ASSIGNEE_TYPE.ME : ASSIGNEE_TYPE.ALL;
}
