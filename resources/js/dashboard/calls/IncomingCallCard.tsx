import Button from 'dashboard/components-next/button/Button';
import BottomSheet from 'dashboard/components-next/BottomSheet';
import { t } from '../../i18n';
import RingingAvatar from './RingingAvatar';
import type { CallMediaKind, CallPeerView } from './types';
import { answerOptionsFor, answerTone, RINGING_ICON_CLASS } from './answerOptions';
import { PHONE_TOUCH_SIZE } from './touchTarget';

interface IncomingCallProps {
    peer: CallPeerView;
    media: CallMediaKind;
    isPhone: boolean;
    onAccept: (media: CallMediaKind) => void;
    onDecline: () => void;
    // Mở màn gọi lớn (vuốt lên trên điện thoại, bấm vào tên trên máy tính).
    onExpand: () => void;
}

// Cuộc gọi đến, ở mọi trang: một hàng gọn gồm ảnh, tên, nút bắt máy (Nghe, và Video nếu là gọi
// video) rồi nút cúp máy ở mép phải, cỡ chuẩn của app.
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

function IncomingCallRow({ peer, media, subtitle, onAccept, onDecline, onExpand }: IncomingCallProps & { subtitle: string | null }) {
    return (
        <div data-testid="incoming-call" className="flex items-center gap-3 max-md:gap-2 min-w-0">
            <button type="button" title={t('CALLS.DIRECT.EXPAND')} className="flex flex-1 items-center gap-3 max-md:gap-2 min-w-0 p-0 text-start" onClick={onExpand}>
                <RingingAvatar peer={peer} size={40} isRinging />
                <span className="flex flex-1 flex-col min-w-0">
                    <span className="text-sm font-medium truncate text-n-slate-12">{peer.name}</span>
                    {subtitle ? <span className="text-xs truncate text-n-slate-11">{subtitle}</span> : null}
                </span>
            </button>
            <div className="flex flex-shrink-0 items-center gap-2">
                {answerOptionsFor(media).map(option => (
                    <Button
                        key={option.media}
                        sm
                        {...answerTone(option)}
                        icon={option.icon}
                        title={t(option.labelKey)}
                        className={`${PHONE_TOUCH_SIZE} ${option.isPrimary ? RINGING_ICON_CLASS : ''}`}
                        onClick={() => onAccept(option.media)}
                    />
                ))}
                <Button sm ruby solid icon="i-lucide-phone-off" title={t('CALLS.DIRECT.DECLINE')} className={PHONE_TOUCH_SIZE} onClick={onDecline} />
            </div>
        </div>
    );
}
