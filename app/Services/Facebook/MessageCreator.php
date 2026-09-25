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
    // chúng ta, hoặc câu hỏi đã được trả lời rồi, thì để rơi xuống luồng tạo tin bình thường
    // để chữ khách bấm vẫn tới nhân viên.
    private function handleQuickReply(): bool
    {
        $parsed = ChoiceToken::parseFacebook((string) $this->response->quickReplyPayload());
        $senderId = $this->response->senderId();

        if ($parsed === null || $senderId === null) {
            return false;
        }

        return FacebookPage::query()->where('page_id', $this->response->recipientId())->get()
            ->filter(fn (FacebookPage $page) => $page->inbox !== null)
            ->contains(fn (FacebookPage $page) => app(ChoiceCallbackService::class)
                ->resolve($parsed['message_id'], $parsed['value'], null, $page->inbox->id, $senderId) !== null);
    }
}
