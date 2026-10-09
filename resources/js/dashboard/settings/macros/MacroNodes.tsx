import { useRef, useState } from 'react';

import Button from 'dashboard/components-next/button/Button';
import type { UISettings } from 'dashboard/composables/useUISettings';
import { t } from '../../../i18n';
import MacroNode from './MacroNode';
import './macros.scss';
import type { MacroAction, MacroOptionSets } from './types';

// Port từ settings/macros/MacroNodes.vue. `vuedraggable` (Sortable) đổi sang
// HTML5 drag-and-drop của trình duyệt như PreChatFields.tsx — kéo bằng đúng tay
// cầm (nút i-lucide-menu) nên node chỉ draggable khi tay cầm đang giữ chuột.
interface Props {
    actions: MacroAction[];
    errors: Record<string, string>;
    optionSets: MacroOptionSets;
    uiSettings: UISettings;
    onChange: (actions: MacroAction[]) => void;
    onAddNewNode: () => void;
    onDeleteNode: (index: number) => void;
    onResetAction: (index: number) => void;
}

const FLOW_LABEL_CLASS = 'bg-n-solid-blue text-n-slate-12 py-1 px-1.5 leading-none text-sm rounded-md';

export default function MacroNodes({
    actions,
    errors,
    optionSets,
    uiSettings,
    onChange,
    onAddNewNode,
    onDeleteNode,
    onResetAction,
}: Props) {
    const [draggableIndex, setDraggableIndex] = useState<number | null>(null);
    const draggedIndex = useRef<number | null>(null);

    const moveAction = (from: number, to: number) => {
        if (from === to) return;
        const reordered = [...actions];
        const [moved] = reordered.splice(from, 1);
        reordered.splice(to, 0, moved);
        onChange(reordered);
    };

    return (
        <div className="macros__nodes">
            <div className="macro__node">
                <div>
                    <span className={FLOW_LABEL_CLASS}>{t('MACROS.EDITOR.START_FLOW')}</span>
                </div>
            </div>
            <div className="macros__nodes-draggable">
                {actions.map((action, index) => (
                    <div
                        key={index}
                        className="macro__node"
                        draggable={draggableIndex === index}
                        onDragStart={() => {
                            draggedIndex.current = index;
                        }}
                        onDragOver={event => event.preventDefault()}
                        onDrop={event => {
                            event.preventDefault();
                            if (draggedIndex.current !== null) moveAction(draggedIndex.current, index);
                            draggedIndex.current = null;
                            setDraggableIndex(null);
                        }}
                        onDragEnd={() => setDraggableIndex(null)}
                    >
                        <MacroNode
                            action={action}
                            index={index}
                            singleNode={actions.length === 1}
                            errorKey={errors[`action_${index}`] ?? ''}
                            optionSets={optionSets}
                            uiSettings={uiSettings}
                            onChange={updated => onChange(actions.map((item, i) => (i === index ? updated : item)))}
                            onResetAction={() => onResetAction(index)}
                            onDeleteNode={() => onDeleteNode(index)}
                            onDragHandleDown={() => setDraggableIndex(index)}
                            onDragHandleUp={() => setDraggableIndex(null)}
                        />
                    </div>
                ))}
            </div>
            <div className="macro__node">
                <div>
                    <Button
                        title={t('MACROS.EDITOR.ADD_BTN_TOOLTIP')}
                        label={t('MACROS.EDITOR.ADD_BTN_TOOLTIP')}
                        className="shadow-sm"
                        solid
                        teal
                        icon="i-lucide-circle-plus"
                        onClick={onAddNewNode}
                    />
                </div>
            </div>
            <div className="macro__node">
                <div>
                    <span className={FLOW_LABEL_CLASS}>{t('MACROS.EDITOR.END_FLOW')}</span>
                </div>
            </div>
        </div>
    );
}
