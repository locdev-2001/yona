<?php

use App\Jobs\Account\ContactsExportJob;
use App\Jobs\DataImportJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\DataImport;
use App\Models\DataImportError;
use App\Models\User;
use App\Support\RoleAttachment;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

// Port từ Api::V1::Accounts::DataImportsController + contacts#import/#export.

beforeEach(function () {
    Storage::fake('public');

    $this->account = Account::factory()->create(['feature_flags' => ['data_import' => true]]);
    $this->administrator = User::factory()->create();
    AccountUser::factory()->administrator()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->administrator->id,
    ]);

    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);

    $this->url = "/api/v1/accounts/{$this->account->id}/data_imports";
});

it('lists the data imports of the account, newest first', function () {
    $older = DataImport::factory()->create(['account_id' => $this->account->id, 'created_at' => now()->subDay()]);
    $newer = DataImport::factory()->create([
        'account_id' => $this->account->id,
        'initiated_by_id' => $this->administrator->id,
    ]);

    DataImportError::query()->create([
        'data_import_id' => $newer->id,
        'error_code' => 'invalid_row',
        'message' => 'boom',
        'details' => ['kind' => 'skipped'],
    ]);

    $payload = $this->actingAs($this->administrator)->getJson($this->url)
        ->assertOk()
        ->json('payload');

    expect(array_column($payload, 'id'))->toBe([$newer->id, $older->id])
        ->and($payload[0]['status'])->toBe('pending')
        ->and($payload[0]['skip_logs_count'])->toBe(1)
        ->and($payload[0]['import_errors_count'])->toBe(0)
        ->and($payload[0]['initiated_by']['email'])->toBe($this->administrator->email);
});

it('refuses the listing for an agent', function () {
    $this->actingAs($this->agent)->getJson($this->url)->assertUnauthorized();
});

it('refuses the listing when the data_import feature is off', function () {
    $this->account->forceFill(['feature_flags' => []])->save();

    $this->actingAs($this->administrator)->getJson($this->url)->assertUnauthorized();
});

it('shows one data import with its error logs', function () {
    $dataImport = DataImport::factory()->create(['account_id' => $this->account->id]);

    DataImportError::query()->create([
        'data_import_id' => $dataImport->id,
        'error_code' => 'invalid_row',
        'message' => 'boom',
        'source_object_type' => 'contact',
        'details' => [],
    ]);

    $payload = $this->actingAs($this->administrator)->getJson("{$this->url}/{$dataImport->id}")
        ->assertOk()
        ->json();

    expect($payload['id'])->toBe($dataImport->id)
        ->and($payload['import_errors'])->toHaveCount(1)
        ->and($payload['import_errors'][0]['error_code'])->toBe('invalid_row')
        ->and($payload['skip_logs'])->toBe([]);
});

it('does not show a data import of another account', function () {
    $otherAccount = Account::factory()->create();
    $dataImport = DataImport::factory()->create(['account_id' => $otherAccount->id]);

    $this->actingAs($this->administrator)->getJson("{$this->url}/{$dataImport->id}")->assertNotFound();
});

describe('contacts#import', function () {
    it('creates a data import holding the uploaded file and queues the job', function () {
        Queue::fake();

        $this->actingAs($this->administrator)
            ->post("/api/v1/accounts/{$this->account->id}/contacts/import", [
                'import_file' => UploadedFile::fake()->createWithContent('contacts.csv', "name,email\nJohn,john@example.com\n"),
            ])
            ->assertOk();

        $dataImport = $this->account->dataImports()->firstOrFail();

        expect($dataImport->data_type)->toBe('contacts')
            ->and($dataImport->initiated_by_id)->toBe($this->administrator->id)
            ->and($dataImport->importFile())->not->toBeNull();

        Queue::assertPushed(DataImportJob::class);
    });

    // "Test ngay" của roadmap, chạy qua đúng đường HTTP + job đồng bộ.
    it('imports 95 of 100 rows end to end and leaves a 5-row error file', function () {
        $lines = ['id,name,email,phone_number'];

        for ($index = 1; $index <= 95; $index++) {
            $lines[] = "{$index},Contact {$index},contact{$index}@example.com,+9180808".str_pad((string) $index, 5, '0', STR_PAD_LEFT);
        }

        for ($index = 96; $index <= 100; $index++) {
            $lines[] = "{$index},Bad {$index},not-an-email-{$index},khong-phai-e164";
        }

        $this->actingAs($this->administrator)
            ->post("/api/v1/accounts/{$this->account->id}/contacts/import", [
                'import_file' => UploadedFile::fake()->createWithContent('contacts.csv', implode("\n", $lines)."\n"),
            ])
            ->assertOk();

        $dataImport = $this->account->dataImports()->firstOrFail();
        $failedRecords = (string) RoleAttachment::contents($dataImport, DataImport::ROLE_FAILED_RECORDS);

        expect($this->account->contacts()->count())->toBe(95)
            ->and($dataImport->processed_records)->toBe(95)
            ->and($dataImport->total_records)->toBe(100)
            ->and($dataImport->statusName())->toBe('completed')
            ->and(substr_count(rtrim($failedRecords, "\n"), "\n"))->toBe(5);
    });

    it('rejects an empty upload', function () {
        $this->actingAs($this->administrator)
            ->postJson("/api/v1/accounts/{$this->account->id}/contacts/import")
            ->assertStatus(422)
            ->assertJson(['error' => 'File is blank']);
    });

    it('refuses an agent', function () {
        $this->actingAs($this->agent)
            ->postJson("/api/v1/accounts/{$this->account->id}/contacts/import")
            ->assertUnauthorized();
    });
});

describe('contacts#export', function () {
    it('queues the export job with the requested columns and filters', function () {
        Queue::fake();

        $this->actingAs($this->administrator)
            ->postJson("/api/v1/accounts/{$this->account->id}/contacts/export", ['column_names' => ['phone_number', 'email']])
            ->assertOk();

        Queue::assertPushed(ContactsExportJob::class);
    });

    it('refuses an agent', function () {
        $this->actingAs($this->agent)
            ->postJson("/api/v1/accounts/{$this->account->id}/contacts/export")
            ->assertUnauthorized();
    });
});
