import { useCallback, useEffect, useRef, useState } from 'react';

import { t } from '../../../../i18n';
import { getJson, postJson } from 'dashboard/helper/apiClient';
import Button from 'dashboard/components-next/button/Button';
import Spinner from 'dashboard/components-next/spinner/Spinner';

// Panel quét mã QR — port từ main:resources/js/pages/integration/zalo/index.tsx.
// Bridge chỉ giữ phiên QR trong ít phút nên panel hỏi trạng thái mỗi 2 giây rồi
// tự chốt phiên (promote) ngay khi bridge báo đã quét xong.
const POLL_INTERVAL_MS = 2000;

type QrPhase = 'starting' | 'waiting' | 'scanned' | 'connected' | 'error';

interface ZaloQrPanelProps {
    accountId: number;
    inboxId: number;
    onConnected: () => void;
}

interface QrStatusResponse {
    ok?: boolean;
    phase?: string;
    qr_image?: string;
    message?: string;
    error?: string;
}

export default function ZaloQrPanel({ accountId, inboxId, onConnected }: ZaloQrPanelProps) {
    const [phase, setPhase] = useState<QrPhase>('starting');
    const [qrImage, setQrImage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const basePath = `/api/v1/accounts/${accountId}/inboxes/${inboxId}/zalo`;

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const fail = useCallback(
        (message: string) => {
            stopPolling();
            setPhase('error');
            setErrorMessage(message);
        },
        [stopPolling],
    );

    const promote = useCallback(async () => {
        try {
            const result = await postJson<{ ok?: boolean; error_code?: string; message?: string }>(
                `${basePath}/promote`,
                {},
            );
            if (!result.ok) throw new Error(result.message ?? '');
            setPhase('connected');
            onConnected();
        } catch (error) {
            const body = (error as { body?: { error_code?: string; message?: string } }).body;
            fail(
                body?.error_code === 'zalo_account_mismatch'
                    ? t('INBOX_MGMT.ADD.ZALO_CHANNEL.QR.MISMATCH')
                    : (body?.message ?? t('INBOX_MGMT.ADD.ZALO_CHANNEL.QR.BRIDGE_DOWN')),
            );
        }
    }, [basePath, fail, onConnected]);

    const start = useCallback(async () => {
        stopPolling();
        setPhase('starting');
        setQrImage(null);
        setErrorMessage(null);

        try {
            await postJson(`${basePath}/qr`, {});
        } catch (error) {
            const body = (error as { body?: { message?: string } }).body;
            fail(body?.message ?? t('INBOX_MGMT.ADD.ZALO_CHANNEL.QR.BRIDGE_DOWN'));

            return;
        }

        setPhase('waiting');
        pollRef.current = setInterval(() => {
            void (async () => {
                let status: QrStatusResponse;
                try {
                    status = await getJson<QrStatusResponse>(`${basePath}/qr_status`);
                } catch {
                    return; // lỗi mạng chốc lát không được phá phiên đang chờ quét
                }

                if (status.qr_image) setQrImage(status.qr_image);

                if (status.phase === 'ready') {
                    stopPolling();
                    setPhase('scanned');
                    await promote();
                } else if (status.phase === 'error') {
                    fail(status.error ?? t('INBOX_MGMT.ADD.ZALO_CHANNEL.QR.EXPIRED'));
                }
            })();
        }, POLL_INTERVAL_MS);
    }, [basePath, fail, promote, stopPolling]);

    useEffect(() => {
        void start();

        return stopPolling;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex flex-col gap-4" data-testid="zalo-qr-panel">
            {qrImage ? (
                <img
                    src={qrImage}
                    alt={t('INBOX_MGMT.ADD.ZALO_CHANNEL.QR.TITLE')}
                    className="size-48 rounded-lg border border-n-weak bg-white p-2"
                />
            ) : null}

            <p className="text-n-slate-11 text-sm flex items-center gap-2">
                {phase === 'error' ? null : <Spinner size={16} />}
                <span className={phase === 'error' ? 'text-n-ruby-11' : ''}>
                    {phase === 'error'
                        ? errorMessage
                        : t(
                              {
                                  starting: 'INBOX_MGMT.ADD.ZALO_CHANNEL.QR.STARTING',
                                  waiting: 'INBOX_MGMT.ADD.ZALO_CHANNEL.QR.WAITING',
                                  scanned: 'INBOX_MGMT.ADD.ZALO_CHANNEL.QR.SCANNED',
                                  connected: 'INBOX_MGMT.ADD.ZALO_CHANNEL.QR.CONNECTED',
                              }[phase],
                          )}
                </span>
            </p>

            {phase === 'error' ? (
                <div>
                    <Button
                        type="button"
                        solid
                        blue
                        label={t('INBOX_MGMT.ADD.ZALO_CHANNEL.QR.RETRY')}
                        onClick={() => void start()}
                    />
                </div>
            ) : null}
        </div>
    );
}
