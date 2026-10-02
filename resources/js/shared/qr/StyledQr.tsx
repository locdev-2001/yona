import { useEffect, useRef, useState } from 'react';
import QRCodeStyling, { type Options } from 'qr-code-styling';

import { bankLogoUrl } from '../banks/bankLogo';

const YONA_LOGO = '/brand-assets/logo_thumbnail.png';

export interface StyledQrProps {
    payload: string;
    size?: number;
    bankBin?: string;
    logoUrl?: string;
    className?: string;
    ariaLabel?: string;
}

// Mức H + logo 0.3: ZXing đọc được QR với mọi logo ngân hàng; logo to hơn bắt đầu có logo làm hỏng.
const BASE_OPTIONS: Omit<Options, 'data' | 'width' | 'height'> = {
    type: 'svg',
    margin: 4,
    qrOptions: {
        errorCorrectionLevel: 'H',
    },
    imageOptions: {
        hideBackgroundDots: true,
        imageSize: 0.3,
        margin: 4,
    },
    dotsOptions: {
        type: 'dots',
        color: '#111827',
    },
    cornersSquareOptions: {
        type: 'extra-rounded',
        color: '#1572E8',
    },
    cornersDotOptions: {
        type: 'dot',
        color: '#1572E8',
    },
    backgroundOptions: {
        color: 'transparent',
    },
};

export function buildQrOptions(payload: string, size: number, logo?: string): Options {
    return {
        ...BASE_OPTIONS,
        width: size,
        height: size,
        data: payload,
        ...(logo ? { image: logo } : {}),
    };
}

/** Logo chỉ nhúng sau khi tải được: thư viện bỏ vẽ cả QR nếu ảnh nhúng lỗi. */
function useLoadedLogo(preferred: string): string | undefined {
    const [loaded, setLoaded] = useState<string>();

    useEffect(() => {
        let alive = true;
        const tryLoad = (url: string, onFail?: () => void) => {
            const image = new Image();
            image.onload = () => alive && setLoaded(url);
            image.onerror = () => alive && onFail?.();
            image.src = url;
        };

        setLoaded(undefined);
        tryLoad(preferred, preferred === YONA_LOGO ? undefined : () => tryLoad(YONA_LOGO));

        return () => {
            alive = false;
        };
    }, [preferred]);

    return loaded;
}

export default function StyledQr({ payload, size = 220, bankBin, logoUrl, className, ariaLabel }: StyledQrProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const logo = useLoadedLogo(logoUrl ?? bankLogoUrl(bankBin) ?? YONA_LOGO);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return undefined;

        container.replaceChildren();
        new QRCodeStyling(buildQrOptions(payload, size, logo)).append(container);

        return () => container.replaceChildren();
    }, [payload, size, logo]);

    return <div ref={containerRef} role="img" aria-label={ariaLabel} className={className} style={{ width: size, height: size }} />;
}
