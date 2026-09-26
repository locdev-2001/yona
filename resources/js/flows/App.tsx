import { useEffect, useState } from 'react';

import 'shared/messaging/kit/kit.css';

import { t } from '../i18n';
import { getFlow } from './api';
import { FLOW_PAGES } from './registry';
import { isEmbedded, notifyClose, notifySubmitted } from './postMessage';
import type { FlowResponse } from './types';

// Trang công khai theo token (`/m/{token}`, phase-05 §C). Mở trực tiếp (link
// Zalo/SMS) hoặc trong iframe của Sheet widget — Sheet tự vẽ khung (grabber,
// tiêu đề, khoá, nút mở tab mới/đóng), trang chỉ vẽ nội dung khi ở trong iframe.
function tokenFromPath(): string {
    const match = window.location.pathname.match(/\/m\/([^/]+)/);

    return match ? match[1] : '';
}

export default function App() {
    const [token] = useState(tokenFromPath);
    const [flow, setFlow] = useState<FlowResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const embedded = isEmbedded();

    useEffect(() => {
        getFlow(token)
            .then(setFlow)
            .catch(() => setError(t('FLOWS.not_found')))
            .finally(() => setLoading(false));
    }, [token]);

    const handleSubmitted = () => {
        setSubmitted(true);
        if (flow) notifySubmitted(flow.message_id);
    };

    const rootClass = 'mk flow-page';

    if (loading) {
        return (
            <div className={rootClass}>
                <div className="flow-state">{t('FLOWS.loading')}</div>
            </div>
        );
    }

    if (error || !flow) {
        return (
            <div className={rootClass}>
                <div className="flow-state">{error || t('FLOWS.not_found')}</div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className={rootClass}>
                <div className="flow-state">
                    <p className="mk-title">{t('FLOWS.submitted_title')}</p>
                    <p>{t('FLOWS.submitted_body')}</p>
                    {embedded ? (
                        <button type="button" className="mk-pill mk-pill--soft" onClick={() => notifyClose()}>
                            {t('FLOWS.close')}
                        </button>
                    ) : (
                        <p className="mk-meta">{t('FLOWS.you_can_close_tab')}</p>
                    )}
                </div>
            </div>
        );
    }

    const Page = FLOW_PAGES[flow.purpose];

    return (
        <div className={rootClass}>
            {!embedded ? <div className="flow-header">{flow.org_name}</div> : null}
            <Page flow={flow} token={token} onSubmitted={handleSubmitted} />
        </div>
    );
}
