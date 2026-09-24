import type { MessageGroupPosition } from 'shared/helpers/messageGrouping';
import { ORIENTATION } from '../constants';
import type { MessageOrientation } from '../constants';

// Bo góc theo vị trí trong nhóm: góc phía người gửi bo nhỏ ở cạnh nối với tin
// liền trên/dưới, tin đứng một mình bo tròn đều.
const CORNERS_BY_SIDE: Record<string, Record<MessageGroupPosition, string>> = {
    [ORIENTATION.LEFT]: {
        single: 'rounded-2xl',
        first: 'rounded-2xl ltr:rounded-bl-md rtl:rounded-br-md',
        middle: 'rounded-2xl ltr:rounded-l-md rtl:rounded-r-md',
        last: 'rounded-2xl ltr:rounded-tl-md rtl:rounded-tr-md',
    },
    [ORIENTATION.RIGHT]: {
        single: 'rounded-2xl',
        first: 'rounded-2xl ltr:rounded-br-md rtl:rounded-bl-md',
        middle: 'rounded-2xl ltr:rounded-r-md rtl:rounded-l-md',
        last: 'rounded-2xl ltr:rounded-tr-md rtl:rounded-tl-md',
    },
};

export function bubbleCornerClass(orientation: MessageOrientation, position: MessageGroupPosition): string {
    return CORNERS_BY_SIDE[orientation]?.[position] ?? 'rounded-md';
}
