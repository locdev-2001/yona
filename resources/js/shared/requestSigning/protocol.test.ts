import { describe, expect, it } from 'vitest';
import {
    canonical,
    decrypt,
    encrypt,
    fromBase64,
    importSessionKeys,
    multipartDigest,
    sha256Hex,
    sign,
} from './protocol';
import vectors from './vectors.json';

// Cùng bộ vector với tests/Unit/Http/SignedRequestProtocolTest.php: đổi một phía mà không đổi
// phía kia là đỏ ở cả hai.
const sessionKeys = () => importSessionKeys(vectors.encryption.key, vectors.signature.key);

describe('request signing protocol matches the PHP side', () => {
    it('encrypts to the exact envelope PHP produces for the same key and iv', async () => {
        const { encryptionKey } = await sessionKeys();

        expect(await encrypt(encryptionKey, vectors.encryption.plaintext, fromBase64(vectors.encryption.iv))).toBe(
            vectors.encryption.envelope,
        );
        expect(await decrypt(encryptionKey, vectors.encryption.envelope)).toBe(vectors.encryption.plaintext);
    });

    it('round-trips a random-iv envelope', async () => {
        const { encryptionKey } = await sessionKeys();
        const envelope = await encrypt(encryptionKey, 'Xin chào 👋');

        expect(envelope).not.toBe(await encrypt(encryptionKey, 'Xin chào 👋'));
        expect(await decrypt(encryptionKey, envelope)).toBe('Xin chào 👋');
    });

    it('builds the same canonical string, body digest and signature', async () => {
        const { signingKey } = await sessionKeys();
        const vector = vectors.signature;
        const digest = await sha256Hex(vector.body);
        const canonicalText = canonical(vector.method, vector.uri, vector.timestamp, vector.nonce, digest);

        expect(digest).toBe(vector.body_digest);
        expect(canonicalText).toBe(vector.canonical);
        expect(await sign(signingKey, canonicalText)).toBe(vector.signature);
        expect(await sha256Hex('')).toBe(vectors.empty_body_digest);
    });

    it('digests multipart fields and file hashes order-independently', async () => {
        const vector = vectors.multipart;
        const files = await Promise.all(
            vector.file_contents.map(async (content) => ({ sha256: await sha256Hex(content), size: content.length })),
        );

        expect(files).toEqual(vector.files);
        expect(await multipartDigest(Object.entries(vector.fields), files)).toBe(vector.digest);
        expect(await multipartDigest(Object.entries(vector.fields).reverse(), [...files].reverse())).toBe(vector.digest);
    });

    it('encodes form fields the way PHP parse_str reads multipart fields', () => {
        const encoded = new URLSearchParams();
        vectors.form.entries.forEach(([name, value]) => encoded.append(name, value));

        expect(encoded.toString()).toBe(vectors.form.encoded);
    });
});
