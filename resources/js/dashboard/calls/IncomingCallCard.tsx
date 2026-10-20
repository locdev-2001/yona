import Button from 'dashboard/components-next/button/Button';
import BottomSheet from 'dashboard/components-next/BottomSheet';
import { t } from '../../i18n';
import RingingAvatar from './RingingAvatar';
import type { CallMediaKind, CallPeerView } from './types';
import { PHONE_TOUCH_SIZE } from './touchTarget';

interface IncomingCallProps {
    peer: CallPeerView;
    media: CallMediaKind;
    isPhone: boolean;
    onAccept: (media: CallMediaKind) => void;
    onDecline: () => void;
    // Mở hội thoại với người gọi mà chưa nghe (nhắn "gọi lại sau").
    onOpenChat: () => void;
    // Mở màn gọi lớn (vuốt lên trên điện thoại, bấm vào tên trên máy tính).
    onExpand: () => void;
}

// Cuộc gọi đến, ở mọi trang: một hàng gọn gồm ảnh, tên và các nút biểu tượng cỡ chuẩn của app.
// Máy tính: thẻ nổi góc dưới, bo 20 = bo nút 8 + lề trong 12. Điện thoại: cùng hàng đó trong
// bottom sheet sẵn có, nút 44px trong tầm ngón cái.
export default function IncomingCallCard(props: IncomingCallProps) {
    const title = props.media === 'video' ? t('CALLS.DIRECT.INCOMING_VIDEO') : t('CALLS.DIRECT.INCOMING_VOICE');

    if (props.isPhone) {
        return (
            <BottomSheet isOpen title={title} onClose={props.onDecline} onSwipeUp={props.onExpand} focusesSheetOnOpen>
                <div className="px-4 pt-2 pb-4">
                    <IncomingCallRow {...props} subtitle={null} />
                </div>
            </BottomSheet>
        );
    }

    return (
        <section role="dialog" aria-label={title} className="fixed bottom-6 end-6 z-50 w-[22rem] p-3 rounded-[1.25rem] overlay-surface animate-fade-in-up">
            <IncomingCallRow {...props} subtitle={title} />
        </section>
    );
}

function IncomingCallRow({ peer, media, subtitle, onAccept, onDecline, onOpenChat, onExpand }: IncomingCallProps & { subtitle: string | null }) {
    const sizeClass = PHONE_TOUCH_SIZE;

    return (
        <div data-testid="incoming-call" className="flex items-center gap-3 max-md:gap-2 min-w-0">
            <button type="button" title={t('CALLS.DIRECT.EXPAND')} className="flex flex-1 items-center gap-3 max-md:gap-2 min-w-0 p-0 text-start" onClick={onExpand}>
                <RingingAvatar peer={peer} size={40} isRinging />
                <span className="flex flex-1 flex-col min-w-0">
                    <span className="text-sm font-medium truncate text-n-slate-12">{peer.name}</span>
                    {subtitle ? <span className="text-xs truncate text-n-teal-11">{subtitle}</span> : null}
                </span>
            </button>
            {/* Nút phụ mờ, đứng riêng; cặp chính: Nghe rồi Từ chối, nút cúp máy ở mép phải sát tay phải. */}
            <div className="flex flex-shrink-0 items-center gap-1">
                <Button sm slate ghost icon="i-lucide-message-circle" title={t('CALLS.DIRECT.OPEN_CHAT')} className={sizeClass} onClick={onOpenChat} />
                {media === 'video' ? (
                    <Button sm slate ghost icon="i-lucide-video-off" title={t('CALLS.DIRECT.ACCEPT_AUDIO_ONLY')} className={sizeClass} onClick={() => onAccept('audio')} />
                ) : null}
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
                <Button
                    sm
                    teal
                    solid
                    icon={media === 'video' ? 'i-lucide-video' : 'i-lucide-phone'}
                    title={t('CALLS.DIRECT.ACCEPT')}
                    className={`${sizeClass} [&>span]:animate-call-ring motion-reduce:[&>span]:animate-none`}
                    onClick={() => onAccept(media)}
                />
                <Button sm ruby solid icon="i-lucide-phone-off" title={t('CALLS.DIRECT.DECLINE')} className={sizeClass} onClick={onDecline} />
            </div>
        </div>
    );
}
