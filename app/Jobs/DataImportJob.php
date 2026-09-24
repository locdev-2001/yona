<?php

namespace App\Jobs;

use App\Exceptions\MalformedCsvException;
use App\Models\Contact;
use App\Models\DataImport;
use App\Notifications\AccountNotification;
use App\Services\DataImport\ContactManager;
use App\Support\Csv;
use Illuminate\Support\Facades\Notification;

// Nhập liên hệ từ CSV.
class DataImportJob extends ApplicationJob
{
    private const LABELS_DELIMITER = ',';

    /** @var list<string> */
    private array $csvHeaders = [];

    /** @var list<array{contact: Contact, labels: list<string>}> */
    private array $importedRows = [];

    /** @var list<array<string, string>> */
    private array $rejectedRows = [];

    public function __construct(private readonly DataImport $dataImport)
    {
        $this->onQueue('low');
    }

    public function handle(): void
    {
        try {
            $this->processImportFile();
            $this->sendImportNotificationToAdmin();
        } catch (MalformedCsvException) {
            $this->dataImport->markStatus('failed');
            $this->sendImportFailedNotificationToAdmin();
        }
    }

    private function processImportFile(): void
    {
        $this->dataImport->markStatus('processing');

        [$this->csvHeaders, $rows] = Csv::parseWithHeaders((string) $this->dataImport->importFileContents());

        $contactManager = new ContactManager($this->dataImport->account);

        foreach ($rows as $row) {
            $this->buildContactFromRow($contactManager, $row);
        }

        $this->importContacts();
        $this->updateDataImportStatus();
        $this->saveFailedRecordsCsv();
    }

    /** @param array<string, string> $row */
    private function buildContactFromRow(ContactManager $contactManager, array $row): void
    {
        $labels = $this->extractLabels($row);
        $invalidLabels = array_values(array_diff(array_map('mb_strtolower', $labels), $this->approvedLabels()));

        if ($invalidLabels !== []) {
            $this->rejectRow($row, 'Unknown labels: '.implode(', ', $invalidLabels));

            return;
        }

        $contact = $contactManager->buildContact(collect($row)->except(['labels'])->all());

        if ($contact->validationErrors() === []) {
            $this->importedRows[] = ['contact' => $contact, 'labels' => $labels];

            return;
        }

        $this->rejectRow($row, implode(', ', $contact->validationMessages()));
    }

    /** @param array<string, string> $row */
    private function extractLabels(array $row): array
    {
        return collect(explode(self::LABELS_DELIMITER, (string) ($row['labels'] ?? '')))
            ->map(fn (string $label) => trim($label))
            ->filter()
            ->values()
            ->all();
    }

    /** @param array<string, string> $row */
    private function rejectRow(array $row, string $error): void
    {
        $this->rejectedRows[] = [...$row, 'errors' => $error];
    }

    // Contact.import(..., on_duplicate_key_ignore: true): liên hệ mới trùng định
    // danh với một liên hệ vừa được lưu trong cùng tệp thì bỏ qua bản ghi, vẫn
    // tính vào processed_records.
    private function importContacts(): void
    {
        foreach ($this->importedRows as $row) {
            $contact = $row['contact'];

            if (! $contact->exists && $contact->validationErrors() === []) {
                $contact->save();
            }
        }

        $this->applyLabelsToContacts();
    }

    private function applyLabelsToContacts(): void
    {
        foreach ($this->importedRows as $row) {
            if ($row['labels'] === []) {
                continue;
            }

            $contact = $this->contactForLabelImport($row['contact']);
            $contact?->addLabels(array_map('mb_strtolower', $row['labels']));
        }
    }

    private function contactForLabelImport(Contact $contact): ?Contact
    {
        if ($contact->exists) {
            return $contact;
        }

        $contacts = Contact::query()->where('account_id', $this->dataImport->account_id);

        if (filled($contact->identifier)) {
            return $contacts->where('identifier', $contact->identifier)->first();
        }

        if (filled($contact->email)) {
            return $contacts->where('email', mb_strtolower((string) $contact->email))->first();
        }

        return filled($contact->phone_number)
            ? $contacts->where('phone_number', $contact->phone_number)->first()
            : null;
    }

    /** @return list<string> */
    private function approvedLabels(): array
    {
        return $this->dataImport->account->labels()->pluck('title')->all();
    }

    private function updateDataImportStatus(): void
    {
        $processed = count($this->importedRows);

        $this->dataImport->markStatus('completed', [
            'processed_records' => $processed,
            'total_records' => $processed + count($this->rejectedRows),
            'completed_at' => now(),
        ]);
    }

    private function saveFailedRecordsCsv(): void
    {
        if ($this->rejectedRows === []) {
            return;
        }

        $headers = [...$this->csvHeaders, 'errors'];
        $rows = array_map(
            fn (array $record) => array_map(fn (string $header) => $record[$header] ?? '', $headers),
            $this->rejectedRows,
        );

        $this->dataImport->attachFailedRecords(
            Csv::generate($headers, $rows),
            now()->format('Ymd').'_contacts.csv',
        );
    }

    private function sendImportNotificationToAdmin(): void
    {
        $dataImport = $this->dataImport->refresh();
        $failedRecords = $dataImport->failedRecords();
        $account = $dataImport->account;

        $actionUrl = $failedRecords?->url() ?? url("/app/accounts/{$account->id}/contacts");

        $this->notifyAdministrators(new AccountNotification(
            template: 'contact-import-complete',
            subject: 'Contact Import Completed',
            actionUrl: $actionUrl,
            meta: [
                'failed_contacts' => (int) $dataImport->total_records - (int) $dataImport->processed_records,
                'imported_contacts' => (int) $dataImport->processed_records,
            ],
        ));
    }

    private function sendImportFailedNotificationToAdmin(): void
    {
        $this->notifyAdministrators(new AccountNotification(
            template: 'contact-import-failed',
            subject: 'Contact Import Failed',
        ));
    }

    private function notifyAdministrators(AccountNotification $notification): void
    {
        $emails = AccountNotification::administratorEmails($this->dataImport->account);

        if ($emails === []) {
            return;
        }

        Notification::route('mail', $emails)->notify($notification);
    }
}
