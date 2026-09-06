import { useMemo } from 'react';
import { usePage } from '@inertiajs/react';

import { useCamelCustomAttributes } from 'dashboard/composables/useCustomAttributes';
import { useLabelsList } from 'dashboard/composables/useLabelsList';
import type { DashboardPageProps } from 'dashboard/types';
import countries from 'shared/constants/countries';
import { t } from '../../../i18n';
import { groupFilterTypes } from './helper/filterAttributeIcons';
import { buildAttributesFilterTypes, CONTACT_ATTRIBUTES } from './helper/filterHelper';
import type { FilterSelectOption, FilterType } from './helper/filterHelper';
import { containmentOperators, dateOperators, equalityOperators, getOperatorTypes } from './operators';

// Port từ components-next/filter/contactProvider.js (useContactFilterContext).
export function useContactFilterContext(): (FilterType | FilterSelectOption)[] {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const labels = useLabelsList(accountId);
    const contactAttributes = useCamelCustomAttributes(accountId, 'contact_attribute');

    return useMemo(() => {
        const filterTypes: FilterType[] = [
            {
                attributeKey: CONTACT_ATTRIBUTES.NAME,
                value: CONTACT_ATTRIBUTES.NAME,
                attributeName: t('CONTACTS_LAYOUT.FILTER.NAME'),
                label: t('CONTACTS_LAYOUT.FILTER.NAME'),
                inputType: 'plainText',
                dataType: 'text',
                filterOperators: equalityOperators,
                attributeModel: 'standard',
            },
            {
                attributeKey: CONTACT_ATTRIBUTES.EMAIL,
                value: CONTACT_ATTRIBUTES.EMAIL,
                attributeName: t('CONTACTS_LAYOUT.FILTER.EMAIL'),
                label: t('CONTACTS_LAYOUT.FILTER.EMAIL'),
                inputType: 'plainText',
                dataType: 'text',
                filterOperators: containmentOperators,
                attributeModel: 'standard',
            },
            {
                attributeKey: CONTACT_ATTRIBUTES.PHONE_NUMBER,
                value: CONTACT_ATTRIBUTES.PHONE_NUMBER,
                attributeName: t('CONTACTS_LAYOUT.FILTER.PHONE_NUMBER'),
                label: t('CONTACTS_LAYOUT.FILTER.PHONE_NUMBER'),
                inputType: 'plainText',
                dataType: 'text',
                filterOperators: containmentOperators,
                attributeModel: 'standard',
            },
            {
                attributeKey: CONTACT_ATTRIBUTES.IDENTIFIER,
                value: CONTACT_ATTRIBUTES.IDENTIFIER,
                attributeName: t('CONTACTS_LAYOUT.FILTER.IDENTIFIER'),
                label: t('CONTACTS_LAYOUT.FILTER.IDENTIFIER'),
                inputType: 'plainText',
                dataType: 'number',
                filterOperators: equalityOperators,
                attributeModel: 'standard',
            },
            {
                attributeKey: CONTACT_ATTRIBUTES.COUNTRY_CODE,
                value: CONTACT_ATTRIBUTES.COUNTRY_CODE,
                attributeName: t('FILTER.ATTRIBUTES.COUNTRY_NAME'),
                label: t('FILTER.ATTRIBUTES.COUNTRY_NAME'),
                inputType: 'searchSelect',
                options: countries.map(country => ({ id: country.id, name: country.name })),
                dataType: 'number',
                filterOperators: equalityOperators,
                attributeModel: 'additional',
            },
            {
                attributeKey: CONTACT_ATTRIBUTES.CITY,
                value: CONTACT_ATTRIBUTES.CITY,
                attributeName: t('CONTACTS_LAYOUT.FILTER.CITY'),
                label: t('CONTACTS_LAYOUT.FILTER.CITY'),
                inputType: 'plainText',
                dataType: 'text',
                filterOperators: containmentOperators,
                attributeModel: 'standard',
            },
            {
                attributeKey: CONTACT_ATTRIBUTES.COMPANY_NAME,
                value: CONTACT_ATTRIBUTES.COMPANY_NAME,
                attributeName: t('CONTACTS_LAYOUT.FILTER.COMPANY'),
                label: t('CONTACTS_LAYOUT.FILTER.COMPANY'),
                inputType: 'plainText',
                dataType: 'text',
                filterOperators: containmentOperators,
                attributeModel: 'standard',
            },
            {
                attributeKey: CONTACT_ATTRIBUTES.CREATED_AT,
                value: CONTACT_ATTRIBUTES.CREATED_AT,
                attributeName: t('CONTACTS_LAYOUT.FILTER.CREATED_AT'),
                label: t('CONTACTS_LAYOUT.FILTER.CREATED_AT'),
                inputType: 'date',
                dataType: 'text',
                filterOperators: dateOperators,
                attributeModel: 'standard',
            },
            {
                attributeKey: CONTACT_ATTRIBUTES.LAST_ACTIVITY_AT,
                value: CONTACT_ATTRIBUTES.LAST_ACTIVITY_AT,
                attributeName: t('CONTACTS_LAYOUT.FILTER.LAST_ACTIVITY'),
                label: t('CONTACTS_LAYOUT.FILTER.LAST_ACTIVITY'),
                inputType: 'date',
                dataType: 'text',
                filterOperators: dateOperators,
                attributeModel: 'standard',
            },
            {
                attributeKey: CONTACT_ATTRIBUTES.BLOCKED,
                value: CONTACT_ATTRIBUTES.BLOCKED,
                attributeName: t('CONTACTS_LAYOUT.FILTER.BLOCKED'),
                label: t('CONTACTS_LAYOUT.FILTER.BLOCKED'),
                inputType: 'searchSelect',
                options: [
                    { id: 'true', name: t('CONTACTS_LAYOUT.FILTER.BLOCKED_TRUE') },
                    { id: 'false', name: t('CONTACTS_LAYOUT.FILTER.BLOCKED_FALSE') },
                ],
                dataType: 'text',
                filterOperators: equalityOperators,
                attributeModel: 'standard',
            },
            {
                attributeKey: CONTACT_ATTRIBUTES.LABELS,
                value: CONTACT_ATTRIBUTES.LABELS,
                attributeName: t('CONTACTS_FILTER.ATTRIBUTES.LABELS'),
                label: t('CONTACTS_FILTER.ATTRIBUTES.LABELS'),
                inputType: 'multiSelect',
                options: labels.map(label => ({ id: label.title, name: label.title })),
                dataType: 'text',
                filterOperators: equalityOperators,
                attributeModel: 'standard',
            },
        ];

        return groupFilterTypes(
            [...filterTypes, ...buildAttributesFilterTypes(contactAttributes, getOperatorTypes, 'contact')],
            'CONTACTS_FILTER',
        );
        // contactAttributes đổi tham chiếu mỗi lần render (map từ store).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [labels, JSON.stringify(contactAttributes)]);
}
