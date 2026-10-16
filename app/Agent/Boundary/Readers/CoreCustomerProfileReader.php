<?php

namespace App\Agent\Boundary\Readers;

use App\Agent\Boundary\CoreRecords;
use App\Agent\Contracts\Ports\CustomerProfileReader;
use App\Agent\ValueObjects\ConversationRef;
use App\Agent\ValueObjects\CustomerProfile;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\CustomAttributeDefinition;
use App\Models\Message;
use App\Models\Note;
use App\Support\AnonymousName;
use Illuminate\Support\Str;

// Hồ sơ khách của đúng hội thoại đang chạy: thông tin liên hệ, thuộc tính tuỳ biến shop
// định nghĩa, nhãn, ghi chú gần nhất, vài hội thoại khác gần nhất (mỗi cái vài dòng cuối).
// Chỉ đi từ hội thoại tới khách của nó, không bao giờ tra khách theo id mô hình đưa.
final class CoreCustomerProfileReader implements CustomerProfileReader
{
    private const NOTE_LIMIT = 3;

    private const NOTE_CHARACTERS = 500;

    private const RECENT_CONVERSATIONS = 3;

    private const LINES_PER_CONVERSATION = 4;

    private const LINE_CHARACTERS = 200;

    private const DATE_FORMAT = 'Y-m-d';

    public function __construct(private readonly MessageText $messageText) {}

    public function profile(ConversationRef $conversation): ?CustomerProfile
    {
        $model = CoreRecords::conversation($conversation);
        $contact = $model?->contact;

        if ($model === null || $contact === null || $contact->account_id !== $conversation->accountId) {
            return null;
        }

        $others = Conversation::query()
            ->where('account_id', $conversation->accountId)
            ->where('contact_id', $contact->id)
            ->whereKeyNot($model->id);

        return new CustomerProfile(
            name: blank($contact->name) || AnonymousName::isGenerated($model->account, (string) $contact->name) ? null : (string) $contact->name,
            phoneNumber: $contact->phone_number ?: null,
            email: $contact->email ?: null,
            city: ($contact->additional_attributes['city'] ?? null) ?: null,
            attributes: $this->attributes($contact),
            labels: $contact->labelList(),
            notes: $contact->notes()->latestFirst()->limit(self::NOTE_LIMIT)->get()
                ->map(fn (Note $note) => ['at' => $note->created_at->format(self::DATE_FORMAT), 'text' => Str::limit((string) $note->content, self::NOTE_CHARACTERS)])
                ->all(),
            otherConversationCount: (clone $others)->count(),
            recentConversations: $others->with('inbox')->orderByDesc('last_activity_at')->orderByDesc('id')->limit(self::RECENT_CONVERSATIONS)->get()
                ->map(fn (Conversation $other) => [
                    'started_at' => $other->created_at->format(self::DATE_FORMAT),
                    'last_activity_at' => ($other->last_activity_at ?? $other->created_at)->format(self::DATE_FORMAT),
                    'status' => $other->statusName(),
                    'channel' => CoreRecords::channel($other->inbox),
                    'last_lines' => $this->lastLines($other),
                ])
                ->all(),
        );
    }

    /** @return list<array{key: string, label: string, type: string, value: ?string, options: list<string>}> */
    private function attributes(Contact $contact): array
    {
        $values = $contact->custom_attributes ?? [];

        return CustomAttributeDefinition::query()
            ->where('account_id', $contact->account_id)
            ->withAttributeModel(CustomAttributeDefinition::MODEL_CONTACT)
            ->orderBy('id')
            ->get()
            ->map(fn (CustomAttributeDefinition $definition) => [
                'key' => (string) $definition->attribute_key,
                'label' => (string) $definition->attribute_display_name,
                'type' => (string) $definition->attribute_display_type,
                'value' => isset($values[$definition->attribute_key]) && ! is_array($values[$definition->attribute_key])
                    ? (string) $values[$definition->attribute_key]
                    : null,
                'options' => array_values(array_map('strval', (array) ($definition->attribute_values ?? []))),
            ])
            ->all();
    }

    /** @return list<string> "customer: …" / "shop: …", cũ trước */
    private function lastLines(Conversation $conversation): array
    {
        return $conversation->messages()
            ->where('private', false)
            ->whereIn('message_type', [Message::TYPE_INCOMING, Message::TYPE_OUTGOING, Message::TYPE_TEMPLATE])
            ->reorder('id', 'desc')
            ->limit(self::LINES_PER_CONVERSATION)
            ->get()
            ->reverse()
            ->map(fn (Message $message) => ($message->isIncoming() ? 'customer: ' : 'shop: ')
                .Str::limit(str_replace("\n", ' ', $this->messageText->of($message, $conversation) ?? '[attachment]'), self::LINE_CHARACTERS))
            ->values()
            ->all();
    }
}
