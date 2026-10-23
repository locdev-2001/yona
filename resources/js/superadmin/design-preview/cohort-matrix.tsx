import { Progress } from '@admin/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@admin/components/ui/table';
import './cohort-matrix.css';

export type CohortMatrixRow = {
    id: string;
    week: string;
    members: string;
    retention: ({ percent: number | null; label: string; description: string } | null)[];
};

export function CohortMatrix({ rows, weeks, label, weekLabel = 'Tuần đăng ký', futureLabel = 'Chưa đến tuần này' }: { rows: CohortMatrixRow[]; weeks: string[]; label: string; weekLabel?: string; futureLabel?: string }) {
    return (
        <div className="cohort-matrix" role="region" tabIndex={0} aria-label={label}>
            <Table>
                <caption className="sr-only">{label}</caption>
                <TableHeader>
                    <TableRow>
                        <TableHead scope="col">{weekLabel}</TableHead>
                        {weeks.map(week => <TableHead key={week} scope="col">{week}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map(row => (
                        <TableRow key={row.id}>
                            <TableHead scope="row">
                                <strong>{row.week}</strong>
                                <span className="cohort-members">{row.members}</span>
                            </TableHead>
                            {weeks.map((week, offset) => {
                                const retention = row.retention[offset];
                                return (
                                    <TableCell key={week}>
                                        {retention?.percent != null ? (
                                            <div className="cohort-rate" title={retention.description}>
                                                <span>{retention.label}</span>
                                                <Progress value={retention.percent} aria-label={retention.description} />
                                            </div>
                                        ) : <span className="cohort-missing" title={retention?.description ?? futureLabel}>—</span>}
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
