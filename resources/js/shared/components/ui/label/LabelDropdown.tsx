import { useEffect, useMemo, useRef, useState } from 'react';
import { picoSearch } from '@chatwoot/pico-search';

import NextButton from 'dashboard/components-next/button/Button';
import Modal from 'dashboard/components/Modal';
import AddLabelModal from 'dashboard/settings/labels/AddLabel';
import type { Label } from 'dashboard/settings/labels/types';
import { sanitizeLabel } from 'shared/helpers/sanitizeData';
import { t } from '../../../../i18n';
import LabelDropdownItem from './LabelDropdownItem';

// Port từ shared/components/ui/label/LabelDropdown.vue.
// `<woot-dropdown-menu>` gốc = `<ul class="dropdown menu vertical">` (style
// foundation: flex cột, bỏ bullet) — dựng thẳng vì chỉ có một call-site.
interface LabelDropdownProps {
    accountId: number;
    accountLabels: Label[];
    selectedLabels: string[];
    allowCreation?: boolean;
    onAdd: (label: Label) => void;
    onRemove: (title: string) => void;
    onLabelCreated?: (label: Label) => void;
}

export default function LabelDropdown({
    accountId,
    accountLabels,
    selectedLabels,
    allowCreation = false,
    onAdd,
    onRemove,
    onLabelCreated,
}: LabelDropdownProps) {
    const [search, setSearch] = useState('');
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const searchbarRef = useRef<HTMLInputElement>(null);

    useEffect(() => searchbarRef.current?.focus(), []);

    const filteredActiveLabels = useMemo(
        () => (search ? (picoSearch(accountLabels, search, ['title']) as Label[]) : accountLabels),
        [accountLabels, search],
    );

    const noResult = filteredActiveLabels.length === 0;
    const hasExactMatchInResults = filteredActiveLabels.some(label => label.title === search);
    const shouldShowCreate = allowCreation && filteredActiveLabels.length < 3;
    const parsedSearch = sanitizeLabel(search);
    const createLabelPlaceholder = t('CONTACT_PANEL.LABELS.LABEL_SELECT.CREATE_LABEL');

    const onAddRemove = (label: Label) => {
        if (selectedLabels.includes(label.title)) {
            onRemove(label.title);
        } else {
            onAdd(label);
        }
    };

    return (
        <div className="flex flex-col w-full max-h-[12.5rem]">
            <div className="flex items-center justify-center mb-1">
                <h4 className="flex-grow m-0 overflow-hidden text-sm text-n-slate-12 whitespace-nowrap text-ellipsis">
                    {t('CONTACT_PANEL.LABELS.LABEL_SELECT.TITLE')}
                </h4>
                <kbd className="hotkey inline-flex leading-[0.625rem] rounded tracking-wide items-center select-none justify-center p-0.5 min-w-[1rem] uppercase border border-solid text-n-slate-12 bg-n-slate-2 text-xxs border-n-strong flex-shrink-0">
                    L
                </kbd>
            </div>
            <div className="flex-auto flex-grow-0 flex-shrink-0 mb-2 max-h-8">
                <input
                    ref={searchbarRef}
                    value={search}
                    type="text"
                    className="search-input"
                    autoFocus
                    placeholder={t('CONTACT_PANEL.LABELS.LABEL_SELECT.PLACEHOLDER')}
                    onChange={event => setSearch(event.target.value)}
                />
            </div>
            <div className="flex items-start justify-start flex-auto flex-grow flex-shrink overflow-auto">
                <div className="w-full my-1">
                    <ul className="dropdown menu vertical flex flex-col p-0 m-0 list-none">
                        {filteredActiveLabels.map(label => (
                            <LabelDropdownItem
                                key={label.title}
                                title={label.title}
                                color={label.color}
                                selected={selectedLabels.includes(label.title)}
                                onSelectLabel={() => onAddRemove(label)}
                            />
                        ))}
                    </ul>
                    {noResult ? (
                        <div className="flex justify-center py-4 px-2.5 font-medium text-xs text-n-slate-11">
                            {t('CONTACT_PANEL.LABELS.LABEL_SELECT.NO_RESULT')}
                        </div>
                    ) : null}
                    {allowCreation && shouldShowCreate ? (
                        <div className="flex pt-1 border-t border-solid border-n-weak">
                            <NextButton
                                icon="i-lucide-plus"
                                slate
                                sm
                                ghost
                                label={`${search ? `${createLabelPlaceholder}:` : createLabelPlaceholder} ${parsedSearch}`}
                                disabled={hasExactMatchInResults}
                                onClick={() => setCreateModalVisible(true)}
                            />
                            <Modal show={createModalVisible} onClose={() => setCreateModalVisible(false)}>
                                <AddLabelModal
                                    accountId={accountId}
                                    prefillTitle={parsedSearch}
                                    onClose={() => setCreateModalVisible(false)}
                                    onCreated={label => onLabelCreated?.(label)}
                                />
                            </Modal>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
