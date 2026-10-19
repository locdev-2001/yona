import { useCallback, useRef, useState } from 'react';

import NextButton from 'dashboard/components-next/button/Button';
import type { DropdownMenuItem, DropdownMenuSection } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import Icon from 'dashboard/components-next/icon/Icon';
import type { AssignableAgent } from 'dashboard/composables/useAgentsList';
import { useClickAway } from 'dashboard/composables/useClickAway';
import { useIsPhoneScreen } from 'dashboard/composables/useViewportWidth';
import { t } from '../../../i18n';
import { AssigneeAvatar, AssigneePill, assigneeLabel, assigneeName } from '../AssigneeIdentity';
import type { AssigneeKind } from '../AssigneeIdentity';
import { agentOptionAvatarSeed } from './contact/assignmentOptions';
import HeaderActionMenu from './HeaderActionMenu';
import { useConversationAssignment } from './useConversationAssignment';

// Người phụ trách ở mũ khung chat: thấy ngay ai đang xử lý, bấm là đổi người
// mà không phải mở panel phải. `isCompact`: chỉ còn avatar để mũ gọn một dòng.
// `isStretched`: nút chiếm nửa dải hành động dưới mũ trên điện thoại.
const SEARCH_THRESHOLD = 6;

interface AssigneeActionProps {
    isCompact?: boolean;
    isStretched?: boolean;
}

export default function AssigneeAction({ isCompact = false, isStretched = false }: AssigneeActionProps = {}) {
    const { agentsList, assignedAgent, isAssignedToMe, selfAssign, toggleAgent, unassign } = useConversationAssignment();
    const [isMenuOpen, setMenuOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const isPhone = useIsPhoneScreen();

    const closeMenu = useCallback(() => setMenuOpen(false), []);
    // Bottom sheet nằm ngoài khung nút (portal) và tự đóng khi chạm nền mờ.
    useClickAway(containerRef, closeMenu, isMenuOpen && !isPhone);

    const isAgentBot = assignedAgent?.assignee_type === 'AgentBot';
    const kind: AssigneeKind = !assignedAgent ? 'none' : isAssignedToMe ? 'me' : 'other';
    const triggerTitle = assigneeLabel(kind, assignedAgent ? assigneeName(assignedAgent) : '');

    const quickActions: DropdownMenuItem[] = [
        ...(!isAssignedToMe
            ? [{ label: t('CONVERSATION.ASSIGNEE.ASSIGN_TO_ME'), value: 'self', action: 'self', icon: 'i-lucide-user-check' }]
            : []),
        ...(assignedAgent
            ? [{ label: t('CONVERSATION.ASSIGNEE.UNASSIGN'), value: 'unassign', action: 'unassign', icon: 'i-lucide-user-x' }]
            : []),
    ];
    const menuSections: DropdownMenuSection[] = [
        ...(quickActions.length ? [{ items: quickActions }] : []),
        {
            title: t('CONVERSATION.ASSIGNEE.ASSIGN_TO'),
            items: agentsList.map(agent => ({
                label: assigneeName(agent),
                value: `${agent.assignee_type ?? 'User'}:${agent.id}`,
                action: 'assign',
                agent,
                isSelected: assignedAgent?.id === agent.id && assignedAgent?.assignee_type === (agent.assignee_type ?? 'User'),
                thumbnail: { name: assigneeName(agent), src: agent.thumbnail ?? '', seed: agentOptionAvatarSeed(agent) },
            })),
        },
    ];

    const onAction = (item: DropdownMenuItem) => {
        closeMenu();
        if (item.action === 'self') selfAssign();
        else if (item.action === 'unassign') unassign();
        else toggleAgent(item.agent as AssignableAgent);
    };

    const assigneeAvatar = <AssigneeAvatar assignee={assignedAgent} isAgentBot={isAgentBot} size={isCompact ? 20 : 16} />;

    return (
        <div
            ref={containerRef}
            className={`relative flex items-center ${isStretched ? 'flex-1 min-w-0' : 'flex-shrink-0'}`}
            onKeyDown={event => {
                if (event.key === 'Escape') closeMenu();
            }}
        >
            <NextButton
                sm
                slate
                noAnimation
                trailingIcon={!isCompact}
                icon={isCompact ? undefined : 'i-lucide-chevron-down'}
                title={triggerTitle}
                aria-label={triggerTitle}
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                data-testid="conversation-assignee-button"
                className={`!outline-0 max-md:h-11 ${
                    isCompact
                        ? `!px-0 w-8 max-md:w-11 justify-center`
                        : isStretched
                          ? 'w-full justify-center'
                          : 'max-w-[16rem]'
                }`}
                onClick={() => setMenuOpen(open => !open)}
            >
                {isCompact ? (
                    assigneeAvatar
                ) : (
                    // Một khối duy nhất: trailingIcon đảo chiều hàng, khối giữ đúng thứ tự bên trong.
                    <AssigneePill assignee={assignedAgent} isAgentBot={isAgentBot} kind={kind} />
                )}
            </NextButton>
            <HeaderActionMenu
                isOpen={isMenuOpen}
                asSheet={isPhone}
                title={t('CONVERSATION.ASSIGNEE.CHANGE')}
                menuSections={menuSections}
                showSearch={agentsList.length > SEARCH_THRESHOLD}
                popoverClassName="top-full mt-1 end-0 w-max min-w-[14rem] max-w-[min(20rem,calc(100vw-1rem))] max-h-[60vh]"
                itemClassName="max-md:h-11"
                renderTrailingIcon={item =>
                    item.isSelected ? <Icon icon="i-lucide-check" className="ms-auto flex-shrink-0 size-4 text-n-blue-11" /> : null
                }
                onAction={onAction}
                onClose={closeMenu}
            />
        </div>
    );
}
