import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const PROBE_URL = '/api/v1/profile';

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
const reload = vi.fn();

const jsonResponse = (status: number) => new Response(status === 200 ? '{}' : '', { status });

function stubProbe(outcome: number | 'network-error') {
    fetchMock.mockImplementation(async input => {
        if (String(input) !== PROBE_URL) throw new Error(`unexpected fetch ${String(input)}`);
        if (outcome === 'network-error') throw new TypeError('Failed to fetch');
        return jsonResponse(outcome);
    });
}

const probeCalls = () => fetchMock.mock.calls.filter(([input]) => String(input) === PROBE_URL).length;

// Trạng thái "đã xử lý hết phiên" và lần hỏi dùng chung sống ở cấp module, nên mỗi ca
// nạp lại module cho sạch.
async function loadModule() {
    vi.resetModules();
    return import('./sessionRecovery');
}

beforeEach(() => {
    fetchMock.mockReset();
    reload.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(window, 'location', { value: { reload }, writable: true, configurable: true });
});

afterEach(() => vi.unstubAllGlobals());

describe('phục hồi phiên khi request JSON bị từ chối', () => {
    it('419 nhưng phiên còn: gửi lại đúng một lần và trả kết quả lần hai', async () => {
        const { sendWithSessionRecovery } = await loadModule();
        stubProbe(200);
        const send = vi.fn().mockResolvedValueOnce(jsonResponse(419)).mockResolvedValueOnce(jsonResponse(200));

        const response = await sendWithSessionRecovery(send);

        expect(send).toHaveBeenCalledTimes(2);
        expect(response.status).toBe(200);
        expect(reload).not.toHaveBeenCalled();
    });

    it('419 và phiên đã mất: gửi lại bằng token mới, endpoint cần đăng nhập trả 401 thì tải lại trang một lần', async () => {
        const { sendWithSessionRecovery } = await loadModule();
        stubProbe(401);
        const send = vi.fn().mockResolvedValueOnce(jsonResponse(419)).mockResolvedValueOnce(jsonResponse(401));

        const response = await sendWithSessionRecovery(send);

        expect(send).toHaveBeenCalledTimes(2);
        expect(response.status).toBe(401);
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('419 trên trang cho khách (quên mật khẩu): gửi lại bằng token mới là xong, không tải lại', async () => {
        const { sendWithSessionRecovery } = await loadModule();
        stubProbe(401);
        const send = vi.fn().mockResolvedValueOnce(jsonResponse(419)).mockResolvedValueOnce(jsonResponse(200));

        const response = await sendWithSessionRecovery(send);

        expect(send).toHaveBeenCalledTimes(2);
        expect(response.status).toBe(200);
        expect(reload).not.toHaveBeenCalled();
    });

    it('401 và phiên đã mất: tải lại trang một lần, không gửi lại', async () => {
        const { sendWithSessionRecovery } = await loadModule();
        stubProbe(401);
        const send = vi.fn().mockResolvedValue(jsonResponse(401));

        const response = await sendWithSessionRecovery(send);

        expect(send).toHaveBeenCalledTimes(1);
        expect(response.status).toBe(401);
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('401 do thiếu quyền (phiên vẫn còn): giữ nguyên 401, không tải lại, không gửi lại', async () => {
        const { sendWithSessionRecovery } = await loadModule();
        stubProbe(200);
        const send = vi.fn().mockResolvedValue(jsonResponse(401));

        const response = await sendWithSessionRecovery(send);

        expect(response.status).toBe(401);
        expect(send).toHaveBeenCalledTimes(1);
        expect(reload).not.toHaveBeenCalled();
    });

    it('nhiều request cùng 401 khi phiên mất: chỉ hỏi máy chủ một lần và tải lại một lần', async () => {
        const { sendWithSessionRecovery } = await loadModule();
        stubProbe(401);
        const send = () => Promise.resolve(jsonResponse(401));

        const responses = await Promise.all([
            sendWithSessionRecovery(send),
            sendWithSessionRecovery(send),
            sendWithSessionRecovery(send),
        ]);

        expect(responses.map(response => response.status)).toEqual([401, 401, 401]);
        expect(probeCalls()).toBe(1);
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('request hỏng sau khi đã tải lại trang thì không hỏi thêm', async () => {
        const { sendWithSessionRecovery } = await loadModule();
        stubProbe(401);
        const send = () => Promise.resolve(jsonResponse(401));

        await sendWithSessionRecovery(send);
        await sendWithSessionRecovery(send);

        expect(probeCalls()).toBe(1);
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('gửi lại vẫn 419: không gửi lần ba', async () => {
        const { sendWithSessionRecovery } = await loadModule();
        stubProbe(200);
        const send = vi.fn().mockResolvedValue(jsonResponse(419));

        const response = await sendWithSessionRecovery(send);

        expect(send).toHaveBeenCalledTimes(2);
        expect(response.status).toBe(419);
        expect(reload).not.toHaveBeenCalled();
    });

    it('hỏi phiên bị lỗi mạng: trả response gốc, không tải lại', async () => {
        const { sendWithSessionRecovery } = await loadModule();
        stubProbe('network-error');
        const send = vi.fn().mockResolvedValue(jsonResponse(401));

        const response = await sendWithSessionRecovery(send);

        expect(response.status).toBe(401);
        expect(send).toHaveBeenCalledTimes(1);
        expect(reload).not.toHaveBeenCalled();
    });

    it('response thành công hoặc lỗi khác không hỏi máy chủ', async () => {
        const { sendWithSessionRecovery } = await loadModule();

        await sendWithSessionRecovery(() => Promise.resolve(jsonResponse(200)));
        await sendWithSessionRecovery(() => Promise.resolve(jsonResponse(422)));
        await sendWithSessionRecovery(() => Promise.resolve(jsonResponse(500)));

        expect(fetchMock).not.toHaveBeenCalled();
    });
});
