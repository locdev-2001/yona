<?php

namespace App\Services\Calls\Media\LiveKit;

use App\Services\Calls\Media\JoinTicket;
use App\Services\Calls\Media\MediaTickets;
use App\Services\Calls\Media\TicketRequest;
use Carbon\CarbonImmutable;

// Vé vào phòng = access token LiveKit: `sub` là identity, `name` là tên hiển thị, grant
// `video` giới hạn đúng một phòng và đúng các nguồn được phát. Không cấp roomAdmin cho
// người tham gia: điều hành phòng chỉ đi từ máy chủ.
final readonly class LiveKitTickets implements MediaTickets
{
    public function __construct(
        private LiveKitCredentials $credentials,
        private LiveKitTokenSigner $signer,
    ) {}

    public function issue(TicketRequest $request): JoinTicket
    {
        $permissions = $request->permissions;

        $token = $this->signer->sign([
            'sub' => $request->identity,
            'name' => $request->displayName,
            'attributes' => (object) $request->attributes,
            'video' => [
                'room' => $request->room,
                'roomJoin' => true,
                'canPublish' => $permissions->canPublish(),
                'canPublishSources' => array_map(LiveKitSources::grantName(...), $permissions->publishableSources),
                'canSubscribe' => $permissions->canSubscribe,
                'canPublishData' => false,
                'canUpdateOwnMetadata' => false,
            ],
        ], $request->ttlSeconds);

        return new JoinTicket(
            $this->credentials->clientUrl(),
            $token,
            CarbonImmutable::now()->addSeconds($request->ttlSeconds),
        );
    }
}
