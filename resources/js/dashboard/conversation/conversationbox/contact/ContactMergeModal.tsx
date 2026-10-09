import { useState } from 'react';
import type { ReactNode } from 'react';
import { usePage } from '@inertiajs/react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import NextButton from 'dashboard/components-next/button/Button';
import ComboBox from 'dashboard/components-next/combobox/ComboBox';
import Popover from 'dashboard/components-next/popover/Popover';
import { useAlert } from 'dashboard/composables/useAlert';
import { getJson } from 'dashboard/helper/apiClient';
import { mergeContacts } from 'dashboard/conversation/panelApi';
import type { ContactMeta } from 'dashboard/conversation/types';
import { t } from '../../../../i18n';
import type { DashboardPageProps } from '../../../types';

// Port từ modules/contact/ContactMergeModal.vue + MergeContact.vue +
// ContactMergeForm.vue + MergeContactSummary.vue — popover chọn contact chính
// (GET /contacts/search của B2), tóm tắt hợp nhất, validate. Nút Merge gọi thật
// POST /actions/contact_merge — base = contact được chọn (giữ lại), mergee =
// contact đang mở (bị gộp rồi xóa). Khác biệt: danh sách hội thoại chỉ theo kịp
// khi có handler realtime `contact.merged` (ghi nợ).
interface ContactMergeModalProps {
    primaryContact: ContactMeta;
    onClose?: () => void;
    onMerged?: (contact: ContactMeta) => void;
    trigger: (context: { isOpen: boolean }) => ReactNode;
}

interface SearchedContact {
    id: number;
    name: string | null;
    email?: string | null;
    phone_number?: string | null;
    thumbnail?: string;
}

