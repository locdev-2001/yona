// Hợp đồng ký + mã hoá, bản TS. Bản PHP: app/Http/RequestSigning/SignedRequestProtocol.php;
// hai bản khớp nhau nhờ vectors.json dùng chung.

export const VERSION = 'v1';
export const HEADER_KEY_ID = 'X-Sig-Key-Id';
export const HEADER_TIMESTAMP = 'X-Sig-Timestamp';
export const HEADER_NONCE = 'X-Sig-Nonce';
export const HEADER_SIGNATURE = 'X-Sig';
export const ENCRYPTED_FIELD = '_encrypted';
export const PLAIN_MULTIPART_FIELDS = ['_method'];

const IV_BYTES = 12;
const NONCE_BYTES = 16;
const textEncoder = new TextEncoder();

export interface FileDigest {
    sha256: string;
    size: number;
}

export interface SessionKeys {
    encryptionKey: CryptoKey;
    signingKey: CryptoKey;
}

export function toBase64(bytes: Uint8Array): string {
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary);
}

export function fromBase64(encoded: string): Uint8Array<ArrayBuffer> {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
}

function toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(data: string | ArrayBuffer): Promise<string> {
    const bytes = typeof data === 'string' ? textEncoder.encode(data) : data;
    return toHex(await crypto.subtle.digest('SHA-256', bytes));
}

export function canonical(method: string, uri: string, timestamp: string, nonce: string, bodyDigest: string): string {
    return [VERSION, method.toUpperCase(), uri, timestamp, nonce, bodyDigest].join('\n');
}

export async function importSessionKeys(encryptionKey: string, signingKey: string): Promise<SessionKeys> {
    const [encryption, signing] = await Promise.all([
        crypto.subtle.importKey('raw', fromBase64(encryptionKey), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']),
        crypto.subtle.importKey('raw', fromBase64(signingKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    ]);
    return { encryptionKey: encryption, signingKey: signing };
}

export async function sign(signingKey: CryptoKey, canonicalText: string): Promise<string> {
    return toHex(await crypto.subtle.sign('HMAC', signingKey, textEncoder.encode(canonicalText)));
}

// Phong bì = base64(iv || ciphertext || tag), đúng thứ tự openssl phía PHP ghép lại.
export async function encrypt(
    encryptionKey: CryptoKey,
    plaintext: string,
    iv: Uint8Array<ArrayBuffer> = crypto.getRandomValues(new Uint8Array(IV_BYTES)),
): Promise<string> {
    const sealed = new Uint8Array(
        await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, encryptionKey, textEncoder.encode(plaintext)),
    );
    const envelope = new Uint8Array(iv.length + sealed.length);
    envelope.set(iv);
    envelope.set(sealed, iv.length);
    return toBase64(envelope);
}

export async function decrypt(encryptionKey: CryptoKey, envelope: string): Promise<string> {
    const bytes = fromBase64(envelope);
    const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: bytes.slice(0, IV_BYTES) },
        encryptionKey,
        bytes.slice(IV_BYTES),
    );
    return new TextDecoder().decode(plaintext);
}

export async function multipartDigest(fields: [string, string][], files: FileDigest[]): Promise<string> {
    const lines = [
        ...fields.map(([name, value]) => `field:${name}=${value}`),
        ...files.map((file) => `file:${file.sha256}:${file.size}`),
    ].sort();
    return sha256Hex(`multipart\n${lines.join('\n')}`);
}

export function randomNonce(): string {
    return toBase64(crypto.getRandomValues(new Uint8Array(NONCE_BYTES)));
}
