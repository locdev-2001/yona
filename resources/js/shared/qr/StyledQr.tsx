import { useEffect, useRef, useState } from 'react';
import QRCodeStyling, { type Options } from 'qr-code-styling';

const VIETQR_LOGO_CDN = 'https://cdn.vietqr.io/img';
const YONA_LOGO = '/brand-assets/logo_thumbnail.png';

export interface StyledQrProps {
    payload: string;
    size?: number;
    /** Mã ngân hàng VietQR (ICB, VCB, BIDV…) — tự tra logo từ CDN. */
    bankCode?: string;
    /** URL logo tuỳ chọn, ưu tiên hơn bankCode. */
    logoUrl?: string;
    className?: string;
    ariaLabel?: string;
}

function resolveLogoUrl(bankCode?: string, logoUrl?: string): string {
    if (logoUrl) return logoUrl;
    if (bankCode) return `${VIETQR_LOGO_CDN}/${bankCode}.png`;
    return YONA_LOGO;
}

const BASE_OPTIONS: Omit<Options, 'data' | 'width' | 'height'> = {
    type: 'svg',
    margin: 4,
    qrOptions: {
        errorCorrectionLevel: 'Q',
    },
    dotsOptions: {
        type: 'classy-rounded',
        gradient: {
            type: 'linear',
            rotation: Math.PI / 4,
            colorStops: [
                { offset: 0, color: '#009dff' },
                { offset: 1, color: '#0affef' },
            ],
        },
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

export function buildQrOptions(payload: string, size: number): Options {
    return {
        ...BASE_OPTIONS,
        width: size,
        height: size,
        data: payload,
    };
}

export default function StyledQr({ payload, size = 220, bankCode, logoUrl, className, ariaLabel }: StyledQrProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const qrRef = useRef<QRCodeStyling | null>(null);
    const [logoLoaded, setLogoLoaded] = useState(false);
    const resolvedLogo = resolveLogoUrl(bankCode, logoUrl);
    const logoSize = Math.round(size * 0.22);

    useEffect(() => {
        if (!containerRef.current) return undefined;

        const options = buildQrOptions(payload, size);
        const qr = new QRCodeStyling(options);
        containerRef.current.replaceChildren();
        qr.append(containerRef.current);
        qrRef.current = qr;

        return () => {
            containerRef.current?.replaceChildren();
            qrRef.current = null;
        };
    }, [payload, size]);

    useEffect(() => {
        setLogoLoaded(false);
    }, [resolvedLogo]);

    return (
        <div role="img" aria-label={ariaLabel} className={className} style={{ position: 'relative', width: size, height: size }}>
            <div ref={containerRef} />
            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: logoSize + 12,
                    height: logoSize + 12,
                    borderRadius: '50%',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                }}
            >
                <img
                    src={resolvedLogo}
                    width={logoSize}
                    height={logoSize}
                    alt=""
                    style={{ borderRadius: '50%', objectFit: 'contain', opacity: logoLoaded ? 1 : 0, transition: 'opacity 0.2s' }}
                    onLoad={() => setLogoLoaded(true)}
                    onError={event => {
                        const img = event.currentTarget;
                        if (img.src !== YONA_LOGO) {
                            img.src = YONA_LOGO;
                        }
                    }}
                />
            </div>
        </div>
    );
}
