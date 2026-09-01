import { useState } from 'react';

import Button from './Button';

// Port từ dashboard/components-next/button/ConfirmButton.vue (bỏ animation
// bounce-complete — chỉ là hiệu ứng 400ms sau khi xác nhận).
interface ConfirmButtonProps {
    label: string;
    confirmLabel: string;
    confirmHint?: string;
    color?: 'blue' | 'ruby' | 'amber' | 'slate' | 'teal';
    confirmColor?: 'blue' | 'ruby' | 'amber' | 'slate' | 'teal';
    variant?: 'solid' | 'outline' | 'faded' | 'link' | 'ghost';
    icon?: string;
    disabled?: boolean;
    className?: string;
    onClick: () => void;
}

export default function ConfirmButton({
    label,
    confirmLabel,
    confirmHint = '',
    color = 'blue',
    confirmColor = 'ruby',
    variant,
    icon = '',
    disabled = false,
    className = '',
    onClick,
}: ConfirmButtonProps) {
    const [isConfirmMode, setConfirmMode] = useState(false);

    const handleClick = () => {
        if (!isConfirmMode) {
            setConfirmMode(true);
            return;
        }
        onClick();
        setTimeout(() => setConfirmMode(false), 400);
    };

    return (
        <div className="relative">
            <Button
                type="button"
                label={isConfirmMode ? confirmLabel : label}
                color={isConfirmMode ? confirmColor : color}
                variant={variant}
                icon={icon}
                disabled={disabled}
                className={className}
                onClick={handleClick}
                onBlur={() => setConfirmMode(false)}
            />
            {isConfirmMode && confirmHint ? (
                <div className="absolute mt-1 w-full text-[10px] text-center text-n-slate-10">{confirmHint}</div>
            ) : null}
        </div>
    );
}
