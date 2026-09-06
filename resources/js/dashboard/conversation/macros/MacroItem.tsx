import { useRef, useState } from 'react';

import Button from 'dashboard/components-next/button/Button';
import { useClickAway } from 'dashboard/composables/useClickAway';
import type { Macro, MacroOptionSets } from 'dashboard/settings/macros/types';
import { t } from '../../../i18n';
import MacroPreview from './MacroPreview';

// Port từ conversation/Macros/MacroItem.vue
interface Props {
    macro: Macro;
    optionSets: MacroOptionSets;
    isExecuting?: boolean;
    onExecute: () => void;
    onDragHandleDown: () => void;
    onDragHandleUp: () => void;
}

export default function MacroItem({
    macro,
    optionSets,
    isExecuting = false,
    onExecute,
    onDragHandleDown,
    onDragHandleUp,
}: Props) {
    const [showPreview, setShowPreview] = useState(false);
    // Gốc đặt v-on-clickaway trên chính popup; ở đây đặt trên cả hàng để nút
    // "Preview" vẫn đóng/mở được (mousedown của clickaway chạy trước click).
    const rowRef = useRef<HTMLDivElement | null>(null);

    useClickAway(rowRef, () => setShowPreview(false), showPreview);

    return (
        <div
            ref={rowRef}
            className={`relative flex items-center justify-between leading-4 rounded-md h-10 pl-3 pr-2 ${
                showPreview ? 'cursor-default' : 'drag-handle cursor-grab'
            }`}
            onMouseDown={showPreview ? undefined : onDragHandleDown}
            onMouseUp={onDragHandleUp}
        >
            <span className="overflow-hidden whitespace-nowrap text-ellipsis font-medium text-n-slate-12">
                {macro.name}
            </span>
            <div className="flex items-center gap-1 justify-end">
                <Button
                    title={t('MACROS.EXECUTE.PREVIEW')}
                    icon="i-lucide-info"
                    slate
                    faded
                    xs
                    onClick={() => setShowPreview(current => !current)}
                />
                <Button
                    title={t('MACROS.EXECUTE.BUTTON_TOOLTIP')}
                    icon="i-lucide-play"
                    slate
                    faded
                    xs
                    isLoading={isExecuting}
                    disabled={isExecuting}
                    onClick={onExecute}
                />
            </div>
            {showPreview ? <MacroPreview macro={macro} optionSets={optionSets} /> : null}
        </div>
    );
}
