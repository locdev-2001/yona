import { useCallSession } from './callSession';
import type { CallSession, DirectCallState } from './callSession';
import DirectCallScene from './DirectCallScene';
import type { DirectCallPhase } from './DirectCallScene';
import IncomingCallCard from './IncomingCallCard';
import OutgoingCallBar from './OutgoingCallBar';
import { identityOfUser } from './participantIdentity';
import type { CallPeerView } from './types';

// Giao diện cuộc gọi 1-1 đọc từ phiên gọi: thẻ/sheet cuộc gọi đến, dải đang gọi đi, màn gọi lớn.
// Nối máy xong mà thu nhỏ thì dùng chung khối "Đã kết nối" của phòng nhóm (VoicePanel, CallBar).

interface DirectCallContext {
    session: CallSession;
    direct: DirectCallState;
    peer: CallPeerView;
    phase: DirectCallPhase;
}

function useDirectCall(): DirectCallContext | null {
    const session = useCallSession();
    const direct = session.direct;
    if (!direct) return null;

    const { view } = direct;
    const phase: DirectCallPhase = view.status === 'active' ? 'connected' : view.role === 'callee' ? 'incoming' : 'outgoing';

    return { session, direct, peer: { userId: view.peer.id, name: view.peer.name, avatarUrl: view.peer.avatar_url }, phase };
}

// Dải "đang gọi" của người gọi. `conversationId`: chỉ hiện khi đang xem đúng hội thoại đó (dải dưới
// mũ khung chat trên máy tính); bỏ trống thì hiện ở mọi trang (đáy màn điện thoại, góc máy tính).
export function DirectOutgoingStrip({ placement, conversationId }: { placement: 'top' | 'bottom' | 'floating'; conversationId?: number }) {
    const context = useDirectCall();
    if (!context || context.phase !== 'outgoing' || context.direct.isExpanded) return null;

    const { session, direct, peer } = context;
    if (conversationId !== undefined && direct.view.conversation_id !== conversationId) return null;

    const bar = (
        <OutgoingCallBar
            peer={peer}
            media={direct.view.media}
            placement={placement}
            since={direct.view.ringing_since ?? new Date().toISOString()}
            isRinging
            micOn={session.local.micOn}
            selfIdentity={session.selfIdentity}
            renderMedia={session.renderMedia}
            onToggleMic={session.actions.toggleMic}
            onCancel={session.directActions.hangUp}
            onExpand={session.directActions.expand}
        />
    );

    return placement === 'floating' ? <div className="fixed bottom-6 end-6 z-50 w-[26rem] max-w-[calc(100vw-3rem)]">{bar}</div> : bar;
}

// Lớp nổi trên mọi trang: cuộc gọi đến và màn gọi lớn. `viewingConversationId`: hội thoại đang
// mở, để dải đang gọi đi nổi ở góc chỉ khi không đang xem hội thoại đó (máy tính).
export function DirectCallOverlay({ isPhone, viewingConversationId }: { isPhone: boolean; viewingConversationId: number | null }) {
    const context = useDirectCall();
    if (!context) return null;

    const { session, direct, peer, phase } = context;
    const { view } = direct;
    const showsScene = direct.isExpanded || (phase === 'connected' && session.stageOpen);

    if (showsScene) {
        const peerIdentity = identityOfUser(view.peer.id);
        const peerSpeaking = session.room?.participants.some(participant => participant.identity === peerIdentity && participant.isSpeaking);
        const selfSpeaking = session.room?.participants.some(participant => participant.isLocal && participant.isSpeaking);

        return (
            <DirectCallScene
                peer={peer}
                media={view.media}
                phase={phase}
                since={(phase === 'connected' ? view.answered_at : view.ringing_since) ?? new Date().toISOString()}
                speaker={peerSpeaking ? 'peer' : selfSpeaking ? 'self' : null}
                readSelfLevel={() => (session.selfIdentity ? session.readAudioLevel(session.selfIdentity) : 0)}
                readPeerLevel={() => session.readAudioLevel(peerIdentity)}
                micOn={session.local.micOn}
                camOn={session.local.camOn}
                deafened={session.local.deafened}
                onAccept={session.directActions.accept}
                onDecline={session.directActions.hangUp}
                onToggleMic={session.actions.toggleMic}
                onToggleCamera={session.actions.toggleCamera}
                onToggleDeafen={session.actions.toggleDeafen}
                listDevices={session.actions.listDevices}
                onSelectDevice={session.actions.selectDevice}
                onMinimize={session.directActions.collapse}
                onOpenChat={session.directActions.openChat}
            />
        );
    }

    if (phase === 'incoming') {
        return (
            <IncomingCallCard
                peer={peer}
                media={view.media}
                isPhone={isPhone}
                onAccept={session.directActions.accept}
                onDecline={session.directActions.hangUp}
                onOpenChat={session.directActions.openChat}
                onExpand={session.directActions.expand}
            />
        );
    }

    return phase === 'outgoing' && !isPhone && viewingConversationId !== view.conversation_id ? <DirectOutgoingStrip placement="floating" /> : null;
}
