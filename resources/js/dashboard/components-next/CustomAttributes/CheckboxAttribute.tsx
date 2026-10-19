import { useState } from 'react';

import Button from 'dashboard/components-next/button/Button';
import Switch from 'dashboard/components-next/switch/Switch';
import type { AttributeInputProps } from './types';

// Port từ components-next/CustomAttributes/CheckboxAttribute.vue
export default function CheckboxAttribute({ attribute, isEditingView = false, onUpdate, onDelete }: AttributeInputProps) {
    const [checked, setChecked] = useState(Boolean(attribute.value) && attribute.value !== 'false');

    return (
        <div className={`flex items-center w-full gap-2 ${isEditingView ? 'justify-start' : 'justify-end'}`}>
            <Switch
                value={checked}
                onChange={value => {
                    setChecked(value);
                    onUpdate(value);
                }}
            />
            {isEditingView ? (
                <Button
                    variant="faded"
                    color="ruby"
                    icon="i-lucide-trash"
                    size="xs"
                    className="flex-shrink-0 opacity-0 group-hover/attribute:opacity-100 hover:no-underline"
                    onClick={onDelete}
                />
            ) : null}
        </div>
    );
}
