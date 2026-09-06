<?php

namespace App\Services\Zalo;

use App\Models\Channel\Zalo;
use Illuminate\Support\Str;

/**
 * Ba bước đăng nhập QR: mở phiên ở bridge → hỏi trạng thái (ảnh QR) → chốt phiên
 * (promote) rồi ghi danh tính tài khoản Zalo vào kênh. Port từ các action
 * store/qr/promote của ZaloConnectionController (nhánh `main`).
 *
 * Hai loại hỏng phải phân biệt được ngay trên màn hình (zalo-deep-audit 6.8):
 * KHÔNG nối được cầu nối (`bridge_unreachable`) khác hẳn cầu nối/Zalo TỪ CHỐI
 * (`bridge_rejected`) — cùng gộp thành "bridge chưa chạy" là chẩn đoán sai.
 */
class QrLoginService
{
    public const ERROR_BRIDGE_UNREACHABLE = 'bridge_unreachable';

    public const ERROR_BRIDGE_REJECTED = 'bridge_rejected';

    public const ERROR_ACCOUNT_MISMATCH = 'zalo_account_mismatch';

    public const ERROR_ACCOUNT_IN_USE = 'zalo_account_in_use';

    public const ERROR_NO_QR_SESSION = 'qr_session_missing';

    public function __construct(
        private readonly ZaloBridgeClient $bridge,
        private readonly ZaloProfileSync $profileSync,
    ) {}

    /** @return array<string, mixed> */
    public function start(Zalo $channel): array
    {
        // Mỗi lần mở QR phải dọn phiên quét dở trước: bridge từ chối 409
        // `login_in_progress` khi slot cũ còn đang chờ quét, và cookie của phiên bỏ
        // dở sống tới 24h (zalo-deep-audit 6.1 / 8.9).
        $this->cancelPendingQr($channel);

        $qrToken = (string) Str::uuid();
        $response = $this->bridge->startQrLogin($channel, $qrToken);

        if ($response === null) {
            return $this->unreachable();
        }

        if (! $response->successful()) {
            return $this->rejected($response->status(), $response->json('message'));
        }

        $channel->update([
            'qr_token' => $qrToken,
            'state' => Zalo::STATE_QR_WAITING,
            'last_qr_at' => now(),
        ]);

        return ['ok' => true, 'qr_token' => $qrToken, 'connection_id' => $channel->connectionId()];
    }

    /** @return array<string, mixed> */
    public function status(Zalo $channel): array
    {
        if (blank($channel->qr_token)) {
            return [
                'ok' => false,
                'status' => 409,
                'error_code' => self::ERROR_NO_QR_SESSION,
                'message' => self::line('NO_QR_SESSION'),
            ];
        }

        $response = $this->bridge->qrStatus($channel->qr_token);

        if ($response === null) {
            return $this->unreachable();
        }

        if (! $response->successful()) {
            return $this->rejected($response->status(), $response->json('message'));
        }

        return ['ok' => true, ...(array) $response->json()];
    }

    /** @return array<string, mixed> */
    public function promote(Zalo $channel): array
    {
        if (blank($channel->qr_token)) {
            return [
                'ok' => false,
                'status' => 409,
                'error_code' => self::ERROR_NO_QR_SESSION,
                'message' => self::line('NO_QR_SESSION'),
            ];
        }

        $response = $this->bridge->promote($channel, $channel->qr_token);

        if ($response === null) {
            return $this->unreachable();
        }

        if (! $response->successful()) {
            return $this->rejected($response->status(), $response->json('message'));
        }

        $data = (array) $response->json();
        $zaloUid = isset($data['personal_uid']) ? (string) $data['personal_uid'] : null;

        $conflict = $this->identityConflict($channel, $zaloUid);

        if ($conflict !== null) {
            // Slot ở bridge đã kết nối rồi: không đăng xuất thì listener vừa mở sẽ
            // đá phiên của hộp thư kia ra (zalo-deep-audit 6.4).
            $this->bridge->logout($channel);
            $channel->update(['qr_token' => null]);

            return $conflict;
        }

        $channel->update([
            ...array_filter(['zalo_uid' => $zaloUid], fn ($value) => $value !== null),
            'qr_token' => null,
        ]);

        $channel->markState(Zalo::STATE_CONNECTED);
        // Vừa quét xong là nguồn chuẩn: tên/SĐT/ảnh mới được phép ghi đè bản cũ.
        $this->profileSync->apply($channel, $data, authoritative: true);

        return [
            'ok' => true,
            'zalo_uid' => $channel->zalo_uid,
            'display_name' => $channel->display_name,
        ];
    }

