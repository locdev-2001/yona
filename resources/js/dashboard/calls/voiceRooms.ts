import { useSyncExternalStore } from 'react';
import { emitter } from 'shared/helpers/emitter';
import { t } from '../../i18n';
import type { OpenRoomSummary, VoiceRoomSummary } from './types';

// Các phòng thoại có tên của từng nhóm. Hai nguồn: payload hội thoại (`group.voice_rooms`) và sự
// kiện realtime `voice_room.updated` (máy chủ gom theo nhịp, gửi cả khi danh sách phòng đổi); cả
// hai mang mốc máy chủ tính (`voice_room_as_of`), bản nào mới hơn thì thắng.

export const VOICE_ROOM_UPDATED = 'voice_room.updated';

const NO_ROOMS: VoiceRoomSummary[] = [];

interface VoiceRoomUpdate {
    group_id: number;
    voice_rooms: VoiceRoomSummary[];
    voice_room_as_of: number;
}

interface VoiceRoomSource {
    id: number;
    voice_rooms?: VoiceRoomSummary[];
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
export function useVoiceRooms(group: VoiceRoomSource | null | undefined): VoiceRoomSummary[] {
    const groupId = group?.id;
    const readGroup = () => (groupId === undefined ? undefined : latestByGroup.get(groupId));
    const latest = useSyncExternalStore(subscribe, readGroup, readGroup);

    if (!group) return NO_ROOMS;

    return latest && latest.voice_room_as_of > (group.voice_room_as_of ?? 0) ? latest.voice_rooms : (group.voice_rooms ?? NO_ROOMS);
}

// Phòng đang có người sớm nhất của nhóm, cho chỉ báo ở danh sách hội thoại.
export function useOpenRoom(group: VoiceRoomSource | null | undefined): OpenRoomSummary | null {
    return useVoiceRooms(group).find(room => room.live)?.live ?? null;
}

export function voiceRoomName(room: Pick<VoiceRoomSummary, 'name'>): string {
    return room.name || t('CALLS.ROOM.DEFAULT_NAME');
}
