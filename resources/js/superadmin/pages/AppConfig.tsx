import { router, useForm, usePage } from '@inertiajs/react';

import { Button } from '@admin/components/ui/button';
import { Input } from '@admin/components/ui/input';
import { Label } from '@admin/components/ui/label';
import { Switch } from '@admin/components/ui/switch';
import { Textarea } from '@admin/components/ui/textarea';
import PageHeader from '@admin/views/pages/page-header';
import SettingsSection from '@admin/views/pages/user-settings/settings-section';
import SettingsTabs from '@admin/views/pages/user-settings/settings-tabs';

import { useConsoleLabels } from '../labels';
import type { SuperAdminPageProps } from '../types';

type Definition = {
    display_title: string;
    description: string;
    type: string;
    options: Record<string, string> | null;
    // Giá trị mặc định trong config/installation_config.php, hiện làm placeholder.
    default?: string | null;
};

type Strings = { title: string; description: string; defaultValue: string; unsetValue: string };

type Props = {
    config: string;
    title: string;
    values: Record<string, string | number | boolean | null>;
    definitions: Record<string, Definition>;
    strings?: Strings;
};

const isTrue = (value: string) => value === 'true' || value === '1';

export default function AppConfig({ config, title, values, definitions, strings }: Props) {
    const label = useConsoleLabels();
    const placeholderFor = (definition: Definition) =>
        definition.default ? (strings?.defaultValue ?? '{value}').replace('{value}', definition.default) : (strings?.unsetValue ?? '');
    const sections = usePage<SuperAdminPageProps>().props.superAdmin?.settingsPages ?? [];
    const { data, setData, post, processing } = useForm<{
        config: string;
        app_config: Record<string, string>;
    }>({
        config,
        app_config: Object.fromEntries(Object.keys(definitions).map(name => [name, String(values[name] ?? '')])),
    });
    const update = (name: string, value: string) => setData('app_config', { ...data.app_config, [name]: value });

    const fields = (
        <form
            className="space-y-6"
            onSubmit={event => {
                event.preventDefault();
                post('/admin/app-config');
            }}
        >
            {Object.entries(definitions).map(([name, definition]) => {
                const id = `app_config_${name}`;
                const hintId = `${id}_hint`;
                const hint = definition.description ? (
                    <p id={hintId} className="text-muted-foreground text-xs">
                        {definition.description}
                    </p>
                ) : null;

                if (definition.type === 'boolean') {
                    return (
                        <div key={name} className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                            <div className="min-w-0 space-y-1">
                                <Label htmlFor={id}>{definition.display_title}</Label>
                                {hint}
                            </div>
                            <Switch
                                id={id}
                                checked={isTrue(data.app_config[name])}
                                onCheckedChange={checked => update(name, checked ? 'true' : 'false')}
                                aria-describedby={hint ? hintId : undefined}
                            />
                        </div>
                    );
                }

                return (
                    <div key={name} className="w-full space-y-2">
                        <Label htmlFor={id}>{definition.display_title}</Label>
                        {definition.type === 'code' ? (
                            <Textarea
                                id={id}
                                className="font-mono"
                                placeholder={placeholderFor(definition)}
                                value={data.app_config[name]}
                                aria-describedby={hint ? hintId : undefined}
                                onChange={event => update(name, event.target.value)}
                            />
                        ) : (
                            <Input
                                id={id}
                                type={definition.type === 'number' ? 'number' : 'text'}
                                autoComplete="off"
                                placeholder={placeholderFor(definition)}
                                value={data.app_config[name]}
                                aria-describedby={hint ? hintId : undefined}
                                onChange={event => update(name, event.target.value)}
                            />
                        )}
                        {hint}
                    </div>
                );
            })}
            <div className="flex justify-end">
                <Button type="submit" className="max-sm:w-full" disabled={processing}>
                    {processing ? label('saving') : label('save')}
                </Button>
            </div>
        </form>
    );

    return (
        <div className="console-resource-page">
            <PageHeader
                className="lg:mb-10"
                title={strings?.title ?? label('settings_title')}
                description={strings?.description ?? label('settings_description')}
            />

            <SettingsTabs
                tabs={sections.map(section => ({ value: section.key, name: section.label }))}
                value={config}
                label={strings?.title ?? label('settings_title')}
                onValueChange={key => {
                    const section = sections.find(candidate => candidate.key === key);
                    if (section) router.visit(section.url);
                }}
            >
                <section className="py-3">
                    <SettingsSection title={title} description={label('app_config_description')}>
                        {fields}
                    </SettingsSection>
                </section>
            </SettingsTabs>
        </div>
    );
}
