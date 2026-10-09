import { useEffect, useMemo, useRef, useState } from 'react';
import { allowedCssProperties, sanitize } from 'lettersanitizer';

import { withExternalLinkTargets } from 'shared/helpers/externalLinks';

import { t } from '../../../../../i18n';
import {
    EMAIL_FRAME_ROOT_ID,
    EMAIL_FRAME_SANDBOX,
    buildEmailFrameDocument,
    fitEmailToWidth,
} from './emailLayout';

// Thân thư HTML trong iframe sandbox: CSS của ứng dụng không chạm vào thư (thuộc
// tính width/bgcolor, lề đoạn văn, @media của thư đều đúng như ứng dụng thư), script
// không chạy. Thư rộng hơn khung được thu nhỏ cho vừa; iframe cao đúng bằng thư nên
// không có thanh cuộn lồng trong bong bóng.

// Khoảng 10 giây ở 60 khung hình/giây; ảnh chậm hơn thì sự kiện load vẫn đo lần cuối.
const MAX_PROGRESSIVE_FIT_FRAMES = 600;

const ALLOWED_CSS_PROPERTIES = [...allowedCssProperties, 'transform', 'transform-origin'];

export default function EmailHtmlBody({ html }: { html: string }) {
    const frameRef = useRef<HTMLIFrameElement>(null);
    const [frameHeight, setFrameHeight] = useState(0);

    const frameDocument = useMemo(
        () =>
            buildEmailFrameDocument(
                withExternalLinkTargets(
                    sanitize(html, '', { allowedCssProperties: ALLOWED_CSS_PROPERTIES, preserveCssPriority: false }),
                ),
            ),
        [html],
    );

    useEffect(() => {
        const frame = frameRef.current;
        if (!frame) return undefined;

        const fitToFrame = () => {
            const emailDocument = frame.contentDocument;
            const root = emailDocument?.getElementById(EMAIL_FRAME_ROOT_ID);
            if (!emailDocument || !root) return;

            root.style.zoom = '';
            const scale = fitEmailToWidth(root.scrollWidth, emailDocument.documentElement.clientWidth);
            root.style.zoom = scale < 1 ? String(scale) : '';
            const horizontalScrollbar = emailDocument.documentElement.scrollWidth > emailDocument.documentElement.clientWidth;
            const height = Math.ceil(root.getBoundingClientRect().height) + (horizontalScrollbar ? 16 : 0);
            setFrameHeight(current => (current === height ? current : height));
        };

        // Thư dựng dần (ảnh tải về làm thư cao lên) nên đo mỗi khung hình tới khi tài
        // liệu tải xong; sau đó chỉ đo lại khi khung đổi bề ngang.
        let pendingFrame = 0;
        let remainingFrames = MAX_PROGRESSIVE_FIT_FRAMES;
        const fitUntilLoaded = () => {
            fitToFrame();
            const emailDocument = frame.contentDocument;
            const isLoaded =
                emailDocument?.readyState === 'complete' && emailDocument.getElementById(EMAIL_FRAME_ROOT_ID) !== null;
            remainingFrames -= 1;
            if (!isLoaded && remainingFrames > 0) pendingFrame = requestAnimationFrame(fitUntilLoaded);
        };
        const onLoad = () => {
            cancelAnimationFrame(pendingFrame);
            fitToFrame();
        };

        frame.addEventListener('load', onLoad);
        pendingFrame = requestAnimationFrame(fitUntilLoaded);

        let lastWidth = frame.clientWidth;
        const observer =
            typeof ResizeObserver === 'undefined'
                ? null
                : new ResizeObserver(() => {
                      if (frame.clientWidth === lastWidth) return;
                      lastWidth = frame.clientWidth;
                      fitToFrame();
                  });
        observer?.observe(frame);

        return () => {
            cancelAnimationFrame(pendingFrame);
            frame.removeEventListener('load', onLoad);
            observer?.disconnect();
        };
    }, [frameDocument]);

    return (
        <div className="overflow-hidden rounded-lg border border-n-weak bg-white">
            <iframe
                ref={frameRef}
                data-testid="email-html-body"
                title={t('EMAIL_HEADER.BODY_FRAME_TITLE')}
                sandbox={EMAIL_FRAME_SANDBOX}
                srcDoc={frameDocument}
                className="block w-full border-0"
                style={{ height: frameHeight }}
            />
        </div>
    );
}
