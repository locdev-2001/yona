<?php

namespace App\Models;

use App\Support\RoleAttachment;
use Database\Factories\DataImportFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\UploadedFile;

// Port từ refs/chatwoot/app/models/data_import.rb.
// Chỉ nhánh nhập CSV liên hệ (legacy_contacts_csv_import) được port — nguồn
// tích hợp freshdesk/intercom cần API bên ngoài, hoãn (xem note e3-notes-be).
class DataImport extends Model
{
    /** @use HasFactory<DataImportFactory> */
    use HasFactory;

    public const DATA_TYPE_CONTACTS = 'contacts';

    public const ROLE_IMPORT_FILE = 'import_file';

    public const ROLE_FAILED_RECORDS = 'failed_records';

    // enum status của Chatwoot — số lưu trong DB, tên hiển thị ra API.
    public const STATUSES = [
        'pending' => 0,
        'processing' => 1,
        'completed' => 2,
        'failed' => 3,
        'completed_with_errors' => 6,
        'abandoned' => 7,
    ];

    protected $fillable = [
        'account_id',
        'data_type',
        'status',
        'processing_errors',
        'total_records',
        'processed_records',
        'name',
        'source_type',
        'source_provider',
        'import_types',
        'initiated_by_id',
        'started_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'import_types' => 'array',
            'source_metadata' => 'array',
            'stats' => 'array',
            'cursor' => 'array',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'abandoned_at' => 'datetime',
            'last_error_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        // set_default_name (before_validation, on: :create)
        static::creating(function (DataImport $dataImport) {
            if (blank($dataImport->name) && filled($dataImport->data_type)) {
                $dataImport->name = ucfirst($dataImport->data_type).' - '.now()->toDateString();
            }
        });
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function initiatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'initiated_by_id');
    }

    public function importErrors(): HasMany
    {
        return $this->hasMany(DataImportError::class);
    }

    /** @param Builder<self> $query */
    public function scopeWithStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', self::STATUSES[$status]);
    }

    public function statusName(): string
    {
        return array_search($this->status, self::STATUSES, true) ?: 'pending';
    }

    public function markStatus(string $status, array $attributes = []): void
    {
        $this->update(['status' => self::STATUSES[$status], ...$attributes]);
    }

    public function isLegacyContactsCsvImport(): bool
    {
        return $this->data_type === self::DATA_TYPE_CONTACTS && blank($this->source_provider);
    }

    public function importFile(): ?Attachment
    {
        return RoleAttachment::for($this, self::ROLE_IMPORT_FILE);
    }

    public function importFileContents(): ?string
    {
        return RoleAttachment::contents($this, self::ROLE_IMPORT_FILE);
    }

    public function attachImportFile(UploadedFile $file): Attachment
    {
        return RoleAttachment::attachUpload($this, self::ROLE_IMPORT_FILE, $file);
    }

    public function failedRecords(): ?Attachment
    {
        return RoleAttachment::for($this, self::ROLE_FAILED_RECORDS);
    }

    public function attachFailedRecords(string $csv, string $filename): Attachment
    {
        return RoleAttachment::attachContents($this, self::ROLE_FAILED_RECORDS, $csv, $filename, 'text/csv');
    }
}
