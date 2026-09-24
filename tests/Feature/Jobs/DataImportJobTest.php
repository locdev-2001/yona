<?php

use App\Jobs\DataImportJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\DataImport;
use App\Models\Label;
use App\Models\User;
use App\Notifications\AccountNotification;
use App\Support\RoleAttachment;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

// Port từ refs/chatwoot/spec/jobs/data_import_job_spec.rb.

function e3Import(Account $account, array $rows): DataImport
{
    $csv = collect($rows)->map(fn (array $row) => implode(',', array_map(
        fn (string $value) => str_contains($value, ',') ? '"'.$value.'"' : $value,
        $row,
    )))->implode("\n")."\n";

    return e3ImportFromCsv($account, $csv);
}

function e3ImportFromCsv(Account $account, string $csv): DataImport
{
    $dataImport = DataImport::factory()->create(['account_id' => $account->id]);
    RoleAttachment::attachContents($dataImport, DataImport::ROLE_IMPORT_FILE, $csv, 'contacts.csv', 'text/csv');

    return $dataImport;
}

function e3FailedRecords(DataImport $dataImport): string
{
    return (string) RoleAttachment::contents($dataImport, DataImport::ROLE_FAILED_RECORDS);
}

beforeEach(function () {
    Storage::fake('public');
    Notification::fake();

    $this->account = Account::factory()->create();
    $this->administrator = User::factory()->create();
    AccountUser::factory()->administrator()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->administrator->id,
    ]);
});

it('imports contacts from a valid csv', function () {
    $dataImport = e3Import($this->account, [
        ['id', 'name', 'email', 'phone_number', 'company_name'],
        ['1', 'Clarice Uzzell', 'cuzzell0@mozilla.org', '918080808080', 'My Company Name'],
        ['2', 'Marieann Creegan', 'mcreegan1@cornell.edu', '+918080808081', 'My Company Name'],
    ]);

    (new DataImportJob($dataImport))->handle();

    $dataImport->refresh();

    expect($this->account->contacts()->count())->toBe(2)
        ->and($dataImport->statusName())->toBe('completed')
        ->and($dataImport->total_records)->toBe(2)
        ->and($dataImport->processed_records)->toBe(2);

    $contact = Contact::query()->where('phone_number', '+918080808080')->first();

    expect($contact)->not->toBeNull()
        ->and($contact->additional_attributes['company_name'])->toBe('My Company Name');
});

// Bản gốc dùng Contact.import(on_duplicate_key_ignore): dòng trùng email vẫn
// được tính vào processed_records nhưng không tạo thêm liên hệ.
it('ignores a duplicate row without creating a second contact', function () {
    $dataImport = e3Import($this->account, [
        ['id', 'first_name', 'last_name', 'email', 'phone_number'],
        ['1', 'Clarice', 'Uzzell', 'cuzzell0@mozilla.org', '+918484848484'],
        ['2', 'Marieann', 'Creegan', 'mcreegan1@cornell.edu', '+918484848485'],
        ['3', 'Nancey', 'Windibank', 'cuzzell0@mozilla.org', '+91848484848'],
    ]);

    (new DataImportJob($dataImport))->handle();

    $dataImport->refresh();

    expect($this->account->contacts()->count())->toBe(2)
        ->and($dataImport->total_records)->toBe(3)
        ->and($dataImport->processed_records)->toBe(3);
});

it('updates an existing contact matched by email', function () {
    $existing = Contact::query()->create(['account_id' => $this->account->id, 'email' => 'cuzzell0@mozilla.org']);

    $dataImport = e3Import($this->account, [
        ['id', 'name', 'email', 'phone_number', 'company_name'],
        ['1', 'Clarice Uzzell', 'cuzzell0@mozilla.org', '918080808080', 'Acmecorp'],
    ]);

    (new DataImportJob($dataImport))->handle();

    $existing->refresh();

    expect($this->account->contacts()->count())->toBe(1)
        ->and($existing->phone_number)->toBe('+918080808080')
        ->and($existing->name)->toBe('Clarice Uzzell')
        ->and($existing->additional_attributes['company_name'])->toBe('Acmecorp');
});

it('rejects a row whose email and phone belong to two different contacts', function () {
    Contact::query()->create(['account_id' => $this->account->id, 'phone_number' => '+918080808081']);
    Contact::query()->create(['account_id' => $this->account->id, 'email' => 'mcreegan1@cornell.edu']);

    $dataImport = e3Import($this->account, [
        ['id', 'name', 'email', 'phone_number'],
        ['1', 'Marieann Creegan', 'mcreegan1@cornell.edu', '+918080808081'],
    ]);

    (new DataImportJob($dataImport))->handle();

    $dataImport->refresh();

    expect($dataImport->total_records)->toBe(1)
        ->and($dataImport->processed_records)->toBe(0);
});

it('marks the import failed when the csv is malformed', function () {
    $dataImport = e3ImportFromCsv($this->account, "id,name,email\n1,\"Clarice Uzzell,\"missing_quote,918080808080\n");

    (new DataImportJob($dataImport))->handle();

    expect($dataImport->refresh()->statusName())->toBe('failed');

    Notification::assertSentOnDemand(AccountNotification::class);
});

