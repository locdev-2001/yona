<?php

namespace App\Services\Facebook;

use App\Messaging\Delivery\ChoiceToken;
use App\Messaging\Inbound\InboundMessageWriter;
use App\Messaging\Inbound\InboundSender;
use App\Models\Channel\FacebookPage;
use App\Models\Inbox;
use App\Services\Messaging\ChoiceCallbackService;

/** Một phần tử `messaging` có `message` → tin đến hoặc tin dội lại trên mọi trang khớp. */
class MessageCreator
{
    public function __construct(private readonly MessageParser $response) {}

    public function perform(): void
    {
        if ($this->response->isEcho() && $this->response->isSentFromOwnApp()) {
            return;
        }

        if (! $this->response->isEcho() && $this->handleQuickReply()) {
            return;
        }

        $pageId = $this->response->isEcho() ? $this->response->senderId() : $this->response->recipientId();
        $contactSourceId = $this->response->contactSourceId();

        if ($contactSourceId === null) {
            return;
        }

        FacebookPage::query()->where('page_id', $pageId)->get()
            ->filter(fn (FacebookPage $page) => $page->inbox !== null && ! $page->reauthorizationRequired())
            ->each(function (FacebookPage $page) use ($contactSourceId) {
                app(InboundMessageWriter::class)->write(
                    $page->inbox,
                    $this->sender($page, $contactSourceId),
                    $this->response->inboundMessage(),
                );
            });
    }

    /**
     * Hồ sơ Graph chỉ tra khi khách chưa có trong hộp thư — tên hiển thị đầy đủ `name`
     * đúng thứ tự chủ tài khoản đặt; ghép first/last kiểu Tây sẽ đảo họ tên.
     */
    private function sender(FacebookPage $page, string $contactSourceId): InboundSender
    {
        if ($this->contactKnown($page->inbox, $contactSourceId)) {
            return new InboundSender($contactSourceId);
        }

        $profile = (new FacebookGraphClient($page))->userProfile($contactSourceId);
        $name = trim((string) ($profile['name'] ?? ''));

        if ($name === '') {
            $name = trim(($profile['first_name'] ?? '').' '.($profile['last_name'] ?? ''));
        }

        return new InboundSender(
            sourceId: $contactSourceId,
            name: $name === '' ? null : $name,
            avatarUrl: $profile['profile_pic'] ?? null,
        );
    }

    private function contactKnown(Inbox $inbox, string $contactSourceId): bool
    {
        return $inbox->contactInboxes()->where('source_id', $contactSourceId)->exists();
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
