<?php

namespace App\Actions;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Models\Account;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Support\Facades\DB;
use RuntimeException;

// Port từ refs/chatwoot/app/actions/contact_merge_action.rb.
// Bỏ: merge_calls (enterprise), merge_contact_notes (chưa có model Note).
class ContactMergeAction
{
    // mergable_attribute_keys — thuộc tính của hồ sơ bị gộp được kéo sang khi
    // hồ sơ giữ lại còn trống.
    private const MERGABLE_ATTRIBUTES = [
        'identifier', 'name', 'email', 'phone_number', 'additional_attributes', 'custom_attributes',
    ];

    public function __construct(
        private readonly Account $account,
        private readonly Contact $baseContact,
        private readonly Contact $mergeeContact,
    ) {}

    public function perform(): Contact
    {
        // Agent sửa email trong dashboard đúng lúc khách tự điền email ở widget
        // có thể dẫn tới gộp một hồ sơ với chính nó.
        if ($this->baseContact->id === $this->mergeeContact->id) {
            return $this->baseContact;
        }

        DB::transaction(function () {
            $this->validateContacts();
            $this->mergeConversations();
            $this->mergeMessages();
            $this->mergeContactInboxes();
            $this->mergeAndRemoveMergeeContact();
        });

        return $this->baseContact;
    }

    private function validateContacts(): void
    {
        $belongsToAccount = $this->account->id === $this->baseContact->account_id
            && $this->account->id === $this->mergeeContact->account_id;

        if (! $belongsToAccount) {
            throw new RuntimeException('contact does not belong to the account');
        }
    }

    private function mergeConversations(): void
    {
        // Bản gốc dùng Relation#update: nạp từng bản ghi rồi save nên hook chạy
        // đủ (conversation.contact_changed bắn realtime). Giữ đúng đường đó.
        Conversation::query()
            ->where('contact_id', $this->mergeeContact->id)
            ->get()
            ->each(fn (Conversation $conversation) => $conversation->update(['contact_id' => $this->baseContact->id]));
    }

    private function mergeMessages(): void
    {
        Message::query()
            ->where('sender_type', $this->mergeeContact->getMorphClass())
            ->where('sender_id', $this->mergeeContact->id)
            ->get()
            ->each(fn (Message $message) => $message->update(['sender_id' => $this->baseContact->id]));
    }

    private function mergeContactInboxes(): void
    {
        ContactInbox::query()
            ->where('contact_id', $this->mergeeContact->id)
            ->get()
            ->each(fn (ContactInbox $contactInbox) => $contactInbox->update(['contact_id' => $this->baseContact->id]));
    }

    private function mergeAndRemoveMergeeContact(): void
    {
        // deep_merge với hồ sơ giữ lại ở vế thắng: giá trị của base contact đè
        // lên, chỗ nào base để trống thì lấy của mergee.
        $mergedAttributes = self::deepMerge(
            $this->mergableAttributes($this->mergeeContact),
            $this->mergableAttributes($this->baseContact),
        );

        $this->mergeeContact->refresh()->delete();

        DomainEvent::dispatch(EventType::CONTACT_MERGED, ['contact' => $this->baseContact]);

        $this->baseContact->update($mergedAttributes);
    }

    /** @return array<string, mixed> */
    private function mergableAttributes(Contact $contact): array
    {
        return collect(self::MERGABLE_ATTRIBUTES)
            ->mapWithKeys(fn (string $key) => [$key => $contact->getAttribute($key)])
            // compact_blank của Rails: null, chuỗi rỗng, mảng/hash rỗng đều bị loại.
            ->reject(fn ($value) => blank($value))
            ->all();
    }

    /**
     * Hash#deep_merge của Rails: chỉ đệ quy khi CẢ HAI phía là hash, còn lại vế
     * override thắng nguyên khối.
     *
     * @param  array<string, mixed>  $base
     * @param  array<string, mixed>  $override
     * @return array<string, mixed>
     */
    private static function deepMerge(array $base, array $override): array
    {
        foreach ($override as $key => $value) {
            $base[$key] = self::isHash($value) && self::isHash($base[$key] ?? null)
                ? self::deepMerge($base[$key], $value)
                : $value;
        }

        return $base;
    }

    private static function isHash(mixed $value): bool
    {
        return is_array($value) && ! array_is_list($value);
    }
}
