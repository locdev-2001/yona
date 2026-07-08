import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslator } from '@/lib/i18n';
import { type DealStatus } from '@/lib/status';
import { Plus } from 'lucide-react';

// Mock pipeline rows — placeholder data; wire to TanStack Table + API later.
type Deal = { id: string; name: string; owner: string; stage: DealStatus; value: string; close: string };

const deals: Deal[] = [
    { id: 'D-1024', name: 'Acme Corp - Annual plan', owner: 'Linh Tran', stage: 'won', value: '₫24.000.000', close: '02/06/2026' },
    { id: 'D-1025', name: 'Globex onboarding', owner: 'Minh Le', stage: 'pending', value: '₫8.500.000', close: '19/06/2026' },
    { id: 'D-1026', name: 'Initech retainer', owner: 'Hoa Pham', stage: 'pending', value: '₫12.300.000', close: '01/07/2026' },
    { id: 'D-1027', name: 'Umbrella POC', owner: 'Linh Tran', stage: 'lost', value: '₫5.000.000', close: '22/05/2026' },
    { id: 'D-1028', name: 'Soylent expansion', owner: 'Minh Le', stage: 'won', value: '₫31.200.000', close: '11/06/2026' },
];

const tabs = [
    { key: 'all', labelKey: 'platform.dashboard.deals.all', rows: deals },
    { key: 'pipeline', labelKey: 'platform.dashboard.deals.pipeline', rows: deals.filter((d) => d.stage === 'pending') },
    { key: 'won', labelKey: 'platform.dashboard.deals.won', rows: deals.filter((d) => d.stage === 'won') },
    { key: 'lost', labelKey: 'platform.dashboard.deals.lost', rows: deals.filter((d) => d.stage === 'lost') },
] as const;

function DealTable({ rows }: { rows: Deal[] }) {
    const t = useTranslator();

    return (
        <div className="overflow-hidden rounded-lg border">
            <Table>
                <TableHeader className="bg-secondary">
                    <TableRow>
                        <TableHead>{t('platform.dashboard.deals.col_deal')}</TableHead>
                        <TableHead>{t('platform.dashboard.deals.col_owner')}</TableHead>
                        <TableHead>{t('platform.dashboard.deals.col_stage')}</TableHead>
                        <TableHead className="text-right">{t('platform.dashboard.deals.col_value')}</TableHead>
                        <TableHead className="text-right">{t('platform.dashboard.deals.col_close')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((d) => (
                        <TableRow key={d.id}>
                            <TableCell>
                                <div className="font-medium">{d.name}</div>
                                <div className="text-muted-foreground text-xs tabular-nums">{d.id}</div>
                            </TableCell>
                            <TableCell>{d.owner}</TableCell>
                            <TableCell>
                                <StatusBadge status={d.stage} />
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{d.value}</TableCell>
                            <TableCell className="text-muted-foreground text-right tabular-nums">{d.close}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export function DataTableMock() {
    const t = useTranslator();

    return (
        <Tabs defaultValue="all" className="gap-4">
            <div className="flex items-center justify-between gap-2">
                <TabsList>
                    {tabs.map((tab) => (
                        <TabsTrigger key={tab.key} value={tab.key}>
                            {t(tab.labelKey)}
                        </TabsTrigger>
                    ))}
                </TabsList>
                <Button size="sm">
                    <Plus className="size-4" />
                    <span className="hidden sm:inline">{t('platform.dashboard.deals.new')}</span>
                </Button>
            </div>
            {tabs.map((tab) => (
                <TabsContent key={tab.key} value={tab.key}>
                    <DealTable rows={tab.rows} />
                </TabsContent>
            ))}
        </Tabs>
    );
}
