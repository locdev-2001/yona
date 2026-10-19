import { useState, type ReactNode } from 'react';

import { t } from '../../../i18n';

import './kit.css';

/** Chuỗi của kit (lang/*\/messaging.php → kit). */
export const kt = (key: string, values?: Record<string, string | number>): string => t(`MESSAGING.kit.${key}`, values);

/** Gốc mọi tin có cấu trúc: nạp token và font của kit. */
export function KitRoot({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <div className={`mk ${className}`.trim()}>{children}</div>;
}

export function Media({ src, alt = '', size }: { src?: string; alt?: string; size?: number }) {
    const [broken, setBroken] = useState(false);
    const style = size ? { width: size, height: size } : undefined;

    return (
        <span className="mk-media" style={style}>
            {src && !broken ? <img src={src} alt={alt} loading="lazy" onError={() => setBroken(true)} /> : null}
        </span>
    );
}
