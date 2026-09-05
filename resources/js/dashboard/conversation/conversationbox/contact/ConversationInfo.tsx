import { t } from '../../../../i18n';
import ContactDetailsItem from './ContactDetailsItem';
import CustomAttributes from './CustomAttributes';
import { buildConversationInfoElements } from './conversationInfoAttributes';

// Port từ routes/dashboard/conversation/ConversationInfo.vue.
interface ConversationInfoProps {
    conversationAttributes: Record<string, unknown>;
    contactAttributes: Record<string, unknown>;
}

export default function ConversationInfo({ conversationAttributes, contactAttributes }: ConversationInfoProps) {
    const staticElements = buildConversationInfoElements(conversationAttributes, contactAttributes);

    return (
        <div className="conversation--details">
            <CustomAttributes
                attributeType="conversation_attribute"
                attributeFrom="conversation_panel"
                staticElements={staticElements}
                renderStaticItem={element => (
                    <ContactDetailsItem title={t(element.title)} value={element.content}>
                        {element.key === 'static-referer' ? (
                            <a
                                href={element.content}
                                rel="noopener noreferrer nofollow"
                                target="_blank"
                                className="text-n-brand"
                            >
                                {element.content}
                            </a>
                        ) : undefined}
                    </ContactDetailsItem>
                )}
            />
        </div>
    );
}
