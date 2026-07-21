import { useTranslator } from '@/lib/i18n';
import type { WorkflowNodeType } from '@/types';
import { PALETTE_NODE_TYPES } from './node-registry';

/** Drag-from-palette source — react-dnd/dnd-kit would be overkill for a
 * single drag target; native HTML5 DnD (dataTransfer) is enough here and
 * matches @xyflow/react's own drag-and-drop example. */
export function Palette() {
    const t = useTranslator();

    function onDragStart(e: React.DragEvent, nodeType: WorkflowNodeType) {
        e.dataTransfer.setData('application/workflow-node-type', nodeType);
        e.dataTransfer.effectAllowed = 'move';
    }

    return (
        <div className="w-48 shrink-0 space-y-1 border-r p-3">
            <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">{t('automation.canvas.palette_title')}</p>
            {PALETTE_NODE_TYPES.map((nodeType) => (
                <div
                    key={nodeType}
                    draggable
                    onDragStart={(e) => onDragStart(e, nodeType)}
                    className="bg-card cursor-grab rounded-md border px-2 py-1.5 text-xs active:cursor-grabbing"
                >
                    {t(`automation.node_types.${nodeType}`)}
                </div>
            ))}
        </div>
    );
}
