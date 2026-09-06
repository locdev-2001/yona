<?php

namespace App\Services\Zalo;

use App\Models\Channel\Zalo;
use Illuminate\Support\Str;

/**
 * Ba bước đăng nhập QR: mở phiên ở bridge → hỏi trạng thái (ảnh QR) → chốt phiên
 * (promote) rồi ghi danh tính tài khoản Zalo vào kênh. Port từ các action
 * store/qr/promote của ZaloConnectionController (nhánh `main`).
 */
class QrLoginService
{
    private const BRIDGE_DOWN_MESSAGE = 'Dịch vụ kết nối Zalo chưa chạy. Khởi động services/zalo-bridge rồi thử lại.';

    public function __construct(private readonly ZaloBridgeClient $bridge) {}

    /** @return array<string, mixed> */
    public function start(Zalo $channel): array
    {
        $qrToken = (string) Str::uuid();
        $response = $this->bridge->startQrLogin($channel, $qrToken);

        if ($response === null) {
            return ['ok' => false, 'message' => self::BRIDGE_DOWN_MESSAGE];
        }

        if (! $response->successful()) {
            return ['ok' => false, 'message' => $response->json('message') ?? 'qr_start_failed'];
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
            return ['ok' => false, 'message' => 'Chưa có phiên quét mã QR nào.'];
        }

        $response = $this->bridge->qrStatus($channel->qr_token);

        if ($response === null) {
            return ['ok' => false, 'message' => self::BRIDGE_DOWN_MESSAGE];
        }

        return ['ok' => true, ...(array) $response->json()];
    }

    /** @return array<string, mixed> */
    public function promote(Zalo $channel): array
    {
        if (blank($channel->qr_token)) {
            return ['ok' => false, 'status' => 422, 'message' => 'Chưa có phiên quét mã QR nào.'];
        }

        $response = $this->bridge->promote($channel, $channel->qr_token);

        if ($response === null) {
            return ['ok' => false, 'status' => 503, 'message' => self::BRIDGE_DOWN_MESSAGE];
        }

        if (! $response->successful()) {
            return [
                'ok' => false,
                'status' => $response->status(),
                'message' => $response->json('message') ?? 'promote_failed',
            ];
        }

        $data = (array) $response->json();
        $zaloUid = $data['personal_uid'] ?? null;

        // Quét nhầm tài khoản khi kết nối lại: giữ nguyên kênh, báo để người dùng quét lại.
        if (filled($channel->zalo_uid) && filled($zaloUid) && (string) $zaloUid !== $channel->zalo_uid) {
            $this->bridge->logout($channel);

            return [
                'ok' => false,
                'status' => 409,
                'error_code' => 'zalo_account_mismatch',
                'message' => 'Mã QR vừa quét thuộc tài khoản Zalo khác. Hãy quét đúng tài khoản đã kết nối.',
            ];
        }

        $channel->update([
            ...array_filter([
                'zalo_uid' => $zaloUid === null ? null : (string) $zaloUid,
                'display_name' => $data['display_name'] ?? null,
                'phone' => $data['phone'] ?? null,
            ], fn ($value) => $value !== null),
            'qr_token' => null,
        ]);

        $channel->markState(Zalo::STATE_CONNECTED);

        return [
            'ok' => true,
            'zalo_uid' => $channel->zalo_uid,
            'display_name' => $channel->display_name,
        ];
    }
}
