import { useEffect, useState } from 'react';

import { getJson } from 'dashboard/helper/apiClient';

// Thành viên của hội thoại nhóm trên kênh (không phải nhân viên) — nguồn gợi ý khi
// agent gõ `@` ở chế độ Trả lời. Không cache ở FE: máy chủ đã cache danh bạ nhóm,
// còn "người vừa nhắn" phải tươi mỗi lần mở hội thoại.

export interface GroupMember {
    external_id: string;
    name: string;
    avatar?: string | null;
}

interface GroupMembersResponse {
    payload?: GroupMember[];
}

export function useGroupMembers(
    accountId: number,
    conversationId: number,
    enabled: boolean,
): { members: GroupMember[]; isLoading: boolean } {
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setMembers([]);
        if (!enabled || !conversationId) {
            setIsLoading(false);
            return undefined;
        }

        let cancelled = false;
        setIsLoading(true);
        getJson<GroupMembersResponse>(`/api/v1/accounts/${accountId}/conversations/${conversationId}/group_members`)
            .then(
                response => {
                    if (!cancelled) setMembers(Array.isArray(response?.payload) ? response.payload : []);
                },
                () => undefined,
            )
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [accountId, conversationId, enabled]);

    return { members, isLoading };
}
