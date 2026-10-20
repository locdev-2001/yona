import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import { t } from '../../i18n';
import type { CallMediaSource, CallParticipantView, RenderCallMedia } from './types';

// Một ô trong màn phòng: hình camera/màn hình nếu có, không thì ảnh đại diện. Không viền:
// người đang nói nhận ra qua nhãn tên chuyển xanh kèm sóng âm. Quản trị rê chuột vào ô người khác thấy nút tắt mic, mời ra.
export default function CallTile({
    participant,
    source,
    renderMedia,
    canModerate,
    onMute,
    onRemove,
    className = '',
}: {
    participant: CallParticipantView;
    source: CallMediaSource;
    renderMedia?: RenderCallMedia;
    canModerate: boolean;
    onMute: (identity: string) => void;
    onRemove: (identity: string) => void;
    className?: string;
}) {
    const isScreen = source === 'screen';
    const showsMedia = isScreen || participant.camOn;
    const name = participant.isLocal ? `${participant.name} (${t('CALLS.ROOM.YOU')})` : participant.name;
    const caption = isScreen ? t('CALLS.ROOM.SCREEN_OF', { name: participant.name }) : name;
    const isSpeaking = participant.isSpeaking && !isScreen;

    return (
        <div className={`group/tile relative flex items-center justify-center overflow-hidden rounded-xl ${isScreen ? '' : 'bg-n-surface-panel'} ${className}`}>
            {showsMedia && renderMedia ? (
                <div className={`absolute inset-0 ${isScreen ? 'rounded-xl overflow-hidden' : ''}`}>{renderMedia(participant.identity, source)}</div>
            ) : (
                <Avatar
                    name={participant.name}
                    src={participant.avatarUrl ?? undefined}
                    seed={participant.userId ? avatarSeed('user', participant.userId) : undefined}
                    size={48}
                />
            )}
            <div className="absolute bottom-2 start-2 end-2 flex items-center gap-1.5 min-w-0">
                <span className={`flex items-center gap-1 min-w-0 max-w-full px-2 py-0.5 rounded-md backdrop-blur-sm text-xs font-medium ${isSpeaking ? 'bg-n-teal-9 text-white' : showsMedia && renderMedia ? 'bg-n-black/60 text-white' : 'bg-n-alpha-2 text-n-slate-12'}`}>
                    {isScreen ? <Icon icon="i-lucide-screen-share" className="size-3.5 flex-shrink-0" /> : null}
                    {isSpeaking ? <Icon icon="i-lucide-audio-lines" className="size-3.5 flex-shrink-0 animate-pulse" /> : null}
                    {!isScreen && !participant.micOn ? (
                        <Icon icon="i-lucide-mic-off" className="size-3.5 flex-shrink-0 text-n-ruby-8" />
                    ) : null}
                    <span className="truncate">{caption}</span>
                </span>
            </div>
            {canModerate && !participant.isLocal && !isScreen ? (
                <div className="absolute top-2 end-2 flex gap-1 opacity-0 group-hover/tile:opacity-100 focus-within:opacity-100">
                    {participant.micOn ? (
                        <Button
                            xs
                            slate
                            solid
                            icon="i-lucide-mic-off"
                            title={t('CALLS.ROOM.MUTE_PARTICIPANT')}
                            className=""
                            onClick={() => onMute(participant.identity)}
                        />
                    ) : null}
                    <Button
                        xs
                        ruby
                        solid
                        icon="i-lucide-user-x"
                        title={t('CALLS.ROOM.REMOVE_PARTICIPANT')}
                        className=""
                        onClick={() => onRemove(participant.identity)}
                    />
                </div>
            ) : null}
        </div>
    );
}
