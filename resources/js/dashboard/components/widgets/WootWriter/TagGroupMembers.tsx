import { useMemo } from 'react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import type { GroupMember } from 'dashboard/conversation/groupMembersApi';
import { escapeHtml } from 'shared/helpers/escapeHtml';
import { highlightSegments } from 'shared/helpers/searchFold';
import { t } from '../../../../i18n';
import CaretAnchoredPicker from './CaretAnchoredPicker';
import type { CaretPosition, PickerCloseReason } from './CaretAnchoredPicker';

// Bảng gợi ý thành viên nhóm khi gõ `@` ở chế độ Trả lời. Ô soạn giữ focus: từ khoá
// là chữ gõ ngay sau `@`, danh sách đã được Editor lọc sẵn.

const HIGHLIGHT_CLASS = 'text-n-blue-text';

interface TagGroupMembersProps {
    caretPosition: CaretPosition | null;
    searchKey: string;
    members: GroupMember[];
    boundaryElement?: HTMLElement | null;
    onSelect: (member: GroupMember) => void;
    onClose: (reason: PickerCloseReason) => void;
    onRemoveTrigger: () => void;
}

interface GroupMemberPickerItem {
    id: string;
    member: GroupMember;
    label: string;
    title: string;
    group: string;
}

// Tên đến từ kênh nên phải mã hoá trước khi vào HTML của bảng; đoạn khớp (không
// dấu) được tô sáng.
function highlightedName(name: string, searchKey: string): string {
    return highlightSegments(name, searchKey)
        .map(segment =>
            segment.match ? `<span class="${HIGHLIGHT_CLASS}">${escapeHtml(segment.text)}</span>` : escapeHtml(segment.text),
        )
        .join('');
}

export default function TagGroupMembers({
    caretPosition,
    searchKey,
    members,
    boundaryElement = null,
    onSelect,
    onClose,
    onRemoveTrigger,
}: TagGroupMembersProps) {
    const groupLabel = t('CONVERSATION.PICKER.GROUP_MEMBER.TITLE');

    const items = useMemo<GroupMemberPickerItem[]>(
        () =>
            members.map(member => ({
                id: member.external_id,
                member,
                label: member.name,
                title: highlightedName(member.name, searchKey),
                group: groupLabel,
            })),
        [members, searchKey, groupLabel],
    );

    return (
        <CaretAnchoredPicker<GroupMemberPickerItem>
            caretPosition={caretPosition}
            items={items}
            search={searchKey}
            onSearchChange={() => undefined}
            keepFocusInEditor
            boundaryElement={boundaryElement}
            onSelect={item => onSelect(item.member)}
            onClose={onClose}
            onRemoveTrigger={onRemoveTrigger}
            renderLeading={item => (
                <Avatar src={item.member.avatar ?? undefined} name={item.label} size={24} roundedFull className="flex-shrink-0" />
            )}
        />
    );
}
