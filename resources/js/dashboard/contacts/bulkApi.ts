import { postJson } from 'dashboard/helper/apiClient';

// Port từ dashboard/api/bulkActions.js — nhánh `type: 'Contact'`
// (bulk_actions_controller.rb → Contacts::BulkActionJob).
export interface ContactBulkActionPayload {
    ids: number[];
    action_name?: 'delete';
    labels?: { add?: string[]; remove?: string[] };
}

export function processContactBulkAction(accountId: number, payload: ContactBulkActionPayload): Promise<void> {
    return postJson(`/api/v1/accounts/${accountId}/bulk_actions`, { type: 'Contact', ...payload }).then(
        () => undefined,
        (error: unknown) => (error instanceof SyntaxError ? undefined : Promise.reject(error)),
    );
}
