import DOMPurify from 'dompurify';

import FluentIcon from 'shared/components/FluentIcon/FluentIcon';
import MessageFormatter from 'shared/helpers/MessageFormatter';

import AvailabilityContainer, { useInboxAvailability } from './Availability';
import HeaderActions from './HeaderActions';
import type { AvailableAgent } from '../types';

// Port từ widget/components/ChatHeader.vue + ChatHeaderExpanded.vue

interface ChatHeaderProps {
    title: string;
    avatarUrl?: string;
    showPopoutButton?: boolean;
    showBackButton?: boolean;
    availableAgents: AvailableAgent[];
    onBack: () => void;
}

export function ChatHeader({
    title,
    avatarUrl = '',
    showPopoutButton = false,
    showBackButton = false,
    availableAgents,
    onBack,
}: ChatHeaderProps) {
    const { isOnline } = useInboxAvailability(availableAgents);

    return (
        <header className="flex justify-between w-full p-5 bg-n-background gap-2">
            <div className="flex items-center">
                {showBackButton ? (
                    <button type="button" className="px-2 ltr:-ml-3 rtl:-mr-3" onClick={onBack}>
                        <FluentIcon icon="chevron-left" size="24" className="text-n-slate-12" />
                    </button>
                ) : null}
                {avatarUrl ? (
                    <img className="w-8 h-8 ltr:mr-3 rtl:ml-3 rounded-full" src={avatarUrl} alt="avatar" />
                ) : null}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center text-base font-medium leading-4 text-n-slate-12">
                        <span
                            className="ltr:mr-1 rtl:ml-1"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(title) }}
                        />
                        <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-n-teal-10' : 'hidden'}`} />
                    </div>
                    <AvailabilityContainer
                        agents={availableAgents}
                        showHeader={false}
                        showAvatars={false}
                        textClasses="text-xs leading-3"
                    />
                </div>
            </div>
            <HeaderActions showPopoutButton={showPopoutButton} />
        </header>
    );
}

interface ChatHeaderExpandedProps {
    introHeading: string;
    introBody: string;
    avatarUrl?: string;
    showPopoutButton?: boolean;
}

export function ChatHeaderExpanded({
    introHeading,
    introBody,
    avatarUrl = '',
    showPopoutButton = false,
}: ChatHeaderExpandedProps) {
    return (
        <header className="header-expanded pt-6 pb-4 px-5 relative box-border w-full bg-transparent">
            <div className={`flex items-start ${avatarUrl ? 'justify-between' : 'justify-end'}`}>
                {avatarUrl ? <img className="h-12 rounded-full" src={avatarUrl} alt="Avatar" /> : null}
                <HeaderActions showPopoutButton={showPopoutButton} showEndConversationButton={false} />
            </div>
            <h2
                className="mt-4 text-2xl mb-1.5 font-medium text-n-slate-12 line-clamp-4"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(introHeading) }}
            />
            <p
                className="text-lg leading-normal text-n-slate-11 [&_a]:underline line-clamp-6"
                dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(new MessageFormatter(introBody).formattedMessage),
                }}
            />
        </header>
    );
}
