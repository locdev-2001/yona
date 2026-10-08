import { t } from '../../../../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import ComboBox from 'dashboard/components-next/combobox/ComboBox';
import type { ComboBoxOption } from 'dashboard/components-next/combobox/ComboBox';
import type { Contact } from 'dashboard/contacts/types';

// Port từ components-next/Contacts/ContactsForm/ContactMergeForm.vue.
interface ContactMergeFormProps {
    selectedContact: Contact;
    primaryContactId?: number | null;
    primaryContactList?: ComboBoxOption[];
    isSearching?: boolean;
    hasError?: boolean;
    errorMessage?: string;
    onChangePrimaryContact: (value: number) => void;
    onSearch: (query: string) => void;
}

export default function ContactMergeForm({
    selectedContact,
    primaryContactId = null,
    primaryContactList = [],
    isSearching = false,
    hasError = false,
    errorMessage = '',
    onChangePrimaryContact,
    onSearch,
}: ContactMergeFormProps) {
    return (
        <div className="flex flex-col">
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between h-5 gap-2">
                    <label className="text-sm text-n-slate-12">
                        {t('CONTACTS_LAYOUT.SIDEBAR.MERGE.PRIMARY')}
                    </label>
                    <span className="flex items-center justify-center w-24 h-5 text-xs rounded-md text-n-teal-11 bg-n-alpha-2">
                        {t('CONTACTS_LAYOUT.SIDEBAR.MERGE.PRIMARY_HELP_LABEL')}
                    </span>
                </div>
                <ComboBox
                    useApiResults
                    value={primaryContactId ? String(primaryContactId) : ''}
                    options={primaryContactList}
                    emptyState={
                        isSearching
                            ? t('CONTACTS_LAYOUT.SIDEBAR.MERGE.IS_SEARCHING')
                            : t('CONTACTS_LAYOUT.SIDEBAR.MERGE.EMPTY_STATE')
                    }
                    searchPlaceholder={t('CONTACTS_LAYOUT.SIDEBAR.MERGE.SEARCH_PLACEHOLDER')}
                    placeholder={t('CONTACTS_LAYOUT.SIDEBAR.MERGE.PLACEHOLDER')}
                    hasError={hasError}
                    message={errorMessage}
                    className="[&>div>button]:bg-n-alpha-black2"
                    onChange={value => onChangePrimaryContact(Number(value))}
                    onSearch={onSearch}
                />
            </div>
            <div className="relative flex justify-center gap-2 top-4">
                {[0, 1, 2].map(index => (
                    <div key={index} className="relative w-4 h-8">
                        <div className="absolute w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-n-strong ltr:translate-x-[4px] rtl:-translate-x-[4px] -translate-y-[4px]" />
                        <div className="absolute w-[1px] h-full bg-n-strong left-1/2 transform -translate-x-1/2" />
                    </div>
                ))}
            </div>
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between h-5 gap-2">
                    <label className="text-sm text-n-slate-12">{t('CONTACTS_LAYOUT.SIDEBAR.MERGE.PARENT')}</label>
                    <span className="flex items-center justify-center w-24 h-5 text-xs rounded-md text-n-ruby-11 bg-n-alpha-2">
                        {t('CONTACTS_LAYOUT.SIDEBAR.MERGE.PARENT_HELP_LABEL')}
                    </span>
                </div>
                <div className="border border-n-strong h-[60px] gap-2 flex items-center rounded-xl p-3">
                    <Avatar
                        seed={avatarSeed('contact', selectedContact.id)}
                        name={selectedContact.name || ''}
                        src={selectedContact.thumbnail || ''}
                        size={32}
                        roundedFull
                    />
                    <div className="flex flex-col w-full min-w-0 gap-1">
                        <span className="text-sm leading-4 truncate text-n-slate-11">{selectedContact.name}</span>
                        <span className="text-sm leading-4 truncate text-n-slate-11">{selectedContact.email}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
