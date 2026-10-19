import { useAgentPresence, useContactPresence, useHasReceivedPresence } from 'dashboard/realtime/hooks';
import type { AvailabilityStatus } from 'dashboard/realtime/types';

// Port từ shared/helpers/vuex/mutationHelpers.js#updatePresence (agents) và
// store/modules/contacts/mutations.js#UPDATE_CONTACTS_PRESENCE: mỗi presence.update
// ghi đè TOÀN BỘ records — id vắng trong map thành `absentStatus`
// (agent → 'offline', contact → null). Trước lần presence.update đầu tiên giữ
// nguyên giá trị API, vì gốc chỉ ghi đè khi mutation chạy.
export function overlayPresence<Record_, Status>(
    records: Record_[],
    presenceMap: Record<number, Status>,
    hasReceivedPresence: boolean,
    absentStatus: Status,
    getId: (record: Record_) => number,
    applyStatus: (record: Record_, status: Status) => Record_,
): Record_[] {
    if (!hasReceivedPresence) return records;

    return records.map(record => applyStatus(record, presenceMap[getId(record)] ?? absentStatus));
}

export function useAgentPresenceOverlay(): {
    presenceMap: Record<number, AvailabilityStatus>;
    hasReceivedPresence: boolean;
} {
    return { presenceMap: useAgentPresence(), hasReceivedPresence: useHasReceivedPresence() };
}

export function useContactPresenceOverlay(): {
    presenceMap: Record<number, 'online'>;
    hasReceivedPresence: boolean;
} {
    return { presenceMap: useContactPresence(), hasReceivedPresence: useHasReceivedPresence() };
}
