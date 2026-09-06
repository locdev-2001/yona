<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomFilterResource;
use App\Models\Account;
use App\Models\CustomFilter;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

// Port từ Api::V1::Accounts::CustomFiltersController — folder hội thoại và
// segment liên hệ đều là bản ghi ở đây, phân biệt bằng filter_type.
// CustomFilterPolicy của bản gốc cho phép cả admin lẫn agent, tức mọi thành
// viên account, nên không cần lớp policy: phạm vi đã khoá theo user_id.
class CustomFiltersController extends Controller
{
    public function index(Request $request, Account $account): JsonResponse
    {
        $filters = $this->scope($request, $account)
            ->where('filter_type', CustomFilter::filterTypeValue(
                $request->query('filter_type', CustomFilter::TYPE_CONVERSATION),
            ))
            ->orderBy('id')
            ->get();

        return response()->json(CustomFilterResource::collectionFor($filters));
    }

    public function show(Request $request, Account $account, int $customFilterId): JsonResponse
    {
        return response()->json($this->resource($this->fetch($request, $account, $customFilterId)));
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        $payload = $this->payload($request);

        if (trim((string) ($payload['name'] ?? '')) === '') {
            return response()->json(['message' => "Name can't be blank"], 422);
        }

        // validate_number_of_filters
        if (CustomFilter::reachedLimit($account->id, $request->user()->id)) {
            return response()->json(
                ['message' => 'Account '.__('errors.custom_filters.number_of_records')],
                422,
            );
        }

        $filter = CustomFilter::query()->create([
            'account_id' => $account->id,
            'user_id' => $request->user()->id,
            ...$payload,
        ]);

        return response()->json($this->resource($filter));
    }

    public function update(Request $request, Account $account, int $customFilterId): JsonResponse
    {
        $filter = $this->fetch($request, $account, $customFilterId);
        $payload = $this->payload($request);

        if (array_key_exists('name', $payload) && trim((string) $payload['name']) === '') {
            return response()->json(['message' => "Name can't be blank"], 422);
        }

        $filter->update($payload);

        return response()->json($this->resource($filter));
    }

    public function destroy(Request $request, Account $account, int $customFilterId): Response
    {
        $this->fetch($request, $account, $customFilterId)->delete();

        return response()->noContent();
    }

    /** @return array<string, mixed> */
    private function payload(Request $request): array
    {
        $input = (array) $request->input('custom_filter', []);

        return array_intersect_key($input, array_flip(['name', 'filter_type', 'query']));
    }

    /** @return HasMany<CustomFilter, Account> */
    private function scope(Request $request, Account $account)
    {
        return $account->customFilters()
            ->where('user_id', $request->user()->id);
    }

    // Filter của người khác coi như không tồn tại (bản gốc trả 404).
    private function fetch(Request $request, Account $account, int $customFilterId): CustomFilter
    {
        return $this->scope($request, $account)->whereKey($customFilterId)->firstOrFail();
    }

    /** @return array<string, mixed> */
    private function resource(CustomFilter $filter): array
    {
        return (new CustomFilterResource($filter))->toArray(request());
    }
}
