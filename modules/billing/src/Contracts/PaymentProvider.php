<?php

namespace Modules\Billing\Contracts;

/**
 * PaymentProvider contract — payment-manual implements GĐ1; VNPay/MoMo GĐ2+.
 *
 * F25: GĐ1 = one-off purchase only. Auto-recurring/dunning/proration hoãn Phase 08+.
 * Billing không biết payment-manual (N1); PaymentManager là registry driver.
 */
interface PaymentProvider
{
    public function key(): string;

    /**
     * Tạo checkout / grant purchase.
     * GĐ1 (manual): admin gọi trực tiếp, không redirect.
     *
     * @param  array<string, mixed>  $payload
     */
    public function createCheckout(string $workspaceId, string $itemId, array $payload = []): array;

    /**
     * Xác nhận callback từ payment gateway (VNPay/MoMo GĐ2+).
     * GĐ1: không dùng — manual không có callback.
     *
     * @param  array<string, mixed>  $data
     */
    public function verifyCallback(array $data): bool;

    /**
     * Hoàn tiền (GĐ2+).
     */
    public function refund(string $purchaseId, int $amountCents): bool;
}
