<?php

namespace App\Models;

use Database\Factories\MacroFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

// has_many_attached :files → attachments polymorphic (quyết định #9).
class Macro extends Model
{
    /** @use HasFactory<MacroFactory> */
    use HasFactory;

    public const VISIBILITY_PERSONAL = 0;

    public const VISIBILITY_GLOBAL = 1;

    /** @var array<string, int> */
    public const VISIBILITIES = [
        'personal' => self::VISIBILITY_PERSONAL,
        'global' => self::VISIBILITY_GLOBAL,
    ];

    /** @var list<string> */
    public const ACTIONS_ATTRS = [
        'send_message', 'add_label', 'assign_team', 'assign_agent', 'mute_conversation',
        'change_status', 'remove_label', 'remove_assigned_agent', 'remove_assigned_team',
        'resolve_conversation', 'snooze_conversation', 'change_priority', 'send_email_transcript',
        'send_attachment', 'add_private_note', 'send_webhook_event', 'send_canned_card',
    ];

    protected $fillable = ['account_id', 'name', 'visibility', 'actions', 'created_by_id', 'updated_by_id'];

    protected $attributes = [
        'actions' => '[]',
        'visibility' => self::VISIBILITY_PERSONAL,
    ];

    protected function casts(): array
    {
        return ['actions' => 'array'];
    }

    // enum visibility: { personal: 0, global: 1 } — cột số, API nói chuỗi.
    protected function visibility(): Attribute
    {
        return Attribute::make(
            get: fn (?int $value) => array_flip(self::VISIBILITIES)[$value ?? self::VISIBILITY_PERSONAL] ?? 'personal',
            set: fn (mixed $value) => self::visibilityValue($value),
        );
    }

    public static function visibilityValue(mixed $value): int
    {
        if (is_int($value) || (is_string($value) && is_numeric($value))) {
            return (int) $value === self::VISIBILITY_GLOBAL ? self::VISIBILITY_GLOBAL : self::VISIBILITY_PERSONAL;
        }

        return self::VISIBILITIES[(string) $value] ?? self::VISIBILITY_PERSONAL;
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_id');
    }

    public function files(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    /** @param Builder<static> $query */
    public function scopeGlobal(Builder $query): void
    {
        $query->where('visibility', self::VISIBILITY_GLOBAL);
    }

    /** @param Builder<static> $query */
    public function scopePersonal(Builder $query): void
    {
        $query->where('visibility', self::VISIBILITY_PERSONAL);
    }

    // Macro.with_visibility: mọi macro global của account + macro personal do
    // chính người dùng tạo.
    /** @return Builder<static> */
    public static function withVisibility(Account $account, User $user): Builder
    {
        return self::query()
            ->where('account_id', $account->id)
            ->where(fn (Builder $query) => $query
                ->where('visibility', self::VISIBILITY_GLOBAL)
                ->orWhere(fn (Builder $personal) => $personal
                    ->where('visibility', self::VISIBILITY_PERSONAL)
                    ->where('created_by_id', $user->id)))
            ->orderBy('id');
    }

    public function isGlobal(): bool
    {
        return (int) ($this->getAttributes()['visibility'] ?? self::VISIBILITY_PERSONAL) === self::VISIBILITY_GLOBAL;
    }

    // set_visibility: agent chỉ được tạo macro riêng, bất kể payload gửi gì.
    public function setVisibility(AccountUser $membership, mixed $visibility): void
    {
        $this->visibility = $membership->isAdministrator() ? $visibility : 'personal';
    }

    /** Thông điệp lỗi của validate json_actions_format; null nghĩa là hợp lệ. */
    public function actionsValidationError(): ?string
    {
        $unsupported = collect($this->actions ?? [])
            ->map(fn (mixed $action) => is_array($action) ? ($action['action_name'] ?? null) : null)
            ->filter(fn (mixed $name) => $name !== null && ! in_array((string) $name, self::ACTIONS_ATTRS, true))
            ->map(fn (mixed $name) => (string) $name)
            ->values();

        return $unsupported->isEmpty()
            ? null
            : 'Macro execution actions '.$unsupported->implode(',').' not supported.';
    }

    /**
     * file_base_data — hình dạng jbuilder `files`; blob_id của ActiveStorage
     * tương ứng id của attachment đã lưu.
     *
     * @return list<array<string, mixed>>
     */
    public function fileBaseData(): array
    {
        return $this->files
            ->map(fn (Attachment $file) => [
                'id' => $file->id,
                'macro_id' => $this->id,
                'file_type' => $file->content_type,
                'account_id' => $this->account_id,
                'file_url' => $file->fileUrl(),
                'blob_id' => $file->id,
                'filename' => (string) $file->filename,
            ])
            ->values()
            ->all();
    }
}
