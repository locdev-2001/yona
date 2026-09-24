<?php

namespace App\Http\Controllers\Widget;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Support\BrowserInfo;
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

        DomainEvent::dispatch($type, [
            'contact_inbox' => $this->contactInbox($request),
            'event_info' => [
                ...(array) $request->input('event_info', []),
                'widget_language' => $request->input('locale'),
                'browser_language' => BrowserInfo::browserLanguage($request),
                'browser' => BrowserInfo::fromRequest($request),
            ],
        ]);

        return response()->noContent();
    }
}
