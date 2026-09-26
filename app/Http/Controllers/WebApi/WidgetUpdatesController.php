<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Inbox;
use App\Models\WidgetUpdate;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

/**
 * Trang cài đặt "Bài cập nhật trên widget": CRUD + đăng/gỡ đăng bài của tab
 * Cập nhật trong widget. Chỉ administrator — không có policy riêng, xử lý
 * giống LabelsController/CampaignsController (authorizeAdministrator thủ công).
 */
class WidgetUpdatesController extends Controller
{
    public const PER_PAGE = 20;

    public function index(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $updates = $this->accountUpdates($account)
            ->with('inbox')
            ->orderByDesc('id')
            ->simplePaginate(self::PER_PAGE);

        return response()->json([
            'payload' => collect($updates->items())->map(fn (WidgetUpdate $update) => self::present($update))->values(),
            'meta' => ['has_more' => $updates->hasMorePages()],
        ]);
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $update = $account->widgetUpdates()->create($this->validatedUpdate($request, $account));

        return response()->json(self::present($update->load('inbox')));
    }

    public function update(Request $request, Account $account, int $updateId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $update = $this->fetchUpdate($account, $updateId);
        $update->update($this->validatedUpdate($request, $account, $update));

        return response()->json(self::present($update->load('inbox')));
    }

    public function destroy(Request $request, Account $account, int $updateId): Response
    {
        $this->authorizeAdministrator($request);

        $this->fetchUpdate($account, $updateId)->delete();

        return response()->noContent(200);
    }

    /** Đăng bài: mốc thời gian là lúc bấm, không có lịch hẹn giờ (quyết định founder). */
    public function publish(Request $request, Account $account, int $updateId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $update = $this->fetchUpdate($account, $updateId);
        $update->update(['published_at' => now()]);

        return response()->json(self::present($update->load('inbox')));
    }

    /** Gỡ đăng: đưa về nháp, không xoá nội dung. */
    public function unpublish(Request $request, Account $account, int $updateId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $update = $this->fetchUpdate($account, $updateId);
        $update->update(['published_at' => null]);

        return response()->json(self::present($update->load('inbox')));
    }

    /**
     * store/update chỉ đụng vào nội dung — không bao giờ nhận published_at từ
     * request, để không lách qua publish()/unpublish() dựng lại kiểu hẹn giờ đã bị bỏ.
     *
     * @return array<string, mixed>
     */
    private function validatedUpdate(Request $request, Account $account, ?WidgetUpdate $update = null): array
    {
        $requiredOnCreate = $update === null ? 'required' : 'sometimes';

        $validated = $request->validate([
            'title' => [$requiredOnCreate, 'string', 'max:120'],
            'body' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'tag' => ['sometimes', Rule::in(WidgetUpdate::TAGS)],
            'cover_url' => [
                'sometimes', 'nullable', 'string', 'max:2000',
                fn (string $attribute, mixed $value, \Closure $fail) => self::guardHttpUrl($value, $fail),
            ],
            'cta_url' => [
                'sometimes', 'nullable', 'string', 'max:2000',
                fn (string $attribute, mixed $value, \Closure $fail) => self::guardHttpUrl($value, $fail),
            ],
            // Không đặt 'sometimes' ở đây: cần rule bắt buộc chạy dù cta_label vắng
            // mặt trong request, để bắt đúng trường hợp có cta_url mà thiếu chữ nút.
            'cta_label' => ['nullable', 'string', 'max:40', Rule::requiredIf(fn () => $request->filled('cta_url'))],
            // inbox_id null = mọi hộp thư website của account; có giá trị thì phải là
            // hộp thư Website của chính account này (bài cập nhật chỉ widget mới đọc).
            'inbox_id' => [
                'sometimes',
                'nullable',
                Rule::exists('inboxes', 'id')->where('account_id', $account->id),
                fn (string $attribute, mixed $value, \Closure $fail) => self::guardWebsiteInbox($account, $value, $fail),
            ],
        ]);

        // cta_label không có 'sometimes' nên validate() luôn trả về khoá này (kể cả
        // null) — PATCH chỉ sửa trường khác (vd title) mà không đụng cta_label/cta_url
        // thì bỏ khoá này ra, tránh vô tình xoá CTA đang có.
        if ($update !== null && ! $request->has('cta_label') && ! $request->has('cta_url')) {
            unset($validated['cta_label']);
        }

        return $validated;
    }

    // Chặn `javascript:`/`data:` và mọi lược đồ khác — chỉ nhận link http(s) thật.
    private static function guardHttpUrl(mixed $url, \Closure $fail): void
    {
        if (blank($url)) {
            return;
        }

        if (! str_starts_with((string) $url, 'http://') && ! str_starts_with((string) $url, 'https://')) {
            $fail('URL không hợp lệ, chỉ nhận đường dẫn http hoặc https.');
        }
    }

    private static function guardWebsiteInbox(Account $account, mixed $inboxId, \Closure $fail): void
    {
        if (blank($inboxId)) {
            return;
        }

        $inbox = Inbox::query()->where('account_id', $account->id)->find($inboxId);

        if ($inbox !== null && ! $inbox->isWebWidget()) {
            $fail('Hộp thư phải là kênh Website.');
        }
    }

    private function fetchUpdate(Account $account, int $updateId): WidgetUpdate
    {
        return $this->accountUpdates($account)->whereKey($updateId)->firstOrFail();
    }

    /** @return HasMany<WidgetUpdate, Account> */
    private function accountUpdates(Account $account): HasMany
    {
        return $account->widgetUpdates();
    }

    private static function present(WidgetUpdate $update): array
    {
        return [
            'id' => $update->id,
            'title' => $update->title,
            'body' => $update->body,
            'tag' => $update->tag,
            'cover_url' => $update->cover_url,
            'cta_label' => $update->cta_label,
            'cta_url' => $update->cta_url,
            'inbox' => $update->inbox ? ['id' => $update->inbox->id, 'name' => $update->inbox->name] : null,
            'published' => $update->published_at !== null,
            'published_at' => $update->published_at?->getTimestamp(),
        ];
    }
}
