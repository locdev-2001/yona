<?php

use App\Jobs\Account\ContactsExportJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\Label;
use App\Models\User;
use App\Notifications\AccountNotification;
use App\Support\Csv;
use App\Support\RoleAttachment;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

function e3ExportedCsv(Account $account): string
{
    $contents = (string) RoleAttachment::contents($account, ContactsExportJob::ROLE_CONTACTS_EXPORT);

    return $contents;
}

beforeEach(function () {
    Storage::fake('public');
    Notification::fake();

    $this->account = Account::factory()->create();
    $this->user = User::factory()->create();
    AccountUser::factory()->administrator()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->user->id,
    ]);

    Contact::query()->create(['account_id' => $this->account->id, 'email' => 'test1@text.example', 'phone_number' => '+910808080818']);
    Contact::query()->create(['account_id' => $this->account->id, 'email' => 'test2@text.example', 'phone_number' => '+910808080808']);

    foreach (range(3, 6) as $index) {
        Contact::query()->create(['account_id' => $this->account->id, 'email' => "looped-{$index}@text.example.com"]);
    }
});

it('attaches the export file to the account and emails the requester', function () {
    (new ContactsExportJob($this->account->id, $this->user->id, [], []))->handle();

    expect(RoleAttachment::for($this->account, ContactsExportJob::ROLE_CONTACTS_EXPORT))->not->toBeNull();

    Notification::assertSentOnDemand(
        AccountNotification::class,
        fn ($notification, $channels, $notifiable) => $notifiable->routes['mail'] === $this->user->email,
    );
});

it('exports the requested columns only, dropping unknown ones', function () {
    (new ContactsExportJob($this->account->id, $this->user->id, ['id', 'name', 'email', 'phone_number', 'column_not_present'], []))->handle();

    [$headers, $rows] = Csv::parseWithHeaders(e3ExportedCsv($this->account));

    expect($headers)->toBe(['id', 'name', 'email', 'phone_number'])
        ->and($rows)->toHaveCount(6)
        ->and(array_column($rows, 'email'))->toContain('test1@text.example', 'test2@text.example')
        // Số điện thoại mở đầu bằng "+" là ký tự công thức nên được thêm "'".
        ->and(array_column($rows, 'phone_number'))->toContain("'+910808080818");
});

it('neutralises formula leading characters', function () {
    Contact::query()->create([
        'account_id' => $this->account->id,
        'name' => '=HYPERLINK("http://evil.example")',
        'email' => 'formula@text.example',
    ]);

    (new ContactsExportJob($this->account->id, $this->user->id, ['id', 'name', 'email'], []))->handle();

    [, $rows] = Csv::parseWithHeaders(e3ExportedCsv($this->account));
    $row = collect($rows)->firstWhere('email', 'formula@text.example');

    expect($row['name'])->toStartWith("'");
});

it('exports labels when asked for them', function () {
    Label::query()->create(['account_id' => $this->account->id, 'title' => 'vip']);
    $contact = $this->account->contacts()->first();
    $contact->addLabels(['vip']);

    (new ContactsExportJob($this->account->id, $this->user->id, ['id', 'email', 'labels'], []))->handle();

    [$headers, $rows] = Csv::parseWithHeaders(e3ExportedCsv($this->account));
    $row = collect($rows)->firstWhere('email', $contact->email);

    expect($headers)->toBe(['id', 'email', 'labels'])
        ->and($row['labels'])->toBe('vip');
});

it('prepends the UTF-8 BOM', function () {
    (new ContactsExportJob($this->account->id, $this->user->id, [], []))->handle();

    expect(e3ExportedCsv($this->account))->toStartWith("\xEF\xBB\xBF");
});

it('exports only resolved contacts when no filter is given', function () {
    Contact::query()->create(['account_id' => $this->account->id]);

    (new ContactsExportJob($this->account->id, $this->user->id, ['id', 'email'], []))->handle();

    [, $rows] = Csv::parseWithHeaders(e3ExportedCsv($this->account));

    expect($rows)->toHaveCount(6);
});

it('exports only contacts carrying the requested label', function () {
    Label::query()->create(['account_id' => $this->account->id, 'title' => 'spec-billing']);
    $this->account->contacts()->first()->addLabels(['spec-billing']);

    (new ContactsExportJob($this->account->id, $this->user->id, [], ['payload' => null, 'label' => 'spec-billing']))->handle();

    [, $rows] = Csv::parseWithHeaders(e3ExportedCsv($this->account));

    expect($rows)->toHaveCount(1);
});

it('exports the filtered contacts when a payload is given', function () {
    $filter = [[
        'attribute_key' => 'email',
        'filter_operator' => 'contains',
        'values' => 'looped',
        'query_operator' => null,
        'attribute_model' => 'standard',
        'custom_attribute_type' => '',
    ]];

    (new ContactsExportJob($this->account->id, $this->user->id, [], ['payload' => $filter, 'label' => null]))->handle();

    [, $rows] = Csv::parseWithHeaders(e3ExportedCsv($this->account));

    expect($rows)->toHaveCount(4);
});
