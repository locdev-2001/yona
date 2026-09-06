import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { ApiError, parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { createContact, exportContacts, importContacts } from 'dashboard/contacts/api';
import ContactHeader from 'dashboard/components-next/Contacts/ContactsHeader/ContactHeader';
import type { SortState } from './components/ContactSortMenu';
import CreateNewContactDialog from 'dashboard/components-next/Contacts/ContactsForm/CreateNewContactDialog';
import ContactImportDialog from 'dashboard/components-next/Contacts/ContactsForm/ContactImportDialog';
import ContactExportDialog from 'dashboard/components-next/Contacts/ContactsForm/ContactExportDialog';
import type { ContactExportQuery } from 'dashboard/components-next/Contacts/ContactsForm/ContactExportDialog';
import type { CreateNewContactDialogHandle } from 'dashboard/components-next/Contacts/ContactsForm/CreateNewContactDialog';
import CreateSegmentDialog from 'dashboard/components-next/Contacts/ContactsForm/CreateSegmentDialog';
import DeleteSegmentDialog from 'dashboard/components-next/Contacts/ContactsForm/DeleteSegmentDialog';
import ContactsFilter, { DEFAULT_CONTACT_FILTER } from 'dashboard/components-next/filter/ContactsFilter';
import { useContactFilterContext } from 'dashboard/components-next/filter/contactProvider';
import { buildConversationFilterPayload, conditionsFromPayload } from 'dashboard/components-next/filter/helper/filterQuery';
import type { ConversationFilterCondition } from 'dashboard/components-next/filter/helper/filterHelper';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { createCustomView, deleteCustomView, updateCustomView } from 'dashboard/composables/useCustomViews';
import type { CustomView } from 'dashboard/composables/useCustomViews';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import type { Contact, ContactFormState } from 'dashboard/contacts/types';
import type { DashboardPageProps } from '../../../types';

// Port từ dashboard/components-next/Contacts/ContactsHeader/ContactListHeaderWrapper.vue.
interface ContactListHeaderWrapperProps {
    showSearch?: boolean;
    searchValue?: string;
    activeSort?: string;
    activeOrdering?: string;
    headerTitle?: string;
    isLabelView?: boolean;
    isActiveView?: boolean;
    segmentsId?: number;
    activeSegment?: CustomView | null;
    appliedFilters?: ConversationFilterCondition[];
    activeLabel?: string;
    onUpdateSort: (state: SortState) => void;
    onSearch: (value: string) => void;
    onContactCreated: (contact: Contact) => void;
    onApplyFilter?: (filters: ConversationFilterCondition[]) => void;
    onClearFilters?: () => void;
}

// DuplicateContactException của bản gốc: 422 có attributes chứa cột trùng.
function alertContactCreationError(error: unknown) {
    const i18nPrefix = 'CONTACTS_LAYOUT.HEADER.ACTIONS.CONTACT_CREATION';

    if (error instanceof ApiError && error.status === 422) {
        const attributes = (error.body as { attributes?: string[] } | null)?.attributes ?? [];

        if (attributes.includes('email')) {
            useAlert(t(`${i18nPrefix}.EMAIL_ADDRESS_DUPLICATE`));
            return;
        }
        if (attributes.includes('phone_number')) {
            useAlert(t(`${i18nPrefix}.PHONE_NUMBER_DUPLICATE`));
            return;
        }
        if (error.body?.message) {
            useAlert(error.body.message);
            return;
        }
    }
    useAlert(t(`${i18nPrefix}.ERROR_MESSAGE`));
}

export interface ContactListHeaderWrapperHandle {
    openCreateNewContactDialog: () => void;
    onToggleFilters: () => void;
}

const ContactListHeaderWrapper = forwardRef<ContactListHeaderWrapperHandle, ContactListHeaderWrapperProps>(
    function ContactListHeaderWrapper(
        {
            showSearch = true,
            searchValue = '',
            activeSort = 'last_activity_at',
            activeOrdering = '',
            headerTitle = '',
            isLabelView = false,
            isActiveView = false,
            segmentsId = 0,
            activeSegment = null,
            appliedFilters = [],
            activeLabel = '',
            onUpdateSort,
            onSearch,
            onContactCreated,
            onApplyFilter,
            onClearFilters,
        },
        ref,
    ) {
        const { currentAccount } = usePage<DashboardPageProps>().props;
        const accountId = currentAccount.id;
        const createNewContactDialogRef = useRef<CreateNewContactDialogHandle>(null);
        const contactImportDialogRef = useRef<DialogHandle>(null);
        const contactExportDialogRef = useRef<DialogHandle>(null);
        const createSegmentDialogRef = useRef<DialogHandle>(null);
        const deleteSegmentDialogRef = useRef<DialogHandle>(null);
        const [isCreating, setCreating] = useState(false);
        const [isImporting, setImporting] = useState(false);
        const [isExporting, setExporting] = useState(false);
        const [showFiltersModal, setShowFiltersModal] = useState(false);
        const [draftFilters, setDraftFilters] = useState<ConversationFilterCondition[]>([]);
        const attributeFilterTypes = useContactFilterContext();

        const hasActiveSegments = Boolean(activeSegment && segmentsId !== 0);
        const hasAppliedFilters = appliedFilters.length > 0;

        useImperativeHandle(ref, () => ({
            openCreateNewContactDialog: () => createNewContactDialogRef.current?.open(),
            onToggleFilters: () => onToggleFilters(),
        }));

        const onToggleFilters = () => {
            if (showFiltersModal) {
                setShowFiltersModal(false);
                return;
            }
            if (hasActiveSegments) {
                setDraftFilters(conditionsFromPayload(activeSegment?.query?.payload ?? [], attributeFilterTypes));
            } else {
                setDraftFilters(
                    hasAppliedFilters
                        ? appliedFilters.map(filter => ({ ...filter }))
                        : [{ ...DEFAULT_CONTACT_FILTER }],
                );
            }
            setShowFiltersModal(true);
        };

        const onImport = async (file: File) => {
            setImporting(true);
            try {
                await importContacts(accountId, file);
                useAlert(t('CONTACTS_LAYOUT.HEADER.ACTIONS.IMPORT_CONTACT.SUCCESS_MESSAGE'));
            } catch (error) {
                useAlert(
                    parseApiErrorMessage(error) ??
                        t('CONTACTS_LAYOUT.HEADER.ACTIONS.IMPORT_CONTACT.ERROR_MESSAGE'),
                );
            } finally {
                setImporting(false);
            }
        };

        const onExport = async (query: ContactExportQuery) => {
            setExporting(true);
            try {
                await exportContacts(accountId, query);
                useAlert(t('CONTACTS_LAYOUT.HEADER.ACTIONS.EXPORT_CONTACT.SUCCESS_MESSAGE'));
            } catch (error) {
                useAlert(
                    parseApiErrorMessage(error) ??
                        t('CONTACTS_LAYOUT.HEADER.ACTIONS.EXPORT_CONTACT.ERROR_MESSAGE'),
                );
            } finally {
                setExporting(false);
            }
        };

        const onCreateSegment = async (name: string) => {
            try {
                const created = await createCustomView(accountId, {
                    name,
                    filter_type: 1,
                    query: { payload: buildConversationFilterPayload(appliedFilters) },
                });
                createSegmentDialogRef.current?.close();
                useAlert(t('CONTACTS_LAYOUT.HEADER.ACTIONS.FILTERS.CREATE_SEGMENT.SUCCESS_MESSAGE'));
                window.location.assign(accountScopedUrl(accountId, `contacts/segments/${created.id}`));
            } catch {
                useAlert(t('CONTACTS_LAYOUT.HEADER.ACTIONS.FILTERS.CREATE_SEGMENT.ERROR_MESSAGE'));
            }
        };

        const onDeleteSegment = async () => {
            try {
                await deleteCustomView(accountId, segmentsId, 'contact');
                deleteSegmentDialogRef.current?.close();
                useAlert(t('CONTACTS_LAYOUT.HEADER.ACTIONS.FILTERS.DELETE_SEGMENT.SUCCESS_MESSAGE'));
                window.location.assign(accountScopedUrl(accountId, 'contacts'));
            } catch {
                useAlert(t('CONTACTS_LAYOUT.HEADER.ACTIONS.FILTERS.DELETE_SEGMENT.ERROR_MESSAGE'));
            }
        };

        const onUpdateSegment = async (filters: ConversationFilterCondition[], segmentName: string) => {
            if (!activeSegment) return;
            await updateCustomView(accountId, activeSegment.id, {
                name: segmentName,
                filter_type: 1,
                query: { payload: buildConversationFilterPayload(filters) },
            });
            setShowFiltersModal(false);
            window.location.reload();
        };

        const onCreate = async (contact: ContactFormState) => {
            setCreating(true);
            try {
                const created = await createContact(currentAccount.id, contact as unknown as Record<string, unknown>);
                createNewContactDialogRef.current?.onSuccess();
                useAlert(t('CONTACTS_LAYOUT.HEADER.ACTIONS.CONTACT_CREATION.SUCCESS_MESSAGE'));
                onContactCreated(created);
            } catch (error) {
                alertContactCreationError(error);
            } finally {
                setCreating(false);
            }
        };

        return (
            <>
                <ContactHeader
                    showSearch={showSearch}
                    searchValue={searchValue}
                    activeSort={activeSort}
                    activeOrdering={activeOrdering}
                    headerTitle={headerTitle}
                    isLabelView={isLabelView}
                    isActiveView={isActiveView}
                    isSegmentsView={hasActiveSegments}
                    hasActiveFilters={hasAppliedFilters}
                    buttonLabel={t('CONTACTS_LAYOUT.HEADER.MESSAGE_BUTTON')}
                    onSearch={onSearch}
                    onUpdateSort={onUpdateSort}
                    onAdd={() => createNewContactDialogRef.current?.open()}
                    onImport={() => contactImportDialogRef.current?.open()}
                    onExport={() => contactExportDialogRef.current?.open()}
                    onFilter={onToggleFilters}
                    onCreateSegment={() => createSegmentDialogRef.current?.open()}
                    onDeleteSegment={() => deleteSegmentDialogRef.current?.open()}
                    filterSlot={
                        <div className="absolute mt-1 ltr:-right-52 rtl:-left-52 sm:ltr:right-0 sm:rtl:left-0 top-full">
                            {showFiltersModal ? (
                                <ContactsFilter
                                    filters={draftFilters}
                                    attributeFilterTypes={attributeFilterTypes}
                                    isSegmentView={hasActiveSegments}
                                    segmentName={activeSegment?.name ?? ''}
                                    onChange={setDraftFilters}
                                    onApplyFilter={filters => {
                                        onApplyFilter?.(filters);
                                        setShowFiltersModal(false);
                                    }}
                                    onUpdateSegment={onUpdateSegment}
                                    onClearFilters={() => onClearFilters?.()}
                                    onClose={() => setShowFiltersModal(false)}
                                />
                            ) : null}
                        </div>
                    }
                />

                <CreateNewContactDialog ref={createNewContactDialogRef} isCreating={isCreating} onCreate={onCreate} />
                <ContactImportDialog
                    ref={contactImportDialogRef}
                    accountId={accountId}
                    isImporting={isImporting}
                    onImport={onImport}
                />
                <ContactExportDialog
                    ref={contactExportDialogRef}
                    activeSegment={hasActiveSegments ? activeSegment : null}
                    appliedFilters={appliedFilters}
                    activeLabel={activeLabel}
                    isExporting={isExporting}
                    onExport={onExport}
                />
                <CreateSegmentDialog ref={createSegmentDialogRef} onCreate={onCreateSegment} />
                <DeleteSegmentDialog ref={deleteSegmentDialogRef} onDelete={onDeleteSegment} />
            </>
        );
    },
);

export default ContactListHeaderWrapper;
