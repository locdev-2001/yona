import { Link, useForm, usePage } from '@inertiajs/react';

import type { SuperAdminPageProps } from '../types';
import { Button } from '../ui/Button';
import { Card, CardContent, CardFooter } from '../ui/Card';
import { cn } from '../ui/cn';
import { Field, Input, Select } from '../ui/Input';
import { useConsoleLabels } from '../ui/labels';
import { PageHeader } from '../ui/PageHeader';

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

export default function AppConfig({ config, title, values, definitions }: Props) {
    const label = useConsoleLabels();
    const sections = usePage<SuperAdminPageProps>().props.superAdmin?.settingsPages ?? [];
    const { data, setData, post, processing } = useForm<{
        config: string;
        app_config: Record<string, string>;
    }>({
        config,
        app_config: Object.fromEntries(Object.keys(definitions).map(name => [name, String(values[name] ?? '')])),
    });
    const update = (name: string, value: string) => setData('app_config', { ...data.app_config, [name]: value });

    return (
        <>
            <PageHeader title={label('app_config_title', { section: title })} description={label('app_config_description')} />

            {sections.length > 0 ? (
                <nav aria-label={label('settings_title')} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
                    <ul className="flex w-max gap-1 rounded-lg bg-console-accent p-1">
                        {sections.map(section => (
                            <li key={section.key}>
                                <Link
                                    href={section.url}
                                    aria-current={section.key === config ? 'page' : undefined}
                                    className={cn(
                                        'block whitespace-nowrap rounded-md px-3 py-1 text-sm transition-colors',
                                        section.key === config
                                            ? 'bg-console-card font-medium text-console-foreground shadow-sm'
                                            : 'text-console-muted-foreground hover:text-console-foreground',
                                    )}
                                >
                                    {section.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            ) : null}

            <Card className="max-w-3xl">
                <form
                    onSubmit={event => {
                        event.preventDefault();
                        post('/admin/app_config');
                    }}
                >
                    <CardContent className="flex flex-col gap-5">
                        {Object.entries(definitions).map(([name, definition]) => {
                            const id = `app_config_${name}`;

                            return (
                                <Field key={name} label={definition.display_title} htmlFor={id} hint={definition.description}>
                                    {definition.type === 'boolean' ? (
                                        <Select id={id} value={data.app_config[name]} onChange={event => update(name, event.target.value)}>
                                            <option value="true">{label('yes')}</option>
                                            <option value="false">{label('no')}</option>
                                        </Select>
                                    ) : (
                                        <Input
                                            id={id}
                                            type="text"
                                            autoComplete="off"
                                            value={data.app_config[name]}
                                            onChange={event => update(name, event.target.value)}
                                        />
                                    )}
                                </Field>
                            );
                        })}
                    </CardContent>
                    <CardFooter className="mt-6 justify-end border-t border-console-border pt-5">
                        <Button type="submit" disabled={processing}>
                            {processing ? label('saving') : label('save')}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </>
    );
}
