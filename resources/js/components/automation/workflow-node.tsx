import { useTranslator } from '@/lib/i18n';
import type { WorkflowNodeType } from '@/types';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ArrowRightLeft, Bell, CircleCheckBig, GitBranch, HelpCircle, Hourglass, ListTodo, MessageSquare, Play, Tag as TagIcon } from 'lucide-react';

const NODE_ICON: Record<WorkflowNodeType, React.ComponentType<{ className?: string }>> = {
    start: Play,
    condition: GitBranch,
    wait: Hourglass,
    end: CircleCheckBig,
    send_message: MessageSquare,
    create_task: ListTodo,
    notify_internal: Bell,
    tag: TagIcon,
    change_lead_stage: ArrowRightLeft,
};

const NODE_COLOR: Record<WorkflowNodeType, string> = {
    start: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
    condition: 'border-amber-400 bg-amber-50 dark:bg-amber-950/40',
    wait: 'border-slate-400 bg-slate-50 dark:bg-slate-900/40',
    end: 'border-slate-400 bg-slate-50 dark:bg-slate-900/40',
    send_message: 'border-blue-400 bg-blue-50 dark:bg-blue-950/40',
    create_task: 'border-blue-400 bg-blue-50 dark:bg-blue-950/40',
    notify_internal: 'border-blue-400 bg-blue-50 dark:bg-blue-950/40',
    tag: 'border-blue-400 bg-blue-50 dark:bg-blue-950/40',
    change_lead_stage: 'border-blue-400 bg-blue-50 dark:bg-blue-950/40',
};

export interface WorkflowNodeData extends Record<string, unknown> {
    nodeType: WorkflowNodeType;
    config: Record<string, unknown>;
    summary?: string;
}

/** Single generic node renderer for all 9 v1 types — the type-specific config
 * lives in the inspector panel, not here; this only shows a summary line. */
export function WorkflowNodeCard({ data, selected }: NodeProps & { data: WorkflowNodeData }) {
    const t = useTranslator();
    // Fallback covers a node type this frontend build doesn't know about yet
    // (e.g. a backend-only type shipped ahead of its canvas counterpart) —
    // server-side ValidatesWorkflowGraph rejects anything outside the v1
    // registry at write time, but a workflow saved by an older/newer build
    // can still reach this renderer, and NODE_ICON/NODE_COLOR are plain
    // lookups with no built-in fallback.
    const Icon = NODE_ICON[data.nodeType] ?? HelpCircle;
    const color = NODE_COLOR[data.nodeType] ?? 'border-red-400 bg-red-50 dark:bg-red-950/40';
    const isCondition = data.nodeType === 'condition';
    const isEnd = data.nodeType === 'end';
    const isStart = data.nodeType === 'start';

    return (
        <div className={`min-w-[180px] rounded-lg border-2 px-3 py-2 shadow-sm ${color} ${selected ? 'ring-ring ring-2 ring-offset-2' : ''}`}>
            {!isStart && <Handle type="target" position={Position.Top} className="!bg-muted-foreground !h-2 !w-2" />}

            <div className="flex items-center gap-2 text-sm font-medium">
                <Icon className="h-4 w-4 shrink-0" />
                <span>{t(`automation.node_types.${data.nodeType}`)}</span>
            </div>
            {data.summary && <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{data.summary}</p>}

            {!isEnd && !isCondition && <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !h-2 !w-2" />}

            {isCondition && (
                <>
                    <Handle id="true" type="source" position={Position.Bottom} style={{ left: '30%' }} className="!h-2 !w-2 !bg-emerald-500" />
                    <Handle id="false" type="source" position={Position.Bottom} style={{ left: '70%' }} className="!h-2 !w-2 !bg-red-500" />
                    <div className="text-muted-foreground mt-1 flex justify-between text-[10px]">
                        <span>{t('automation.canvas.branch_true')}</span>
                        <span>{t('automation.canvas.branch_false')}</span>
                    </div>
                </>
            )}
        </div>
    );
}