export default function ContactMergeModal({
    primaryContact,
    onClose,
    onMerged,
    trigger,
}: ContactMergeModalProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const [searchResults, setSearchResults] = useState<SearchedContact[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isMerging, setIsMerging] = useState(false);
    const [parentContactId, setParentContactId] = useState<string>('');
    const [showError, setShowError] = useState(false);

    const onContactSearch = async (query: string) => {
        if (!query.trim()) return;
        setIsSearching(true);
        setSearchResults([]);
        try {
            const response = await getJson<{ payload?: SearchedContact[] }>(
                `/api/v1/accounts/${currentAccount.id}/contacts/search?q=${encodeURIComponent(query)}&page=1`,
            );
            setSearchResults((response.payload ?? []).filter(contact => contact.id !== primaryContact.id));
        } catch {
            useAlert(t('MERGE_CONTACTS.SEARCH.ERROR_MESSAGE'));
        } finally {
            setIsSearching(false);
        }
    };

    const parentContact = searchResults.find(contact => String(contact.id) === parentContactId) ?? null;
    const parentContactName = parentContact?.name ?? '';

    const onSubmit = async (hide: () => void) => {
        setShowError(true);
        if (!parentContactId || isMerging) return;

        setIsMerging(true);
        try {
            const mergedContact = await mergeContacts(
                currentAccount.id,
                Number(parentContactId),
                primaryContact.id,
            );
            useAlert(t('MERGE_CONTACTS.FORM.SUCCESS_MESSAGE'));
            onMerged?.(mergedContact);
            hide();
        } catch {
            useAlert(t('MERGE_CONTACTS.FORM.ERROR_MESSAGE'));
        } finally {
            setIsMerging(false);
        }
    };

    const reset = () => {
        setSearchResults([]);
        setParentContactId('');
        setShowError(false);
        setIsMerging(false);
        onClose?.();
    };

    return (
        <Popover
            onHide={reset}
            trigger={trigger}
            content={({ hide }) => (
                <div className="w-full md:w-96 p-6 flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <h3 className="text-base font-medium leading-6 text-n-slate-12">{t('MERGE_CONTACTS.TITLE')}</h3>
                        <p className="mb-0 text-sm text-n-slate-11">{t('MERGE_CONTACTS.DESCRIPTION')}</p>
                    </div>
                    <form
                        onSubmit={event => {
                            event.preventDefault();
                            void onSubmit(hide);
                        }}
                    >
                        <div className="flex flex-col">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between h-5 gap-2">
                                    <label className="text-sm text-n-slate-12">{t('CONTACTS_LAYOUT.SIDEBAR.MERGE.PRIMARY')}</label>
                                    <span className="flex items-center justify-center w-24 h-5 text-xs rounded-md text-n-teal-11 bg-n-alpha-2">
                                        {t('CONTACTS_LAYOUT.SIDEBAR.MERGE.PRIMARY_HELP_LABEL')}
                                    </span>
                                </div>
                                <ComboBox
                                    useApiResults
                                    value={parentContactId}
                                    options={searchResults.map(contact => ({
                                        value: String(contact.id),
                                        label: contact.name ?? '',
                                    }))}
                                    emptyState={
                                        isSearching
                                            ? t('CONTACTS_LAYOUT.SIDEBAR.MERGE.IS_SEARCHING')
                                            : t('CONTACTS_LAYOUT.SIDEBAR.MERGE.EMPTY_STATE')
                                    }
                                    searchPlaceholder={t('CONTACTS_LAYOUT.SIDEBAR.MERGE.SEARCH_PLACEHOLDER')}
                                    placeholder={t('CONTACTS_LAYOUT.SIDEBAR.MERGE.PLACEHOLDER')}
                                    hasError={showError && !parentContactId}
                                    message={showError && !parentContactId ? t('MERGE_CONTACTS.FORM.CHILD_CONTACT.ERROR') : ''}
                                    className="[&>div>button]:bg-n-alpha-black2"
                                    onChange={setParentContactId}
                                    onSearch={query => void onContactSearch(query)}
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
                                <div className="bg-n-surface-field h-[60px] gap-2 flex items-center rounded-xl p-3">
                                    <Avatar seed={avatarSeed('contact', primaryContact.id)} name={primaryContact.name || ''} src={primaryContact.thumbnail || ''} size={32} roundedFull />
                                    <div className="flex flex-col w-full min-w-0 gap-1">
                                        <span className="text-sm leading-4 truncate text-n-slate-11">{primaryContact.name}</span>
                                        <span className="text-sm leading-4 truncate text-n-slate-11">{primaryContact.email}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {parentContactName ? (
                            <div className="my-4 relative p-2.5 rounded-[4px] text-n-slate-12 bg-n-surface-field">
                                <h5 className="text-base font-medium text-n-slate-12">{t('MERGE_CONTACTS.SUMMARY.TITLE')}</h5>
                                <ul className="ml-0 list-none">
                                    <li>
                                        <span className="inline-block mr-1">❌</span>
                                        <span
                                            dangerouslySetInnerHTML={{
                                                __html: t('MERGE_CONTACTS.SUMMARY.DELETE_WARNING', {
                                                    primaryContactName: primaryContact.name ?? '',
                                                }),
                                            }}
                                        />
                                    </li>
                                    <li>
                                        <span className="inline-block mr-1">✅</span>
                                        <span
                                            dangerouslySetInnerHTML={{
                                                __html: t('MERGE_CONTACTS.SUMMARY.ATTRIBUTE_WARNING', {
                                                    primaryContactName: primaryContact.name ?? '',
                                                    parentContactName,
                                                }),
                                            }}
                                        />
                                    </li>
                                </ul>
                            </div>
                        ) : null}
                        <div className="flex justify-end gap-2 mt-6">
                            <NextButton faded slate type="reset" label={t('MERGE_CONTACTS.FORM.CANCEL')} onClick={() => hide()} />
                            <NextButton type="submit" isLoading={isMerging} label={t('MERGE_CONTACTS.FORM.SUBMIT')} />
                        </div>
                    </form>
                </div>
            )}
        />
    );
}
