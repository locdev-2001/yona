import { useCallback, useEffect, useRef, useState } from 'react';

import { t } from '../../../../i18n';
import { getJson, postJson } from 'dashboard/helper/apiClient';
import Button from 'dashboard/components-next/button/Button';
import Loader from 'shared/components/loader/Loader';

// Panel quét mã QR — port từ main:resources/js/pages/integration/zalo/index.tsx.
// Bridge chỉ cấp mã QR sống ~100 giây nên panel đếm ngược rồi tự xin mã mới tối đa
// 3 lần liên tiếp trước khi bắt người dùng bấm tay; mất kết nối cầu nối giữa chừng
// (poll lỗi liên tiếp) thoát spinner ngay, không chờ hết đếm ngược.
const POLL_INTERVAL_MS = 2000;
const COUNTDOWN_TICK_MS = 1000;
const QR_TTL_SECONDS = 100;
const MAX_AUTO_REFRESH = 3;
const MAX_CONSECUTIVE_POLL_FAILURES = 5;

type QrPhase = 'starting' | 'waiting' | 'scanned' | 'confirming' | 'connected' | 'error';

interface ZaloQrPanelProps {
    accountId: number;
    inboxId: number;
    // Hộp thư đã gắn sẵn một tài khoản (mất phiên/đổi tài khoản) — nhắc người dùng
    // quét đúng tài khoản, và làm fallback tên khi lỗi mismatch không kèm theo.
    boundAccountName?: string | null;
    onConnected: () => void;
}

interface QrStatusResponse {
    ok?: boolean;
    phase?: string;
    qr_image?: string;
    message?: string;
    error?: string;
}

interface ZaloApiErrorBody {
    error_code?: string;
    message?: string;
    bridge_message?: string;
    bound_display_name?: string;
    inbox_name?: string;
}

// Nguồn duy nhất dịch error_code của backend sang chuỗi hiện cho người dùng —
// dùng chung cho lỗi mở phiên QR (POST /qr) lẫn lỗi chốt phiên (POST /promote).
function resolveErrorMessage(body: ZaloApiErrorBody | undefined, boundAccountName?: string | null): string {
    switch (body?.error_code) {
        case 'bridge_unreachable':
            return t('INBOX_MGMT.ZALO_SESSION.ERRORS.BRIDGE_UNREACHABLE');
        case 'bridge_rejected':
            // `bridge_message` là văn bản kỹ thuật của bridge — backend đã ghi log,
            // không ghép vào câu hiện cho người dùng cuối.
            return t('INBOX_MGMT.ZALO_SESSION.ERRORS.BRIDGE_REJECTED');
        case 'zalo_account_mismatch':
            return t('INBOX_MGMT.ZALO_SESSION.ERRORS.ACCOUNT_MISMATCH', {
                name: body.bound_display_name ?? boundAccountName ?? '',
            });
        case 'zalo_account_in_use':
            return t('INBOX_MGMT.ZALO_SESSION.ERRORS.ACCOUNT_IN_USE', { inbox: body.inbox_name ?? '' });
        case 'qr_session_missing':
            return t('INBOX_MGMT.ZALO_SESSION.ERRORS.NO_QR_SESSION');
        default:
            // Lỗi không rõ mã (network lạ/500) — giữ nguyên message của backend nếu có,
            // chỉ rơi về câu trung lập khi backend không kèm message nào.
            return body?.message ?? t('INBOX_MGMT.ZALO_SESSION.ERRORS.BRIDGE_UNREACHABLE');
    }
}

const PHASE_MESSAGE_KEY: Partial<Record<QrPhase, string>> = {
    starting: 'INBOX_MGMT.ADD.ZALO_CHANNEL.QR.STARTING',
    scanned: 'INBOX_MGMT.ADD.ZALO_CHANNEL.QR.SCANNED',
    confirming: 'INBOX_MGMT.ADD.ZALO_CHANNEL.QR.CONFIRMING',
    connected: 'INBOX_MGMT.ADD.ZALO_CHANNEL.QR.CONNECTED',
};

