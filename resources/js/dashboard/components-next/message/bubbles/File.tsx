import BaseBubble from './Base';
import FileChip from '../chips/File';
import { useMessageContext } from '../provider';

export default function FileBubble() {
    const { attachments } = useMessageContext();

    return (
        <BaseBubble className="p-1.5" dataBubbleName="file">
            <FileChip attachment={attachments[0]} />
        </BaseBubble>
    );
}
