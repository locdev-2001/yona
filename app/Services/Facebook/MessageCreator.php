<?php

namespace App\Services\Facebook;

use App\Builders\Messages\Facebook\MessageBuilder;
use App\Models\Channel\FacebookPage;

// Port từ refs/chatwoot/lib/integrations/facebook/message_creator.rb.
class MessageCreator
{
    public function __construct(private readonly MessageParser $response) {}

    public function perform(): void
    {
        // Echo của chính tin Chatwoot vừa gửi — bỏ, nếu không sẽ nhân đôi.
        if ($this->response->isEcho() && $this->response->isSentFromChatwootApp()) {
            return;
        }

        $isEcho = $this->response->isEcho();
        $pageId = $isEcho ? $this->response->senderId() : $this->response->recipientId();

        FacebookPage::query()->where('page_id', $pageId)->get()
            ->each(function (FacebookPage $page) use ($isEcho) {
                if ($page->inbox === null) {
                    return;
                }

                (new MessageBuilder($this->response, $page->inbox, outgoingEcho: $isEcho))->perform();
            });
    }
}
