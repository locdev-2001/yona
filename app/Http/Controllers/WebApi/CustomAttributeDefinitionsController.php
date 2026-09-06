<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomAttributeDefinitionResource;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\CustomAttributeDefinition;
use App\Policies\CustomAttributeDefinitionPolicy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

// Port từ Api::V1::Accounts::CustomAttributeDefinitionsController.
// Khác bản gốc: `attribute_key` là tuỳ chọn — không gửi thì backend tự sinh từ
// tên hiển thị (lệnh founder: người dùng không nhập khoá kỹ thuật).
class CustomAttributeDefinitionsController extends Controller
{
    /** @var list<string> */
    private const PAYLOAD_FIELDS = [
        'attribute_display_name', 'attribute_description', 'attribute_display_type',
        'attribute_key', 'attribute_model', 'regex_pattern', 'regex_cue', 'attribute_values',
    ];

    public function index(Request $request, Account $account): JsonResponse
    {
        $this->assertAllowed($request, 'index');

        $definitions = $account->customAttributeDefinitions()
            ->withAttributeModel($request->query('attribute_model'))
            ->orderBy('id')
            ->get();

        return response()->json(CustomAttributeDefinitionResource::collectionFor($definitions));
    }

    public function show(Request $request, Account $account, int $definitionId): JsonResponse
    {
        $this->assertAllowed($request, 'show');

        return response()->json($this->resource($this->fetch($account, $definitionId)));
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        $this->assertAllowed($request, 'store');

        $definition = new CustomAttributeDefinition(['account_id' => $account->id]);
        $definition->fill($this->payload($request, $account));

        if (($error = $this->validationError($definition, $account)) !== null) {
            return response()->json(['message' => $error], 422);
        }

        $definition->save();

        return response()->json($this->resource($definition));
    }

    public function update(Request $request, Account $account, int $definitionId): JsonResponse
    {
        $this->assertAllowed($request, 'update');

        $definition = $this->fetch($account, $definitionId);
        $definition->fill($this->payload($request, $account, $definition));

        if (($error = $this->validationError($definition, $account)) !== null) {
            return response()->json(['message' => $error], 422);
        }

        $definition->save();

        return response()->json($this->resource($definition));
    }

    public function destroy(Request $request, Account $account, int $definitionId): Response
    {
        $this->assertAllowed($request, 'destroy');
        $this->fetch($account, $definitionId)->delete();

        return response()->noContent();
    }

    /** @return array<string, mixed> */
    private function payload(Request $request, Account $account, ?CustomAttributeDefinition $existing = null): array
    {
        $input = (array) $request->input('custom_attribute_definition', []);
        $payload = array_intersect_key($input, array_flip(self::PAYLOAD_FIELDS));

        $key = isset($payload['attribute_key']) ? trim((string) $payload['attribute_key']) : '';

        if ($key !== '') {
            $payload['attribute_key'] = $key;

            return $payload;
        }

        unset($payload['attribute_key']);

        // Sửa mà không gửi key: giữ nguyên key cũ, đổi key sẽ mồ côi dữ liệu đã lưu.
        if ($existing !== null) {
            return $payload;
        }

        $payload['attribute_key'] = CustomAttributeDefinition::generateKey(
            $account->id,
            $payload['attribute_model'] ?? CustomAttributeDefinition::MODEL_CONVERSATION,
            (string) ($payload['attribute_display_name'] ?? ''),
        );

        return $payload;
    }

    /** Thông điệp lỗi đầu tiên của validates trong model — null nghĩa là hợp lệ. */
    private function validationError(CustomAttributeDefinition $definition, Account $account): ?string
    {
        if (trim((string) $definition->attribute_display_name) === '') {
            return "Attribute display name can't be blank";
        }

        if (! $definition->hasValidKeyFormat()) {
            return __('errors.custom_attribute_definition.attribute_key_format');
        }

        // attribute_must_not_conflict — chỉ kiểm lúc tạo, đúng bản gốc.
        if (! $definition->exists && $definition->conflictsWithStandardAttribute()) {
            return __('errors.custom_attribute_definition.key_conflict');
        }

        $duplicate = $account->customAttributeDefinitions()
            ->where('attribute_model', CustomAttributeDefinition::ATTRIBUTE_MODELS[$definition->attribute_model])
            ->where('attribute_key', $definition->attribute_key)
            ->when($definition->exists, fn ($query) => $query->whereKeyNot($definition->id))
            ->exists();

        return $duplicate ? 'Attribute key has already been taken' : null;
    }

    private function fetch(Account $account, int $definitionId): CustomAttributeDefinition
    {
        return $account->customAttributeDefinitions()
            ->whereKey($definitionId)
            ->firstOrFail();
    }

    private function assertAllowed(Request $request, string $ability): void
    {
        /** @var AccountUser $accountUser */
        $accountUser = $request->attributes->get('currentAccountUser');

        // Bản gốc trả {"error": ...} cho Pundit::NotAuthorizedError.
        abort_unless(
            (new CustomAttributeDefinitionPolicy($accountUser))->{$ability}(),
            response()->json(['error' => 'You are not authorized to do this action'], 401)
        );
    }

    /** @return array<string, mixed> */
    private function resource(CustomAttributeDefinition $definition): array
    {
        return (new CustomAttributeDefinitionResource($definition))->toArray(request());
    }
}
