import { useForm } from '@inertiajs/react';

import Link from '@admin/components/Link';
import { buttonVariants } from '@admin/components/ui/button';
import { PreviewButton as Button } from '../design-preview/components';
import { Field, FieldError, FieldLabel } from '@admin/components/ui/field';
import { Input } from '@admin/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@admin/components/ui/select';
import { Textarea } from '@admin/components/ui/textarea';
import { cn } from '@admin/lib/utils';
import { RecordForm } from '@admin/views/apps/resources/form/record-form';

import { useNavLabel } from '../components/navigation';
import { useConsoleDictionary, useConsoleLabels } from '../labels';

type FormField = {
    name: string;
    label: string;
    type: string;
    options: string[];
    value: string | number | null;
    depends_on: { field: string; value: string } | null;
};

type Props = {
    resource: string;
    resourceLabel?: string;
    singular: string;
    singularLabel: string;
    record: { id: number; title: string; url: string | null } | null;
    fields: FormField[];
    action: string;
    method: 'post' | 'put';
};

// Trường chữ dài (mô tả, lý do, giá trị cấu hình) chiếm cả hàng và nhiều dòng.
const LONG_TEXT_FIELDS = ['description', 'suspension_reason', 'value'];

// Nhãn máy chủ tự suy từ tên thuộc tính thì thay bằng bản tiếng Việt; nhãn riêng
// do dashboard đặt thì giữ.
function isDerivedLabel(name: string, label: string): boolean {
    const derived = name.replaceAll('_', ' ');

    return label === derived.charAt(0).toUpperCase() + derived.slice(1);
}

function inputType(type: string): string {
    if (type === 'password') return 'password';
    if (type === 'date_time' || type === 'confirmed_at_field') return 'datetime-local';
    if (type === 'number') return 'number';

    return 'text';
}

export default function ResourceForm({ resource, resourceLabel, singular, singularLabel, record, fields, action, method }: Props) {
    const label = useConsoleLabels();
    const dictionary = useConsoleDictionary();
    const { attribute } = dictionary;
    const resourceTitle = useNavLabel(`/admin/${resource}`, resourceLabel ?? singularLabel);
    const initial = Object.fromEntries(fields.map(field => [field.name, String(field.value ?? '')]));
    const { data, setData, post, put, processing, errors } = useForm<Record<string, Record<string, string>>>({
        [singular]: initial,
    });

    const values = data[singular];
    // Trường phụ thuộc (lý do đình chỉ) chỉ hiện khi trường điều kiện đúng giá trị.
    const visibleFields = fields.filter(
        field => !field.depends_on || values[field.depends_on.field] === field.depends_on.value,
    );
    const title = record
        ? label('edit_title', { title: record.title })
        : label('new_title', { resource: resourceTitle.toLowerCase() });
    const cancelUrl = record?.url ?? `/admin/${resource}`;
    const errorFor = (name: string) => (errors as Record<string, string | undefined>)[`${singular}.${name}`];

    return (
        <RecordForm
            title={title}
            onSubmit={event => {
                event.preventDefault();
                (method === 'put' ? put : post)(action);
            }}
            actions={
                <>
                    <Button appearance="primary" type="submit" disabled={processing}>
                        {processing ? label('saving') : record ? label('save') : label('create')}
                    </Button>
                    <Link href={cancelUrl} className={buttonVariants({ variant: 'outline', className: 'preview-button preview-button--secondary' })}>
                        {label('cancel')}
                    </Link>
                </>
            }
        >
            {visibleFields.map(field => {
                const id = `${singular}_${field.name}`;
                const error = errorFor(field.name);
                const fieldLabel = isDerivedLabel(field.name, field.label) ? attribute(field.name, field.label) : field.label;
                const update = (value: string) => setData(singular, { ...values, [field.name]: value });
                const longText = LONG_TEXT_FIELDS.includes(field.name);
                // Trạng thái dùng nhãn tiếng Việt của bộ lọc (active → Đang hoạt động); lựa chọn khác giữ nguyên.
                const options = field.options.map(option => ({
                    value: option,
                    label: field.name === 'status' ? dictionary.filter(option) : option,
                }));

                return (
                    <Field key={field.name} data-invalid={error ? true : undefined} className={cn('gap-2', longText && 'sm:col-span-2')}>
                        <FieldLabel htmlFor={id}>{fieldLabel}</FieldLabel>
                        {field.options.length > 0 ? (
                            <Select
                                items={options}
                                value={values[field.name] ?? ''}
                                onValueChange={(value: string | null) => {
                                    if (value !== null) update(value);
                                }}
                            >
                                <SelectTrigger id={id} className="w-full" aria-invalid={error ? true : undefined}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="catalogue-overlay catalogue-select-popup" alignItemWithTrigger={false}>
                                    <SelectGroup>
                                        {options.map(option => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        ) : longText ? (
                            <Textarea
                                id={id}
                                rows={4}
                                aria-invalid={error ? true : undefined}
                                value={values[field.name] ?? ''}
                                onChange={event => update(event.target.value)}
                            />
                        ) : (
                            <Input
                                id={id}
                                type={inputType(field.type)}
                                aria-invalid={error ? true : undefined}
                                autoComplete={field.type === 'password' ? 'new-password' : undefined}
                                value={values[field.name] ?? ''}
                                onChange={event => update(event.target.value)}
                            />
                        )}
                        {error ? <FieldError>{error}</FieldError> : null}
                    </Field>
                );
            })}
        </RecordForm>
    );
}
