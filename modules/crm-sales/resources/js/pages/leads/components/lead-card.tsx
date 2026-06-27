import { Badge } from '@/components/ui/badge';
import { useTranslator } from '@/lib/i18n';
import type { Lead } from '@/types';
import { Link } from '@inertiajs/react';
import { DollarSign, Mail, Phone, User } from 'lucide-react';

interface Props {
    lead: Lead;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent, lead: Lead) => void;
}

export default function LeadCard({ lead, draggable, onDragStart }: Props) {
    const t = useTranslator();

    const statusBadge = lead.is_lost ? (
        <Badge variant="destructive" className="text-xs">
            {t('leads.status.lost')}
        </Badge>
    ) : lead.is_junk ? (
        <Badge variant="secondary" className="text-xs">
            {t('leads.status.junk')}
        </Badge>
    ) : lead.date_converted ? (
        <Badge variant="outline" className="text-xs">
            {t('leads.status.converted')}
        </Badge>
    ) : null;

    return (
        <div
            draggable={draggable}
            onDragStart={onDragStart ? (e) => onDragStart(e, lead) : undefined}
            className="bg-card hover:bg-accent/50 cursor-grab rounded-lg border p-3 shadow-sm transition-colors active:cursor-grabbing"
        >
            <div className="mb-2 flex items-start justify-between gap-2">
                <Link href={route('leads.show', lead.id)} className="text-sm font-medium hover:underline">
                    {lead.name}
                </Link>
                {statusBadge}
            </div>

            {lead.company && <p className="text-muted-foreground mb-1 truncate text-xs">{lead.company}</p>}

            <div className="space-y-1">
                {lead.email && (
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{lead.email}</span>
                    </span>
                )}
                {lead.phone && (
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                        <Phone className="h-3 w-3 shrink-0" />
                        {lead.phone}
                    </span>
                )}
                {lead.assignee && (
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                        <User className="h-3 w-3 shrink-0" />
                        {lead.assignee.name}
                    </span>
                )}
                {lead.lead_value && (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <DollarSign className="h-3 w-3 shrink-0" />
                        {Number(lead.lead_value).toLocaleString()}
                    </span>
                )}
            </div>

            {(lead.tags ?? []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                    {(lead.tags ?? []).slice(0, 3).map((tag) => (
                        <Badge
                            key={tag.id}
                            variant="outline"
                            className="px-1.5 py-0 text-[10px]"
                            style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                        >
                            {tag.name}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}
