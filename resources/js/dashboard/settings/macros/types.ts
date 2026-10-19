import type { FilterOption } from 'dashboard/components-next/filter/helper/filterHelper';
import type { AutomationAction } from 'dashboard/settings/automation/types';

// Hình dạng theo api/v1/models/_macro.json.jbuilder.
export type MacroVisibility = 'global' | 'personal';

export interface MacroAuthor {
    id: number;
    name?: string;
    available_name?: string;
    email?: string;
}

export interface MacroFile {
    blob_id: string;
    filename: string;
}

export interface Macro {
    id: number;
    account_id: number;
    name: string;
    visibility: MacroVisibility;
    actions: AutomationAction[];
    created_by?: MacroAuthor | null;
    updated_by?: MacroAuthor | null;
    files?: MacroFile[];
}

// Macro đang soạn trong editor: chưa có id/account_id, action_params còn là
// FilterOption khi dropdown đang chọn.
export interface MacroDraft {
    name: string;
    visibility: MacroVisibility;
    actions: AutomationAction[];
    files?: MacroFile[];
}

export interface MacroOptionSets {
    agents: FilterOption[];
    teams: FilterOption[];
    labels: FilterOption[];
    // Câu trả lời mẫu có mang thẻ (content_type khác rỗng) — action "Gửi thẻ".
    cannedCards: FilterOption[];
}

export type { AutomationAction as MacroAction };
