import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTranslator } from '@/lib/i18n';
import { FolderTree, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';

export interface TeamNodeData {
    id: string;
    name: string;
    parent_id: string | null;
    member_count: number;
    children: TeamNodeData[];
}

interface TeamNodeProps {
    node: TeamNodeData;
    depth: number;
    onAddChild: (parentId: string) => void;
    onRename: (node: TeamNodeData) => void;
    onMove: (node: TeamNodeData) => void;
    onDelete: (node: TeamNodeData) => void;
}

export function TeamNode({ node, depth, onAddChild, onRename, onMove, onDelete }: TeamNodeProps) {
    const t = useTranslator();

    return (
        <>
            <div
                className="hover:bg-muted flex items-center gap-2 rounded-lg px-2 py-2"
                // Dynamic indentation by tree depth is a genuinely computed value.
                style={{ paddingLeft: `${depth * 1.25 + 0.5}rem` }}
            >
                <FolderTree className="text-muted-foreground size-4 shrink-0" />
                <span className="flex-1 truncate text-sm font-medium">{node.name}</span>
                <span className="text-muted-foreground text-xs tabular-nums">{t('platform.teams.members_count', { count: node.member_count })}</span>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7">
                            <MoreHorizontal className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onAddChild(node.id)}>
                            <Plus className="mr-2 size-4" />
                            {t('platform.teams.add_child')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRename(node)}>
                            <Pencil className="mr-2 size-4" />
                            {t('platform.actions.rename')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onMove(node)}>
                            <FolderTree className="mr-2 size-4" />
                            {t('platform.actions.move')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(node)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 size-4" />
                            {t('platform.actions.delete')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {node.children.map((child) => (
                <TeamNode
                    key={child.id}
                    node={child}
                    depth={depth + 1}
                    onAddChild={onAddChild}
                    onRename={onRename}
                    onMove={onMove}
                    onDelete={onDelete}
                />
            ))}
        </>
    );
}
