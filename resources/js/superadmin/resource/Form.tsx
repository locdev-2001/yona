import { Head, useForm } from '@inertiajs/react';

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
    singular: string;
    singularLabel: string;
    record: { id: number; title: string; url: string | null } | null;
    fields: FormField[];
    action: string;
    method: 'post' | 'put';
};

// Port từ app/views/administrate/application/{new,edit,_form}.html.erb.
export default function ResourceForm({
    singular,
    singularLabel,
    record,
    fields,
    action,
    method,
}: Props) {
    const initial = Object.fromEntries(
        fields.map(field => [field.name, String(field.value ?? '')]),
    );
    const { data, setData, post, put, processing, errors } = useForm<
        Record<string, Record<string, string>>
    >({ [singular]: initial });

    const values = data[singular];
    // Trường phụ thuộc (lý do đình chỉ) chỉ hiện khi trường điều kiện đúng giá trị.
    const visibleFields = fields.filter(
        field => !field.depends_on || values[field.depends_on.field] === field.depends_on.value,
    );
    const title = record ? `Edit ${record.title}` : `New ${singularLabel.toLowerCase()}`;

    return (
        <>
            <Head title={title} />
            <header className="main-content__header" role="banner">
                <h1 className="main-content__page-title">{title}</h1>
            </header>

            <section className="main-content__body">
                <form
                    className="form"
                    onSubmit={event => {
                        event.preventDefault();
                        (method === 'put' ? put : post)(action);
                    }}
                >
                    {visibleFields.map(field => (
                        <div
                            className={`field-unit field-unit--${field.type.replace(/_/g, '-')}`}
                            key={field.name}
                        >
                            <div className="field-unit__label">
                                <label htmlFor={`${singular}_${field.name}`}>{field.label}</label>
                            </div>
                            <div className="field-unit__field">
                                {field.options.length > 0 ? (
                                    <select
                                        id={`${singular}_${field.name}`}
                                        value={values[field.name] ?? ''}
                                        onChange={event =>
                                            setData(singular, {
                                                ...values,
                                                [field.name]: event.target.value,
                                            })
                                        }
                                    >
                                        {field.options.map(option => (
                                            <option value={option} key={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        id={`${singular}_${field.name}`}
                                        type={
                                            field.type === 'password'
                                                ? 'password'
                                                : field.type === 'date_time' ||
                                                    field.type === 'confirmed_at_field'
                                                  ? 'datetime-local'
                                                  : 'text'
                                        }
                                        value={values[field.name] ?? ''}
                                        onChange={event =>
                                            setData(singular, {
                                                ...values,
                                                [field.name]: event.target.value,
                                            })
                                        }
                                    />
                                )}
                                {errors[`${singular}.${field.name}`] ? (
                                    <div className="text-color-red">
                                        {errors[`${singular}.${field.name}`]}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ))}

                    <div className="form-actions">
                        <input
                            type="submit"
                            value={`${record ? 'Update' : 'Create'} ${singularLabel}`}
                            disabled={processing}
                        />
                    </div>
                </form>
            </section>
        </>
    );
}
