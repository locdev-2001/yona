<?php

namespace App\Http\Controllers\Widget;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Http\Middleware\ResolveWidgetChannel;
use App\Models\ContactInbox;
use App\Support\BrowserInfo;
use App\Support\Widget\LazyWidgetContactResolver;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

// Widget bắn sự kiện (webwidget.triggered, campaign.triggered) vào cùng
// dispatcher với phần còn lại của hệ thống.
class EventsController extends WidgetController
{
    public function store(Request $request): Response
    {
        $type = EventType::tryFrom((string) $request->input('name'));

        abort_if($type === null, 404, 'Resource could not be found');

        $contactInbox = $this->resolveContactInbox($request, $type);

        abort_if($contactInbox === null, 404, 'Resource could not be found');

        DomainEvent::dispatch($type, [
            'contact_inbox' => $contactInbox,
            'event_info' => [
                ...(array) $request->input('event_info', []),
                'widget_language' => $request->input('locale'),
                'browser_language' => BrowserInfo::browserLanguage($request),
                'browser' => BrowserInfo::fromRequest($request),
            ],
        ]);

        return response()->noContent();
    }

    // campaign.triggered là hành động thật của khách (bấm mở tin chủ động) nên
    // dựng contact lazy như messages/conversations; các sự kiện khác (vd.
    // webwidget.triggered phát khi mở khung chat) giữ nguyên yêu cầu đã có
    // phiên — KHÔNG tự tạo khách chỉ vì mở widget.
    private function resolveContactInbox(Request $request, EventType $type): ?ContactInbox
    {
        $contactInbox = $this->contactInbox($request);

        if ($contactInbox !== null || $type !== EventType::CAMPAIGN_TRIGGERED) {
            return $contactInbox;
        }

        $channel = $this->channel($request);
        $payload = $request->attributes->get(ResolveWidgetChannel::AUTH_PAYLOAD, []);
        $contactInbox = app(LazyWidgetContactResolver::class)->resolve($channel, $payload, $request);

        if ($contactInbox !== null) {
            $request->attributes->set(ResolveWidgetChannel::CONTACT_INBOX, $contactInbox);
        }

        return $contactInbox;
    }
}
