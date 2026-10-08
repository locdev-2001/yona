<?php

namespace App\Jobs\Account;

use App\Jobs\ApplicationJob;
use App\Models\Account;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\User;
use App\Notifications\AccountNotification;
use App\Services\Contacts\FilterService;
use App\Support\Csv;
use App\Support\RoleAttachment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schema;

class ContactsExportJob extends ApplicationJob
{
    public const LABELS_COLUMN = 'labels';

    public const LABELS_DELIMITER = ',';

    public const ROLE_CONTACTS_EXPORT = 'contacts_export';

    private const DEFAULT_COLUMNS = ['id', 'name', 'email', 'phone_number', 'labels'];

    private const BOM = "\xEF\xBB\xBF";

    /**
     * @param  list<string>|null  $columnNames
     * @param  array{payload?: array<int, array<string, mixed>>|null, label?: string|null}  $filterParams
     */
    public function __construct(
        private readonly int $accountId,
        private readonly int $userId,
        private readonly ?array $columnNames = null,
        private readonly array $filterParams = [],
    ) {
        $this->onQueue('low');
    }

    public function handle(): void
    {
        $account = Account::findOrFail($this->accountId);
        $user = User::findOrFail($this->userId);

        $headers = $this->validHeaders();
        $attachment = $this->generateCsv($account, $headers);

        if ($attachment === null) {
            return;
        }

        Notification::route('mail', $user->email)->notify(new AccountNotification(
            account: $account,
            template: 'contact-export-complete',
            actionUrl: $attachment->url(),
        ));
    }

    /** @param list<string> $headers */
    private function generateCsv(Account $account, array $headers): ?Attachment
    {
        $query = $this->contacts($account);

        if (in_array(self::LABELS_COLUMN, $headers, true)) {
            $query->with('labels');
        }

        $rows = $query->get()
            ->map(fn (Contact $contact) => array_map(
                fn (string $header) => $this->valueForHeader($contact, $header),
                $headers,
            ))
            ->all();

        $csv = Csv::generate($headers, $rows);

        if ($csv === '') {
            return null;
        }

        // BOM để bảng tính nhận đúng UTF-8 cho tiếng Việt/Ả Rập/Nhật.
        return RoleAttachment::attachContents(
            $account,
            self::ROLE_CONTACTS_EXPORT,
            self::BOM.$csv,
            "{$account->name}_{$account->id}_contacts.csv",
            'text/csv',
        );
    }

    private function valueForHeader(Contact $contact, string $header): string
    {
        if ($header === self::LABELS_COLUMN) {
            return implode(self::LABELS_DELIMITER, $contact->labels->pluck('title')->all());
        }

        return (string) $contact->getAttribute($header);
    }

    /** @return Builder<Contact> */
    private function contacts(Account $account): Builder
    {
        $payload = $this->filterParams['payload'] ?? null;
        $label = $this->filterParams['label'] ?? null;

        if (filled($payload)) {
            return (new FilterService($account, $payload))->perform();
        }

        $contacts = Contact::query()
            ->where('account_id', $account->id)
            ->listableContacts(useCrmV2: $account->featureEnabled('crm_v2'));

        if (filled($label)) {
            $labels = is_array($label) ? $label : [$label];
            $contacts->whereHas('labels', fn (Builder $query) => $query->whereIn('title', $labels));
        }

        return $contacts;
    }

    /** @return list<string> */
    private function validHeaders(): array
    {
        $requested = filled($this->columnNames) ? $this->columnNames : self::DEFAULT_COLUMNS;
        $columns = Schema::getColumnListing('contacts');

        return array_values(array_unique(array_filter(
            $requested,
            fn (string $header) => $header === self::LABELS_COLUMN || in_array($header, $columns, true),
        )));
    }
}