export default function ZaloQrPanel({ accountId, inboxId, boundAccountName, onConnected }: ZaloQrPanelProps) {
    const [phase, setPhase] = useState<QrPhase>('starting');
    const [qrImage, setQrImage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isRefreshing, setRefreshing] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(QR_TTL_SECONDS);

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Ngân sách tự làm mới — reset về 0 chỉ khi người dùng bấm tay "Hiện mã QR mới".
    const refreshAttemptsRef = useRef(0);
    const consecutiveFailuresRef = useRef(0);
    // Nguồn thật của đếm ngược nằm ở ref (đọc trong interval, không qua setState
    // updater) để refreshOrFail() — một side effect — không chạy trong thân hàm cập
    // nhật state, tránh bị React StrictMode gọi hai lần ở dev.
    const remainingSecondsRef = useRef(QR_TTL_SECONDS);

    const basePath = `/api/v1/accounts/${accountId}/inboxes/${inboxId}/zalo`;

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const stopCountdown = useCallback(() => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
    }, []);

    const stopTimers = useCallback(() => {
        stopPolling();
        stopCountdown();
    }, [stopPolling, stopCountdown]);

    const fail = useCallback(
        (message: string) => {
            stopTimers();
            setPhase('error');
            setErrorMessage(message);
        },
        [stopTimers],
    );

    const promote = useCallback(async () => {
        setPhase('confirming');
        try {
            const result = await postJson<{ ok?: boolean } & ZaloApiErrorBody>(`${basePath}/promote`, {});
            if (!result.ok) throw new Error(result.message ?? '');
            setPhase('connected');
            onConnected();
        } catch (error) {
            const body = (error as { body?: ZaloApiErrorBody }).body;
            fail(resolveErrorMessage(body, boundAccountName));
        }
    }, [basePath, boundAccountName, fail, onConnected]);

    // isAutoRefresh=true: gọi lại vì QR hết hạn (đếm ngược về 0 hoặc bridge báo phase
    // lỗi) — giữ nguyên ngân sách refreshAttemptsRef, không reset phase về 'starting'
    // để tránh spinner nhấp nháy, chỉ hiện REFRESHING trong lúc chờ mã mới.
    const start = useCallback(
        async (isAutoRefresh = false) => {
            stopTimers();
            setQrImage(null);
            setErrorMessage(null);
            setRefreshing(isAutoRefresh);
            if (!isAutoRefresh) setPhase('starting');
            consecutiveFailuresRef.current = 0;

            // Tự tham chiếu `start` qua closure (hợp lệ: chỉ gọi lại sau khi interval bắn,
            // tức sau khi cả hàm này đã được gán xong) — tránh vòng phụ thuộc giữa hai
            // useCallback riêng biệt.
            const refreshOrFail = () => {
                stopTimers();
                if (refreshAttemptsRef.current >= MAX_AUTO_REFRESH) {
                    fail(t('INBOX_MGMT.ADD.ZALO_CHANNEL.QR.EXPIRED'));
                    return;
                }
                refreshAttemptsRef.current += 1;
                void start(true);
            };

            try {
                await postJson(`${basePath}/qr`, {});
            } catch (error) {
                const body = (error as { body?: ZaloApiErrorBody }).body;
                fail(resolveErrorMessage(body, boundAccountName));
                return;
            }

            setPhase('waiting');
            setRefreshing(false);
            remainingSecondsRef.current = QR_TTL_SECONDS;
            setRemainingSeconds(QR_TTL_SECONDS);

            countdownRef.current = setInterval(() => {
                remainingSecondsRef.current -= 1;
                setRemainingSeconds(Math.max(remainingSecondsRef.current, 0));
                if (remainingSecondsRef.current <= 0) refreshOrFail();
            }, COUNTDOWN_TICK_MS);

            pollRef.current = setInterval(() => {
                void (async () => {
                    let status: QrStatusResponse;
                    try {
                        status = await getJson<QrStatusResponse>(`${basePath}/qr_status`);
                        consecutiveFailuresRef.current = 0;
                    } catch {
                        consecutiveFailuresRef.current += 1;
                        if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_POLL_FAILURES) {
                            fail(t('INBOX_MGMT.ZALO_SESSION.ERRORS.BRIDGE_UNREACHABLE'));
                        }
                        return; // lỗi mạng chốc lát không được phá phiên đang chờ quét
                    }

                    if (status.qr_image) setQrImage(status.qr_image);

                    if (status.phase === 'ready') {
                        stopTimers();
                        setPhase('scanned');
                        await promote();
                    } else if (status.phase === 'error' || status.phase === 'session_lost') {
                        refreshOrFail();
                    }
                })();
            }, POLL_INTERVAL_MS);
        },
        [basePath, boundAccountName, fail, promote, stopTimers],
    );

    useEffect(() => {
        void start();
        return stopTimers;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const statusMessage =
        phase === 'waiting'
            ? t(isRefreshing ? 'INBOX_MGMT.ADD.ZALO_CHANNEL.QR.REFRESHING' : 'INBOX_MGMT.ADD.ZALO_CHANNEL.QR.WAITING')
            : t(PHASE_MESSAGE_KEY[phase] ?? 'INBOX_MGMT.ADD.ZALO_CHANNEL.QR.WAITING');

    const retry = () => {
        refreshAttemptsRef.current = 0;
        void start();
    };

    return (
        <div className="flex flex-col gap-4" data-testid="zalo-qr-panel">
            {boundAccountName ? (
                <p className="text-n-slate-11 text-sm">
                    {t('INBOX_MGMT.ADD.ZALO_CHANNEL.QR.BOUND_ACCOUNT', { name: boundAccountName })}
                </p>
            ) : null}

            {qrImage ? (
                <img
                    src={qrImage}
                    alt={t('INBOX_MGMT.ADD.ZALO_CHANNEL.QR.TITLE')}
                    className="size-48 rounded-lg border border-n-weak bg-white p-2"
                />
            ) : null}

            <div className="text-n-slate-11 text-sm leading-[1.65] mb-2 flex items-center gap-2">
                {phase === 'error' ? null : <Loader size={16} />}
                <span className={phase === 'error' ? 'text-n-ruby-11' : ''}>
                    {phase === 'error' ? errorMessage : statusMessage}
                </span>
            </div>

            {phase === 'waiting' && !isRefreshing ? (
                <p className="text-n-slate-10 text-xs">
                    {t('INBOX_MGMT.ADD.ZALO_CHANNEL.QR.EXPIRES_IN', { seconds: remainingSeconds })}
                </p>
            ) : null}

            {phase === 'error' ? (
                <div>
                    <Button
                        type="button"
                        solid
                        blue
                        label={t('INBOX_MGMT.ADD.ZALO_CHANNEL.QR.RETRY')}
                        onClick={retry}
                    />
                </div>
            ) : null}
        </div>
    );
}
