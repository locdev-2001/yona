import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminLayout from '@/layouts/admin/layout';
import { Head, router } from '@inertiajs/react';

interface MarketplaceItemRow {
    id: string;
    code: string;
    name: string;
    type: string;
    billing_type: string;
    price_cents: number;
    currency: string;
    flags: string[];
    quotas: Record<string, number>;
    active: boolean;
}

interface WorkspaceInfo {
    id: string;
    name: string;
    slug: string;
}

interface Props {
    workspace: WorkspaceInfo;
    items: MarketplaceItemRow[];
    channel_usage: Record<string, number>;
}

export default function AdminWorkspacePlans({ workspace, items, channel_usage }: Props) {
    const grant = (itemCode: string) => {
        router.post(`/admin/workspaces/${workspace.id}/plans`, { item_code: itemCode });
    };

    const revoke = (itemCode: string) => {
        router.delete(`/admin/workspaces/${workspace.id}/plans`, { data: { item_code: itemCode } });
    };

    return (
        <AdminLayout
            breadcrumbs={[
                { title: 'Workspaces', href: '/admin/workspaces' },
                { title: workspace.name, href: `/admin/workspaces/${workspace.id}` },
                { title: 'Quản lý gói', href: `/admin/workspaces/${workspace.id}/plans` },
            ]}
        >
            <Head title={`Gói — ${workspace.name}`} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="text-2xl font-semibold">Quản lý gói — {workspace.name}</h1>
                    <p className="text-muted-foreground mt-1 text-sm">{workspace.slug}</p>
                </div>

                {Object.keys(channel_usage).length > 0 && (
                    <div>
                        <h2 className="mb-2 text-base font-medium">Channel usage tháng này</h2>
                        <div className="flex gap-4">
                            {Object.entries(channel_usage).map(([channel, count]) => (
                                <div key={channel} className="bg-muted rounded-lg px-4 py-2 text-sm">
                                    <span className="font-medium">{channel}</span>: {count} hội thoại
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-card rounded-xl border shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tên gói</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Loại</TableHead>
                                <TableHead>Giá</TableHead>
                                <TableHead>Flags</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead className="text-right" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                                        Không có gói nào.
                                    </TableCell>
                                </TableRow>
                            )}
                            {items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell className="text-muted-foreground font-mono text-xs">{item.code}</TableCell>
                                    <TableCell>{item.type}</TableCell>
                                    <TableCell className="tabular-nums">
                                        {item.price_cents === 0
                                            ? 'Miễn phí'
                                            : `${item.price_cents.toLocaleString()} ${item.currency}`}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {item.flags.map((flag) => (
                                                <Badge key={flag} variant="secondary" className="text-xs">
                                                    {flag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {item.active ? (
                                            <Badge variant="default">Đang dùng</Badge>
                                        ) : (
                                            <Badge variant="outline">Chưa cấp</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {item.active ? (
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => revoke(item.code)}
                                            >
                                                Thu hồi
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="default"
                                                onClick={() => grant(item.code)}
                                            >
                                                Cấp gói
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AdminLayout>
    );
}
