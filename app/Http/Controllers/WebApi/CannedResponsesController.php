<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\CannedResponseResource;
use App\Models\Account;
use App\Models\CannedResponse;
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
            ->only(['short_code', 'content'])
            ->all();

        if ($payload === []) {
            abort(response()->json(
                ['error' => 'param is missing or the value is empty: canned_response'],
                422
            ));
        }

        $required = $cannedResponse === null ? 'required' : 'sometimes';

        return RecordInvalidResponse::validatedOrAbort(Validator::make($payload, [
            'content' => ['bail', $required, 'filled', 'string'],
            'short_code' => [
                'bail',
                $required,
                'filled',
                'string',
                Rule::unique('canned_responses', 'short_code')
                    ->where('account_id', $account->id)
                    ->ignore($cannedResponse?->id),
            ],
        ], [
            'content.required' => "Content can't be blank",
            'content.filled' => "Content can't be blank",
            'short_code.required' => "Short code can't be blank",
            'short_code.filled' => "Short code can't be blank",
            'short_code.unique' => 'Short code has already been taken',
        ]));
    }

    private function fetchCannedResponse(Account $account, int $cannedResponseId): CannedResponse
    {
        return $account->cannedResponses()->whereKey($cannedResponseId)->firstOrFail();
    }
}
