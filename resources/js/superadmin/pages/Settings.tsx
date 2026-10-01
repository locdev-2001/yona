import { Link } from '@inertiajs/react';

import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { useConsoleLabels } from '../ui/labels';
import { PageHeader } from '../ui/PageHeader';

// Bản CE chỉ còn danh sách mục cấu hình (khối gói cước/billing là enterprise).
export default function SuperAdminSettings({ sections }: { sections: { key: string; label: string; url: string }[] }) {
    const label = useConsoleLabels();

    return (
        <>
            <PageHeader title={label('settings_title')} description={label('settings_description')} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {sections.map(section => (
                    <Link
                        key={section.key}
                        href={section.url}
                        className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-console-ring/50"
                    >
                        <Card className="flex-row items-center gap-3 px-5 py-4 transition-colors group-hover:bg-console-muted">
                            <span className="flex size-9 items-center justify-center rounded-md bg-console-accent text-console-muted-foreground">
                                <Icon name="i-lucide-sliders-horizontal" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">
                                    {label('app_config_title', { section: section.label })}
                                </span>
                            </span>
                            <Icon name="i-lucide-chevron-right" className="text-console-muted-foreground" />
                        </Card>
                    </Link>
                ))}
            </div>
        </>
    );
}
