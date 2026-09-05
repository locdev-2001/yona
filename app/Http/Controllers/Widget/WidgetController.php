<?php

namespace App\Http\Controllers\Widget;

use App\Http\Controllers\Controller;
use App\Http\Middleware\ResolveWidgetChannel;
use App\Models\Account;
use App\Models\Channel\WebWidget;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Support\BrowserInfo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

// Port từ refs/chatwoot/app/controllers/api/v1/widget/base_controller.rb.
// Ngữ cảnh khách (kênh, contact_inbox, contact) do ResolveWidgetChannel đặt vào
// request; controller chỉ đọc ra, không tự tra lại.
abstract class WidgetController extends Controller
{
    protected function channel(Request $request): WebWidget
    {
        return $request->attributes->get(ResolveWidgetChannel::CHANNEL);
    }

    protected function inbox(Request $request): Inbox
    {
        return $this->channel($request)->inbox;
    }

    protected function account(Request $request): Account
    {
        return $this->inbox($request)->account;
    }

    protected function contactInbox(Request $request): ?ContactInbox
    {
        return $request->attributes->get(ResolveWidgetChannel::CONTACT_INBOX);
    }

    protected function contact(Request $request): ?Contact
    {
        return $this->contactInbox($request)?->contact;
    }

    /** @return array<string, mixed> */
    protected function authPayload(Request $request): array
    {
        return $request->attributes->get(ResolveWidgetChannel::AUTH_PAYLOAD, []);
    }

    /**
     * base_controller#conversations — khách đã xác minh HMAC thấy hội thoại của
     * MỌI phiên đã xác minh (continuity đa thiết bị), khách thường chỉ thấy
     * hội thoại của đúng phiên hiện tại.
     *
     * @return Builder<Conversation>
     */
    protected function conversationsQuery(Request $request)
    {
        $contactInbox = $this->contactInbox($request);
        $inboxId = $this->authPayload($request)['inbox_id'] ?? null;

        if ($contactInbox->hmac_verified) {
            $verifiedIds = $contactInbox->contact->contactInboxes()
                ->where('inbox_id', $inboxId)
                ->where('hmac_verified', true)
                ->pluck('id');

            return $contactInbox->contact->conversations()->getQuery()->whereIn('contact_inbox_id', $verifiedIds);
        }

        return $contactInbox->conversations()->getQuery()->where('inbox_id', $inboxId);
    }

    // `conversations.last` của Rails: sắp theo khóa chính rồi lấy bản ghi cuối.
    protected function conversation(Request $request): ?Conversation
    {
        return $this->conversationsQuery($request)->reorder('id', 'desc')->first();
    }

    // create_conversation — bản gốc gọi thẳng Conversation.create!, KHÔNG qua
    // ConversationBuilder (widget không áp lock_to_single_conversation).
    protected function createConversation(Request $request): Conversation
    {
        $inbox = $this->inbox($request);
        $contactInbox = $this->contactInbox($request);

        return Conversation::query()->create([
            'account_id' => $inbox->account_id,
            'inbox_id' => $inbox->id,
            'contact_id' => $contactInbox->contact_id,
            'contact_inbox_id' => $contactInbox->id,
            'additional_attributes' => [
                'browser_language' => BrowserInfo::browserLanguage($request),
                'browser' => BrowserInfo::fromRequest($request),
                'initiated_at' => ['timestamp' => $request->input('message.timestamp')],
                'referer' => $request->input('message.referer_url'),
            ],
            'custom_attributes' => $this->customAttributes($request),
        ]);
    }

    /** @return array<string, mixed> */
    protected function customAttributes(Request $request): array
    {
        $customAttributes = $request->input('custom_attributes');

        return is_array($customAttributes) ? $customAttributes : [];
    }

    /** @return array<string, mixed> */
    protected function messageParams(Request $request, Conversation $conversation): array
    {
        return [
            'content' => $request->input('message.content'),
            'message_type' => 'incoming',
            'echo_id' => $request->input('message.echo_id'),
            // Tệp gửi multipart nằm ở file(), signed_id của upload trực tiếp nằm
            // ở input() — request đa phần luôn để lại mảng RỖNG ở input() nên
            // phải dùng ?: chứ không phải ??.
            'attachments' => $request->file('message.attachments') ?: $request->input('message.attachments'),
            'content_attributes' => [
                'in_reply_to' => $this->inReplyToId($request, $conversation),
            ],
        ];
    }

    // Messages::InReplyToMessageBuilder giới hạn ở luồng widget: id không thuộc
    // hội thoại này thì bỏ, để khách không trích dẫn được tin của người khác.
    private function inReplyToId(Request $request, Conversation $conversation): ?int
    {
        $replyTo = $request->input('message.reply_to');

        if (blank($replyTo) || ! is_numeric($replyTo)) {
            return null;
        }

        return $conversation->messages()
            ->whereKey((int) $replyTo)
            ->value('id');
    }

    protected function contactEmail(Request $request): ?string
    {
        $email = $request->input('contact.email');

        return filled($email) ? mb_strtolower((string) $email) : null;
    }

    // contact_name: chỉ đặt tên khi hồ sơ chưa có định danh nào; thiếu tên thì
    // lấy phần trước @ của email.
    protected function contactName(Request $request): ?string
    {
        $contact = $this->contact($request);

        if (filled($contact?->email) || filled($contact?->phone_number) || filled($contact?->identifier)) {
            return null;
        }

        $name = $request->input('contact.name');

        if (filled($name)) {
            return (string) $name;
        }

        $email = $this->contactEmail($request);

        return filled($email) ? explode('@', $email)[0] : null;
    }

    protected function contactPhoneNumber(Request $request): ?string
    {
        return $request->input('contact.phone_number');
    }

    /** @return array<string, mixed>|null */
    protected function contactCustomAttributes(Request $request): ?array
    {
        $customAttributes = $request->input('contact.custom_attributes');

        return is_array($customAttributes) ? $customAttributes : null;
    }
}
