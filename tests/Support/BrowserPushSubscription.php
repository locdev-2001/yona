<?php

namespace Tests\Support;

use RuntimeException;

// Đóng vai một trình duyệt đăng ký Web Push: tự giữ cặp khoá P-256 + bí mật auth
// như PushManager.subscribe() sinh ra, và giải mã được thông báo aes128gcm
// (RFC 8291) mà máy chủ gửi — test kiểm đúng thứ trình duyệt thật nhận được.
final class BrowserPushSubscription
{
    private const P256_SPKI_PREFIX = '3059301306072a8648ce3d020106082a8648ce3d030107034200';

    private function __construct(
        public readonly string $endpoint,
        private readonly \OpenSSLAsymmetricKey $privateKey,
        private readonly string $publicKey,
        private readonly string $authSecret,
    ) {}

    public static function make(string $endpoint = 'https://fcm.googleapis.com/fcm/send/browser-token'): self
    {
        $privateKey = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
        $details = openssl_pkey_get_details($privateKey);
        $publicKey = "\x04"
            .str_pad($details['ec']['x'], 32, "\0", STR_PAD_LEFT)
            .str_pad($details['ec']['y'], 32, "\0", STR_PAD_LEFT);

        return new self($endpoint, $privateKey, $publicKey, random_bytes(16));
    }

    /** @return array{endpoint: string, p256dh: string, auth: string} */
    public function attributes(): array
    {
        return [
            'endpoint' => $this->endpoint,
            'p256dh' => self::base64Url($this->publicKey),
            'auth' => self::base64Url($this->authSecret),
        ];
    }

    /** @return array<string, mixed> */
    public function decrypt(string $body): array
    {
        $salt = substr($body, 0, 16);
        $keyIdLength = ord($body[20]);
        $serverPublicKey = substr($body, 21, $keyIdLength);
        $cipherText = substr($body, 21 + $keyIdLength);

        $sharedSecret = openssl_pkey_derive(self::publicKeyResource($serverPublicKey), $this->privateKey, 32);
        $keyInfo = "WebPush: info\0".$this->publicKey.$serverPublicKey;
        $inputKey = hash_hkdf('sha256', $sharedSecret, 32, $keyInfo, $this->authSecret);
        $contentKey = hash_hkdf('sha256', $inputKey, 16, "Content-Encoding: aes128gcm\0", $salt);
        $nonce = hash_hkdf('sha256', $inputKey, 12, "Content-Encoding: nonce\0", $salt);

        $padded = openssl_decrypt(
            substr($cipherText, 0, -16),
            'aes-128-gcm',
            $contentKey,
            OPENSSL_RAW_DATA,
            $nonce,
            substr($cipherText, -16),
        );

        if ($padded === false) {
            throw new RuntimeException('Cannot decrypt web push payload');
        }

        // Bản ghi cuối: nội dung + dấu 0x02 + phần đệm toàn 0x00.
        $plainText = substr(rtrim($padded, "\0"), 0, -1);

        return json_decode($plainText, true, flags: JSON_THROW_ON_ERROR);
    }

    private static function publicKeyResource(string $rawPoint): \OpenSSLAsymmetricKey
    {
        $pem = "-----BEGIN PUBLIC KEY-----\n"
            .chunk_split(base64_encode(hex2bin(self::P256_SPKI_PREFIX).$rawPoint), 64, "\n")
            ."-----END PUBLIC KEY-----\n";

        return openssl_pkey_get_public($pem);
    }

    private static function base64Url(string $bytes): string
    {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }
}
