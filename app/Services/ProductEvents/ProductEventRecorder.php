<?php

namespace App\Services\ProductEvents;

use App\Models\Account;
use App\Models\User;
use App\Support\SuperAdminArea;
use Carbon\CarbonInterface;
use Closure;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Nơi DUY NHẤT ghi `product_events`. Rẻ và không bao giờ làm hỏng request:
 * một câu insert sau khi transaction đang mở commit xong (lỗi insert không làm
 * hỏng transaction của nghiệp vụ), mọi lỗi chỉ ghi log.
 *
 * Thuộc tính chỉ nhận id, số đếm, nền tảng, mã ngắn (Nghị định 13): khoá dạng
 * snake_case, giá trị vô hướng, chuỗi tối đa MAX_STRING ký tự; còn lại bị bỏ.
 */
final class ProductEventRecorder
{
    // Đặt lúc đăng nhập bằng link đăng nhập hộ (SessionsController): mọi việc
    // trong phiên này là super admin làm, không phải tenant dùng tính năng.
    public const IMPERSONATION_SESSION_KEY = 'product_events_impersonated';

    public const MAX_STRING = 64;

    private const MAX_PROPERTIES = 12;

    // Sự kiện một lần đã ghi thì nhớ trong cache để lần sau khỏi chạm DB
    // (tin nhắn, lượt tải widget). Cache mất thì khoá duy nhất trong DB vẫn chặn trùng.
    private const ONCE_CACHE_SECONDS = 60 * 60 * 24 * 30;

    /**
     * @param  array<string, mixed>  $properties
     */
    public function record(
        ProductEventName $name,
        Account|int|null $account,
        array $properties = [],
        User|int|null $user = null,
        ?CarbonInterface $occurredAt = null,
        ?string $dedupeKey = null,
    ): void {
        try {
            $accountId = $account instanceof Account ? $account->getKey() : $account;
            if ($accountId === null || ($this->isTenantAction($name) && $this->actingAsStaff())) {
                return;
            }

            $row = [
                'account_id' => (int) $accountId,
                'user_id' => $user instanceof User ? $user->getKey() : ($user ?? $this->currentUserId()),
                'name' => $name->value,
                'properties' => json_encode((object) self::sanitize($properties), JSON_THROW_ON_ERROR),
                'dedupe_key' => $dedupeKey,
                'occurred_at' => ($occurredAt ?? now())->copy()->utc(),
                'created_at' => now()->utc(),
            ];

            DB::afterCommit(fn () => $this->insert($row));
        } catch (Throwable $exception) {
            $this->failed($name, $exception);
        }
    }

    /**
     * Sự kiện chỉ xảy ra một lần cho mỗi khoá (tin đầu tiên của account, widget
     * gắn lên web…): hỏi cache trước, chỉ lần đầu mới ghi DB. Thuộc tính tốn truy
     * vấn thì truyền closure, chỉ chạy khi thật sự ghi.
     *
     * @param  array<string, mixed>|Closure(): array<string, mixed>  $properties
     */
    public function recordOnce(
        ProductEventName $name,
        Account|int $account,
        string $dedupeKey,
        array|Closure $properties = [],
        User|int|null $user = null,
        ?CarbonInterface $occurredAt = null,
    ): void {
        try {
            if ($this->isTenantAction($name) && $this->actingAsStaff()) {
                return;
            }

            if (! Cache::add('product_events:once:'.$dedupeKey, true, self::ONCE_CACHE_SECONDS)) {
                return;
            }

            $properties = $properties instanceof Closure ? $properties() : $properties;
        } catch (Throwable $exception) {
            $this->failed($name, $exception);

            return;
        }

        $this->record($name, $account, $properties, $user, $occurredAt, $dedupeKey);
    }

    /**
     * Super admin đang thao tác: trong console /admin, hoặc trong phiên đăng nhập hộ.
     */
    public function actingAsStaff(): bool
    {
        // Job hàng đợi và lệnh artisan không có request thật: không phải lượt làm hộ.
        if (! app()->bound('request')) {
            return false;
        }

        $request = request();
        if (SuperAdminArea::isConsole($request)) {
            return true;
        }

        return $request->hasSession() && (bool) $request->session()->get(self::IMPERSONATION_SESSION_KEY, false);
    }

    /**
     * @param  array<string, mixed>  $properties
     * @return array<string, int|float|bool|string|null>
     */
    public static function sanitize(array $properties): array
    {
        $clean = [];
        foreach ($properties as $key => $value) {
            if (count($clean) >= self::MAX_PROPERTIES || ! is_string($key) || preg_match('/^[a-z][a-z0-9_]{0,39}$/', $key) !== 1) {
                continue;
            }

            if (is_string($value)) {
                if (mb_strlen($value) > self::MAX_STRING) {
                    continue;
                }
            } elseif ($value !== null && ! is_int($value) && ! is_float($value) && ! is_bool($value)) {
                continue;
            }

            $clean[$key] = $value;
        }

        return $clean;
    }

    // Lượt làm của người (dùng tính năng, trả lời khách) — không tính khi super admin làm hộ.
    private function isTenantAction(ProductEventName $name): bool
    {
        return $name->isFeature() || $name === ProductEventName::FirstOutboundReply;
    }

    private function currentUserId(): ?int
    {
        try {
            $id = Auth::guard('web')->id();

            return is_numeric($id) ? (int) $id : null;
        } catch (Throwable) {
            return null;
        }
    }

    /** @param  array<string, mixed>  $row */
    private function insert(array $row): void
    {
        try {
            // Vẫn còn trong transaction (vd. test, hay job tự bọc): chạy trong
            // savepoint để insert hỏng chỉ lùi chính nó.
            DB::transactionLevel() > 0
                ? DB::transaction(fn () => DB::table('product_events')->insertOrIgnore($row))
                : DB::table('product_events')->insertOrIgnore($row);
        } catch (Throwable $exception) {
            if (is_string($row['dedupe_key'])) {
                Cache::forget('product_events:once:'.$row['dedupe_key']);
            }
            $this->failed(ProductEventName::from($row['name']), $exception);
        }
    }

    private function failed(ProductEventName $name, Throwable $exception): void
    {
        try {
            Log::warning('product_events.record_failed', ['name' => $name->value, 'error' => $exception->getMessage()]);
        } catch (Throwable) {
            // Log hỏng cũng không được làm hỏng request.
        }
    }
}