    /**
     * Ngắt kết nối chủ động (hoặc để đổi sang tài khoản Zalo khác): đăng xuất slot
     * ở bridge rồi hạ trạng thái. Cố ý GIỮ `zalo_uid`/tên để màn cấu hình còn nói
     * được "hộp thư này từng gắn tài khoản nào", nhưng lần quét sau được phép gắn
     * tài khoản khác (xem identityConflict).
     *
     * @return array<string, mixed>
     */
    public function disconnect(Zalo $channel): array
    {
        $this->cancelPendingQr($channel);
        $response = $this->bridge->logout($channel);

        $channel->update(['qr_token' => null]);
        $channel->markState(Zalo::STATE_DISCONNECTED, 'user_disconnected');

        return [
            'ok' => true,
            'state' => $channel->state,
            // Bridge chết không được chặn người dùng gỡ kết nối, nhưng phải nói thật
            // là slot bên kia có thể còn sống tới lần bridge khởi động lại.
            'bridge_reachable' => $response !== null && $response->successful(),
        ];
    }

    private function cancelPendingQr(Zalo $channel): void
    {
        if (filled($channel->qr_token)) {
            $this->bridge->cancelQrLogin((string) $channel->qr_token);
        }
    }

    /**
     * Hai kiểu "sai tài khoản", thông điệp phải nói rõ khác nhau:
     *  - quét nhầm tài khoản khi ĐANG kết nối lại chính hộp thư này;
     *  - tài khoản Zalo đó đã gắn vào hộp thư khác trong cùng account.
     *
     * @return array<string, mixed>|null
     */
    private function identityConflict(Zalo $channel, ?string $zaloUid): ?array
    {
        if (blank($zaloUid)) {
            return null;
        }

        $userSwitchedOnPurpose = $channel->state === Zalo::STATE_DISCONNECTED;

        if (filled($channel->zalo_uid) && ! $userSwitchedOnPurpose && $zaloUid !== $channel->zalo_uid) {
            return [
                'ok' => false,
                'status' => 409,
                'error_code' => self::ERROR_ACCOUNT_MISMATCH,
                'bound_display_name' => $channel->display_name,
                'message' => self::line('ACCOUNT_MISMATCH', ['{name}' => (string) ($channel->display_name ?: $channel->zalo_uid)]),
            ];
        }

        $takenBy = Zalo::query()
            ->where('account_id', $channel->account_id)
            ->where('zalo_uid', $zaloUid)
            ->whereKeyNot($channel->getKey())
            ->with('inbox')
            ->first();

        if ($takenBy !== null) {
            return [
                'ok' => false,
                'status' => 409,
                'error_code' => self::ERROR_ACCOUNT_IN_USE,
                'inbox_name' => $takenBy->inbox?->name,
                'message' => self::line('ACCOUNT_IN_USE', ['{inbox}' => $takenBy->inbox?->name ?? '#'.$takenBy->getKey()]),
            ];
        }

        return null;
    }

    /**
     * Chuỗi lấy từ lang/{locale}/inbox_mgmt.php — cùng nguồn với giao diện
     * (ghi nhớ *i18n-single-source*). Placeholder theo kiểu Chatwoot `{name}` nên
     * thay bằng strtr chứ không phải `:name` của Laravel.
     *
     * @param  array<string, string>  $replace
     */
    private static function line(string $key, array $replace = []): string
    {
        return strtr((string) __("inbox_mgmt.ZALO_SESSION.ERRORS.{$key}"), $replace);
    }

    /** @return array<string, mixed> */
    private function unreachable(): array
    {
        return [
            'ok' => false,
            'status' => 503,
            'error_code' => self::ERROR_BRIDGE_UNREACHABLE,
            'message' => self::line('BRIDGE_UNREACHABLE'),
        ];
    }

    /** @return array<string, mixed> */
    private function rejected(int $status, mixed $bridgeMessage): array
    {
        return [
            'ok' => false,
            'status' => $status === 0 ? 502 : $status,
            'error_code' => self::ERROR_BRIDGE_REJECTED,
            'bridge_message' => is_string($bridgeMessage) ? $bridgeMessage : null,
            'message' => self::line('BRIDGE_REJECTED'),
        ];
    }
}
