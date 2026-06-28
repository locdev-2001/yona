<?php

namespace Modules\PaymentManual\Services;

use App\Models\WorkspacePurchase;
use App\Modules\Integration\Contracts\PaymentDriver;

/**
 * ManualPaymentProvider — GĐ1: admin duyệt tay, không qua gateway ngoài.
 *
 * createCheckout(): đánh dấu purchase status='manual_pending' và trả về
 * thông tin để admin duyệt. Không redirect hay gọi API ngoài.
 *
 * verifyCallback(): no-op — manual không có IPN/callback.
 * refund(): no-op — manual không hỗ trợ hoàn tiền tự động GĐ1.
 */
class ManualPaymentProvider implements PaymentDriver
{
    public function key(): string
    {
        return 'manual';
    }

    /**
     * GĐ1: Đánh dấu purchase chờ admin duyệt (status = manual_pending).
     * Không tạo checkout URL, không gọi gateway ngoài.
     *
     * @param  array<string, mixed>  $payload
     * @return array{status: string, purchase_id: string, message: string}
     */
    public function createCheckout(string $workspaceId, string $itemId, array $payload = []): array
    {
        $purchase = WorkspacePurchase::withoutGlobalScope('workspace')
            ->where('workspace_id', $workspaceId)
            ->where('item_id', $itemId)
            ->whereIn('status', ['active', 'manual_pending'])
            ->first();

        if ($purchase) {
            return [
                'status' => $purchase->status,
                'purchase_id' => $purchase->id,
                'message' => 'Purchase đã tồn tại.',
            ];
        }

        $newPurchase = WorkspacePurchase::withoutGlobalScope('workspace')->create([
            'workspace_id' => $workspaceId,
            'item_id' => $itemId,
            'status' => 'manual_pending',
            'quantity' => $payload['quantity'] ?? 1,
            'external_ref' => $payload['external_ref'] ?? null,
        ]);

        return [
            'status' => 'manual_pending',
            'purchase_id' => $newPurchase->id,
            'message' => 'Đang chờ admin duyệt.',
        ];
    }

    /**
     * Manual không có callback — no-op, luôn trả false.
     *
     * @param  array<string, mixed>  $data
     */
    public function verifyCallback(array $data): bool
    {
        return false;
    }

    /**
     * Manual không hỗ trợ hoàn tiền tự động GĐ1.
     */
    public function refund(string $purchaseId, int $amountCents): bool
    {
        return false;
    }
}
