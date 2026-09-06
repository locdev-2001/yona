<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\AgentBotResource;
use App\Http\Resources\AgentResource;
use App\Http\Resources\InboxResource;
use App\Jobs\DeleteObjectJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\AgentBot;
use App\Models\Channel\Api;
use App\Models\Channel\Email;
use App\Models\Channel\FacebookPage;
use App\Models\Channel\Instagram;
use App\Models\Channel\Line;
use App\Models\Channel\Sms;
use App\Models\Channel\Telegram;
use App\Models\Channel\Tiktok;
use App\Models\Channel\TwilioSms;
use App\Models\Channel\TwitterProfile;
use App\Models\Channel\WebWidget;
use App\Models\Channel\Whatsapp;
use App\Models\Channel\Zalo;
use App\Models\Inbox;
use App\Services\Channels\ChannelSetupService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
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
        'web_widget' => WebWidget::class,
        'email' => Email::class,
        'facebook' => FacebookPage::class,
        'instagram' => Instagram::class,
        'telegram' => Telegram::class,
        'line' => Line::class,
        'sms' => Sms::class,
        'twilio' => TwilioSms::class,
        'whatsapp' => Whatsapp::class,
        'tiktok' => Tiktok::class,
        'twitter_profile' => TwitterProfile::class,
        'zalo' => Zalo::class,
    ];

    // inbox_attributes của bản gốc — cùng bộ cho POST lẫn PATCH (trừ name/avatar
    // khác bắt buộc giữa hai action).
    private const INBOX_ATTRIBUTE_RULES = [
        'greeting_enabled' => ['sometimes', 'boolean'],
        'greeting_message' => ['sometimes', 'nullable', 'string', 'max:255'],
        'enable_email_collect' => ['sometimes', 'boolean'],
        'csat_survey_enabled' => ['sometimes', 'boolean'],
        'csat_config' => ['sometimes', 'array'],
        'enable_auto_assignment' => ['sometimes', 'boolean'],
        'auto_assignment_config' => ['sometimes', 'array'],
        'working_hours_enabled' => ['sometimes', 'boolean'],
        'out_of_office_message' => ['sometimes', 'nullable', 'string', 'max:10000'],
        'timezone' => ['sometimes', 'string', 'timezone:all'],
        'allow_messages_after_resolved' => ['sometimes', 'boolean'],
        'lock_to_single_conversation' => ['sometimes', 'boolean'],
        'sender_name_type' => ['sometimes', 'in:friendly,professional'],
        'business_name' => ['sometimes', 'nullable', 'string', 'max:255'],
    ];

    // params.permit(working_hours: Inbox::OFFISABLE_ATTRS) — lịch tuần đi kèm
    // PATCH inbox, không có endpoint riêng ở bản gốc.
    private const WORKING_HOURS_RULES = [
        'working_hours' => ['sometimes', 'array'],
        'working_hours.*.day_of_week' => ['required', 'integer', 'between:0,6'],
        'working_hours.*.closed_all_day' => ['sometimes', 'nullable', 'boolean'],
        'working_hours.*.open_all_day' => ['sometimes', 'nullable', 'boolean'],
        'working_hours.*.open_hour' => ['sometimes', 'nullable', 'integer'],
        'working_hours.*.open_minutes' => ['sometimes', 'nullable', 'integer'],
        'working_hours.*.close_hour' => ['sometimes', 'nullable', 'integer'],
        'working_hours.*.close_minutes' => ['sometimes', 'nullable', 'integer'],
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

        $data = $request->validate($this->storeRules($request->input('channel.type')));

        $inbox = DB::transaction(function () use ($account, $data) {
            $channel = $this->createChannel($account, $data['channel']);

            return $account->inboxes()->create([
                'name' => '',
                ...$this->inboxAttributesFrom($data),
                'channel_id' => $channel->id,
                'channel_type' => $channel->getMorphClass(),
            ]);
        });

        // Đăng ký webhook với nhà cung cấp (setWebhook/subscribe/…) — một lời gọi
        // cho mọi kênh, bảng tra nằm trong service.
        app(ChannelSetupService::class)->register($inbox);

        return response()->json($this->inboxPayload($request, $inbox->refresh()));
    }

    public function update(Request $request, Account $account, int $inboxId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $inbox = $this->fetchInbox($request, $account, $inboxId);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            ...self::INBOX_ATTRIBUTE_RULES,
            ...self::WORKING_HOURS_RULES,
            'avatar' => ['sometimes', 'file', 'mimes:jpg,jpeg,png,gif,webp', 'max:15360'],
            'channel' => ['sometimes', 'array'],
        ]);

        DB::transaction(function () use ($request, $inbox, $data) {
            $inbox->update($this->inboxAttributesFrom($data));

            if ($request->file('avatar') instanceof UploadedFile) {
                $inbox->replaceAvatar($request->file('avatar'));
            }

            // update_inbox_working_hours: chỉ đụng tới lịch khi client gửi khóa này.
            if (array_key_exists('working_hours', $data)) {
                $inbox->updateWorkingHours($data['working_hours']);
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

    // Api::V1::Accounts::InboxesController#agent_bot — inbox chưa gắn bot thì
    // jbuilder gốc trả `{"agent_bot": {}}`.
    public function agentBot(Request $request, Account $account, int $inboxId): JsonResponse
    {
        $agentBot = $this->fetchInbox($request, $account, $inboxId)->agentBot;
        $accountUser = $request->attributes->get('currentAccountUser');

        return response()->json([
            'agent_bot' => $agentBot === null ? (object) [] : (new AgentBotResource(
                $agentBot,
                $account,
                $accountUser instanceof AccountUser && $accountUser->isAdministrator(),
            ))->toArray($request),
        ]);
    }

    // #set_agent_bot — không truyền `agent_bot` (hoặc null) là gỡ bot khỏi inbox.
    public function setAgentBot(Request $request, Account $account, int $inboxId): Response
    {
        $this->authorizeAdministrator($request);

        $inbox = $this->fetchInbox($request, $account, $inboxId);
        $agentBotId = $request->input('agent_bot');

        if (filled($agentBotId)) {
            $agentBot = AgentBot::query()->accessibleTo($account)->whereKey($agentBotId)->firstOrFail();

            $inbox->agentBotInbox()->updateOrCreate([], ['agent_bot_id' => $agentBot->id]);
        } else {
            $inbox->agentBotInbox?->delete();
        }

        $inbox->unsetRelation('agentBotInbox')->unsetRelation('agentBot');

        return response()->noContent(200);
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

    /**
     * Quy tắc validate cho POST: phần chung + phần kênh do chính kênh khai
     * (channelRules) — thêm kênh mới không phải sửa chỗ này.
     *
     * @return array<string, list<string>>
     */
    private function storeRules(mixed $channelType): array
    {
        $channelClass = is_string($channelType) ? (self::CHANNEL_TYPES[$channelType] ?? null) : null;

        $rules = [
            'name' => $channelClass && $channelClass::namesInboxItself()
                ? ['sometimes', 'string', 'max:255']
                : ['required', 'string', 'max:255'],
            ...self::INBOX_ATTRIBUTE_RULES,
            'channel' => ['required', 'array'],
            'channel.type' => ['required', 'string', 'in:'.implode(',', array_keys(self::CHANNEL_TYPES))],
        ];

        foreach ($channelClass ? $channelClass::channelRules() : [] as $attribute => $rule) {
            $rules["channel.{$attribute}"] = $rule;
        }

        return $rules;
    }

    // Cột của inbox lấy từ params đã validate; sender_name_type là enum số của
    // Rails nên đổi khóa 'friendly'/'professional' thành giá trị cột.
    private function inboxAttributesFrom(array $data): array
    {
        $attributes = collect($data)->except(['avatar', 'channel', 'working_hours', 'sender_name_type'])->all();

        if (array_key_exists('sender_name_type', $data)) {
            $attributes['sender_name_type'] = $data['sender_name_type'] === 'professional'
                ? Inbox::SENDER_NAME_TYPE_PROFESSIONAL
                : Inbox::SENDER_NAME_TYPE_FRIENDLY;
        }

        return $attributes;
    }

    private function createChannel(Account $account, array $channelParams): Model
    {
        $channelClass = self::CHANNEL_TYPES[$channelParams['type']];

        return $channelClass::create([
            'account_id' => $account->id,
            ...collect($channelParams)->only($this->creatableAttributes($channelClass))->all(),
        ]);
    }

    /**
     * Thuộc tính kênh nhận được lúc tạo: hợp của những gì kênh khai trong
     * channelRules() (nguồn duy nhất cho form tạo) và EDITABLE_ATTRS (nếu có).
     * Kênh không khai EDITABLE_ATTRS (Facebook/Instagram/Tiktok) vẫn tạo được.
     *
     * @param  class-string  $channelClass
     * @return list<string>
     */
    private function creatableAttributes(string $channelClass): array
    {
        $editable = defined($channelClass.'::EDITABLE_ATTRS') ? $channelClass::EDITABLE_ATTRS : [];

        return array_values(array_unique([...array_keys($channelClass::channelRules()), ...$editable]));
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
