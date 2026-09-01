import { t } from '../../../../i18n';
import RadioCard from 'dashboard/components-next/radioCard/RadioCard';

// Port từ settings/inbox/components/LockToSingleConversationPreview.vue
interface LockToSingleConversationPreviewProps {
    lockToSingleConversation: boolean;
    onUpdate: (value: boolean) => void;
}

export default function LockToSingleConversationPreview({
    lockToSingleConversation,
    onUpdate,
}: LockToSingleConversationPreviewProps) {
    return (
        <div className="flex flex-col sm:flex-row items-start gap-4 mt-3 min-w-0">
            <RadioCard
                id="disabled"
                label={t('INBOX_MGMT.EDIT.LOCK_TO_SINGLE_CONVERSATION.DISABLED')}
                description={t('INBOX_MGMT.EDIT.LOCK_TO_SINGLE_CONVERSATION.DISABLED_DESCRIPTION')}
                isActive={!lockToSingleConversation}
                className="flex-1"
                onSelect={() => onUpdate(false)}
            />
            <RadioCard
                id="enabled"
                label={t('INBOX_MGMT.EDIT.LOCK_TO_SINGLE_CONVERSATION.ENABLED')}
                description={t('INBOX_MGMT.EDIT.LOCK_TO_SINGLE_CONVERSATION.ENABLED_DESCRIPTION')}
                isActive={lockToSingleConversation}
                className="flex-1"
                onSelect={() => onUpdate(true)}
            />
        </div>
    );
}
