import { formatDistanceToNow, fromUnixTime } from 'date-fns';

// Port từ shared/helpers/timeHelper.js (phần contacts cần).
export function dynamicTime(time: number): string {
    return formatDistanceToNow(fromUnixTime(time), { addSuffix: true });
}
