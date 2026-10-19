<?php

namespace App\Messaging\Structured\Types;

use App\Messaging\Structured\AbstractStructuredType;
use App\Messaging\Structured\InvalidStructuredPayload;
use App\Messaging\Structured\Money;
use App\Messaging\Structured\PayloadContext;
use App\Models\AccountUser;
use App\Models\AgentBot;
use App\Models\PaymentAccount;
use App\Support\VietQr\Payload;
use App\Support\VietQr\VietQrBanks;

/**
 * Thẻ chuyển khoản: agent chọn một `PaymentAccount` đã cấu hình sẵn, server tự
 * tra ngân hàng/số tài khoản thật và dựng mã QR — KHÔNG bao giờ tin số tài
 * khoản do phía gửi tự khai.
 */
final class BankTransferType extends AbstractStructuredType
{
    public function contentType(): string
    {
        return 'bank_transfer';
    }

    public function rules(): array
    {
        return [
            'content' => ['nullable', 'string', 'max:2000'],
            'payment_account_id' => ['required', 'integer'],
            'amount' => ['nullable'],
            'memo' => ['nullable', 'string', 'max:100'],
            // Bản chụp lúc gửi, chỉ dùng khi đọc lại tin đã lưu; lúc gửi luôn dựng lại từ tài khoản thật.
            'bank_bin' => ['nullable', 'string', 'max:10'],
            'bank_code' => ['nullable', 'string', 'max:40'],
            'bank_name' => ['nullable', 'string', 'max:120'],
            'account_number' => ['nullable', 'string', 'max:40'],
            'account_name' => ['nullable', 'string', 'max:120'],
            'qr_payload' => ['nullable', 'string', 'max:512'],
        ];
    }

    private const SNAPSHOT_KEYS = ['payment_account_id', 'bank_bin', 'bank_code', 'bank_name', 'account_number', 'account_name', 'amount', 'memo', 'qr_payload'];

    public function normalize(array $attributes, PayloadContext $context): array
    {
        // Thẻ đã gửi là bằng chứng khách đã nhận số tài khoản nào: đọc lại thì giữ đúng bản chụp,
        // kể cả khi quản trị viên sau đó sửa hay xoá tài khoản.
        if ($context->fromStorage && isset($attributes['qr_payload'], $attributes['account_number'])) {
            return array_intersect_key($attributes, array_flip(self::SNAPSHOT_KEYS));
        }

        $account = PaymentAccount::query()
            ->where('account_id', $context->conversation->account_id)
            ->find($attributes['payment_account_id']);

        if ($account === null) {
            throw InvalidStructuredPayload::because('unknown_payment_account');
        }

        $this->authorizeSender($account, $context);

        $amount = Money::normalize($attributes['amount'] ?? null);
        $memo = $this->resolveMemo($attributes['memo'] ?? null, $account, $context);
        $bank = VietQrBanks::find($account->bank_bin);

        return array_filter([
            'payment_account_id' => $account->id,
            'bank_bin' => $account->bank_bin,
            'bank_code' => $account->bank_code,
            'bank_name' => $bank['short_name'] ?? $account->bank_code,
            'account_number' => $account->account_number,
            'account_name' => $account->account_name,
            'amount' => $amount,
            'memo' => $memo,
            'qr_payload' => Payload::build($account->bank_bin, $account->account_number, $amount['amount'] ?? null, $memo),
        ], fn (mixed $value) => $value !== null);
    }

    public function plainText(?string $content, array $attributes): string
    {
        $amount = $attributes['amount'] ?? null;

        return self::lines([
            $content,
            __('messaging.bank_transfer.bank_line', ['bank' => $attributes['bank_name'], 'account' => $attributes['account_number']]),
            __('messaging.bank_transfer.holder', ['name' => $attributes['account_name']]),
            $amount === null ? null : __('messaging.bank_transfer.amount', ['amount' => Money::format($amount['amount'], $amount['currency'])]),
            isset($attributes['memo']) ? __('messaging.bank_transfer.memo', ['memo' => $attributes['memo']]) : null,
        ]);
    }

    public function previewText(?string $content, array $attributes): string
    {
        return filled($content) ? trim((string) $content) : __('messaging.bank_transfer.preview', ['bank' => $attributes['bank_name']]);
    }

    private function authorizeSender(PaymentAccount $account, PayloadContext $context): void
    {
        if ($account->allow_all_agents || $context->performedBy === null) {
            return;
        }

        if ($context->performedBy instanceof AgentBot) {
            throw InvalidStructuredPayload::because('payment_account_not_allowed');
        }

        $accountUser = AccountUser::query()
            ->where('account_id', $context->conversation->account_id)
            ->where('user_id', $context->performedBy->id)
            ->first();

        if ($accountUser === null || ! $accountUser->isAdministrator()) {
            throw InvalidStructuredPayload::because('payment_account_not_allowed');
        }
    }

    private function resolveMemo(?string $memo, PaymentAccount $account, PayloadContext $context): ?string
    {
        if (filled($memo)) {
            return trim($memo);
        }

        if (blank($account->memo_template)) {
            return null;
        }

        return trim(str_replace('{ma_hoi_thoai}', (string) $context->conversation->display_id, $account->memo_template));
    }
}
