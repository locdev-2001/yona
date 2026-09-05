<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\AgentResource;
use App\Http\Resources\InboxResource;
use App\Jobs\DeleteObjectJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Channel\Api;
use App\Models\Inbox;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

// Port từ Api::V1::Accounts::InboxesController của Chatwoot.
// B1 chỉ có driver kênh API; các action kênh khác (agent_bot, sync_templates,
// health, campaigns…) port cùng tính năng của chúng.
class InboxesController extends Controller
{
    // Mỗi kênh port xong tự thêm vào map này (allowed_channel_types + channel_type_from_params).
    private const CHANNEL_TYPES = [
        'api' => Api::class,
    ];

    public function index(Request $request, Account $account): JsonResponse
    {
        $inboxes = $this->policyScope($request, $account)
            ->with(['channel', 'avatar'])
            ->orderByName()
            ->get();

        return response()->json([
            'payload' => InboxResource::collectionFor($inboxes, $this->isAdministrator($request)),
        ]);
    }

    public function show(Request $request, Account $account, int $inboxId): JsonResponse
    {
        return response()->json($this->inboxPayload($request, $this->fetchInbox($request, $account, $inboxId)));
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'channel' => ['required', 'array'],
            'channel.type' => ['required', 'string', 'in:'.implode(',', array_keys(self::CHANNEL_TYPES))],
            'channel.webhook_url' => ['sometimes', 'nullable', 'string', 'max:2048'],
        ]);

        $inbox = DB::transaction(function () use ($account, $data) {
            $channel = $this->createChannel($account, $data['channel']);

            return $account->inboxes()->create([
                'name' => $data['name'],
                'channel_id' => $channel->id,
                'channel_type' => $channel->getMorphClass(),
            ]);
        });

        return response()->json($this->inboxPayload($request, $inbox));
    }

    public function update(Request $request, Account $account, int $inboxId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $inbox = $this->fetchInbox($request, $account, $inboxId);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'greeting_enabled' => ['sometimes', 'boolean'],
            'greeting_message' => ['sometimes', 'nullable', 'string', 'max:255'],
            'enable_email_collect' => ['sometimes', 'boolean'],
            'csat_survey_enabled' => ['sometimes', 'boolean'],
            'enable_auto_assignment' => ['sometimes', 'boolean'],
            'auto_assignment_config' => ['sometimes', 'array'],
            'working_hours_enabled' => ['sometimes', 'boolean'],
            'out_of_office_message' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'timezone' => ['sometimes', 'string', 'timezone:all'],
            'allow_messages_after_resolved' => ['sometimes', 'boolean'],
            'lock_to_single_conversation' => ['sometimes', 'boolean'],
            'sender_name_type' => ['sometimes', 'in:friendly,professional'],
            'business_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'avatar' => ['sometimes', 'file', 'mimes:jpg,jpeg,png,gif,webp', 'max:15360'],
            'channel' => ['sometimes', 'array'],
        ]);

        DB::transaction(function () use ($request, $inbox, $data) {
            $inboxAttributes = collect($data)->except(['avatar', 'channel', 'sender_name_type'])->all();

            if (array_key_exists('sender_name_type', $data)) {
                $inboxAttributes['sender_name_type'] = $data['sender_name_type'] === 'professional'
                    ? Inbox::SENDER_NAME_TYPE_PROFESSIONAL
                    : Inbox::SENDER_NAME_TYPE_FRIENDLY;
            }

            $inbox->update($inboxAttributes);

            if ($request->file('avatar') instanceof UploadedFile) {
                $inbox->replaceAvatar($request->file('avatar'));
            }

            $this->updateChannel($inbox, $data['channel'] ?? []);
        });

        return response()->json($this->inboxPayload($request, $inbox->refresh()));
    }

    public function destroy(Request $request, Account $account, int $inboxId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        DeleteObjectJob::dispatch($this->fetchInbox($request, $account, $inboxId));

        return response()->json([
            'message' => 'Your inbox deletion request will be processed in some time.',
        ]);
    }

    public function resetSecret(Request $request, Account $account, int $inboxId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $inbox = $this->fetchInbox($request, $account, $inboxId);

        if (! $inbox->isApi()) {
            return response()->json(null, 404);
        }

        $inbox->channel->resetSecret();

        return response()->json($this->inboxPayload($request, $inbox));
    }

    public function destroyAvatar(Request $request, Account $account, int $inboxId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $this->fetchInbox($request, $account, $inboxId)->avatar?->delete();

        return response()->json(null, 200);
    }

    public function assignableAgents(Request $request, Account $account, int $inboxId): JsonResponse
    {
        $inbox = $this->fetchInbox($request, $account, $inboxId);

        return response()->json([
            'payload' => AgentResource::forAccount($inbox->assignableAgents(), $account),
        ]);
    }

    // assignable_agents_controller.rb: nhận inbox_ids[] rồi trả agent gán được
    // cho TẤT CẢ inbox đó (thanh bulk action gọi khi chọn nhiều hội thoại).
    public function assignableAgentsForInboxes(Request $request, Account $account): JsonResponse
    {
        $inboxIds = (array) $request->query('inbox_ids', []);
        $inboxes = collect($inboxIds)->map(
            fn ($inboxId) => $this->fetchInbox($request, $account, (int) $inboxId)
        );

        return response()->json([
            'payload' => AgentResource::forAccount(Inbox::assignableAgentsForInboxes($inboxes, $account), $account),
        ]);
    }

    private function createChannel(Account $account, array $channelParams): Api
    {
        $channelClass = self::CHANNEL_TYPES[$channelParams['type']];

        return $channelClass::create([
            'account_id' => $account->id,
            ...collect($channelParams)->only($channelClass::EDITABLE_ATTRS)->all(),
        ]);
    }

    private function updateChannel(Inbox $inbox, array $channelParams): void
    {
        $editable = collect($channelParams)->only($inbox->channel::EDITABLE_ATTRS)->all();

        if ($editable !== []) {
            $inbox->channel->update($editable);
        }
    }

    // InboxPolicy::Scope#resolve = user.assigned_inboxes (admin thấy hết, agent chỉ inbox mình).
    private function policyScope(Request $request, Account $account): Builder
    {
        return $request->user()->assignedInboxes($account, $this->currentAccountUser($request));
    }

    // fetch_inbox + authorize :show? — ngoài account → 404 (find), agent không
    // phải member → 401 (Pundit::NotAuthorizedError của bản gốc).
    private function fetchInbox(Request $request, Account $account, int $inboxId): Inbox
    {
        $inbox = $account->inboxes()->findOrFail($inboxId);

        abort_unless(
            $this->isAdministrator($request)
                || $inbox->inboxMembers()->where('user_id', $request->user()->id)->exists(),
            401,
            'You are not authorized to do this action'
        );

        return $inbox;
    }

    private function inboxPayload(Request $request, Inbox $inbox): array
    {
        return (new InboxResource($inbox, $this->isAdministrator($request)))->toArray($request);
    }

    private function currentAccountUser(Request $request): AccountUser
    {
        return $request->attributes->get('currentAccountUser');
    }

    private function isAdministrator(Request $request): bool
    {
        return $this->currentAccountUser($request)->isAdministrator();
    }
}
