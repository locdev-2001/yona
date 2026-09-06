<?php

namespace App\Builders;

use App\Jobs\Avatar\AvatarFromUrlJob;
use App\Models\Account;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Inbox;
use App\Support\AnonymousName;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// Port từ refs/chatwoot/app/builders/contact_inbox_with_contact_builder.rb —
// điểm gộp định danh DUY NHẤT khi tin nhắn đổ về: dedupe theo thứ tự
// identifier → email → phone_number rồi mới tạo contact mới.
// Bỏ ở B2: nhánh tái dùng contact theo source_id Instagram (đi cùng driver Instagram).
class ContactInboxWithContactBuilder
{
    private const MAX_STRING_COLUMN_LENGTH = 255;

    public function __construct(
        private readonly Inbox $inbox,
        private readonly array $contactAttributes,
        private readonly ?string $sourceId = null,
        private readonly bool $hmacVerified = false,
    ) {}

    public function perform(): ?ContactInbox
    {
        try {
            return $this->findOrCreateContactAndContactInbox();
        } catch (UniqueConstraintViolationException) {
            // Race: contact vừa được thread khác tạo — tìm lại rồi tạo contact inbox.
            return $this->findOrCreateContactAndContactInbox();
        }
    }

    private function findOrCreateContactAndContactInbox(): ?ContactInbox
    {
        if (filled($this->sourceId)) {
            $existing = $this->inbox->contactInboxes()->where('source_id', $this->sourceId)->first();

            if ($existing !== null) {
                return $existing;
            }
        }

        $contactInbox = DB::transaction(function () {
            $contact = $this->findContact() ?? $this->createContact();

            return (new ContactInboxBuilder(
                contact: $contact,
                inbox: $this->inbox,
                sourceId: $this->sourceId,
                hmacVerified: $this->hmacVerified,
            ))->perform();
        });

        if ($contactInbox !== null) {
            $this->updateContactAvatar($contactInbox->contact);
        }

        return $contactInbox;
    }

    private function account(): Account
    {
        return $this->inbox->account;
    }

    private function updateContactAvatar(Contact $contact): void
    {
        $avatarUrl = $this->contactAttributes['avatar_url'] ?? null;

        if ($avatarUrl && $contact->avatar === null) {
            AvatarFromUrlJob::dispatch($contact, $avatarUrl);
        }
    }

    private function createContact(): Contact
    {
        return $this->account()->contacts()->create([
            'name' => $this->contactName(),
            'phone_number' => $this->contactAttributes['phone_number'] ?? null,
            'email' => $this->contactAttributes['email'] ?? null,
            'identifier' => $this->contactAttributes['identifier'] ?? null,
            'additional_attributes' => $this->contactAttributes['additional_attributes'] ?? [],
            'custom_attributes' => $this->contactAttributes['custom_attributes'] ?? [],
        ]);
    }

    // Khác bản gốc một điểm cố ý: Ruby dùng `name || Haikunator...`, mà '' trong Ruby là
    // truthy nên tên rỗng do kênh gửi lên (Telegram không có first/last name chẳng hạn) được
    // lưu thẳng, cho ra liên hệ không tên. Dùng blank() để mọi tên rỗng cũng về tên ẩn danh.
    private function contactName(): string
    {
        $name = $this->contactAttributes['name'] ?? null;

        return blank($name)
            ? AnonymousName::forAccount($this->account())
            : Str::limit($name, self::MAX_STRING_COLUMN_LENGTH, '');
    }

    private function findContact(): ?Contact
    {
        return $this->findContactByIdentifier($this->contactAttributes['identifier'] ?? null)
            ?? $this->findContactByEmail($this->contactAttributes['email'] ?? null)
            ?? $this->findContactByPhoneNumber($this->contactAttributes['phone_number'] ?? null);
    }

    private function findContactByIdentifier(?string $identifier): ?Contact
    {
        return blank($identifier)
            ? null
            : $this->account()->contacts()->where('identifier', $identifier)->first();
    }

    private function findContactByEmail(?string $email): ?Contact
    {
        return blank($email)
            ? null
            : $this->account()->contacts()->where('email', mb_strtolower($email))->first();
    }

    private function findContactByPhoneNumber(?string $phoneNumber): ?Contact
    {
        return blank($phoneNumber)
            ? null
            : $this->account()->contacts()->where('phone_number', $phoneNumber)->first();
    }
}
