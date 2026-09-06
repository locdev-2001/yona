import type { ReactNode } from 'react';

import Button from 'dashboard/components-next/button/Button';

// Port từ dashboard/components/ui/Dropdown/DropdownButton.vue
interface DropdownButtonProps {
    buttonText?: string;
    trailingIcon?: boolean;
    icon?: string;
    dropdown?: ReactNode;
    onClick: () => void;
}

export default function DropdownButton({
    buttonText = '',
    trailingIcon = false,
    icon = '',
    dropdown,
    onClick,
}: DropdownButtonProps) {
    return (
        <Button ghost slate sm className="relative" noAnimation icon={icon} trailingIcon={trailingIcon} onClick={onClick}>
            <span className="min-w-0 truncate">{buttonText}</span>
            {dropdown}
        </Button>
    );
}
