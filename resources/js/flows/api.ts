import type { FlowResponse } from './types';

// Hai đường duy nhất của trang công khai theo token — không session, không CSRF,
// giống survey/api.ts. Token sai/hết hạn/đã dùng trả 404 y hệt nhau (chống dò).
const endpoint = (token: string) => `/public/api/v1/flows/${token}`;

async function parse(response: Response): Promise<unknown> {
    const body = await response.text();
    const payload = body ? JSON.parse(body) : {};

    if (!response.ok) {
        throw new Error((payload as { error?: string; message?: string }).error ?? (payload as { message?: string }).message ?? '');
    }

    return payload;
}

export const getFlow = async (token: string): Promise<FlowResponse> =>
    parse(await fetch(endpoint(token), { headers: { Accept: 'application/json' } })) as Promise<FlowResponse>;

export const submitFlow = async (token: string, body: Record<string, unknown>): Promise<void> => {
    await parse(
        await fetch(`${endpoint(token)}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(body),
        }),
    );
};