it('imports labels that exist in the account', function () {
    foreach (['customer', 'vip', 'lead'] as $title) {
        Label::query()->create(['account_id' => $this->account->id, 'title' => $title]);
    }

    $dataImport = e3Import($this->account, [
        ['id', 'name', 'email', 'phone_number', 'labels'],
        ['1', 'John Doe', 'john@example.com', '+918080808080', ' Customer , VIP , vip '],
        ['2', 'Jane Smith', 'jane@example.com', '+918080808081', 'lead'],
        ['3', 'Bob Wilson', 'bob@example.com', '+918080808082', ''],
    ]);

    (new DataImportJob($dataImport))->handle();

    expect(Contact::fromEmail('john@example.com')->labelList())->toEqualCanonicalizing(['customer', 'vip'])
        ->and(Contact::fromEmail('jane@example.com')->labelList())->toBe(['lead'])
        ->and(Contact::fromEmail('bob@example.com')->labelList())->toBe([]);
});

it('rejects rows carrying labels the account does not have, leaving the contact untouched', function () {
    Label::query()->create(['account_id' => $this->account->id, 'title' => 'vip']);

    $existing = Contact::query()->create([
        'account_id' => $this->account->id,
        'email' => 'existing@example.com',
        'phone_number' => '+918080808085',
        'name' => 'Existing Name',
    ]);

    $dataImport = e3Import($this->account, [
        ['id', 'name', 'email', 'phone_number', 'labels'],
        ['1', 'Updated Name', 'existing@example.com', '+918080808086', 'vip,unknown_label'],
    ]);

    (new DataImportJob($dataImport))->handle();

    $existing->refresh();

    expect($existing->name)->toBe('Existing Name')
        ->and($existing->phone_number)->toBe('+918080808085')
        ->and(e3FailedRecords($dataImport))->toContain('Unknown labels: unknown_label');
});

it('merges labels of duplicate rows without duplicating taggings', function () {
    foreach (['customer', 'lead'] as $title) {
        Label::query()->create(['account_id' => $this->account->id, 'title' => $title]);
    }

    $dataImport = e3Import($this->account, [
        ['id', 'name', 'email', 'phone_number', 'labels'],
        ['1', 'Duplicate User', 'duplicate@example.com', '+918080808092', 'lead'],
        ['2', 'Duplicate User', 'duplicate@example.com', '+918080808092', 'customer,lead'],
    ]);

    (new DataImportJob($dataImport))->handle();

    $contact = Contact::fromEmail('duplicate@example.com');

    expect($this->account->contacts()->count())->toBe(1)
        ->and($contact->labelList())->toEqualCanonicalizing(['customer', 'lead']);
});

it('notifies administrators when the import completes', function () {
    $dataImport = e3Import($this->account, [
        ['id', 'name', 'email'],
        ['1', 'John Doe', 'john@example.com'],
    ]);

    (new DataImportJob($dataImport))->handle();

    Notification::assertSentOnDemand(
        AccountNotification::class,
        fn ($notification, $channels, $notifiable) => $notifiable->routes['mail'] === [$this->administrator->email],
    );
});

// "Test ngay" của roadmap: CSV 100 dòng, 5 dòng sai → 95 vào, tệp lỗi 5 dòng.
it('imports 95 of 100 rows and writes a failed records file holding the 5 bad rows', function () {
    $rows = [['id', 'name', 'email', 'phone_number']];

    for ($index = 1; $index <= 95; $index++) {
        $rows[] = [(string) $index, "Contact {$index}", "contact{$index}@example.com", '+9180808'.str_pad((string) $index, 5, '0', STR_PAD_LEFT)];
    }

    for ($index = 96; $index <= 100; $index++) {
        $rows[] = [(string) $index, "Bad {$index}", "not-an-email-{$index}", 'khong-phai-e164'];
    }

    $dataImport = e3Import($this->account, $rows);

    (new DataImportJob($dataImport))->handle();

    $dataImport->refresh();
    $failedRecords = e3FailedRecords($dataImport);

    expect($this->account->contacts()->count())->toBe(95)
        ->and($dataImport->processed_records)->toBe(95)
        ->and($dataImport->total_records)->toBe(100)
        ->and(substr_count(rtrim($failedRecords, "\n"), "\n"))->toBe(5)
        ->and($failedRecords)->toContain('Email Invalid email');
});

it('quy số Việt Nam trong CSV về E.164 và gộp vào hồ sơ đã có cùng số', function () {
    $existing = Contact::query()->create(['account_id' => $this->account->id, 'phone_number' => '+84912345678']);

    $dataImport = e3Import($this->account, [
        ['id', 'name', 'email', 'phone_number'],
        ['1', 'Khách cũ', '', '912345678'],
        ['2', 'Khách mới', '', '0987 654 321'],
    ]);

    (new DataImportJob($dataImport))->handle();

    expect($this->account->contacts()->count())->toBe(2)
        ->and($existing->refresh()->name)->toBe('Khách cũ')
        ->and($this->account->contacts()->where('phone_number', '+84987654321')->exists())->toBeTrue();
});
