<?php

namespace App\Actions;

use App\Jobs\Avatar\AvatarFromUrlJob;
use App\Models\Account;
use App\Models\Contact;
use Illuminate\Support\Facades\DB;

// Port từ refs/chatwoot/app/actions/contact_identify_action.rb — cửa DUY NHẤT
// để một định danh gửi lên từ khách (widget) gắn vào hồ sơ: gộp hồ sơ trùng
// theo identifier → email → phone_number rồi mới ghi thuộc tính.
//
// retainOriginalContactName = true khi cập nhật từ pre-chat form: hồ sơ gốc
// đang giữ tên do agent đặt, không được ghi đè bằng tên khách tự nhập.
class ContactIdentifyAction
{
    private const IDENTITY_ATTRIBUTES = ['identifier', 'name', 'email', 'phone_number'];

    /** @var list<string> */
    private array $attributesToUpdate = self::IDENTITY_ATTRIBUTES;

    private ?Contact $existingIdentifiedContact = null;

    private ?Contact $existingEmailContact = null;

    private ?Contact $existingPhoneNumberContact = null;

    /** @param array<string, mixed> $params */
    public function __construct(
        private Contact $contact,
        private readonly array $params,
        private readonly bool $retainOriginalContactName = false,
        private readonly bool $discardInvalidAttrs = false,
    ) {}

    public function perform(): Contact
    {
        DB::transaction(function () {
            $this->mergeIfExistingIdentifiedContact();
            $this->mergeIfExistingEmailContact();
            $this->mergeIfExistingPhoneNumberContact();
            $this->updateContact();
        });

        return $this->contact;
    }

    private function account(): Account
    {
        return $this->contact->account;
    }

    private function mergeIfExistingIdentifiedContact(): void
    {
        if ($this->shouldMerge($this->existingIdentifiedContact(), 'identifier')) {
            $this->processContactMerge($this->existingIdentifiedContact());
        }
    }

    private function mergeIfExistingEmailContact(): void
    {
        if ($this->shouldMerge($this->existingEmailContact(), 'email')) {
            $this->processContactMerge($this->existingEmailContact());
        }
    }

    private function mergeIfExistingPhoneNumberContact(): void
    {
        if (! $this->shouldMerge($this->existingPhoneNumberContact(), 'phone_number')) {
            return;
        }

        if (! $this->mergablePhoneContact()) {
            return;
        }

        $this->processContactMerge($this->existingPhoneNumberContact());
    }

    private function processContactMerge(Contact $mergeeContact): void
    {
        $this->contact = $this->mergeContact($mergeeContact, $this->contact);

        if ($this->retainOriginalContactName) {
            $this->attributesToUpdate = array_values(array_diff($this->attributesToUpdate, ['name']));
        }
    }

    private function existingIdentifiedContact(): ?Contact
    {
        if (blank($this->params['identifier'] ?? null)) {
            return null;
        }

        return $this->existingIdentifiedContact ??= $this->account()->contacts()
            ->where('identifier', $this->params['identifier'])
            ->first();
    }

    private function existingEmailContact(): ?Contact
    {
        if (blank($this->params['email'] ?? null)) {
            return null;
        }

        return $this->existingEmailContact ??= $this->account()->contacts()
            ->where('email', mb_strtolower((string) $this->params['email']))
            ->first();
    }

    private function existingPhoneNumberContact(): ?Contact
    {
        if (blank($this->params['phone_number'] ?? null)) {
            return null;
        }

        return $this->existingPhoneNumberContact ??= $this->account()->contacts()
            ->where('phone_number', $this->params['phone_number'])
            ->first();
    }

    // Hai hồ sơ mang identifier khác nhau thì KHÔNG gộp, và khóa đang xét bị
    // loại khỏi danh sách ghi để định danh của người khác không bị cướp.
    private function shouldMerge(?Contact $existingContact, string $key): bool
    {
        if ($existingContact === null) {
            return false;
        }

        if (blank($this->params['identifier'] ?? null)) {
            return true;
        }

        if (filled($existingContact->identifier) && $existingContact->identifier !== $this->params['identifier']) {
            $this->attributesToUpdate = array_values(array_diff($this->attributesToUpdate, [$key]));

            return false;
        }

        return true;
    }

    // email được ưu tiên hơn phone_number: không để số điện thoại kéo theo một
    // hồ sơ mang email khác đè lên email vừa gửi lên.
    private function mergablePhoneContact(): bool
    {
        if (blank($this->params['email'] ?? null)) {
            return true;
        }

        $phoneContact = $this->existingPhoneNumberContact();

        if (filled($phoneContact?->email) && $phoneContact->email !== $this->params['email']) {
            $this->attributesToUpdate = array_values(array_diff($this->attributesToUpdate, ['phone_number']));

            return false;
        }

        return true;
    }

    private function updateContact(): void
    {
        $attributes = collect($this->attributesToUpdate)
            ->filter(fn (string $key) => array_key_exists($key, $this->params))
            ->mapWithKeys(fn (string $key) => [$key => $this->params[$key]])
            ->reject(fn ($value) => blank($value))
            ->all();

        $this->contact->fill([
            ...$attributes,
            'custom_attributes' => $this->mergedAttributes('custom_attributes'),
            'additional_attributes' => $this->mergedAttributes('additional_attributes'),
        ]);

        if ($this->discardInvalidAttrs) {
            $this->contact->discardInvalidAttrs();
        }

        if ($this->contact->isDirty()) {
            $this->contact->save();
        }

        $this->enqueueAvatarJob();
    }

    /** @return array<string, mixed> */
    private function mergedAttributes(string $key): array
    {
        $incoming = $this->params[$key] ?? null;
        $current = $this->contact->getAttribute($key) ?? [];

        return blank($incoming) ? $current : self::deepMerge($current, (array) $incoming);
    }

    private function enqueueAvatarJob(): void
    {
        $avatarUrl = $this->params['avatar_url'] ?? null;

        if (blank($avatarUrl) || $this->contact->avatar !== null) {
            return;
        }

        if (filter_var($avatarUrl, FILTER_VALIDATE_URL) === false) {
            return;
        }

        AvatarFromUrlJob::dispatch($this->contact, $avatarUrl);
    }

    private function mergeContact(Contact $baseContact, Contact $mergeContact): Contact
    {
        if ($baseContact->id === $mergeContact->id) {
            return $baseContact;
        }

        return (new ContactMergeAction($this->account(), $baseContact, $mergeContact))->perform();
    }

    /**
     * @param  array<string, mixed>  $base
     * @param  array<string, mixed>  $override
     * @return array<string, mixed>
     */
    private static function deepMerge(array $base, array $override): array
    {
        foreach ($override as $key => $value) {
            $base[$key] = is_array($value) && is_array($base[$key] ?? null)
                ? self::deepMerge($base[$key], $value)
                : $value;
        }

        return $base;
    }
}
