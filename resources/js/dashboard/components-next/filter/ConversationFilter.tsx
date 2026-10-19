import { useEffect, useRef } from 'react';

import BottomSheet from 'dashboard/components-next/BottomSheet';
import { useIsPhoneScreen } from 'dashboard/composables/useViewportWidth';
import { t } from '../../../i18n';
import FilterComposer from './FilterComposer';
import type { ConversationFilterCondition, FilterSelectOption, FilterType } from './helper/filterHelper';

export const DEFAULT_FILTER: ConversationFilterCondition = {
    attributeKey: 'status',
    filterOperator: 'equal_to',
    values: [],
    queryOperator: 'and',
};

interface ConversationFilterProps {
    filters: ConversationFilterCondition[];
    attributeFilterTypes: (FilterType | FilterSelectOption)[];
    onChange: (filters: ConversationFilterCondition[]) => void;
    onApplyFilter: (filters: ConversationFilterCondition[]) => void;
    onClose: () => void;
}

// Lọc nâng cao: cùng một nội dung, máy tính là popover hẹp cạnh nút Lọc, điện thoại là bottom sheet.
export default function ConversationFilter({ filters, attributeFilterTypes, onChange, onApplyFilter, onClose }: ConversationFilterProps) {
    const isPhone = useIsPhoneScreen();
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isPhone) return undefined;
        const onMouseDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (rootRef.current?.contains(target)) return;
            if (target.closest('#toggleConversationFilterButton')) return;
            onClose();
        };
        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, [isPhone, onClose]);

    const apply = (conditions: ConversationFilterCondition[]) => {
        onChange(conditions.length ? conditions : [{ ...DEFAULT_FILTER }]);
        onApplyFilter(conditions);
    };

    const composer = (
        <FilterComposer filters={filters} filterTypes={attributeFilterTypes} isSheet={isPhone} onApply={apply} onClose={onClose} />
    );

    if (isPhone) {
        return (
            <BottomSheet isOpen focusesSheetOnOpen title={t('FILTER.COMPOSER.TITLE')} onClose={onClose}>
                {composer}
            </BottomSheet>
        );
    }

    return (
        <div ref={rootRef} className="z-40 w-[22rem] max-w-[calc(100vw-2rem)] max-h-[min(36rem,80vh)] flex flex-col overlay-surface rounded-xl">
            {composer}
        </div>
    );
}
