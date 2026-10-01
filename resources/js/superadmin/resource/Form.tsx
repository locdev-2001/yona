import { Link, useForm } from '@inertiajs/react';

import { useNavLabel } from '../components/navigation';
import { Button, buttonClassName } from '../ui/Button';
import { Card, CardContent, CardFooter } from '../ui/Card';
import { Field, Input, Select } from '../ui/Input';
import { useConsoleDictionary, useConsoleLabels } from '../ui/labels';
import { PageHeader } from '../ui/PageHeader';

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
    const { attribute } = useConsoleDictionary();
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
        <>
            <PageHeader title={title} />
            <Card className="max-w-3xl">
                <form
                    noValidate
                    onSubmit={event => {
                        event.preventDefault();
                        (method === 'put' ? put : post)(action);
                    }}
                >
                    <CardContent className="flex flex-col gap-5">
                        {visibleFields.map(field => {
                            const id = `${singular}_${field.name}`;
                            const error = errorFor(field.name);
                            const fieldLabel = isDerivedLabel(field.name, field.label)
                                ? attribute(field.name, field.label)
                                : field.label;
                            const update = (value: string) => setData(singular, { ...values, [field.name]: value });

                            return (
                                <Field key={field.name} label={fieldLabel} htmlFor={id} error={error}>
                                    {field.options.length > 0 ? (
                                        <Select id={id} value={values[field.name] ?? ''} onChange={event => update(event.target.value)}>
                                            {field.options.map(option => (
                                                <option value={option} key={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </Select>
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
                                </Field>
                            );
                        })}
                    </CardContent>
                    <CardFooter className="mt-6 justify-end border-t border-console-border pt-5">
                        <Link href={cancelUrl} className={buttonClassName({ variant: 'outline' })}>
                            {label('cancel')}
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? label('saving') : record ? label('save') : label('create')}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </>
    );
}
