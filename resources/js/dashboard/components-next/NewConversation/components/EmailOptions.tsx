import { useState } from 'react';

import { t } from '../../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import InlineInput from 'dashboard/components-next/inline-input/InlineInput';
import TagInput from 'dashboard/components-next/taginput/TagInput';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';

// Port từ components-next/NewConversation/components/EmailOptions.vue.
const I18N_PREFIX = 'COMPOSE_NEW_CONVERSATION.FORM.EMAIL_OPTIONS';

interface EmailOptionsProps {
    subject: string;
    ccEmails: string;
    bccEmails: string;
    contactEmails?: DropdownMenuItem[];
    hasErrors?: boolean;
    onChange: (value: { subject?: string; ccEmails?: string; bccEmails?: string }) => void;
}

const toList = (value: string): string[] =>
    value ? value.split(',').map(email => email.trim()) : [];

export default function EmailOptions({
    subject,
    ccEmails,
    bccEmails,
    contactEmails = [],
    hasErrors = false,
    onChange,
}: EmailOptionsProps) {
    const [showBccInput, setShowBccInput] = useState(false);

    const inputClass = hasErrors ? 'placeholder:!text-n-ruby-9' : '';

    const updateList = (field: 'ccEmails' | 'bccEmails', list: string[]) =>
        onChange({ [field]: list.join(',') });

    return (
        <div className="flex flex-col">
            <div className="flex items-baseline flex-1 w-full h-8 gap-3 px-4 py-3">
                <InlineInput
                    autoFocus
                    value={subject}
                    placeholder={t(`${I18N_PREFIX}.SUBJECT_PLACEHOLDER`)}
                    label={t(`${I18N_PREFIX}.SUBJECT_LABEL`)}
                    customInputClass={inputClass}
                    onChange={event => onChange({ subject: event.target.value })}
                />
            </div>
            <div className="flex items-baseline flex-1 w-full gap-3 px-4 py-3 min-h-8">
                <label className="mb-0.5 text-sm font-medium whitespace-nowrap text-n-slate-11">
                    {t(`${I18N_PREFIX}.CC_LABEL`)}
                </label>
                <div className="flex items-center w-full gap-3 min-h-7">
                    <TagInput
                        value={toList(ccEmails)}
                        placeholder={t(`${I18N_PREFIX}.CC_PLACEHOLDER`)}
                        menuItems={contactEmails}
                        showDropdown={contactEmails.length > 0}
                        autoOpenDropdown={false}
                        allowCreate
                        className="flex-1 min-h-7"
                        onAdd={item => updateList('ccEmails', [...toList(ccEmails), String(item.label)])}
                        onCreate={tag => updateList('ccEmails', [...toList(ccEmails), tag])}
                        onRemove={index =>
                            updateList(
                                'ccEmails',
                                toList(ccEmails).filter((_, position) => position !== index),
                            )
                        }
                    />
                    <Button
                        label={t(`${I18N_PREFIX}.BCC_BUTTON`)}
                        variant="ghost"
                        size="sm"
                        color="slate"
                        className="flex-shrink-0"
                        onClick={() => setShowBccInput(current => !current)}
                    />
                </div>
            </div>
            {showBccInput ? (
                <div className="flex items-baseline flex-1 w-full gap-3 px-4 py-3 min-h-8">
                    <label className="mb-0.5 text-sm font-medium whitespace-nowrap text-n-slate-11">
                        {t(`${I18N_PREFIX}.BCC_LABEL`)}
                    </label>
                    <TagInput
                        value={toList(bccEmails)}
                        placeholder={t(`${I18N_PREFIX}.BCC_PLACEHOLDER`)}
                        menuItems={contactEmails}
                        showDropdown={contactEmails.length > 0}
                        autoOpenDropdown={false}
                        allowCreate
                        className="flex-1 min-h-7"
                        onAdd={item => updateList('bccEmails', [...toList(bccEmails), String(item.label)])}
                        onCreate={tag => updateList('bccEmails', [...toList(bccEmails), tag])}
                        onRemove={index =>
                            updateList(
                                'bccEmails',
                                toList(bccEmails).filter((_, position) => position !== index),
                            )
                        }
                    />
                </div>
            ) : null}
        </div>
    );
}
