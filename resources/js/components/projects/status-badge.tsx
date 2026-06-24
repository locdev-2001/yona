import { Badge } from '@/components/ui/badge';
import type { ProjectStatus } from '@/types';

interface Props {
    status: ProjectStatus | null | undefined;
}

export default function StatusBadge({ status }: Props) {
    if (!status) return <Badge variant="outline">—</Badge>;

    return (
        <Badge style={status.color ? { backgroundColor: status.color, color: '#fff', borderColor: status.color } : {}} variant="outline">
            {status.name}
        </Badge>
    );
}
