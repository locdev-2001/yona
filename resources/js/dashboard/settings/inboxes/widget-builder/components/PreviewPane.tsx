import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { t } from '../../../../../i18n';
import Segmented from 'dashboard/components-next/segmented/Segmented';
import type { WidgetSettingsShape } from '../../types';
import type { PreviewDevice } from '../types';

// Cùng giao thức với resources/js/widget/helpers/previewMode.ts — không import
// chéo sang bundle widget (không có alias, và hai bundle build riêng), chỉ lặp
// lại đúng 2 chuỗi hằng của giao thức đó.
const PREVIEW_READY_MESSAGE = 'yona-preview:ready';
const PREVIEW_CONFIG_MESSAGE = 'yona-preview:config';
const SEND_DEBOUNCE_MS = 150;

interface PreviewConfigPayload {
    widgetColor?: string;
    websiteName?: string;
    welcomeTagline?: string;
    widgetSettings?: WidgetSettingsShape;
}

interface PreviewPaneProps {
    websiteToken: string;
    websiteName: string;
    widgetColor: string;
    welcomeTagline: string;
    widgetSettings: WidgetSettingsShape;
    className?: string;
}

// { width, height } của khung iframe — cao hơn kích thước khung chat thật một
// khoảng để canvas còn chỗ hiện launcher bên dưới, đúng bản thiết kế.
const DEVICE_FRAMES: Record<PreviewDevice, { width: number; height: number }> = {
    desktop: { width: 380, height: 760 },
    mobile: { width: 320, height: 680 },
};

export default function PreviewPane({
    websiteToken,
    websiteName,
    widgetColor,
    welcomeTagline,
    widgetSettings,
    className = '',
}: PreviewPaneProps) {
    const [device, setDevice] = useState<PreviewDevice>('desktop');
    const [isReady, setReady] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const config = useMemo<PreviewConfigPayload>(
        () => ({ widgetColor, websiteName, welcomeTagline, widgetSettings }),
        [widgetColor, websiteName, welcomeTagline, widgetSettings],
    );

    const sendConfig = useCallback(() => {
        iframeRef.current?.contentWindow?.postMessage(
            { type: PREVIEW_CONFIG_MESSAGE, config },
            window.location.origin,
        );
    }, [config]);

    // Chỉ nhận 'ready' từ chính origin của mình (widget cùng domain dashboard) —
    // khớp listenForPreviewConfig() phía widget.
    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            const data = event.data as { type?: unknown } | null;
            if (data?.type === PREVIEW_READY_MESSAGE) setReady(true);
        };
        window.addEventListener('message', onMessage);

        return () => window.removeEventListener('message', onMessage);
    }, []);

    // Gửi lại mỗi lần cấu hình đổi, gộp các đổi liên tiếp (gõ chữ) vào một lần gửi.
    useEffect(() => {
        if (!isReady) return undefined;
        const timeout = window.setTimeout(sendConfig, SEND_DEBOUNCE_MS);

        return () => window.clearTimeout(timeout);
    }, [isReady, sendConfig]);

    const frame = DEVICE_FRAMES[device];

    return (
        <div className={`flex flex-col gap-3 ${className}`}>
            <div className="flex items-center justify-between gap-3">
                <span className="text-heading-3 text-n-slate-12">{t('WIDGET_BUILDER.PREVIEW.TITLE')}</span>
                <Segmented
                    ariaLabel={t('WIDGET_BUILDER.PREVIEW.DEVICE_LABEL')}
                    size="sm"
                    value={device}
                    options={[
                        { value: 'desktop', label: t('WIDGET_BUILDER.PREVIEW.DEVICE_DESKTOP') },
                        { value: 'mobile', label: t('WIDGET_BUILDER.PREVIEW.DEVICE_MOBILE') },
                    ]}
                    onChange={value => setDevice(value as PreviewDevice)}
                />
            </div>
            <div className="flex justify-center items-start rounded-2xl bg-n-surface-2 p-4 overflow-hidden">
                <iframe
                    ref={iframeRef}
                    title={t('WIDGET_BUILDER.PREVIEW.IFRAME_TITLE')}
                    src={`/widget?website_token=${encodeURIComponent(websiteToken)}&preview=1`}
                    style={{ width: frame.width, height: frame.height, maxWidth: '100%' }}
                    className="rounded-xl border-0"
                />
            </div>
        </div>
    );
}
