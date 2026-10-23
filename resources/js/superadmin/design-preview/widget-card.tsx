import { useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@admin/components/ui/card';
import { dimensionTokens } from './tokens';

const cutoutCorners = ['top-right', 'bottom-right', 'bottom-left', 'top-left'] as const;
export type CardCutout = (typeof cutoutCorners)[number];

export function cardCutout(seed: string): CardCutout {
    const identityHash = Array.from(seed).reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 0);
    return cutoutCorners[identityHash % cutoutCorners.length];
}

function cutoutPath(width: number, height: number, cutoutSize: number, maxCutoutHeightRatio: number): string {
    const radius = Math.min(Number.parseFloat(dimensionTokens['panel-radius']), width / 4, height / 4);
    const notch = Math.min(cutoutSize, width / 3, height * maxCutoutHeightRatio);
    const innerRadius = Math.min(radius, notch / 2);
    const rightRadius = Math.min(radius, notch - innerRadius);
    return [
        `M ${radius} 0`,
        `H ${width - notch - innerRadius}`,
        `Q ${width - notch} 0 ${width - notch} ${innerRadius}`,
        `V ${notch - innerRadius}`,
        `Q ${width - notch} ${notch} ${width - notch + innerRadius} ${notch}`,
        `H ${width - rightRadius}`,
        `Q ${width} ${notch} ${width} ${notch + rightRadius}`,
        `V ${height - radius}`,
        `Q ${width} ${height} ${width - radius} ${height}`,
        `H ${radius}`,
        `Q 0 ${height} 0 ${height - radius}`,
        `V ${radius}`,
        `Q 0 0 ${radius} 0 Z`,
    ].join(' ');
}

export function useCardSurface<TElement extends HTMLElement>(
    corner: CardCutout,
    {
        cutoutSize = Number.parseFloat(dimensionTokens['card-cutout-size']),
        maxCutoutHeightRatio = 1 / 3,
    }: { cutoutSize?: number; maxCutoutHeightRatio?: number } = {},
) {
    const clipId = useId();
    const rootRef = useRef<TElement>(null);
    const [bounds, setBounds] = useState({ width: 0, height: 0 });

    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const observer = new ResizeObserver(([entry]) => {
            const box = entry.borderBoxSize?.[0];
            const width = box?.inlineSize ?? root.clientWidth;
            const height = box?.blockSize ?? root.clientHeight;
            setBounds((current) =>
                current.width === width && current.height === height ? current : { width, height },
            );
        });
        observer.observe(root);
        return () => observer.disconnect();
    }, []);

    const transforms: Record<CardCutout, string | undefined> = {
        'top-right': undefined,
        'top-left': `translate(${bounds.width} 0) scale(-1 1)`,
        'bottom-right': `translate(0 ${bounds.height}) scale(1 -1)`,
        'bottom-left': `translate(${bounds.width} ${bounds.height}) scale(-1 -1)`,
    };

    return {
        rootRef,
        geometry: (
            <svg className="shaped-card-geometry" aria-hidden="true" focusable="false">
                <defs>
                    <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                        <path
                            d={cutoutPath(bounds.width, bounds.height, cutoutSize, maxCutoutHeightRatio)}
                            transform={transforms[corner]}
                        />
                    </clipPath>
                </defs>
            </svg>
        ),
        surfaceStyle: bounds.width ? { clipPath: `url(#${clipId})` } : undefined,
    };
}

export function WidgetCard({
    title,
    description,
    children,
    footer,
    action,
    seed,
    appearance = 'surface',
    className = '',
    headingId,
    cutoutSize,
}: {
    title: string;
    description?: string;
    children: ReactNode;
    footer?: ReactNode;
    action?: ReactNode;
    seed: string;
    appearance?: 'surface' | 'highlight';
    className?: string;
    headingId?: string;
    cutoutSize?: number;
}) {
    const generatedId = useId();
    const titleId = headingId ?? generatedId;
    const corner = cardCutout(seed);
    const surface = useCardSurface<HTMLDivElement>(corner, { cutoutSize });

    return (
        <Card
            ref={surface.rootRef}
            role="region"
            aria-labelledby={titleId}
            className={`shaped-card ${className}`}
            style={cutoutSize === undefined ? undefined : { '--preview-card-cutout-size': `${cutoutSize}px` } as CSSProperties}
            data-cutout={corner}
            data-appearance={appearance}
        >
            {surface.geometry}
            <div className="shaped-card-surface" aria-hidden="true" style={surface.surfaceStyle} />
            {action && <div className="shaped-card-action">{action}</div>}
            <CardHeader className="shaped-card-header">
                <CardTitle id={titleId} role="heading" aria-level={2}>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent className="shaped-card-content">{children}</CardContent>
            {footer && <CardFooter className="shaped-card-footer">{footer}</CardFooter>}
        </Card>
    );
}
