<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\CannedResponseResource;
use App\Messaging\Structured\InvalidStructuredPayload;
use App\Messaging\Structured\Money;
use App\Messaging\Structured\PayloadContext;
use App\Messaging\Structured\StructuredTypeRegistry;
use App\Models\Account;
use App\Models\CannedResponse;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\PaymentAccount;
use App\Services\ProductEvents\ProductEventName;
use App\Services\ProductEvents\ProductEventRecorder;
use App\Support\RecordInvalidResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

// Port từ Api::V1::Accounts::CannedResponsesController.
// Không gọi check_authorization ở bản gốc → mọi thành viên account (kể cả agent)
// đọc/ghi được. index trả MẢNG TRẦN, không bọc `payload`.
class CannedResponsesController extends Controller
{
    public function __construct(private readonly StructuredTypeRegistry $structuredTypes) {}

    public function index(Request $request, Account $account): JsonResponse
    {
        $search = $request->query('search');

        $cannedResponses = $account->cannedResponses()
            ->when(is_string($search), fn ($query) => $query->search($search))
            ->get();

        return response()->json(CannedResponseResource::collection($cannedResponses)->toArray($request));
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        $cannedResponse = $account->cannedResponses()->create($this->validatedPayload($request, $account));

        return response()->json((new CannedResponseResource($cannedResponse))->toArray($request));
    }

    public function update(Request $request, Account $account, int $cannedResponseId): JsonResponse
    {
        $cannedResponse = $this->fetchCannedResponse($account, $cannedResponseId);
        $cannedResponse->update($this->validatedPayload($request, $account, $cannedResponse));

        return response()->json((new CannedResponseResource($cannedResponse))->toArray($request));
    }

    // Nhân viên chèn câu trả lời mẫu vào ô soạn: chỉ ghi lượt dùng (sự kiện sản phẩm).
    public function markUsed(Request $request, Account $account, int $cannedResponseId): Response
    {
        $cannedResponse = $this->fetchCannedResponse($account, $cannedResponseId);

        app(ProductEventRecorder::class)->record(
            ProductEventName::CannedResponseUsed,
            $account,
            ['canned_response_id' => $cannedResponse->id, 'via' => 'composer'],
            $request->user(),
        );

        return response()->noContent();
    }

    public function destroy(Request $request, Account $account, int $cannedResponseId): Response
    {
        $this->fetchCannedResponse($account, $cannedResponseId)->delete();

        return response()->noContent(200);
    }

    // params.require(:canned_response).permit(:short_code, :content) + ParamsWrapper:
    // FE gửi phẳng, Rails tự bọc vào khóa `canned_response` — nhận cả hai dạng,
    // và rỗng cả hai thì trả đúng lỗi `param is missing`.
    /** @return array<string, mixed> */
    private function validatedPayload(Request $request, Account $account, ?CannedResponse $cannedResponse = null): array
    {
        $wrapped = $request->input('canned_response');
        $payload = collect(is_array($wrapped) ? $wrapped : $request->all())
            ->only(['short_code', 'content', 'content_type', 'content_attributes'])
            ->all();

        if ($payload === []) {
            abort(response()->json(
                ['error' => 'param is missing or the value is empty: canned_response'],
                422
            ));
        }

        $required = $cannedResponse === null ? 'required' : 'sometimes';
        // Thẻ (Gửi thẻ) tự mang nội dung riêng (câu hỏi trả lời nhanh, ghi chú
        // chuyển khoản…) — "content" chữ thuần không còn bắt buộc khi có thẻ.
        $hasCard = array_key_exists('content_type', $payload) && $payload['content_type'] !== null;

        $validated = RecordInvalidResponse::validatedOrAbort(Validator::make($payload, [
            'content' => $hasCard ? ['bail', 'nullable', 'string'] : ['bail', $required, 'filled', 'string'],
            'short_code' => [
                'bail',
                $required,
                'filled',
                'string',
                Rule::unique('canned_responses', 'short_code')
                    ->where('account_id', $account->id)
                    ->ignore($cannedResponse?->id),
            ],
            'content_type' => ['nullable', 'string', Rule::in($this->structuredTypes->contentTypes())],
            'content_attributes' => ['nullable', 'array'],
        ], [
            'content.required' => "Content can't be blank",
            'content.filled' => "Content can't be blank",
            'short_code.required' => "Short code can't be blank",
            'short_code.filled' => "Short code can't be blank",
            'short_code.unique' => 'Short code has already been taken',
            'content_type.in' => 'Unknown card type',
        ]));

        if (! $hasCard) {
            return $validated;
        }

        try {
            $validated['content_attributes'] = $this->preparedCardAttributes(
                $account,
                $validated['content_type'],
                $validated['content'] ?? null,
                $validated['content_attributes'] ?? [],
            );
        } catch (InvalidStructuredPayload $exception) {
            abort(response()->json(
                ['message' => $exception->getMessage(), 'attributes' => ['content_attributes']],
                422
            ));
        }

        return $validated;
    }

    /**
     * Kiểm thẻ đính kèm bằng đúng luật của StructuredTypeRegistry (`$type->rules()`),
     * không lưu qua hội thoại nào — canned response chưa gắn với hội thoại cụ thể.
     *
     * @return array<string, mixed>
     *
     * @throws InvalidStructuredPayload
     */
    private function preparedCardAttributes(Account $account, string $contentType, ?string $content, array $attributes): array
    {
        $type = $this->structuredTypes->for($contentType);

        $validation = Validator::make([...$attributes, 'content' => $content], $type->rules());

        if ($validation->fails()) {
            throw new InvalidStructuredPayload($validation->errors()->first());
        }

        if ($contentType === 'bank_transfer') {
            return $this->bankTransferSnapshot($account, $attributes);
        }

        // Không dùng registry->prepare(): normalize() của các loại còn lại
        // không đọc PayloadContext->conversation nên một Conversation chưa
        // lưu, chỉ mang account_id, là đủ để chuẩn hoá đúng luật.
        $context = new PayloadContext(new Conversation(['account_id' => $account->id]), Message::TYPE_OUTGOING);

        return $type->normalize($attributes, $context);
    }

    /**
     * Chỉ lưu mã tài khoản, số tiền, nội dung — KHÔNG lưu số tài khoản/mã QR:
     * máy chủ tự tra lại từ `PaymentAccount` mỗi lần gửi thẻ này đi, cùng luật
     * với BankTransferType::normalize.
     *
     * @return array<string, mixed>
     *
     * @throws InvalidStructuredPayload
     */
    private function bankTransferSnapshot(Account $account, array $attributes): array
    {
        $exists = PaymentAccount::query()
            ->where('account_id', $account->id)
            ->whereKey($attributes['payment_account_id'])
            ->exists();

        if (! $exists) {
            throw InvalidStructuredPayload::because('unknown_payment_account');
        }

        return array_filter([
            'payment_account_id' => (int) $attributes['payment_account_id'],
            'amount' => Money::normalize($attributes['amount'] ?? null)['amount'] ?? null,
            'memo' => filled($attributes['memo'] ?? null) ? trim($attributes['memo']) : null,
        ], fn (mixed $value) => $value !== null);
    }

    private function fetchCannedResponse(Account $account, int $cannedResponseId): CannedResponse
    {
        return $account->cannedResponses()->whereKey($cannedResponseId)->firstOrFail();
    }
}
