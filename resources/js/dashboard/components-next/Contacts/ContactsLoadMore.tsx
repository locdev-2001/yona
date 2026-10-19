import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';

// Port từ dashboard/components-next/Contacts/ContactsLoadMore.vue.
interface ContactsLoadMoreProps {
    isLoading?: boolean;
    onLoadMore: () => void;
}

export default function ContactsLoadMore({ isLoading = false, onLoadMore }: ContactsLoadMoreProps) {
    return (
        <div className="flex justify-center py-4">
            <Button
                label={t('CONTACTS_LAYOUT.LOAD_MORE')}
                isLoading={isLoading}
                variant="faded"
                color="slate"
                size="sm"
                onClick={onLoadMore}
            />
        </div>
    );
}
