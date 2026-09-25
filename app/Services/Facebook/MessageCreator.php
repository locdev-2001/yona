<?php

namespace App\Services\Facebook;

use App\Builders\Messages\Facebook\MessageBuilder;
use App\Messaging\Delivery\ChoiceToken;
use App\Models\Channel\FacebookPage;
use App\Services\Messaging\ChoiceCallbackService;

class MessageCreator
{
    public function __construct(private readonly MessageParser $response) {}

    public function perform(): void
    {
        // Echo của chính tin hệ thống vừa gửi — bỏ, nếu không sẽ nhân đôi.
        if ($this->response->isEcho() && $this->response->isSentFromOwnApp()) {
            return;
        }

        $isEcho = $this->response->isEcho();

        if (! $isEcho && $this->handleQuickReply()) {
            return;
        }

        $pageId = $isEcho ? $this->response->senderId() : $this->response->recipientId();

        FacebookPage::query()->where('page_id', $pageId)->get()
            ->each(function (FacebookPage $page) use ($isEcho) {
                if ($page->inbox === null) {
                    return;
                }

                (new MessageBuilder($this->response, $page->inbox, outgoingEcho: $isEcho))->perform();
            });
    }

    // Khách bấm chip do DeliveryPlanner vẽ (Renderers\FacebookRenderer): map thẳng về tin gốc
    // qua SubmissionService thay vì tạo tin đến mang payload thô. Payload không phải của
    // chúng ta (vd bot flow khác) thì để rơi xuống luồng tạo tin bình thường.
    private function handleQuickReply(): bool
    {
        $payload = $this->response->quickReplyPayload();

        if ($payload === null) {
            return false;
        }

        $parsed = ChoiceToken::parseFacebook($payload);

        if ($parsed === null) {
            return false;
        }

        $pageId = $this->response->recipientId();

        FacebookPage::query()->where('page_id', $pageId)->get()
            ->each(function (FacebookPage $page) use ($parsed) {
                if ($page->inbox === null) {
                    return;
                }

                app(ChoiceCallbackService::class)->resolve($parsed['message_id'], $parsed['value'], null, $page->account_id);
            });

        return true;
    }
}
