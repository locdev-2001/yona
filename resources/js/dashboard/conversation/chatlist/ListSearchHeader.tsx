import type { ReactNode } from 'react';

import { t } from '../../../i18n';
import type { Conversation } from '../types';
import ContactMatchItem from './ContactMatchItem';

function SectionHeading({ children }: { children: ReactNode }) {
    return <h3 className="px-5 pt-3 pb-1 my-0 text-xs font-semibold text-n-slate-11">{children}</h3>;
}

interface ListSearchHeaderProps {
    contacts: Conversation[];
    hasConversationMatches: boolean;
    conversationType?: string;
}

// Phần đầu vùng cuộn khi đang tìm: mục "Liên hệ" rồi tiêu đề mục "Hội thoại" (các
// thẻ hội thoại nối ngay sau). Mục rỗng thì ẩn cả tiêu đề.
export default function ListSearchHeader({ contacts, hasConversationMatches, conversationType = '' }: ListSearchHeaderProps) {
    return (
        <>
            {contacts.length > 0 ? (
                <section aria-label={t('CHAT_LIST.SEARCH.CONTACTS_HEADING')}>
                    <SectionHeading>{t('CHAT_LIST.SEARCH.CONTACTS_HEADING')}</SectionHeading>
                    <div className="flex flex-col gap-0.5 px-2">
                        {contacts.map(conversation => (
                            <ContactMatchItem key={conversation.id} conversation={conversation} conversationType={conversationType} />
                        ))}
                    </div>
                </section>
            ) : null}
            {hasConversationMatches ? <SectionHeading>{t('CHAT_LIST.SEARCH.CONVERSATIONS_HEADING')}</SectionHeading> : null}
        </>
    );
}
