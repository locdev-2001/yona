<?php

namespace App\Http\Controllers\Widget;

use App\Events\DomainEvent;
use App\Events\EventType;
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

    // campaign.triggered là hành động thật duy nhất ở đây có thể dựng contact lazy.
    private function resolveContactInbox(Request $request, EventType $type): ?ContactInbox
    {
        $contactInbox = $this->contactInbox($request);

        if ($contactInbox !== null || $type !== EventType::CAMPAIGN_TRIGGERED) {
            return $contactInbox;
        }

        return app(LazyWidgetContactResolver::class)->resolve($request);
    }
}
