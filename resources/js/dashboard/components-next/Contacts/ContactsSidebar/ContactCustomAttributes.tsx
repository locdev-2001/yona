import { t } from '../../../../i18n';
import type { Contact } from 'dashboard/contacts/types';

// Port từ dashboard/components-next/Contacts/ContactsSidebar/ContactCustomAttributes.vue
// — phần B2: account chưa có custom attribute definition (attributes store E1)
// nên hasContactAttributes luôn false → nhánh else của bản gốc (empty state).
// Danh sách used/unused + search + ContactCustomAttributeItem port ở E1.
interface ContactCustomAttributesProps {
    selectedContact?: Contact | null;
}

export default function ContactCustomAttributes(_props: ContactCustomAttributesProps) {
    return (
        <p className="px-6 py-10 text-sm leading-6 text-center text-n-slate-11">
            {t('CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.EMPTY_STATE')}
        </p>
    );
}
