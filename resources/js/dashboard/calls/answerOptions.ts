import type { CallMediaKind } from './types';

// Các cách bắt máy một cuộc gọi đến: gọi thoại chỉ có Nghe; gọi video có Nghe (chỉ tiếng) và
// Video (bật camera, cách chính). Một nguồn cho thẻ, sheet và màn gọi lớn.
export interface AnswerOption {
    media: CallMediaKind;
    icon: string;
    labelKey: string;
    isPrimary: boolean;
}

const ANSWER_VOICE: AnswerOption = { media: 'audio', icon: 'i-lucide-phone', labelKey: 'CALLS.DIRECT.ACCEPT', isPrimary: true };

export function answerOptionsFor(media: CallMediaKind): AnswerOption[] {
    return media === 'video'
        ? [
              { ...ANSWER_VOICE, isPrimary: false },
              { media: 'video', icon: 'i-lucide-video', labelKey: 'CALLS.DIRECT.ACCEPT_VIDEO', isPrimary: true },
          ]
        : [ANSWER_VOICE];
}

// Nút bắt máy chính rung như chuông; nút phụ đứng yên, nền nhạt.
export const answerTone = (option: AnswerOption): Record<string, boolean> =>
    option.isPrimary ? { teal: true, solid: true } : { teal: true, faded: true };

export const RINGING_ICON_CLASS = '[&>span]:animate-call-ring motion-reduce:[&>span]:animate-none';
