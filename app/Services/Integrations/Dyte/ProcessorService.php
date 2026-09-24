<?php

namespace App\Services\Integrations\Dyte;

use App\Http\Resources\MessageResource;
use App\Models\Account;
use App\Models\Conversation;
use App\Models\Integrations\Hook;
use App\Models\Message;
use App\Models\User;

// Tạo cuộc gọi video/voice Cloudflare RealtimeKit và cấp token tham gia cho agent.
// Gọi bởi WebApi\Integrations\DyteController.
class ProcessorService
{
    public function __construct(
        private readonly Account $account,
        private readonly Conversation $conversation,
    ) {}

    /** @return array<string, mixed> */
    public function createAMeeting(User $agent): array
    {
        if ($this->realtimekitCredentialsMissing()) {
            return $this->missingCredentialsResponse();
        }

        $title = $this->meetingTitle($agent);
        $meeting = $this->dyteClient()->createAMeeting($title);

        if (filled($meeting['error'] ?? null)) {
            return $meeting;
        }

        $message = $this->createIntegrationMessage($meeting, $title, $agent);

        return MessageResource::pushEventData($message);
    }

    /** @return array<string, mixed> */
    public function addParticipantToMeeting(string $meetingId, User $user, ?Message $message = null): array
    {
        if ($this->realtimekitCredentialsMissing()) {
            return $this->missingCredentialsResponse();
        }

        $clientId = $this->realtimekitClientId($user);
        $participantId = $this->realtimekitParticipantId($message, $clientId);
        $response = $this->participantTokenResponse($meetingId, $participantId);

        if (blank($response['error'] ?? null)) {
            return $response;
        }

        $response = $this->dyteClient()->addParticipantToMeeting($meetingId, $clientId, $user->name, $this->avatarUrl($user));

        if (blank($response['error'] ?? null)) {
            return $this->storeParticipantIdAndReturn($message, $clientId, $response);
        }

        return $this->existingParticipantTokenResponse($meetingId, $clientId, $message) ?? $response;
    }

    // integration_apps.dyte.meeting_name CHƯA có trong lang/en/integration_apps.php
    // (nợ, xem f6-notes-misc.md) — hardcode nguyên văn chuỗi bản gốc
    // (config/locales/en.yml: '%{agent_name} has started a meeting').
    private function meetingTitle(User $agent): string
    {
        return __('integration_apps.dyte.meeting_name', ['agent_name' => $agent->availableName()]);
    }

    private function realtimekitClientId(User $user): string
    {
        return get_class($user).':'.$user->id;
    }

    /** @param  array<string, mixed>  $response @return array<string, mixed> */
    private function storeParticipantIdAndReturn(?Message $message, string $clientId, array $response): array
    {
        if (filled($response['id'] ?? null)) {
            $this->updateRealtimekitParticipantId($message, $clientId, $response['id']);
        }

        return $response;
    }

    private function createIntegrationMessage(array $meeting, string $title, User $agent): Message
    {
        $message = $this->conversation->messages()->make([
            'account_id' => $this->conversation->account_id,
            'inbox_id' => $this->conversation->inbox_id,
            'message_type' => Message::TYPE_OUTGOING,
            'content_type' => Message::CONTENT_TYPES['integrations'],
            'content' => $title,
            'content_attributes' => [
                'type' => 'dyte',
                'data' => ['meeting_id' => $meeting['id'] ?? null],
            ],
        ]);
        $message->sender()->associate($agent);
        $message->save();

        return $message;
    }

    private function avatarUrl(User $user): string
    {
        $avatarUrl = $user->avatarUrl();

        return $avatarUrl !== '' ? $avatarUrl : rtrim((string) config('app.frontend_url', config('app.url')), '/').'/integrations/slack/user.png';
    }

    private function dyteHook(): Hook
    {
        return $this->account->hooks()->where('app_id', 'dyte')->firstOrFail();
    }

    private function dyteClient(): Client
    {
        [$accountId, $appId, $apiToken] = $this->realtimekitCredentials();

        return new Client($accountId, $appId, $apiToken);
    }

    /** @return array<string, mixed> */
    private function participantTokenResponse(string $meetingId, ?string $participantId): array
    {
        if (blank($participantId)) {
            return ['error' => 'participant_id_missing'];
        }

        return $this->dyteClient()->refreshParticipantToken($meetingId, $participantId);
    }

    /** @return array<string, mixed>|null */
    private function existingParticipantTokenResponse(string $meetingId, string $clientId, ?Message $message): ?array
    {
        $participantId = $this->existingRealtimekitParticipantId($meetingId, $clientId);

        if (blank($participantId)) {
            return null;
        }

        $response = $this->dyteClient()->refreshParticipantToken($meetingId, $participantId);

        if (blank($response['error'] ?? null)) {
            $this->updateRealtimekitParticipantId($message, $clientId, $participantId);
        }

        return $response;
    }

    private function existingRealtimekitParticipantId(string $meetingId, string $clientId): ?string
    {
        $participants = $this->dyteClient()->fetchParticipants($meetingId);

        if ($participants === [] || array_is_list($participants) === false) {
            return null;
        }

        foreach ($participants as $participant) {
            if ((string) ($participant['custom_participant_id'] ?? '') === $clientId) {
                return $participant['id'] ?? null;
            }
        }

        return null;
    }

    private function realtimekitParticipantId(?Message $message, string $clientId): ?string
    {
        return $this->integrationMessageData($message)['participants'][$clientId] ?? null;
    }

    private function updateRealtimekitParticipantId(?Message $message, string $clientId, string $participantId): void
    {
        if ($message === null) {
            return;
        }

        $attributes = $message->content_attributes ?? [];
        $data = $attributes['data'] ?? [];
        $participants = $data['participants'] ?? [];
        $participants[$clientId] = $participantId;
        $data['participants'] = $participants;
        $attributes['data'] = $data;

        // update_columns của bản gốc: ghi thẳng SQL, không chạy hook model
        // (tránh phát lại sự kiện message.updated chỉ vì lưu participant id).
        $message->newModelQuery()->whereKey($message->id)->toBase()->update([
            'content_attributes' => json_encode($attributes),
            'updated_at' => now(),
        ]);
        $message->setAttribute('content_attributes', $attributes);
    }

    /** @return array<string, mixed> */
    private function integrationMessageData(?Message $message): array
    {
        if ($message === null) {
            return [];
        }

        return $message->content_attributes['data'] ?? [];
    }

    /** @return array{0: ?string, 1: ?string, 2: ?string} */
    private function realtimekitCredentials(): array
    {
        $settings = $this->dyteHook()->settings ?? [];

        return [$settings['account_id'] ?? null, $settings['app_id'] ?? null, $settings['api_token'] ?? null];
    }

    private function realtimekitCredentialsMissing(): bool
    {
        foreach ($this->realtimekitCredentials() as $credential) {
            if (blank($credential)) {
                return true;
            }
        }

        return false;
    }

    /** @return array{error: string} */
    private function missingCredentialsResponse(): array
    {
        // errors.dyte.realtimekit_credentials_required CHƯA có trong
        // lang/en/errors.php (nợ, xem f6-notes-misc.md) — hardcode nguyên văn
        // chuỗi bản gốc (config/locales/en.yml).
        return ['error' => __('errors.dyte.realtimekit_credentials_required')];
    }
}
