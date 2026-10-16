import {
    ENCRYPTED_FIELD,
    HEADER_KEY_ID,
    HEADER_NONCE,
    HEADER_SIGNATURE,
    HEADER_TIMESTAMP,
    PLAIN_MULTIPART_FIELDS,
    canonical,
    encrypt,
    importSessionKeys,
    multipartDigest,
    randomNonce,
    sha256Hex,
    sign,
    type FileDigest,
    type SessionKeys,
} from './protocol';

// Máy chủ trả 428 khi khoá thiếu, hết hạn, bị thu hồi hoặc giờ máy lệch: xin khoá mới rồi gửi lại.
const KEY_REQUIRED_STATUS = 428;

export interface KeyGrant {
    enabled: boolean;
    key_id?: string;
    encryption_key?: string;
    signing_key?: string;
    server_time?: number;
    protected_routes?: { methods: string[]; pattern: string }[];
}

export interface OutgoingRequest {
    method: string;
    url: string;
    body?: BodyInit | null;
}

export interface PreparedRequest {
    headers: Record<string, string>;
    body?: BodyInit | null;
}

interface ProtectedRoute {
    methods: string[];
    pattern: RegExp;
}

type SigningSession =
    | { enabled: false }
    | { enabled: true; keyId: string; keys: SessionKeys; clockOffsetSeconds: number; routes: ProtectedRoute[] };

async function toSession(grant: KeyGrant | null): Promise<SigningSession> {
    if (!grant?.enabled || !grant.key_id || !grant.encryption_key || !grant.signing_key || !globalThis.crypto?.subtle) {
        return { enabled: false };
    }
    return {
        enabled: true,
        keyId: grant.key_id,
        keys: await importSessionKeys(grant.encryption_key, grant.signing_key),
        clockOffsetSeconds: (grant.server_time ?? Date.now() / 1000) - Date.now() / 1000,
        routes: (grant.protected_routes ?? []).map((route) => ({
            methods: route.methods.map((method) => method.toUpperCase()),
            pattern: new RegExp(route.pattern),
        })),
    };
}

async function encryptBody(
    keys: SessionKeys,
    body: BodyInit | null | undefined,
): Promise<{ body: BodyInit | null | undefined; digest: string }> {
    if (body === undefined || body === null || body === '') {
        return { body, digest: await sha256Hex('') };
    }
    if (typeof body === 'string') {
        const envelope = JSON.stringify({ [ENCRYPTED_FIELD]: await encrypt(keys.encryptionKey, body) });
        return { body: envelope, digest: await sha256Hex(envelope) };
    }
    if (body instanceof FormData) {
        return encryptForm(keys, body);
    }
    throw new TypeError('Unsupported body type for a signed request');
}

// Tệp không mã hoá (tệp lớn sẽ chậm): chỉ băm vào chữ ký. Các trường chữ gom thành một phong bì.
async function encryptForm(keys: SessionKeys, form: FormData): Promise<{ body: FormData; digest: string }> {
    const textFields = new URLSearchParams();
    const plainFields: [string, string][] = [];
    const files: [string, File][] = [];

    form.forEach((value, name) => {
        if (typeof value !== 'string') files.push([name, value]);
        else if (PLAIN_MULTIPART_FIELDS.includes(name)) plainFields.push([name, value]);
        else textFields.append(name, value);
    });

    const signedFields = [...plainFields];
    if (textFields.size) {
        signedFields.push([ENCRYPTED_FIELD, await encrypt(keys.encryptionKey, textFields.toString())]);
    }

    const fileDigests: FileDigest[] = await Promise.all(
        files.map(async ([, file]) => ({ sha256: await sha256Hex(await file.arrayBuffer()), size: file.size })),
    );

    const sealed = new FormData();
    signedFields.forEach(([name, value]) => sealed.append(name, value));
    files.forEach(([name, file]) => sealed.append(name, file, file.name));

    return { body: sealed, digest: await multipartDigest(signedFields, fileDigests) };
}

export class RequestSigner {
    private session: Promise<SigningSession> | null = null;

    constructor(private readonly requestGrant: () => Promise<KeyGrant | null>) {}

    invalidate(): void {
        this.session = null;
    }

    // Xin khoá sẵn ở nền (vd ngay khi widget có phiên khách) để request nhắn tin đầu tiên không phải chờ.
    warmUp(): void {
        void this.loadSession();
    }

    // Chưa từng xin khoá thì không chặn request: xin ở nền và gửi thường. Nếu route cần ký,
    // máy chủ trả 428 và send() gửi lại sau khi có khoá; request không cần ký không phải chờ gì.
    async prepare(request: OutgoingRequest): Promise<PreparedRequest> {
        if (!this.session) {
            this.warmUp();
            return { headers: {}, body: request.body };
        }

        const session = await this.session;
        const target = new URL(request.url, window.location.origin);
        const method = request.method.toUpperCase();

        if (
            !session.enabled ||
            !session.routes.some((route) => route.methods.includes(method) && route.pattern.test(target.pathname))
        ) {
            return { headers: {}, body: request.body };
        }

        const { body, digest } = await encryptBody(session.keys, request.body);
        const timestamp = String(Math.floor(Date.now() / 1000 + session.clockOffsetSeconds));
        const nonce = randomNonce();
        const signature = await sign(
            session.keys.signingKey,
            canonical(method, target.pathname + target.search, timestamp, nonce, digest),
        );

        return {
            headers: {
                [HEADER_KEY_ID]: session.keyId,
                [HEADER_TIMESTAMP]: timestamp,
                [HEADER_NONCE]: nonce,
                [HEADER_SIGNATURE]: signature,
            },
            body,
        };
    }

    // Điểm duy nhất client gửi request có thể phải ký: chuẩn bị, gửi, và tự phục hồi một lần khi 428.
    async send(request: OutgoingRequest, transport: (prepared: PreparedRequest) => Promise<Response>): Promise<Response> {
        const response = await transport(await this.prepare(request));
        if (response.status !== KEY_REQUIRED_STATUS) return response;

        this.invalidate();
        await this.loadSession();
        return transport(await this.prepare(request));
    }

    private loadSession(): Promise<SigningSession> {
        this.session ??= this.requestGrant()
            .catch(() => null)
            .then(toSession)
            .catch((): SigningSession => ({ enabled: false }));
        return this.session;
    }
}
