import { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { picoSearch } from '@ext/pico-search';

import Button from 'dashboard/components-next/button/Button';
import TabBar from 'dashboard/components-next/tabbar/TabBar';
import AttributeListItem from 'dashboard/components-next/ConversationWorkflow/AttributeListItem';
import type { AttributeBadgeType } from 'dashboard/components-next/CustomAttributes/AttributeBadge';
import Modal from 'dashboard/components/Modal';
import ConfirmDeleteModal from 'dashboard/components/widgets/modal/ConfirmDeleteModal';
import { useAlert } from 'dashboard/composables/useAlert';
import {
    deleteCustomAttribute,
    useCustomAttributes,
    useCustomAttributeUiFlags,
} from 'dashboard/composables/useCustomAttributes';
import type { CustomAttributeDefinition } from 'dashboard/composables/useCustomAttributes';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { t } from '../../../i18n';
import Dashboard from '../../Dashboard';
import type { DashboardPageProps } from '../../types';
import BaseSettingsHeader from '../BaseSettingsHeader';
import SettingsLayout from '../SettingsLayout';
import SettingsWrapper from '../SettingsWrapper';
import AddAttribute from './AddAttribute';
import EditAttribute from './EditAttribute';
import { ATTRIBUTE_MODEL_NAMES } from './constants';

// Port từ routes/dashboard/settings/attributes/Index.vue.
interface DerivedAttribute extends CustomAttributeDefinition {
    label: string;
    type: string;
    badges: { type: AttributeBadgeType }[];
}

export default function AttributesIndex() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;

    const records = useCustomAttributes(accountId);
    const uiFlags = useCustomAttributeUiFlags();

    const [selectedTabIndex, setSelectedTabIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddPopup, setShowAddPopup] = useState(false);
    const [attributeToEdit, setAttributeToEdit] = useState<CustomAttributeDefinition | null>(null);
    const [attributeToDelete, setAttributeToDelete] = useState<CustomAttributeDefinition | null>(null);

    const attributeModel = ATTRIBUTE_MODEL_NAMES[selectedTabIndex] || 'conversation_attribute';
    const attributes = records.filter(record => record.attribute_model === attributeModel);

    // buildBadges của gốc cần hai nguồn bản port chưa có: `pre_chat_form_options`
    // của từng inbox (prop sidebar chỉ share id/name/channel_type) và
    // `settings.conversation_required_attributes` (thuộc tính bắt buộc khi resolve,
    // tính năng trả phí chưa port — xem settings/conversationWorkflow/Index.tsx).
    // Danh sách huy hiệu vì vậy luôn rỗng; AttributeBadge đã sẵn sàng cho lúc có dữ liệu.
    const derivedAttributes: DerivedAttribute[] = attributes.map(attribute => ({
        ...attribute,
        label: attribute.attribute_display_name,
        type: attribute.attribute_display_type,
        badges: [],
    }));

    const query = searchQuery.trim();
    const filteredAttributes = query
        ? picoSearch(derivedAttributes, query, ['attribute_display_name', 'attribute_description'])
        : derivedAttributes;

    const confirmDeleteAttribute = async () => {
        if (!attributeToDelete) return;
        try {
            await deleteCustomAttribute(accountId, attributeToDelete.id);
            useAlert(t('ATTRIBUTES_MGMT.DELETE.API.SUCCESS_MESSAGE'));
            setAttributeToDelete(null);
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('ATTRIBUTES_MGMT.DELETE.API.ERROR_MESSAGE'));
        }
    };

    return (
        <Dashboard>
            <SettingsWrapper>
                <SettingsLayout
                    isLoading={uiFlags.isFetching}
                    loadingMessage={t('ATTRIBUTES_MGMT.LOADING')}
                    header={
                        <BaseSettingsHeader
                            title={t('ATTRIBUTES_MGMT.HEADER')}
                            description={t('ATTRIBUTES_MGMT.DESCRIPTION')}
                            linkText={t('ATTRIBUTES_MGMT.LEARN_MORE')}
                            searchPlaceholder={t('ATTRIBUTES_MGMT.SEARCH_PLACEHOLDER')}
                            searchQuery={searchQuery}
                            onSearchQueryChange={setSearchQuery}
                            featureName="custom_attributes"
                            count={
                                attributes.length ? (
                                    <span className="text-body-main text-n-slate-11 truncate min-w-0">
                                        {t('ATTRIBUTES_MGMT.COUNT', { n: attributes.length })}
                                    </span>
                                ) : null
                            }
                            tabs={
                                <TabBar
                                    tabs={[
                                        { label: t('ATTRIBUTES_MGMT.TABS.CONVERSATION'), value: '0' },
                                        { label: t('ATTRIBUTES_MGMT.TABS.CONTACT'), value: '1' },
                                    ]}
                                    initialActiveTab={selectedTabIndex}
                                    onTabChanged={tab => {
                                        setSelectedTabIndex(Number(tab.value));
                                        setSearchQuery('');
                                    }}
                                />
                            }
                            actions={
                                <Button
                                    label={t('ATTRIBUTES_MGMT.HEADER_BTN_TXT')}
                                    size="sm"
                                    onClick={() => setShowAddPopup(true)}
                                />
                            }
                        />
                    }
                    body={
                        <div className="flex flex-col gap-4">
                            {!filteredAttributes.length && searchQuery ? (
                                <span className="flex-1 flex items-center justify-center py-20 text-center text-body-main !text-base text-n-slate-11">
                                    {t('ATTRIBUTES_MGMT.NO_RESULTS')}
                                </span>
                            ) : filteredAttributes.length ? (
                                <div className="flex flex-col divide-y divide-n-weak border-t border-n-weak">
                                    {filteredAttributes.map(attribute => (
                                        <AttributeListItem
                                            key={attribute.id}
                                            attribute={attribute}
                                            badges={attribute.badges}
                                            onEdit={() => setAttributeToEdit(attribute)}
                                            onDelete={() => setAttributeToDelete(attribute)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="flex-1 py-20 text-n-slate-12 flex items-center justify-center text-base">
                                    {t('ATTRIBUTES_MGMT.LIST.EMPTY_RESULT.404')}
                                </p>
                            )}
                        </div>
                    }
                >
                    {showAddPopup ? (
                        <AddAttribute
                            show={showAddPopup}
                            accountId={accountId}
                            selectedAttributeModelTab={selectedTabIndex}
                            onClose={() => setShowAddPopup(false)}
                        />
                    ) : null}
                    <Modal show={Boolean(attributeToEdit)} onClose={() => setAttributeToEdit(null)}>
                        {attributeToEdit ? (
                            <EditAttribute
                                accountId={accountId}
                                selectedAttribute={attributeToEdit}
                                isUpdating={uiFlags.isUpdating}
                                onClose={() => setAttributeToEdit(null)}
                            />
                        ) : null}
                    </Modal>
                    {attributeToDelete ? (
                        <ConfirmDeleteModal
                            show
                            title={t('ATTRIBUTES_MGMT.DELETE.CONFIRM.TITLE', {
                                attributeName: attributeToDelete.attribute_display_name,
                            })}
                            message={t('ATTRIBUTES_MGMT.DELETE.CONFIRM.MESSAGE')}
                            confirmText={`${t('ATTRIBUTES_MGMT.DELETE.CONFIRM.YES')} ${attributeToDelete.attribute_display_name}`}
                            rejectText={t('ATTRIBUTES_MGMT.DELETE.CONFIRM.NO')}
                            confirmValue={attributeToDelete.attribute_display_name}
                            confirmPlaceHolderText={t('ATTRIBUTES_MGMT.DELETE.CONFIRM.PLACE_HOLDER', {
                                attributeName: attributeToDelete.attribute_display_name,
                            })}
                            onConfirm={confirmDeleteAttribute}
                            onClose={() => setAttributeToDelete(null)}
                        />
                    ) : null}
                </SettingsLayout>
            </SettingsWrapper>
        </Dashboard>
    );
}
