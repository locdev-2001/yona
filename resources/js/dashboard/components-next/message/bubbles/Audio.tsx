import BaseBubble from './Base';
import AudioChip from '../chips/Audio';
import { useMessageContext } from '../provider';

// Port từ dashboard/components-next/message/bubbles/Audio.vue.
export default function AudioBubble() {
    const { attachments } = useMessageContext();

    return (
        <BaseBubble className="bg-transparent" dataBubbleName="audio">
            <AudioChip attachment={attachments[0]} className="p-2 text-n-slate-12 skip-context-menu" />
        </BaseBubble>
    );
}
