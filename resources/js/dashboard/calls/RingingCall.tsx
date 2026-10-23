import type { ReactNode } from 'react';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import BottomSheet from 'dashboard/components-next/BottomSheet';
import Button from 'dashboard/components-next/button/Button';
import { t } from '../../i18n';
import CallActionButton, { CallActionGrid } from './CallActionButton';
import CallOrb from './CallOrb';
import { PHONE_TOUCH_SIZE, TOUCH_HEIGHT, TOUCH_MIN_HEIGHT } from './touchTarget';
import type { CallMediaKind } from './types';

// Cuộc gọi đang đổ chuông tới mình, chung cho gọi 1-1 và gọi nhóm: ai/nhóm nào gọi, kiểu gọi, ai
// đã vào. Ba nút bằng nhau Nghe (vào bằng tiếng) · Video (vào và bật camera) · Từ chối, ở cả thẻ
// gọn lẫn màn lớn.

const JOINED_AVATAR_SIZE = 18;
const JOINED_AVATAR_LIMIT = 4;

export interface RingingCallerView {
    title: string;
    // Kiểu gọi và người gọi, vd "Cuộc gọi thoại đến", "Cuộc gọi nhóm video từ Linh".
    subtitle: string;
    renderAvatar: (size: number) => ReactNode;
    // Gọi nhóm: những người đã vào cuộc gọi.
    joined: { user_id: number; name: string; avatar_url: string | null }[];
}

interface RingingProps {
    caller: RingingCallerView;
    onAccept: (media: CallMediaKind) => void;
    onDecline: () => void;
    onOpenChat: () => void;
}

function JoinedPeople({ joined }: { joined: RingingCallerView['joined'] }) {
    if (joined.length === 0) return null;

    return (
        <span className="flex items-center min-w-0 gap-1.5 text-xs text-n-slate-11">
            <span className="flex flex-shrink-0">
                {joined.slice(0, JOINED_AVATAR_LIMIT).map(person => (
                    <Avatar
                        key={person.user_id}
                        name={person.name}
                        src={person.avatar_url ?? ''}
                        size={JOINED_AVATAR_SIZE}
                        roundedFull
                        className="-me-1.5 ring-2 ring-n-solid-1"
                    />
                ))}
            </span>
            <span className="ms-1.5 truncate">{t('CALLS.RINGING.JOINED', { count: joined.length })}</span>
        </span>
    );
}

const ROW_BUTTON_CLASS = 'w-full max-md:!h-[44px]';

// Thẻ gọn: máy tính nổi góc dưới, điện thoại là bottom sheet (vuốt lên mở màn lớn).
export function RingingCard({ caller, isPhone, onAccept, onDecline, onOpenChat, onExpand }: RingingProps & { isPhone: boolean; onExpand: () => void }) {
    const body = (
        <div data-testid="incoming-call" className="flex flex-col gap-3">
            <div className="flex items-center gap-3 min-w-0">
                <button type="button" title={t('CALLS.DIRECT.EXPAND')} className="flex flex-1 items-center gap-3 min-w-0 p-0 text-start" onClick={onExpand}>
                    <span className="flex-shrink-0">{caller.renderAvatar(40)}</span>
                    <span className="flex flex-1 flex-col min-w-0 gap-0.5">
                        <span className="text-sm font-medium truncate text-n-slate-12">{caller.title}</span>
                        {isPhone ? null : <span className="text-xs truncate text-n-teal-11">{caller.subtitle}</span>}
                        <JoinedPeople joined={caller.joined} />
                    </span>
                </button>
                <Button sm slate ghost icon="i-lucide-message-circle" title={t('CALLS.DIRECT.OPEN_CHAT')} className={PHONE_TOUCH_SIZE} onClick={onOpenChat} />
            </div>
            <div className="grid grid-cols-3 gap-2">
                <Button sm teal solid icon="i-lucide-phone" label={t('CALLS.DIRECT.ACCEPT')} className={ROW_BUTTON_CLASS} onClick={() => onAccept('audio')} />
                <Button sm teal faded icon="i-lucide-video" label={t('CALLS.RINGING.VIDEO')} className={ROW_BUTTON_CLASS} onClick={() => onAccept('video')} />
                <Button sm ruby solid icon="i-lucide-phone-off" label={t('CALLS.DIRECT.DECLINE')} className={ROW_BUTTON_CLASS} onClick={onDecline} />
            </div>
        </div>
    );

    if (isPhone) {
        return (
            <BottomSheet isOpen title={caller.subtitle} onClose={onDecline} onSwipeUp={onExpand} focusesSheetOnOpen>
                <div className="px-4 pt-2 pb-4">{body}</div>
            </BottomSheet>
        );
    }

    return (
        <section role="dialog" aria-label={caller.subtitle} className="fixed bottom-6 end-6 z-50 w-[22rem] p-3 rounded-[1.25rem] overlay-surface animate-fade-in-up">
            {body}
        </section>
    );
}

// Màn đổ chuông lớn: quả cầu ôm ảnh, kiểu gọi + tên, ai đã vào, nút phụ Nhắn tin, ba nút lớn.
export function RingingScene({ caller, onAccept, onDecline, onOpenChat, onMinimize }: RingingProps & { onMinimize: () => void }) {
    return (
        <section
            role="dialog"
            aria-label={caller.subtitle}
            data-testid="ringing-scene"
            className="fixed inset-0 z-50 isolate flex flex-col bg-n-surface-canvas pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-fade-in-up"
        >
            <div className="flex justify-end px-3 h-12">
                <Button sm slate link label={t('CALLS.DIRECT.HIDE')} className={`${TOUCH_HEIGHT} px-2`} onClick={onMinimize} />
            </div>
            <div className="relative flex flex-1 items-center justify-center min-h-0">
                <CallOrb mode="waiting" readSelfLevel={() => 0} readPeerLevel={() => 0} className="aspect-square w-[min(80vw,40vh,22rem)]" />
                <span className="absolute">{caller.renderAvatar(88)}</span>
            </div>
            <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto px-8 pt-6">
                <div className="flex flex-col items-center gap-1 max-w-full text-center">
                    <span className="text-xs text-n-slate-11">{caller.subtitle}</span>
                    <span className="max-w-full text-3xl font-semibold truncate text-n-slate-12">{caller.title}</span>
                    <JoinedPeople joined={caller.joined} />
                </div>
                <button type="button" className={`flex flex-col items-center gap-1 ${TOUCH_MIN_HEIGHT} px-2 text-n-slate-12 hover:text-n-slate-11`} onClick={onOpenChat}>
                    <span className="i-lucide-message-circle size-5" aria-hidden="true" />
                    <span className="text-xs">{t('CALLS.DIRECT.OPEN_CHAT')}</span>
                </button>
                <CallActionGrid className="w-full">
                    <CallActionButton
                        icon="i-lucide-phone"
                        label={t('CALLS.DIRECT.ACCEPT')}
                        tone="accept"
                        className="[&>span]:animate-call-ring motion-reduce:[&>span]:animate-none"
                        onClick={() => onAccept('audio')}
                    />
                    <CallActionButton icon="i-lucide-video" label={t('CALLS.RINGING.VIDEO')} tone="acceptAlt" onClick={() => onAccept('video')} />
                    <CallActionButton icon="i-lucide-phone-off" label={t('CALLS.DIRECT.DECLINE')} tone="end" onClick={onDecline} />
                </CallActionGrid>
            </div>
        </section>
    );
}
