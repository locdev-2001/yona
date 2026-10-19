import type { ReactNode } from 'react';

// Port từ components-next/buttonGroup/ButtonGroup.vue.
interface ButtonGroupProps {
    noAnimation?: boolean;
    className?: string;
    children: ReactNode;
}

export default function ButtonGroup({ noAnimation = false, className = '', children }: ButtonGroupProps) {
    const animationClass = noAnimation
        ? ''
        : 'has-[button:not(:disabled):active]:scale-[0.98] transition-transform duration-150 ease-out';

    return <div className={`${animationClass} ${className}`.trim()}>{children}</div>;
}
