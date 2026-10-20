import Icon from 'dashboard/components-next/icon/Icon';
import { describeCall, groupRoomStartText, isGroupRoomStart } from './callLog';
import type { CallLogData } from './callLog';

// Dòng xem trước của tin cuộc gọi ở danh sách hội thoại: biểu tượng theo loại, cuộc gọi mình nhỡ thì đỏ.
export default function CallPreview({ call, iconClassName = '' }: { call: CallLogData; iconClassName?: string }) {
    if (isGroupRoomStart(call)) {
        return (
            <span data-testid="call-preview">
                <Icon icon="i-lucide-headphones" className={`-mt-0.5 align-middle inline-block size-4 me-1 ${iconClassName}`} />
                {groupRoomStartText(call)}
            </span>
        );
    }

    const { preview } = describeCall(call);

    return (
        <span data-testid="call-preview" className={preview.isAlert ? 'text-n-ruby-11' : ''}>
            <Icon icon={preview.icon} className={`-mt-0.5 align-middle inline-block size-4 me-1 ${preview.isAlert ? 'text-n-ruby-11' : iconClassName}`} />
            {preview.text}
        </span>
    );
}
