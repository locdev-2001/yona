import { avatarSeed } from 'shared/avatar/avatarSeed';
import type { AvailabilityStatus } from 'dashboard/constants/globals';
import { isProductFeatureVisible } from 'shared/helpers/productVisibility';
import type { Conversation } from 'dashboard/conversation/types';

export interface CardAssignee {
    seed: string | undefined;
    name: string | undefined;
    thumbnail: string | undefined;
    status: AvailabilityStatus | undefined;
}

/** Ảnh người phụ trách ở góc thẻ hội thoại; không có khi phân công đã ẩn khỏi giao diện. */
export function cardAssigneeOf(conversation: Conversation): CardAssignee | null {
    const agent = conversation.meta?.assignee;
    if (!agent || !isProductFeatureVisible('conversationAssignment')) return null;

    return {
        seed: avatarSeed('user', agent.id),
        name: agent.name ?? agent.available_name,
        thumbnail: agent.thumbnail,
        status: agent.availability_status as AvailabilityStatus | undefined,
    };
}
