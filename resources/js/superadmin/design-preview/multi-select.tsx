import { useId, useRef, useState } from 'react';
import { X } from '@admin/components/icons';
import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxList,
    ComboboxTrigger,
    ComboboxValue,
} from '@admin/components/ui/combobox';
import { PreviewButton } from './components';
import { previewCopy, previewText } from './copy';
import { spacingPixels } from './tokens';
import './multi-select.css';

export function MultiSelectDemo() {
    const [selected, setSelected] = useState<string[]>(['Yona', previewCopy.zalo_ca_nhan]);
    const [query, setQuery] = useState('');
    const anchorRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const inputId = useId();
    const options = ['Yona', previewCopy.zalo_ca_nhan, 'Email', 'Gmail', 'IMAP'];
    return (
        <div className="catalogue-form preview-multi-select">
            <div className="catalogue-field">
                <label htmlFor={inputId}>{previewCopy.multi_label}</label>
                <Combobox
                    multiple
                    items={options}
                    value={selected}
                    onValueChange={setSelected}
                    inputValue={query}
                    onInputValueChange={setQuery}
                >
                    <div ref={anchorRef} className="preview-multi-anchor">
                        <ComboboxChips className="preview-multi-chips">
                            <ComboboxValue>
                                {(values: string[]) =>
                                    values.map((value) => (
                                        <ComboboxChip key={value} removeLabel={previewText('multi_remove', value)}>
                                            {value}
                                        </ComboboxChip>
                                    ))
                                }
                            </ComboboxValue>
                            <ComboboxChipsInput
                                id={inputId}
                                ref={inputRef}
                                aria-label={previewCopy.multi_search}
                                placeholder={
                                    selected.length === 0 ? previewCopy.multi_placeholder : previewCopy.go_ten_kenh
                                }
                            />
                        </ComboboxChips>
                        <div className="preview-multi-actions">
                            {(selected.length > 0 || query.length > 0) && (
                                <PreviewButton
                                    appearance="ghost"
                                    aria-label={previewCopy.multi_clear}
                                    onClick={() => {
                                        setSelected([]);
                                        setQuery('');
                                        inputRef.current?.focus();
                                    }}
                                >
                                    <X />
                                </PreviewButton>
                            )}
                            <ComboboxTrigger
                                render={<PreviewButton appearance="ghost" />}
                                aria-label={previewCopy.multi_toggle}
                            />
                        </div>
                    </div>
                    <ComboboxContent
                        anchor={anchorRef}
                        sideOffset={spacingPixels('control-gap')}
                        className="catalogue-combobox-popup preview-multi-popup"
                    >
                        <ComboboxEmpty>{previewCopy.multi_empty}</ComboboxEmpty>
                        <ComboboxList>
                            {(item: string) => (
                                <ComboboxItem key={item} value={item}>
                                    {item}
                                </ComboboxItem>
                            )}
                        </ComboboxList>
                    </ComboboxContent>
                </Combobox>
            </div>
            <p className="catalogue-result" role="status">
                {previewText('multi_count', selected.length)}
            </p>
        </div>
    );
}
