import InputError from '@/components/input-error';
import type { CustomFieldDefinition, EntityType, FieldType } from '@/components/shared/custom-fields/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslator } from '@/lib/i18n';
import { useForm } from '@inertiajs/react';
import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const OPTION_TYPES: FieldType[] = ['select', 'multiselect', 'checkbox'];

interface FormData {
    entity_type: EntityType | '';
    name: string;
    field_type: FieldType | '';
    options: string[];
    default_value: string;
    required: boolean;
    active: boolean;
    field_order: number;
    bs_column: number;
    show_on_table: boolean;
    show_on_client_portal: boolean;
    disallow_client_edit: boolean;
    only_admin: boolean;
}

interface Props {
    open: boolean;
    onClose: () => void;
    entityTypes: string[];
    fieldTypes: string[];
    /** Provided when editing; null when creating. */
    definition?: CustomFieldDefinition | null;
    /** Route for create (POST). */
    storeRoute: string;
    /** Route for update (PUT) — required when definition is provided. */
    updateRoute?: string;
}

const DEFAULT_FORM: FormData = {
    entity_type: '',
    name: '',
    field_type: '',
    options: [],
    default_value: '',
    required: false,
    active: true,
    field_order: 0,
    bs_column: 12,
    show_on_table: false,
    show_on_client_portal: false,
    disallow_client_edit: false,
    only_admin: false,
};

/**
 * Create / Edit dialog for custom-field definitions.
 * entity_type and field_type are disabled (immutable) when editing.
 * Options editor shown only for option-bearing field types.
 */
export default function CustomFieldForm({ open, onClose, entityTypes, fieldTypes, definition, storeRoute, updateRoute }: Props) {
    const t = useTranslator();
    const isEditing = definition != null;

    const { data, setData, post, put, reset, errors, processing, clearErrors } = useForm<FormData>(DEFAULT_FORM);

    const [newOptionInput, setNewOptionInput] = useState('');

    // Sync form state when dialog opens (create vs. edit)
    useEffect(() => {
        if (open) {
            if (definition) {
                setData({
                    entity_type: definition.entity_type,
                    name: definition.name,
                    field_type: definition.field_type,
                    options: definition.options ?? [],
                    default_value: '',
                    required: definition.required,
                    active: definition.active,
                    field_order: definition.field_order,
                    bs_column: definition.bs_column,
                    show_on_table: definition.show_on_table,
                    show_on_client_portal: definition.show_on_client_portal,
                    disallow_client_edit: definition.disallow_client_edit,
                    only_admin: definition.only_admin,
                });
            } else {
                reset();
            }
            clearErrors();
            setNewOptionInput('');
        }
    }, [open, definition]);

    const fieldType = data.field_type as FieldType;
    const requiresOptions = OPTION_TYPES.includes(fieldType);

    const addOption = () => {
        const opt = newOptionInput.trim();
        if (!opt || data.options.includes(opt)) return;
        setData('options', [...data.options, opt]);
        setNewOptionInput('');
    };

    const removeOption = (opt: string) => {
        setData(
            'options',
            data.options.filter((o) => o !== opt),
        );
    };

    const submit = () => {
        const opts = {
            preserveScroll: true,
            onSuccess: () => {
                onClose();
                reset();
            },
        };

        if (isEditing && updateRoute) {
            put(updateRoute, opts);
        } else {
            post(storeRoute, opts);
        }
    };

    const handleClose = () => {
        onClose();
        reset();
        clearErrors();
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEditing ? t('custom_fields.actions.edit') : t('custom_fields.actions.add')}</DialogTitle>
                    <DialogDescription>{t('custom_fields.dialog_description') ?? 'Configure the custom field definition below.'}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Entity Type — immutable on edit */}
                    <div className="grid gap-2">
                        <Label>{t('custom_fields.fields.entity_type')}</Label>
                        <Select value={data.entity_type} onValueChange={(v) => setData('entity_type', v as EntityType)} disabled={isEditing}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('custom_fields.select_entity')} />
                            </SelectTrigger>
                            <SelectContent>
                                {entityTypes.map((et) => (
                                    <SelectItem key={et} value={et}>
                                        {t(`custom_fields.entity_types.${et}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.entity_type} />
                    </div>

                    {/* Name */}
                    <div className="grid gap-2">
                        <Label>{t('custom_fields.fields.name')}</Label>
                        <Input value={data.name} onChange={(e) => setData('name', e.target.value)} autoFocus={!isEditing} maxLength={150} />
                        <InputError message={errors.name} />
                    </div>

                    {/* Field Type — immutable on edit */}
                    <div className="grid gap-2">
                        <Label>{t('custom_fields.fields.field_type')}</Label>
                        <Select value={data.field_type} onValueChange={(v) => setData('field_type', v as FieldType)} disabled={isEditing}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('custom_fields.fields.field_type')} />
                            </SelectTrigger>
                            <SelectContent>
                                {fieldTypes.map((ft) => (
                                    <SelectItem key={ft} value={ft}>
                                        {t(`custom_fields.field_types.${ft}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {isEditing && <p className="text-muted-foreground text-xs">{t('custom_fields.immutable_hint')}</p>}
                        <InputError message={errors.field_type} />
                    </div>

                    {/* Options editor — only for option-bearing types */}
                    {requiresOptions && (
                        <div className="grid gap-2">
                            <Label>{t('custom_fields.fields.options')}</Label>
                            <div className="space-y-2">
                                {data.options.map((opt) => (
                                    <div key={opt} className="flex items-center gap-2">
                                        <span className="bg-muted flex-1 rounded px-3 py-1.5 text-sm">{opt}</span>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(opt)} className="h-8 w-8 p-0">
                                            <X className="size-3.5" />
                                        </Button>
                                    </div>
                                ))}
                                <div className="flex gap-2">
                                    <Input
                                        value={newOptionInput}
                                        onChange={(e) => setNewOptionInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                                        placeholder={t('custom_fields.fields.add_option')}
                                        className="flex-1"
                                    />
                                    <Button type="button" variant="outline" size="sm" onClick={addOption}>
                                        <Plus className="size-4" />
                                    </Button>
                                </div>
                            </div>
                            <InputError message={errors.options} />
                        </div>
                    )}

                    {/* Flags */}
                    <div className="grid grid-cols-2 gap-3">
                        {(
                            [
                                ['required', 'custom_fields.fields.required'],
                                ['active', 'custom_fields.fields.active'],
                                ['show_on_table', 'custom_fields.fields.show_on_table'],
                                ['only_admin', 'custom_fields.fields.only_admin'],
                            ] as const
                        ).map(([field, labelKey]) => (
                            <div key={field} className="flex items-center gap-2">
                                <Checkbox id={field} checked={data[field] as boolean} onCheckedChange={(c) => setData(field, c === true)} />
                                <Label htmlFor={field} className="font-normal">
                                    {t(labelKey)}
                                </Label>
                            </div>
                        ))}
                    </div>

                    {/* Field order */}
                    <div className="grid gap-2">
                        <Label>{t('custom_fields.fields.order')}</Label>
                        <Input
                            type="number"
                            min={0}
                            value={data.field_order}
                            onChange={(e) => setData('field_order', parseInt(e.target.value) || 0)}
                            className="w-32"
                        />
                        <InputError message={errors.field_order} />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={processing}>
                        {t('custom_fields.actions.cancel')}
                    </Button>
                    <Button onClick={submit} disabled={processing}>
                        {t('custom_fields.actions.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
