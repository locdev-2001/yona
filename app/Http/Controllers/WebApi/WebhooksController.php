<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\WebhookResource;
use App\Models\Account;
use App\Models\Webhook;
use App\Support\RecordInvalidResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

// Port từ Api::V1::Accounts::WebhooksController (WebhookPolicy: chỉ administrator).
class WebhooksController extends Controller
{
    public function index(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        return response()->json([
            'payload' => ['webhooks' => WebhookResource::collectionFor($account->webhooks()->get())],
        ]);
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);
        $webhook = $account->webhooks()->create($this->validatedPayload($request, $account));

        return response()->json(['payload' => ['webhook' => $this->resource($webhook)]]);
    }

    public function update(Request $request, Account $account, int $webhookId): JsonResponse
    {
        $this->authorizeAdministrator($request);
        $webhook = $this->fetchWebhook($account, $webhookId);
        $webhook->update($this->validatedPayload($request, $account, $webhook));

        return response()->json(['payload' => ['webhook' => $this->resource($webhook->refresh())]]);
    }

    public function destroy(Request $request, Account $account, int $webhookId): Response
    {
        $this->authorizeAdministrator($request);
        $this->fetchWebhook($account, $webhookId)->delete();

        return response()->noContent(200);
    }

    private function resource(Webhook $webhook): array
    {
        return (new WebhookResource($webhook))->toArray(request());
    }

    // params.require(:webhook).permit(:inbox_id, :name, :url, subscriptions: []) —
    // FE gửi bọc trong khoá `webhook` (ParamsWrapper), nhận cả dạng phẳng.
    /** @return array<string, mixed> */
    private function validatedPayload(Request $request, Account $account, ?Webhook $webhook = null): array
    {
        $wrapped = $request->input('webhook');
        $payload = collect(is_array($wrapped) ? $wrapped : $request->all())
            ->only(['inbox_id', 'name', 'url', 'subscriptions'])
            ->all();

        if ($payload === []) {
            abort(response()->json(['error' => 'param is missing or the value is empty: webhook'], 422));
        }

        $required = $webhook === null ? 'required' : 'sometimes';

        return RecordInvalidResponse::validatedOrAbort(Validator::make($payload, [
            'name' => ['sometimes', 'nullable', 'string'],
            'inbox_id' => [
                'sometimes', 'nullable',
                Rule::exists('inboxes', 'id')->where('account_id', $account->id),
            ],
            'url' => [
                'bail', $required, 'filled', 'string',
                'regex:#^https?://#i',
                Rule::unique('webhooks', 'url')->where('account_id', $account->id)->ignore($webhook?->id),
            ],
            'subscriptions' => ['bail', $required, 'array', 'min:1'],
            'subscriptions.*' => [Rule::in(Webhook::ALLOWED_EVENTS)],
        ], [
            'url.required' => "Url can't be blank",
            'url.filled' => "Url can't be blank",
            'url.regex' => 'Url is invalid',
            'url.unique' => 'Url has already been taken',
            'inbox_id.exists' => 'Inbox must exist',
            'subscriptions.required' => __('errors.webhook.invalid'),
            'subscriptions.array' => __('errors.webhook.invalid'),
            'subscriptions.min' => __('errors.webhook.invalid'),
            'subscriptions.*.in' => __('errors.webhook.invalid'),
        ]));
    }

    private function fetchWebhook(Account $account, int $webhookId): Webhook
    {
        return $account->webhooks()->whereKey($webhookId)->firstOrFail();
    }
}
