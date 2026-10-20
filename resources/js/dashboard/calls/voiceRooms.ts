import { useSyncExternalStore } from 'react';
import { emitter } from 'shared/helpers/emitter';
import type { OpenRoomSummary } from './types';

// Phòng thoại đang mở của từng nhóm. Hai nguồn: payload hội thoại (`group.voice_room`) và sự
// kiện realtime `voice_room.updated` (máy chủ gom theo nhịp); cả hai mang mốc máy chủ tính
// (`voice_room_as_of`), bản nào mới hơn thì thắng.

export const VOICE_ROOM_UPDATED = 'voice_room.updated';

interface VoiceRoomUpdate {
    group_id: number;
    voice_room: OpenRoomSummary | null;
    voice_room_as_of: number;
}

interface VoiceRoomSource {
    id: number;
    voice_room?: OpenRoomSummary | null;
    voice_room_as_of?: number;
}

const latestByGroup = new Map<number, VoiceRoomUpdate>();
const listeners = new Set<() => void>();

emitter.on(VOICE_ROOM_UPDATED, payload => {
    const update = payload as VoiceRoomUpdate;
    latestByGroup.set(update.group_id, update);
    listeners.forEach(listener => listener());
});

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

// Mỗi chỗ dùng chỉ đọc nhóm của mình: sự kiện của nhóm khác không vẽ lại chỗ này.
export function useOpenRoom(group: VoiceRoomSource | null | undefined): OpenRoomSummary | null {
    const groupId = group?.id;
    const readGroup = () => (groupId === undefined ? undefined : latestByGroup.get(groupId));
    const latest = useSyncExternalStore(subscribe, readGroup, readGroup);

    if (!group) return null;

    return latest && latest.voice_room_as_of > (group.voice_room_as_of ?? 0) ? latest.voice_room : (group.voice_room ?? null);
}
