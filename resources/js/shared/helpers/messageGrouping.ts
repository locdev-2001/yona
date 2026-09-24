// Luật gộp các tin liên tiếp thành một nhóm bong bóng — nguồn duy nhất cho hộp
// thư nhân viên và widget. Mỗi nơi tự quy payload của mình về GroupableMessage
// (ai gửi, lúc nào, tin nào phải đứng riêng); luật gộp và mốc thời gian nằm ở đây.

/** Tin cùng người gửi cách nhau dưới khoảng này thì chung một nhóm. */
export const MESSAGE_GROUP_WINDOW_SECONDS = 2 * 60;

/** Hai tin cách nhau từ khoảng này trở lên thì chèn mốc thời gian ở giữa. */
export const TIME_DIVIDER_GAP_SECONDS = 15 * 60;

export type MessageGroupPosition = 'single' | 'first' | 'middle' | 'last';

export interface GroupableMessage {
    senderKey: string;
    /** Unix giây. */
    createdAt: number;
    /** Tin luôn đứng riêng (lỗi gửi, mẫu, hoạt động…), không gộp với tin kề. */
    standalone?: boolean;
}

export function belongsToSameGroup(previous: GroupableMessage, next: GroupableMessage): boolean {
    if (previous.standalone || next.standalone) return false;
    if (previous.senderKey !== next.senderKey) return false;

    return Math.abs(next.createdAt - previous.createdAt) < MESSAGE_GROUP_WINDOW_SECONDS;
}

export function resolveGroupPositions(messages: readonly GroupableMessage[]): MessageGroupPosition[] {
    return messages.map((message, index) => {
        const joinsPrevious = index > 0 && belongsToSameGroup(messages[index - 1], message);
        const joinsNext = index < messages.length - 1 && belongsToSameGroup(message, messages[index + 1]);

        if (joinsPrevious && joinsNext) return 'middle';
        if (joinsNext) return 'first';
        if (joinsPrevious) return 'last';

        return 'single';
    });
}

export const joinsNextMessage = (position: MessageGroupPosition): boolean =>
    position === 'first' || position === 'middle';

export const joinsPreviousMessage = (position: MessageGroupPosition): boolean =>
    position === 'middle' || position === 'last';

export function needsTimeDivider(previousCreatedAt: number | null, createdAt: number): boolean {
    return previousCreatedAt === null || createdAt - previousCreatedAt >= TIME_DIVIDER_GAP_SECONDS;
}
