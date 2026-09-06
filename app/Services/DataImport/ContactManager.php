<?php

namespace App\Services\DataImport;

use App\Models\Account;
use App\Models\Contact;
use Illuminate\Database\Eloquent\Builder;

// Port từ refs/chatwoot/app/services/data_import/contact_manager.rb.
// Gộp liên hệ theo thứ tự identifier → email → phone_number; liên hệ đã có
// được cập nhật và lưu ngay, liên hệ mới trả về ở dạng CHƯA lưu.
class ContactManager
{
    public function __construct(private readonly Account $account) {}

    /** @param array<string, string> $row */
    public function buildContact(array $row): Contact
    {
        $contact = $this->findOrInitializeContact($row);
        $this->updateContactAttributes($row, $contact);

        return $contact;
    }

    /** @param array<string, string> $row */
    private function findOrInitializeContact(array $row): Contact
    {
        $contact = $this->findExistingContact($row);

        if ($contact instanceof Contact) {
            return $contact;
        }

        $contact = new Contact([
            'account_id' => $this->account->id,
            'email' => $this->presence($row, 'email'),
            'identifier' => $this->presence($row, 'identifier'),
        ]);
        $contact->account_id = $this->account->id;

        if ($this->presence($row, 'phone_number') !== null) {
            $contact->phone_number = self::formatPhoneNumber($row['phone_number']);
        }

        return $contact;
    }

    /** @param array<string, string> $row */
    private function findExistingContact(array $row): ?Contact
    {
        $contact = $this->findByIdentifier($row)
            ?? $this->findByEmail($row)
            ?? $this->findByPhoneNumber($row);

        if ($contact instanceof Contact && $contact->validationErrors() === []) {
            $this->updateContactWithMergedAttributes($row, $contact);
        }

        return $contact;
    }

    /** @param array<string, string> $row */
    private function findByIdentifier(array $row): ?Contact
    {
        $identifier = $this->presence($row, 'identifier');

        return $identifier === null ? null : $this->contacts()->where('identifier', $identifier)->first();
    }

    /** @param array<string, string> $row */
    private function findByEmail(array $row): ?Contact
    {
        $email = $this->presence($row, 'email');

        return $email === null ? null : $this->contacts()->where('email', mb_strtolower($email))->first();
    }

    /** @param array<string, string> $row */
    private function findByPhoneNumber(array $row): ?Contact
    {
        $phoneNumber = $this->presence($row, 'phone_number');

        return $phoneNumber === null
            ? null
            : $this->contacts()->where('phone_number', self::formatPhoneNumber($phoneNumber))->first();
    }

    /** @param array<string, string> $row */
    private function updateContactWithMergedAttributes(array $row, Contact $contact): void
    {
        foreach (['identifier', 'email'] as $attribute) {
            if ($this->presence($row, $attribute) !== null) {
                $contact->{$attribute} = $row[$attribute];
            }
        }

        if ($this->presence($row, 'phone_number') !== null) {
            $contact->phone_number = self::formatPhoneNumber($row['phone_number']);
        }

        $this->updateContactAttributes($row, $contact);

        // Bản gốc dùng `contact.save` — sai validation thì bỏ qua trong im lặng
        // và dòng CSV sẽ bị từ chối ở lớp trên.
        if ($contact->validationErrors() === []) {
            $contact->save();
        }
    }

    /** @param array<string, string> $row */
    private function updateContactAttributes(array $row, Contact $contact): void
    {
        if ($this->presence($row, 'name') !== null) {
            $contact->name = $row['name'];
        }

        $additional = $contact->additional_attributes ?? [];

        foreach (['company_name', 'city'] as $attribute) {
            if ($this->presence($row, $attribute) !== null) {
                $additional[$attribute] = $row[$attribute];
            }
        }

        $contact->additional_attributes = $additional;
        $contact->custom_attributes = [
            ...($contact->custom_attributes ?? []),
            ...collect($row)->except(['identifier', 'email', 'name', 'phone_number'])->all(),
        ];
    }

    public static function formatPhoneNumber(string $phoneNumber): string
    {
        return str_starts_with($phoneNumber, '+') ? $phoneNumber : '+'.$phoneNumber;
    }

    /** @param array<string, string> $row */
    private function presence(array $row, string $key): ?string
    {
        return filled($row[$key] ?? null) ? (string) $row[$key] : null;
    }

    /** @return Builder<Contact> */
    private function contacts()
    {
        return Contact::query()->where('account_id', $this->account->id);
    }
}
