import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { CustomFieldValue } from '@/types';
import { useTranslator } from '@/lib/i18n';
import type { CustomFieldDefinition } from './types';

interface Props {
    definition: CustomFieldDefinition;
    value: CustomFieldValue;
    error?: string;
    onChange: (slug: string, value: CustomFieldValue) => void;
    disabled?: boolean;
}

/**
 * Renders the appropriate input control for a single custom-field definition.
 * 10 field types: input / number / textarea / select / multiselect / checkbox / date / datetime / color / link.
 * Host form owns state — this component is controlled (no internal submit).
 */
export default function CustomFieldInput({ definition, value, error, onChange, disabled = false }: Props) {
    const t = useTranslator();

    const label = (
        <Label className="text-sm font-medium">
            {definition.name}
            {definition.required && <span className="text-destructive ml-1">*</span>}
        </Label>
    );

    const renderInput = () => {
        switch (definition.field_type) {
            case 'input':
                return (
                    <Input
                        type="text"
                        value={(value as string) ?? ''}
                        onChange={(e) => onChange(definition.slug, e.target.value)}
                        disabled={disabled}
                        placeholder={definition.name}
                    />
                );

            case 'number':
                return (
                    <Input
                        type="number"
                        value={(value as string | number) ?? ''}
                        onChange={(e) => onChange(definition.slug, e.target.value === '' ? null : Number(e.target.value))}
                        disabled={disabled}
                    />
                );

            case 'textarea':
                return (
                    <Textarea
                        value={(value as string) ?? ''}
                        onChange={(e) => onChange(definition.slug, e.target.value)}
                        disabled={disabled}
                        rows={3}
                    />
                );

            case 'select': {
                const selectVal = (value as string) ?? '';
                return (
                    <Select value={selectVal} onValueChange={(v) => onChange(definition.slug, v)} disabled={disabled}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('custom_fields.fields.options')} />
                        </SelectTrigger>
                        <SelectContent>
                            {(definition.options ?? []).map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                    {opt}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            }

            case 'multiselect': {
                const multiVal = (value as string[]) ?? [];
                return (
                    <div className="space-y-2">
                        {(definition.options ?? []).map((opt) => (
                            <div key={opt} className="flex items-center gap-2">
                                <Checkbox
                                    id={`${definition.slug}-${opt}`}
                                    checked={multiVal.includes(opt)}
                                    disabled={disabled}
                                    onCheckedChange={(checked) => {
                                        const next = checked ? [...multiVal, opt] : multiVal.filter((v) => v !== opt);
                                        onChange(definition.slug, next);
                                    }}
                                />
                                <Label htmlFor={`${definition.slug}-${opt}`} className="font-normal">
                                    {opt}
                                </Label>
                            </div>
                        ))}
                    </div>
                );
            }

            case 'checkbox': {
                const checkVal = (value as string[]) ?? [];
                return (
                    <div className="space-y-2">
                        {(definition.options ?? []).map((opt) => (
                            <div key={opt} className="flex items-center gap-2">
                                <Checkbox
                                    id={`${definition.slug}-${opt}`}
                                    checked={checkVal.includes(opt)}
                                    disabled={disabled}
                                    onCheckedChange={(checked) => {
                                        const next = checked ? [...checkVal, opt] : checkVal.filter((v) => v !== opt);
                                        onChange(definition.slug, next);
                                    }}
                                />
                                <Label htmlFor={`${definition.slug}-${opt}`} className="font-normal">
                                    {opt}
                                </Label>
                            </div>
                        ))}
                    </div>
                );
            }

            case 'date':
                return (
                    <Input
                        type="date"
                        value={(value as string) ?? ''}
                        onChange={(e) => onChange(definition.slug, e.target.value || null)}
                        disabled={disabled}
                    />
                );

            case 'datetime':
                return (
                    <Input
                        type="datetime-local"
                        value={((value as string) ?? '').replace(' ', 'T').substring(0, 16)}
                        onChange={(e) => {
                            // Store as "YYYY-MM-DD HH:MM" (server format)
                            const raw = e.target.value;
                            onChange(definition.slug, raw ? raw.replace('T', ' ') : null);
                        }}
                        disabled={disabled}
                    />
                );

            case 'color':
                return (
                    <div className="flex items-center gap-2">
                        <Input
                            type="color"
                            value={(value as string) ?? '#000000'}
                            onChange={(e) => onChange(definition.slug, e.target.value.toUpperCase())}
                            disabled={disabled}
                            className="h-10 w-14 cursor-pointer p-1"
                        />
                        <Input
                            type="text"
                            value={(value as string) ?? ''}
                            onChange={(e) => onChange(definition.slug, e.target.value)}
                            disabled={disabled}
                            placeholder="#FF5733"
                            className="flex-1"
                            maxLength={7}
                        />
                    </div>
                );

            case 'link': {
                const linkVal = (value as { url?: string; text?: string }) ?? {};
                return (
                    <div className="space-y-2">
                        <Input
                            type="url"
                            value={linkVal.url ?? ''}
                            onChange={(e) => onChange(definition.slug, { ...linkVal, url: e.target.value })}
                            disabled={disabled}
                            placeholder={t('custom_fields.fields.url')}
                        />
                        <Input
                            type="text"
                            value={linkVal.text ?? ''}
                            onChange={(e) => onChange(definition.slug, { ...linkVal, text: e.target.value })}
                            disabled={disabled}
                            placeholder={t('custom_fields.fields.link_text')}
                        />
                    </div>
                );
            }

            default:
                return null;
        }
    };

    return (
        <div className="space-y-1">
            {label}
            {renderInput()}
            {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
    );
}
