<?php

namespace App\Http\Middleware;

use App\Models\Account;
use App\Models\Channel\WebWidget;
use App\Models\ContactInbox;
use App\Support\CurrentContact;
use App\Support\WidgetTokenService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// (#set_web_widget + #set_contact + #auth_token_params).
//
// Đây là BIÊN VÀO của khách website: chỉ có hai bằng chứng — `website_token`
// công khai nhận diện inbox, và JWT `X-Auth-Token` nhận diện phiên khách. Không
// đụng session/guard của dashboard.
class ResolveWidgetChannel
{
    public const CHANNEL = 'widgetChannel';

    public const CONTACT_INBOX = 'widgetContactInbox';

    public const AUTH_PAYLOAD = 'widgetAuthPayload';

    public function handle(Request $request, Closure $next): Response
    {
        $channel = WebWidget::query()
            ->where('website_token', (string) $request->input('website_token'))
            ->first();

        abort_if($channel === null, 404, 'Resource could not be found');

        $inbox = $channel->inbox;
        abort_if($inbox === null, 404, 'Resource could not be found');

        if ($inbox->account->status !== Account::STATUS_ACTIVE) {
            return response()->json(['error' => 'Account is suspended'], 401);
        }

        $payload = WidgetTokenService::decode($request->header('X-Auth-Token'));
        $contactInbox = $this->resolveContactInbox($inbox->id, $payload);

        $request->attributes->set(self::CHANNEL, $channel);
        $request->attributes->set(self::AUTH_PAYLOAD, $payload);
        $request->attributes->set(self::CONTACT_INBOX, $contactInbox);

        return CurrentContact::run($contactInbox?->contact, fn () => $next($request));
    }

    /** @param array<string, mixed> $payload */
    private function resolveContactInbox(int $inboxId, array $payload): ?ContactInbox
    {
        if (blank($payload['source_id'] ?? null)) {
            return null;
        }

        $contactInbox = ContactInbox::query()
            ->where('inbox_id', $inboxId)
            ->where('source_id', $payload['source_id'])
            ->with('contact')
            ->first();

        return $contactInbox?->contact === null ? null : $contactInbox;
    }
}
