<?php

namespace App\Http\Controllers\Widget;

use App\Builders\ContactInboxWithContactBuilder;
use App\Http\Middleware\ResolveWidgetChannel;
use App\Http\Resources\Widget\WidgetConfigResource;
use App\Models\ContactInbox;
use App\Support\WidgetTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Port từ refs/chatwoot/app/controllers/api/v1/widget/configs_controller.rb —
// cửa vào của mọi phiên khách: chưa có token (hoặc token hỏng) thì dựng hồ sơ
// nháp mới, có token hợp lệ thì dùng lại đúng phiên cũ.
class ConfigsController extends WidgetController
{
    public function store(Request $request): JsonResponse
    {
        $channel = $this->channel($request);
        $contactInbox = $this->contactInbox($request) ?? $this->buildContactInbox($request);

        $token = WidgetTokenService::generate([
            'source_id' => $contactInbox->source_id,
            'inbox_id' => $channel->inbox->id,
        ]);

        return response()->json(
            WidgetConfigResource::make($channel, $contactInbox, $contactInbox->contact, $token)
        );
    }

    // Channel::WebWidget#create_contact_inbox — dùng lại builder định danh của B2.
    private function buildContactInbox(Request $request): ContactInbox
    {
        $contactInbox = (new ContactInboxWithContactBuilder(
            inbox: $this->inbox($request),
            contactAttributes: ['additional_attributes' => $this->additionalAttributes($request)],
        ))->perform();

        abort_if($contactInbox === null, 422, 'Could not create a contact for this widget');

        $request->attributes->set(ResolveWidgetChannel::CONTACT_INBOX, $contactInbox);

        return $contactInbox;
    }

    /** @return array<string, mixed> */
    private function additionalAttributes(Request $request): array
    {
        return $this->account($request)->featureEnabled('ip_lookup')
            ? ['created_at_ip' => $request->ip()]
            : [];
    }
}
