<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentAccountResource;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\PaymentAccount;
use App\Support\VietQr\Payload;
use App\Support\VietQr\VietQrBanks;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PaymentAccountsController extends Controller
{
    // Nhân viên chỉ thấy tài khoản được phép gửi thẻ; quản trị viên thấy hết
    // để còn sửa/xoá — soi theo currentAccountUser giống Controller::authorizeAdministrator.
    public function index(Request $request, Account $account): JsonResponse
    {
        $query = $this->visibleAccounts($request, $account)->orderByDesc('is_default')->orderBy('bank_code');

        return response()->json(['payload' => PaymentAccountResource::collection($query->get())->toArray($request)]);
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $attributes = $this->validated($request, $account);
        $paymentAccount = new PaymentAccount([...$attributes, 'account_id' => $account->id]);

        DB::transaction(function () use ($paymentAccount, $account, $attributes) {
            $isFirstAccount = ! $account->paymentAccounts()->exists();
            $paymentAccount->is_default = $isFirstAccount || ($attributes['is_default'] ?? false);
            $paymentAccount->save();

            if ($paymentAccount->is_default) {
                $paymentAccount->markAsDefault();
            }
        });

        return response()->json((new PaymentAccountResource($paymentAccount))->toArray($request));
    }

    public function update(Request $request, Account $account, int $paymentAccountId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $paymentAccount = $this->fetch($account, $paymentAccountId);
        $attributes = $this->validated($request, $account, $paymentAccount);

        DB::transaction(function () use ($paymentAccount, $attributes) {
            $paymentAccount->update(collect($attributes)->except('is_default')->all());

            if ($attributes['is_default'] ?? false) {
                $paymentAccount->markAsDefault();
            }
        });

        return response()->json((new PaymentAccountResource($paymentAccount->fresh()))->toArray($request));
    }

    public function destroy(Request $request, Account $account, int $paymentAccountId): Response
    {
        $this->authorizeAdministrator($request);

        $paymentAccount = $this->fetch($account, $paymentAccountId);
        $wasDefault = $paymentAccount->is_default;
        $paymentAccount->delete();

        // Xoá mất tài khoản mặc định thì đôn tài khoản còn lại lên, tránh
        // hộp thư không còn tài khoản mặc định nào để gửi thẻ.
        if ($wasDefault) {
            $account->paymentAccounts()->first()?->markAsDefault();
        }

        return response()->noContent(200);
    }

    // Xem trước QR khi đang sửa form, tự tính theo số tiền/nội dung đang gõ —
    // không lưu gì, chỉ dựng lại đúng payload server sẽ gắn vào tin thật.
    public function preview(Request $request, Account $account, int $paymentAccountId): JsonResponse
    {
        $paymentAccount = $this->visibleAccounts($request, $account)->whereKey($paymentAccountId)->firstOrFail();

        $amount = $request->filled('amount') ? (int) $request->input('amount') : null;
        $memo = filled($request->input('memo')) ? (string) $request->input('memo') : $paymentAccount->memo_template;

        return response()->json([
            'qr_payload' => Payload::build($paymentAccount->bank_bin, $paymentAccount->account_number, $amount, $memo),
        ]);
    }

    // Xem trước QR cho tài khoản đang nhập dở, chưa lưu: chỉ quản trị viên mới tạo tài khoản.
    public function previewDraft(Request $request): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $attributes = $request->validate([
            'bank_bin' => ['required', 'string', Rule::in(VietQrBanks::bins())],
            'account_number' => ['required', 'string', 'regex:/^\d{4,30}$/'],
            'amount' => ['nullable', 'integer', 'min:1'],
            'memo' => ['nullable', 'string', 'max:100'],
        ]);

        return response()->json([
            'qr_payload' => Payload::build(
                $attributes['bank_bin'],
                $attributes['account_number'],
                isset($attributes['amount']) ? (int) $attributes['amount'] : null,
                $attributes['memo'] ?? null,
            ),
        ]);
    }

    public function banks(): JsonResponse
    {
        return response()->json(['payload' => VietQrBanks::all()]);
    }

    private function visibleAccounts(Request $request, Account $account): Builder
    {
        $accountUser = $request->attributes->get('currentAccountUser');
        $isAdmin = $accountUser instanceof AccountUser && $accountUser->isAdministrator();

        $query = $account->paymentAccounts()->getQuery();

        return $isAdmin ? $query : $query->where('allow_all_agents', true);
    }

    private function fetch(Account $account, int $paymentAccountId): PaymentAccount
    {
        return $account->paymentAccounts()->whereKey($paymentAccountId)->firstOrFail();
    }

    private function validated(Request $request, Account $account, ?PaymentAccount $paymentAccount = null): array
    {
        $attributes = $request->validate([
            'bank_bin' => ['required', 'string', Rule::in(VietQrBanks::bins())],
            'account_number' => ['required', 'string', 'regex:/^\d{4,30}$/'],
            'account_name' => ['required', 'string', 'max:100'],
            'memo_template' => ['nullable', 'string', 'max:100'],
            'is_default' => ['sometimes', 'boolean'],
            'allow_all_agents' => ['sometimes', 'boolean'],
        ]);

        $accountNumber = $attributes['account_number'];

        $request->validate([
            'account_number' => [
                Rule::unique('payment_accounts')
                    ->where(fn ($query) => $query->where('account_id', $account->id)->where('bank_bin', $attributes['bank_bin']))
                    ->ignore($paymentAccount?->id),
            ],
        ], ['account_number.unique' => __('messaging.errors.duplicate_payment_account')]);

        $bank = VietQrBanks::find($attributes['bank_bin']);

        return [
            'bank_bin' => $attributes['bank_bin'],
            'bank_code' => $bank['code'] ?? $attributes['bank_bin'],
            'account_number' => $accountNumber,
            'account_name' => self::normalizeAccountName($attributes['account_name']),
            'memo_template' => filled($attributes['memo_template'] ?? null) ? trim($attributes['memo_template']) : null,
            'is_default' => (bool) ($attributes['is_default'] ?? false),
            'allow_all_agents' => array_key_exists('allow_all_agents', $attributes) ? (bool) $attributes['allow_all_agents'] : true,
        ];
    }

    // Đúng cách ngân hàng in trên sao kê: viết hoa, không dấu, để khách đối chiếu dễ.
    private static function normalizeAccountName(string $name): string
    {
        $ascii = strtoupper(Str::ascii($name));

        return trim((string) preg_replace('/\s+/', ' ', $ascii));
    }
}
