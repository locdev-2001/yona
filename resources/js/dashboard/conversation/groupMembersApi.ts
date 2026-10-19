import { useCallback, useEffect, useState } from 'react';

import { fetchGroupMembers } from './api';
import type { GroupMemberPerson } from './types';

// Thành viên nhóm đang mở: nguồn cho danh sách thành viên và gợi ý khi gõ `@`.
// `external_id` là id người dùng dạng chuỗi, đúng khoá mà Editor ghi vào mentions.

export interface GroupMember {
    external_id: string;
    name: string;
    avatar?: string | null;
}

export function toMentionable(member: GroupMemberPerson): GroupMember {
    return { external_id: String(member.id), name: member.name, avatar: member.thumbnail };
}

export function useGroupMembers(chatId: number, enabled: boolean, revision = 0): { members: GroupMemberPerson[]; reload: () => void } {
    const [members, setMembers] = useState<GroupMemberPerson[]>([]);
    const [reloadKey, setReloadKey] = useState(0);
    const reload = useCallback(() => setReloadKey(key => key + 1), []);

    useEffect(() => {
        setMembers([]);
        if (!enabled || !chatId) return undefined;

        let cancelled = false;
        fetchGroupMembers(chatId).then(
            response => {
                if (!cancelled) setMembers(response.payload);
            },
            () => undefined,
        );

        return () => {
            cancelled = true;
        };
    }, [chatId, enabled, revision, reloadKey]);

    return { members, reload };
}
