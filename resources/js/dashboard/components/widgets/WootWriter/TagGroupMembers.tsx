import { useMemo } from 'react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import type { GroupMember } from 'dashboard/conversation/groupMembersApi';
import { searchHighlightHtml } from 'dashboard/helper/searchHighlight';
import { t } from '../../../../i18n';
import CaretAnchoredPicker from './CaretAnchoredPicker';
import { isEveryoneMention } from './groupMemberMentions';
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
    const everyoneHint = t('CONVERSATION.PICKER.GROUP_MEMBER.EVERYONE_HINT');

    const items = useMemo<GroupMemberPickerItem[]>(
        () =>
            members.map(member => ({
                id: member.external_id,
                member,
                label: member.name,
                // @All giữ một dòng như các thành viên: lời giải thích nằm cùng dòng, chữ nhạt.
                title: isEveryoneMention(member)
                    ? `${searchHighlightHtml(`@${member.name}`, searchKey)} <span class="font-normal text-n-slate-11">· ${searchHighlightHtml(everyoneHint, '')}</span>`
                    : searchHighlightHtml(member.name, searchKey),
                group: groupLabel,
            })),
        [members, searchKey, groupLabel, everyoneHint],
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
            renderLeading={item =>
                isEveryoneMention(item.member) ? (
                    <span className="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-n-brand/10 text-n-brand">
                        <span className="i-lucide-users-round size-3.5" aria-hidden />
                    </span>
                ) : (
                    <Avatar seed={avatarSeed('group_member', item.member.external_id)} src={item.member.avatar ?? undefined} name={item.label} size={24} roundedFull className="flex-shrink-0" />
                )
            }
        />
    );
}
