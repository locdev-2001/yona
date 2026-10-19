import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import NextButton from 'dashboard/components-next/button/Button';
import { useKeyboardNavigableList } from 'dashboard/composables/useKeyboardNavigableList';
import type { Label } from 'dashboard/settings/labels/types';
import { isLabelTitleInvalid, isSameLabelTitle, normalizeLabelTitle } from 'dashboard/settings/labels/validations';
import { searchByRelevance } from 'shared/helpers/searchFold';
import { t } from '../../../../i18n';
import LabelDropdownItem from './LabelDropdownItem';

type LabelOption = { kind: 'label'; label: Label } | { kind: 'create'; title: string };

interface LabelDropdownProps {
    accountLabels: Label[];
    selectedLabels: string[];
    allowCreation?: boolean;
    onAdd: (label: Label) => void;
    onRemove: (title: string) => void;
    onCreate?: (title: string) => Promise<unknown>;
    onCustomize?: (title: string) => void;
    onClose?: () => void;
}

export default function LabelDropdown({
    accountLabels,
    selectedLabels,
    allowCreation = false,
    onAdd,
    onRemove,
    onCreate,
    onCustomize,
    onClose,
}: LabelDropdownProps) {
    const [search, setSearch] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const [isCreating, setIsCreating] = useState(false);
    const searchbarRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const optionIdPrefix = useId();

    // Khung nổi chỉ hiện sau khi đo xong vị trí; focus ở khung hình kế tiếp mới ăn.
    useEffect(() => {
        const frame = requestAnimationFrame(() => searchbarRef.current?.focus());
        return () => cancelAnimationFrame(frame);
    }, []);

    const newTitle = normalizeLabelTitle(search);
    const canCreateNewTitle =
        allowCreation &&
        Boolean(onCreate) &&
        !isLabelTitleInvalid(newTitle) &&
        !accountLabels.some(label => isSameLabelTitle(label.title, newTitle));

    const options = useMemo<LabelOption[]>(() => {
        const matchedLabels = searchByRelevance(accountLabels, search, label => label.title);
        const labelOptions = matchedLabels.map(label => ({ kind: 'label', label }) as const);

        return canCreateNewTitle ? [...labelOptions, { kind: 'create', title: newTitle }] : labelOptions;
    }, [accountLabels, search, canCreateNewTitle, newTitle]);

    const activeOptionIndex = Math.min(activeIndex, options.length - 1);
    const optionId = (index: number) => `${optionIdPrefix}-option-${index}`;

    useEffect(() => {
        listRef.current?.querySelector('[data-active]')?.scrollIntoView?.({ block: 'nearest' });
    }, [activeOptionIndex]);

    const createLabel = async (title: string) => {
        if (!onCreate || isCreating) return;
        setIsCreating(true);
        try {
            await onCreate(title);
            setSearch('');
            setActiveIndex(0);
        } finally {
            setIsCreating(false);
        }
    };

    const chooseOption = (option: LabelOption | undefined) => {
        if (!option) return;
        if (option.kind === 'create') {
            void createLabel(option.title);
            return;
        }
        if (selectedLabels.includes(option.label.title)) {
            onRemove(option.label.title);
        } else {
            onAdd(option.label);
        }
    };

    useKeyboardNavigableList({
        itemCount: options.length,
        selectedIndex: activeOptionIndex,
        onSelectedIndexChange: setActiveIndex,
        onSelect: () => chooseOption(options[activeOptionIndex]),
        // Cuộn tới dòng đang chọn chạy trong effect sau khi render.
        adjustScroll: () => undefined,
    });

    const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        onClose?.();
    };

    const selectTitle = t('CONTACT_PANEL.LABELS.LABEL_SELECT.TITLE');

    return (
        <div className="flex flex-col w-full md:w-[18.75rem] max-h-[60vh] gap-2 p-2">
            <div className="flex items-center justify-center">
                <h4 className="flex-grow m-0 overflow-hidden text-sm text-n-slate-12 whitespace-nowrap text-ellipsis">
                    {selectTitle}
                </h4>
                <kbd className="hotkey inline-flex leading-[0.625rem] rounded tracking-wide items-center select-none justify-center p-0.5 min-w-[1rem] uppercase border border-solid text-n-slate-12 bg-n-slate-2 text-xxs border-n-strong flex-shrink-0">
                    L
                </kbd>
            </div>
            <input
                ref={searchbarRef}
                value={search}
                type="text"
                className="search-input flex-shrink-0 !mb-0"
                autoFocus
                role="combobox"
                aria-expanded
                aria-controls={`${optionIdPrefix}-listbox`}
                aria-activedescendant={options.length ? optionId(activeOptionIndex) : undefined}
                placeholder={t('CONTACT_PANEL.LABELS.LABEL_SELECT.PLACEHOLDER')}
                onChange={event => {
                    setSearch(event.target.value);
                    setActiveIndex(0);
                }}
                onKeyDown={onSearchKeyDown}
            />
            <ul
                ref={listRef}
                id={`${optionIdPrefix}-listbox`}
                role="listbox"
                aria-label={selectTitle}
                aria-multiselectable
                className="flex flex-col flex-1 min-h-0 gap-0.5 p-0 m-0 overflow-y-auto list-none overscroll-contain"
            >
                {options.map((option, index) =>
                    option.kind === 'label' ? (
                        <LabelDropdownItem
                            key={option.label.id}
                            id={optionId(index)}
                            title={option.label.title}
                            color={option.label.color}
                            selected={selectedLabels.includes(option.label.title)}
                            active={index === activeOptionIndex}
                            onHover={() => setActiveIndex(index)}
                            onSelectLabel={() => chooseOption(option)}
                        />
                    ) : (
                        <li
                            key="create"
                            id={optionId(index)}
                            role="option"
                            aria-selected={false}
                            aria-disabled={isCreating}
                            data-active={index === activeOptionIndex || undefined}
                            className={`flex items-center gap-2 min-h-8 px-2.5 py-1 rounded-lg cursor-pointer text-sm text-n-slate-12 border-t border-n-weak ${
                                index === activeOptionIndex ? 'bg-n-alpha-2' : ''
                            } ${isCreating ? 'opacity-60 pointer-events-none' : ''}`}
                            onMouseEnter={() => setActiveIndex(index)}
                            onMouseDown={event => event.preventDefault()}
                            onClick={() => chooseOption(option)}
                        >
                            <span aria-hidden className="i-lucide-plus size-4 flex-shrink-0 text-n-slate-11" />
                            <span className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                                {t('CONTACT_PANEL.LABELS.LABEL_SELECT.CREATE_NAMED', { title: option.title })}
                            </span>
                            {onCustomize ? (
                                <NextButton
                                    slate
                                    xs
                                    ghost
                                    type="button"
                                    label={t('CONTACT_PANEL.LABELS.LABEL_SELECT.CUSTOMIZE')}
                                    onClick={event => {
                                        event.stopPropagation();
                                        onCustomize(option.title);
                                    }}
                                />
                            ) : null}
                        </li>
                    ),
                )}
            </ul>
            {options.length === 0 ? (
                <div className="flex justify-center py-4 px-2.5 font-medium text-xs text-n-slate-11">
                    {t('CONTACT_PANEL.LABELS.LABEL_SELECT.NO_RESULT')}
                </div>
            ) : null}
            {allowCreation && onCustomize && !search.trim() ? (
                <div className="flex pt-1 border-t border-solid border-n-weak">
                    <NextButton
                        icon="i-lucide-plus"
                        slate
                        sm
                        ghost
                        type="button"
                        label={t('CONTACT_PANEL.LABELS.LABEL_SELECT.CREATE_LABEL')}
                        onClick={() => onCustomize('')}
                    />
                </div>
            ) : null}
        </div>
    );
}
