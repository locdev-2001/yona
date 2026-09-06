<?php

namespace App\Http\Controllers\WebApi\Integrations;

use App\Http\Controllers\Controller;
use App\Http\Resources\Integrations\HookResource;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Integrations\Hook;
use App\Services\Integrations\Contracts\CredentialValidator;
use App\Support\Integrations\App;
use App\Support\Integrations\JsonSchemaValidator;
use App\Support\RecordInvalidResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

// Port từ Api::V1::Accounts::Integrations::HooksController (HookPolicy: ghi chỉ
// administrator, process_event mở cho mọi thành viên).
class HooksController extends Controller
{
    public function store(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);
        $payload = $this->validatedPayload($request, $account);
        $hook = $account->hooks()->create($payload);

        return response()->json($this->resource($request, $hook));
    }

    public function update(Request $request, Account $account, int $hookId): JsonResponse
    {
        $this->authorizeAdministrator($request);
        $hook = $this->fetchHook($account, $hookId);
        // permitted_params.slice(:status, :settings) — app_id/inbox_id/hook_type
        // là attr_readonly ở bản gốc.
        $hook->update($this->validatedPayload($request, $account, $hook));

        return response()->json($this->resource($request, $hook->refresh()));
    }

    // Hook#process_event của bản gốc luôn trả { error: 'No processor found' }:
    // OpenAI đã chuyển sang Captain (enterprise), các app khác chạy qua HookJob.
    public function processEvent(Request $request, Account $account, int $hookId): JsonResponse
    {
        $this->fetchHook($account, $hookId);

        return response()->json(['error' => 'No processor found'], 422);
    }

    public function destroy(Request $request, Account $account, int $hookId): Response
    {
        $this->authorizeAdministrator($request);
        $this->fetchHook($account, $hookId)->delete();

        return response()->noContent(200);
    }

    private function resource(Request $request, Hook $hook): array
    {
        $accountUser = $request->attributes->get('currentAccountUser');
        $administrator = $accountUser instanceof AccountUser && $accountUser->isAdministrator();

        return (new HookResource($hook, $administrator))->toArray($request);
    }

    private function fetchHook(Account $account, int $hookId): Hook
    {
        return $account->hooks()->whereKey($hookId)->firstOrFail();
    }

    /** @return array<string, mixed> */
    private function validatedPayload(Request $request, Account $account, ?Hook $hook = null): array
    {
        $wrapped = $request->input('hook');
        $source = collect(is_array($wrapped) ? $wrapped : $request->all());

        // update chỉ nhận status + settings (attr_readonly của bản gốc).
        $payload = $hook === null
            ? $source->only(['app_id', 'inbox_id', 'status', 'settings'])->all()
            : $source->only(['status', 'settings'])->all();

        if ($payload === []) {
            abort(response()->json(['error' => 'param is missing or the value is empty: hook'], 422));
        }

        $app = App::find((string) ($payload['app_id'] ?? $hook?->app_id ?? ''));
        // ensure_hook_type: kiểu hook luôn lấy từ danh mục, client không đặt được.
        $hookType = $app?->params['hook_type'] ?? 'account';

        $validated = RecordInvalidResponse::validatedOrAbort(Validator::make($payload, [
            'app_id' => [
                'bail',
                $hook === null ? 'required' : 'prohibited',
                'string',
                ...($hook === null && $app !== null && ! ($app->params['allow_multiple_hooks'] ?? false)
                    ? [Rule::unique('integrations_hooks', 'app_id')->where('account_id', $account->id)]
                    : []),
            ],
            'inbox_id' => [
                'bail',
                $hookType === 'inbox' && $hook === null ? 'required' : 'sometimes',
                'nullable',
                Rule::exists('inboxes', 'id')->where('account_id', $account->id),
            ],
            'status' => ['sometimes', Rule::in([Hook::STATUS_DISABLED, Hook::STATUS_ENABLED, 'disabled', 'enabled'])],
            'settings' => ['sometimes', 'nullable', 'array'],
        ], [
            'app_id.required' => "App can't be blank",
            'app_id.unique' => 'App has already been taken',
            'inbox_id.required' => "Inbox can't be blank",
            'inbox_id.exists' => 'Inbox must exist',
        ]));

        $settings = $validated['settings'] ?? $hook?->settings ?? [];
        $this->assertAppRulesPass($account, $app, $settings);

        return [
            ...$validated,
            ...(array_key_exists('status', $validated) ? ['status' => $this->statusValue($validated['status'])] : []),
            ...($hook === null ? ['hook_type' => $hookType === 'inbox' ? Hook::TYPE_INBOX : Hook::TYPE_ACCOUNT] : []),
        ];
    }

    private function statusValue(mixed $status): int
    {
        return match ($status) {
            'disabled', Hook::STATUS_DISABLED, '0' => Hook::STATUS_DISABLED,
            default => Hook::STATUS_ENABLED,
        };
    }

    /** ensure_feature_enabled + validate_settings_json_schema + kiểm credential của app. */
    private function assertAppRulesPass(Account $account, ?App $app, array $settings): void
    {
        if ($app === null) {
            return;
        }

        $featureFlag = $app->params['feature_flag'] ?? null;

        if ($featureFlag !== null && ! $account->featureEnabled($featureFlag)) {
            $this->failWith('feature_flag', 'Feature flag Feature not enabled');
        }

        $schema = $app->params['settings_json_schema'] ?? null;

        if ($schema !== null && ! JsonSchemaValidator::isValid($settings, $schema)) {
            $this->failWith('settings', 'Settings : Invalid settings data');
        }

        $validatorClass = $app->params['credential_validator'] ?? null;

        if ($validatorClass === null) {
            return;
        }

        /** @var CredentialValidator $validator */
        $validator = app($validatorClass);
        $error = $validator->validate($settings);

        if ($error !== null) {
            $this->failWith('base', $error);
        }
    }

    private function failWith(string $attribute, string $message): never
    {
        abort(response()->json(['message' => $message, 'attributes' => [$attribute]], 422));
    }
}
