import { useSyncExternalStore } from 'react';
import { emitter } from 'shared/helpers/emitter';
import type { GroupCallPayload } from './api';
import type { GroupCallSummary } from './types';

// Cuộc gọi nhóm đang diễn ra của từng nhóm. Như phòng thoại (voiceRooms.ts): payload hội thoại
// (`group.group_call`) và sự kiện realtime `group_call.updated`, bản nào có mốc máy chủ mới hơn thì thắng.

export const GROUP_CALL_UPDATED = 'group_call.updated';

interface GroupCallSource {
    id: number;
    group_call?: GroupCallSummary | null;
    group_call_as_of?: number;
}

const latestByGroup = new Map<number, GroupCallPayload>();
const listeners = new Set<() => void>();

emitter.on(GROUP_CALL_UPDATED, payload => {
    const update = payload as GroupCallPayload;
    latestByGroup.set(update.group_id, update);
    listeners.forEach(listener => listener());
});

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export function useGroupCall(group: GroupCallSource | null | undefined): GroupCallSummary | null {
    const groupId = group?.id;
    const readGroup = () => (groupId === undefined ? undefined : latestByGroup.get(groupId));
    const latest = useSyncExternalStore(subscribe, readGroup, readGroup);

    if (!group) return null;

    return latest && latest.group_call_as_of > (group.group_call_as_of ?? 0) ? latest.group_call : (group.group_call ?? null);
}
