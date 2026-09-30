import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
    ENCRYPTED_FIELD,
    HEADER_KEY_ID,
    HEADER_NONCE,
    HEADER_SIGNATURE,
    HEADER_TIMESTAMP,
    canonical,
    decrypt,
    importSessionKeys,
    multipartDigest,
    sha256Hex,
    sign,
} from './protocol';
import { RequestSigner, setRequestSigningEnabled, type KeyGrant, type PreparedRequest } from './signer';
import vectors from './vectors.json';

const grant = (keyId = 'key-1'): KeyGrant => ({
    enabled: true,
    key_id: keyId,
    encryption_key: vectors.encryption.key,
    signing_key: vectors.signature.key,
    server_time: Math.floor(Date.now() / 1000) + 120,
    protected_routes: [
        { methods: ['GET', 'POST'], pattern: '^/api/v1/widget/messages$' },
        { methods: ['PUT', 'PATCH'], pattern: '^/api/v1/widget/messages/[^/]+$' },
    ],
});

const keys = () => importSessionKeys(vectors.encryption.key, vectors.signature.key);

async function prepareOnce(signer: RequestSigner, method: string, url: string, body?: BodyInit): Promise<PreparedRequest> {
    let captured: PreparedRequest | null = null;
    signer.warmUp();
    await signer.send({ method, url, body }, async (prepared) => {
        captured = prepared;
        return new Response('{}', { status: 200 });
    });
    return captured!;
}

describe('RequestSigner', () => {
    beforeAll(() => setRequestSigningEnabled(true));
    afterAll(() => setRequestSigningEnabled(false));

    it('leaves requests to unprotected routes untouched', async () => {
        const signer = new RequestSigner(async () => grant());
        const prepared = await prepareOnce(signer, 'POST', '/api/v1/widget/events?website_token=a', '{"name":"x"}');

        expect(prepared).toEqual({ headers: {}, body: '{"name":"x"}' });
    });

    it('encrypts the JSON body and signs method, path with query, timestamp, nonce and body', async () => {
        const signer = new RequestSigner(async () => grant());
        const url = '/api/v1/widget/messages?website_token=a&locale=vi';
        const prepared = await prepareOnce(signer, 'post', url, '{"content":"Chào"}');
        const { encryptionKey, signingKey } = await keys();

        const envelope = JSON.parse(prepared.body as string)[ENCRYPTED_FIELD];
        expect(await decrypt(encryptionKey, envelope)).toBe('{"content":"Chào"}');

        const timestamp = Number(prepared.headers[HEADER_TIMESTAMP]);
        expect(Math.abs(timestamp - (Date.now() / 1000 + 120))).toBeLessThan(5);
        expect(prepared.headers[HEADER_KEY_ID]).toBe('key-1');

        const expected = await sign(
            signingKey,
            canonical(
                'POST',
                '/api/v1/widget/messages?website_token=a&locale=vi',
                prepared.headers[HEADER_TIMESTAMP],
                prepared.headers[HEADER_NONCE],
                await sha256Hex(prepared.body as string),
            ),
        );
        expect(prepared.headers[HEADER_SIGNATURE]).toBe(expected);
    });

    it('signs a body-less GET over the empty digest with a fresh nonce each time', async () => {
        const signer = new RequestSigner(async () => grant());
        const first = await prepareOnce(signer, 'GET', '/api/v1/widget/messages');
        const second = await prepareOnce(signer, 'GET', '/api/v1/widget/messages');

        expect(first.body).toBeUndefined();
        expect(first.headers[HEADER_NONCE]).not.toBe(second.headers[HEADER_NONCE]);
    });

    it('seals multipart text fields into one envelope, keeps _method and files, and hashes the files', async () => {
        const signer = new RequestSigner(async () => grant());
        const form = new FormData();
        form.append('content', 'Ảnh mới');
        form.append('attachments[]', new File(['hello'], 'a.txt', { type: 'text/plain' }));
        form.append('_method', 'PUT');
        const prepared = await prepareOnce(signer, 'POST', '/api/v1/widget/messages', form);
        const sealed = prepared.body as FormData;
        const { encryptionKey } = await keys();

        expect(sealed.get('content')).toBeNull();
        expect(sealed.get('_method')).toBe('PUT');
        expect((sealed.get('attachments[]') as File).name).toBe('a.txt');
        expect(await decrypt(encryptionKey, sealed.get(ENCRYPTED_FIELD) as string)).toBe('content=%E1%BA%A2nh+m%E1%BB%9Bi');

        const digest = await multipartDigest(
            [
                ['_method', 'PUT'],
                [ENCRYPTED_FIELD, sealed.get(ENCRYPTED_FIELD) as string],
            ],
            [{ sha256: await sha256Hex('hello'), size: 5 }],
        );
        const { signingKey } = await keys();
        expect(prepared.headers[HEADER_SIGNATURE]).toBe(
            await sign(
                signingKey,
                canonical('POST', '/api/v1/widget/messages', prepared.headers[HEADER_TIMESTAMP], prepared.headers[HEADER_NONCE], digest),
            ),
        );
    });

    it('fetches a new key once and resends when the server answers 428', async () => {
        const requestGrant = vi.fn().mockResolvedValueOnce(grant('old')).mockResolvedValueOnce(grant('new'));
        const signer = new RequestSigner(requestGrant);
        signer.warmUp();
        const keyIds: string[] = [];

        const response = await signer.send({ method: 'GET', url: '/api/v1/widget/messages' }, async (prepared) => {
            keyIds.push(prepared.headers[HEADER_KEY_ID]);
            return new Response('{}', { status: keyIds.length === 1 ? 428 : 200 });
        });

        expect(response.status).toBe(200);
        expect(keyIds).toEqual(['old', 'new']);
        expect(requestGrant).toHaveBeenCalledTimes(2);
    });

    it('does not hold back the first request before any key was requested; a 428 resends it signed', async () => {
        const requestGrant = vi.fn().mockResolvedValue(grant());
        const signer = new RequestSigner(requestGrant);
        const attempts: PreparedRequest[] = [];

        const response = await signer.send({ method: 'GET', url: '/api/v1/widget/messages' }, async (prepared) => {
            attempts.push(prepared);
            return new Response('{}', { status: prepared.headers[HEADER_SIGNATURE] ? 200 : 428 });
        });

        expect(response.status).toBe(200);
        expect(attempts.map((attempt) => Boolean(attempt.headers[HEADER_SIGNATURE]))).toEqual([false, true]);
    });

    it('sends plainly when the server has signing switched off or the key request failed', async () => {
        for (const requestGrant of [async () => ({ enabled: false }), async () => null, async () => Promise.reject(new Error('offline'))]) {
            const prepared = await prepareOnce(new RequestSigner(requestGrant), 'POST', '/api/v1/widget/messages', '{}');
            expect(prepared).toEqual({ headers: {}, body: '{}' });
        }
    });
});
