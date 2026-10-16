import CmdBarConversationSnooze from 'dashboard/commands/CmdBarConversationSnooze';
import { useConversationHotKeys } from 'dashboard/commands/useConversationHotKeys';
import { useMacroHotKeys } from 'dashboard/commands/useMacroHotKeys';
import Dashboard from '../Dashboard';
import { ConversationProvider, useConversation } from './ConversationContext';
import type { ConversationType } from './constants';
import ChatList from './chatlist/ChatList';
import ComposeDraftPane from './compose/ComposeDraftPane';
import ConversationBox from './conversationbox/ConversationBox';
import ConversationSidebar from './conversationbox/ConversationSidebar';
import OnboardingView from './conversationbox/OnboardingView';
import { useShowAdminOnboarding } from './conversationbox/useShowAdminOnboarding';
import { showConversationList as computeShowList, showMessageView as computeShowMessageView } from './layoutMode';

// Port từ routes/dashboard/conversation/ConversationView.vue — trang 3 cột
// (Sidebar shell + ChatList + ConversationBox). Layout expanded (⇥) như gốc:
// list chiếm hết khi chưa chọn conversation, chọn rồi thì chỉ còn cột giữa.
// Bỏ ở B3: ConversationSidebar/SidepanelSwitch (B11).
interface Props {
    conversationId?: number;
    teamId?: number;
    // prop route conversation_mentions / conversation_through_mentions.
    conversationType?: ConversationType;
    // prop route folder_conversations / conversations_through_folders (E1).
    foldersId?: number;
    // Route /inbox/new: khung chat là bản nháp hội thoại mới.
    isComposing?: boolean;
    composeContactId?: number | null;
}

function ConversationLayout({ conversationId, foldersId }: { conversationId: number; foldersId: number }) {
    const { isOnExpandedLayout, selectedConversation, isComposing } = useConversation();
    const hasOpenThread = Boolean(conversationId) || isComposing;
    const showConversationList = computeShowList(isOnExpandedLayout, hasOpenThread);
    const showMessageView = computeShowMessageView(isOnExpandedLayout, hasOpenThread);
    // Cột phải luôn dựng khi có hội thoại: mở thì là panel Liên hệ, đóng thì
    // ConversationSidebar tự thu thành dải nút mở (màn rộng) hoặc không vẽ gì.
    const shouldShowSidebar = Boolean(selectedConversation);
    const showAdminOnboarding = useShowAdminOnboarding();
    useConversationHotKeys();
    useMacroHotKeys();

    // Bố cục hai-màn (điện thoại, hoặc đã bấm ⇥) chỉ dựng khung chat khi đã chọn
    // hội thoại, nên màn bắt đầu của quản trị viên nằm trong khung chat sẽ không
    // bao giờ hiện. Account chưa có hộp thư thì danh sách cũng rỗng — nhường chỗ
    // cho màn bắt đầu. Chừa đáy dưới `md` để thẻ cuối cuộn lên khỏi nút menu nổi.
    if (showAdminOnboarding && isOnExpandedLayout && !hasOpenThread) {
        return (
            <section className="flex w-full h-full min-w-0 overflow-auto pb-16 md:pb-0">
                <OnboardingView />
            </section>
        );
    }

    return (
        <section className="flex w-full h-full min-w-0">
            <ChatList showConversationList={showConversationList} foldersId={foldersId} />
            {showMessageView ? isComposing ? <ComposeDraftPane /> : <ConversationBox /> : null}
            {shouldShowSidebar && !isComposing ? <ConversationSidebar /> : null}
            <CmdBarConversationSnooze />
        </section>
    );
}

export default function ConversationView({
    conversationId = 0,
    teamId = 0,
    conversationType = '',
    foldersId = 0,
    isComposing = false,
    composeContactId = null,
}: Props) {
    return (
        <Dashboard>
            <ConversationProvider
                conversationId={conversationId}
                teamId={teamId}
                conversationType={conversationType}
                isComposing={isComposing}
                composeContactId={composeContactId}
            >
                <ConversationLayout conversationId={conversationId} foldersId={foldersId} />
            </ConversationProvider>
        </Dashboard>
    );
}
