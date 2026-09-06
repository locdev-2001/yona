import { Head, useForm } from '@inertiajs/react';

type Definition = {
    display_title: string;
    description: string;
    type: string;
    options: Record<string, string> | null;
};

type Props = {
    config: string;
    title: string;
    values: Record<string, string | number | boolean | null>;
    definitions: Record<string, Definition>;
};

// Port từ app/views/super_admin/app_configs/show.html.erb.
export default function AppConfig({ config, title, values, definitions }: Props) {
    const { data, setData, post, processing } = useForm<{
        config: string;
        app_config: Record<string, string>;
    }>({
        config,
        app_config: Object.fromEntries(
            Object.keys(definitions).map(name => [name, String(values[name] ?? '')]),
        ),
    });

    return (
        <>
            <Head title={`${title} settings`} />
            <header className="main-content__header" role="banner">
                <h1 className="main-content__page-title">{title} settings</h1>
            </header>
            <section className="main-content__body">
                <form
                    className="form"
                    onSubmit={event => {
                        event.preventDefault();
                        post('/super_admin/app_config');
                    }}
                >
                    {Object.entries(definitions).map(([name, definition]) => (
                        <div className="field-unit field-unit--string" key={name}>
                            <div className="field-unit__label">
                                <label htmlFor={`app_config_${name}`}>{definition.display_title}</label>
                            </div>
                            <div className="field-unit__field">
                                {definition.type === 'boolean' ? (
                                    <select
                                        id={`app_config_${name}`}
                                        value={data.app_config[name]}
                                        onChange={event =>
                                            setData('app_config', {
                                                ...data.app_config,
                                                [name]: event.target.value,
                                            })
                                        }
                                    >
                                        <option value="true">true</option>
                                        <option value="false">false</option>
                                    </select>
                                ) : (
                                    <input
                                        id={`app_config_${name}`}
                                        type="text"
                                        value={data.app_config[name]}
                                        onChange={event =>
                                            setData('app_config', {
                                                ...data.app_config,
                                                [name]: event.target.value,
                                            })
                                        }
                                    />
                                )}
                                <p className="text-sm text-n-slate-11">{definition.description}</p>
                            </div>
                        </div>
                    ))}
                    <div className="form-actions">
                        <input type="submit" value="Save" disabled={processing} />
                    </div>
                </form>
            </section>
        </>
    );
}
