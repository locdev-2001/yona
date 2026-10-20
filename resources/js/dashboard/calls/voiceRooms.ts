import { useSyncExternalStore } from 'react';
import { emitter } from 'shared/helpers/emitter';
import type { OpenRoomSummary } from './types';

// Phòng thoại đang mở của từng nhóm, cập nhật realtime (`voice_room.updated`, máy chủ gom theo
// nhịp). Chưa có sự kiện nào cho nhóm thì dùng giá trị payload hội thoại mang theo.

export const VOICE_ROOM_UPDATED = 'voice_room.updated';

interface VoiceRoomUpdate {
    group_id: number;
    voice_room: OpenRoomSummary | null;
}

const latestByGroup = new Map<number, OpenRoomSummary | null>();
const listeners = new Set<() => void>();

emitter.on(VOICE_ROOM_UPDATED, payload => {
    const update = payload as VoiceRoomUpdate;
    latestByGroup.set(update.group_id, update.voice_room);
    listeners.forEach(listener => listener());
});

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

// Mỗi thẻ chỉ đọc giá trị của nhóm mình: sự kiện của nhóm khác không vẽ lại thẻ này.
export function useOpenRoom(groupId: number | undefined, fromPayload: OpenRoomSummary | null | undefined): OpenRoomSummary | null {
    const readGroup = () => (groupId === undefined ? undefined : latestByGroup.get(groupId));
    const latest = useSyncExternalStore(subscribe, readGroup, readGroup);

    if (groupId === undefined) return null;

    return latestByGroup.has(groupId) ? (latest ?? null) : (fromPayload ?? null);
}
