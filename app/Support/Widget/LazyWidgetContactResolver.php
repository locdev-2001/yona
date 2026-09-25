<?php

namespace App\Support\Widget;

use App\Builders\ContactInboxWithContactBuilder;
use App\Http\Middleware\ResolveWidgetChannel;
use App\Models\ContactInbox;
use App\Models\Inbox;
use Illuminate\Http\Request;

// source_id tái dùng qua unique(inbox_id, source_id) làm cho hành động thật đầu tiên đua nhau vẫn an toàn.
final class LazyWidgetContactResolver
{
    public function resolve(Request $request): ?ContactInbox
    {
        $payload = $request->attributes->get(ResolveWidgetChannel::AUTH_PAYLOAD, []);
        $sourceId = $payload['source_id'] ?? null;

        if (blank($sourceId)) {
            return null;
        }

        $inbox = $request->attributes->get(ResolveWidgetChannel::CHANNEL)->inbox;

        $contactInbox = (new ContactInboxWithContactBuilder(
            inbox: $inbox,
            contactAttributes: ['additional_attributes' => $this->additionalAttributes($request, $inbox)],
            sourceId: (string) $sourceId,
        ))->perform();

        if ($contactInbox !== null) {
            $request->attributes->set(ResolveWidgetChannel::CONTACT_INBOX, $contactInbox);
        }

        return $contactInbox;
    }

    /** @return array<string, mixed> */
    private function additionalAttributes(Request $request, Inbox $inbox): array
    {
        return $inbox->account->featureEnabled('ip_lookup')
            ? ['created_at_ip' => $request->ip()]
            : [];
    }
}
