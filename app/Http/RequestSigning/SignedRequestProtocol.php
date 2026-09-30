<?php

namespace App\Http\RequestSigning;

// Hợp đồng ký + mã hoá, bản PHP. Bản TS nằm ở resources/js/shared/requestSigning/protocol.ts;
// hai bản khớp nhau nhờ bộ vector chung resources/js/shared/requestSigning/vectors.json.
final class SignedRequestProtocol
{
    public const VERSION = 'v1';

    public const HEADER_KEY_ID = 'X-Sig-Key-Id';

    public const HEADER_TIMESTAMP = 'X-Sig-Timestamp';

    public const HEADER_NONCE = 'X-Sig-Nonce';

    public const HEADER_SIGNATURE = 'X-Sig';

    // Trường duy nhất của thân JSON đã mã hoá, và trường chữ của multipart chứa các trường gốc.
    public const ENCRYPTED_FIELD = '_encrypted';

    // Laravel đọc `_method` để chọn route trước khi middleware chạy, nên nó phải đi dạng chữ trơn.
    public const PLAIN_MULTIPART_FIELDS = ['_method'];

    private const CIPHER = 'aes-256-gcm';

    private const IV_BYTES = 12;

    private const TAG_BYTES = 16;

    public static function canonical(string $method, string $uri, string $timestamp, string $nonce, string $bodyDigest): string
    {
        return implode("\n", [self::VERSION, strtoupper($method), $uri, $timestamp, $nonce, $bodyDigest]);
    }

    public static function sign(string $signingKey, string $canonical): string
    {
        return hash_hmac('sha256', $canonical, $signingKey);
    }

    public static function rawBodyDigest(string $body): string
    {
        return hash('sha256', $body);
    }

    /**
     * Multipart không ký byte thô (biên giới do trình duyệt tự sinh): ký các trường chữ và
     * băm từng tệp, không mã hoá tệp để tệp lớn không chậm thêm.
     *
     * @param  array<string, string>  $fields
     * @param  list<array{sha256: string, size: int}>  $files
     */
    public static function multipartDigest(array $fields, array $files): string
    {
        $lines = [];
        foreach ($fields as $name => $value) {
            $lines[] = 'field:'.$name.'='.$value;
        }
        foreach ($files as $file) {
            $lines[] = 'file:'.$file['sha256'].':'.$file['size'];
        }
        sort($lines, SORT_STRING);

        return hash('sha256', "multipart\n".implode("\n", $lines));
    }

    public static function encrypt(string $encryptionKey, string $plaintext, ?string $iv = null): string
    {
        $iv ??= random_bytes(self::IV_BYTES);
        $tag = '';
        $ciphertext = openssl_encrypt($plaintext, self::CIPHER, $encryptionKey, OPENSSL_RAW_DATA, $iv, $tag, '', self::TAG_BYTES);

        return base64_encode($iv.$ciphertext.$tag);
    }

    public static function decrypt(string $encryptionKey, string $envelope): ?string
    {
        $bytes = base64_decode($envelope, true);

        if ($bytes === false || strlen($bytes) < self::IV_BYTES + self::TAG_BYTES) {
            return null;
        }

        $plaintext = openssl_decrypt(
            substr($bytes, self::IV_BYTES, -self::TAG_BYTES),
            self::CIPHER,
            $encryptionKey,
            OPENSSL_RAW_DATA,
            substr($bytes, 0, self::IV_BYTES),
            substr($bytes, -self::TAG_BYTES),
        );

        return $plaintext === false ? null : $plaintext;
    }
}
