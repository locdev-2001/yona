import { Link } from '@inertiajs/react';
import { ChevronRightIcon, SlidersHorizontalIcon } from 'lucide-react';

import { buttonVariants } from '@admin/components/ui/button';
import { Card, CardContent } from '@admin/components/ui/card';
import PageHeader from '@admin/views/pages/page-header';

import { useConsoleLabels } from '../labels';

// Bản CE chỉ còn danh sách mục cấu hình (khối gói cước/billing là enterprise).
export default function SuperAdminSettings({ sections }: { sections: { key: string; label: string; url: string }[] }) {
    const label = useConsoleLabels();

    return (
        <div>
            <PageHeader className="lg:mb-10" title={label('settings_title')} description={label('settings_description')} />

            <Card className="gap-0 py-0">
                <CardContent className="px-0">
                    <ul className="divide-y">
                        {sections.map(section => {
                            const title = label('app_config_title', { section: section.label });

                            return (
                                <li key={section.key} className="flex items-center justify-between gap-4 px-6 py-4">
                                    <div className="flex min-w-0 flex-1 items-center gap-4">
                                        <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-sm">
                                            <SlidersHorizontalIcon className="size-4" />
                                        </div>
                                        <Link href={section.url} className="truncate font-medium hover:underline">
                                            {title}
                                        </Link>
                                    </div>
                                    <Link href={section.url} tabIndex={-1} aria-hidden="true" className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
                                        <ChevronRightIcon className="size-4.5" />
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
