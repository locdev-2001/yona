import { useMemo } from 'react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import type { GroupMember } from 'dashboard/conversation/groupMembersApi';
import { searchHighlightHtml } from 'dashboard/helper/searchHighlight';
import { t } from '../../../../i18n';
import CaretAnchoredPicker from './CaretAnchoredPicker';
import type { CaretPosition, PickerCloseReason } from './CaretAnchoredPicker';

// Bảng gợi ý thành viên nhóm khi gõ `@` ở chế độ Trả lời. Ô soạn giữ focus: từ khoá
// là chữ gõ ngay sau `@`, danh sách đã được Editor lọc và xếp sẵn.

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
                title: searchHighlightHtml(member.name, searchKey),
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
