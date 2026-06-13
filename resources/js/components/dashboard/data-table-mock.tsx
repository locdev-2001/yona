import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type DealStatus } from '@/lib/status';
import { Plus } from 'lucide-react';

// Mock pipeline rows — dashboard-01 DataTable placeholder (no dnd/tanstack yet).
type Deal = { id: string; name: string; owner: string; stage: DealStatus; value: string; close: string };

const deals: Deal[] = [
    { id: 'D-1024', name: 'Acme Corp — Annual plan', owner: 'Linh Tran', stage: 'won', value: '$24,000', close: 'Jun 02, 2026' },
    { id: 'D-1025', name: 'Globex onboarding', owner: 'Minh Le', stage: 'pending', value: '$8,500', close: 'Jun 19, 2026' },
    { id: 'D-1026', name: 'Initech retainer', owner: 'Hoa Pham', stage: 'pending', value: '$12,300', close: 'Jul 01, 2026' },
    { id: 'D-1027', name: 'Umbrella POC', owner: 'Linh Tran', stage: 'lost', value: '$5,000', close: 'May 22, 2026' },
    { id: 'D-1028', name: 'Soylent expansion', owner: 'Minh Le', stage: 'won', value: '$31,200', close: 'Jun 11, 2026' },
];

const tabs = [
    { key: 'all', label: 'All deals', rows: deals },
    { key: 'pipeline', label: 'Pipeline', rows: deals.filter((d) => d.stage === 'pending') },
    { key: 'won', label: 'Won', rows: deals.filter((d) => d.stage === 'won') },
    { key: 'lost', label: 'Lost', rows: deals.filter((d) => d.stage === 'lost') },
];

function DealTable({ rows }: { rows: Deal[] }) {
    return (
        <div className="overflow-hidden rounded-xl border">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead>Deal</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead className="text-right">Close date</TableHead>
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
    return (
        <Tabs defaultValue="all" className="gap-4">
            <div className="flex items-center justify-between gap-2">
                <TabsList>
                    {tabs.map((t) => (
                        <TabsTrigger key={t.key} value={t.key}>
                            {t.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
                <Button size="sm">
                    <Plus className="size-4" />
                    <span className="hidden sm:inline">New deal</span>
                </Button>
            </div>
            {tabs.map((t) => (
                <TabsContent key={t.key} value={t.key}>
                    <DealTable rows={t.rows} />
                </TabsContent>
            ))}
        </Tabs>
    );
}
