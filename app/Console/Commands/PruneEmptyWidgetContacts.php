<?php

namespace App\Console\Commands;

use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Inbox;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Xoá contact_inbox của widget website chưa từng có hội thoại/tin nhắn và
 * chưa được khách nhập bất kỳ định danh nào (email/phone/identifier/custom
 * attributes) — hồ sơ dựng thừa từ lúc /config còn tạo khách ngay lúc tải
 * trang. Chạy lại được nhiều lần: lượt sau không còn gì để xoá.
 */
class PruneEmptyWidgetContacts extends Command
{
    private const CHUNK_SIZE = 500;

    protected $signature = 'widget:prune-empty-contacts {--dry-run : Chỉ đếm, không xoá}';

    protected $description = 'Xoá contact_inbox widget chưa có hội thoại và chưa từng được khách nhập định danh';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $inboxIds = Inbox::query()->where('channel_type', 'Channel::WebWidget')->pluck('id');

        if ($inboxIds->isEmpty()) {
            $this->components->info('Không có inbox website nào.');

            return self::SUCCESS;
        }

        $contactInboxesDeleted = 0;
        $contactsDeleted = 0;

        $this->eligibleContactInboxesQuery($inboxIds)
            ->chunkById(self::CHUNK_SIZE, function (Collection $contactInboxes) use ($dryRun, &$contactInboxesDeleted, &$contactsDeleted) {
                $contactInboxIds = $contactInboxes->pluck('id')->all();
                $contactIds = $contactInboxes->pluck('contact_id')->filter()->unique()->values()->all();
                $orphanContactIds = $this->orphanContactIds($contactIds, $contactInboxIds)->all();

                if ($dryRun) {
                    $contactInboxesDeleted += count($contactInboxIds);
                    $contactsDeleted += count($orphanContactIds);

                    return;
                }

                // Contact mồ côi xoá QUA MODEL: cascade kéo theo contact_inbox của nó ở
                // DB, và hook Contact dọn theo (search outbox, avatar, taggings, realtime
                // CONTACT_DELETED) — khác bản trước dùng query builder bỏ qua hết các hook.
                $contactsDeleted += $this->deleteOrphanContacts($orphanContactIds, $contactInboxIds);

                // Phần còn lại (contact null hoặc còn dùng ở contact_inbox khác) xoá
                // dòng riêng qua model.
                $directIds = collect($contactInboxes)
                    ->reject(fn (ContactInbox $contactInbox) => in_array($contactInbox->contact_id, $orphanContactIds, true))
                    ->pluck('id')
                    ->all();
                $this->deleteContactInboxes($directIds);

                // Đếm theo số dòng THỰC SỰ còn lại thay vì cộng dồn từng nhánh — vài
                // dòng có thể bị soát lại và giữ nguyên lúc xoá (xem deleteOrphanContacts).
                $contactInboxesDeleted += count($contactInboxIds)
                    - ContactInbox::query()->whereIn('id', $contactInboxIds)->count();
            });

        $this->components->info($dryRun
            ? "Thử chạy: {$contactInboxesDeleted} contact_inbox và {$contactsDeleted} contact sẽ bị xoá."
            : "Đã xoá {$contactInboxesDeleted} contact_inbox và {$contactsDeleted} contact.");

        return self::SUCCESS;
    }

    /** @param Collection<int, int> $inboxIds @return Builder<ContactInbox> */
    private function eligibleContactInboxesQuery(Collection $inboxIds): Builder
    {
        return ContactInbox::query()
            ->whereIn('inbox_id', $inboxIds)
            ->whereDoesntHave('conversations')
            ->where(function (Builder $query) {
                $query->whereNull('contact_id')->orWhereHas('contact', function (Builder $contactQuery) {
                    $contactQuery->whereNull('email')
                        ->whereNull('phone_number')
                        ->whereNull('identifier')
                        ->where('blocked', false)
                        ->whereDoesntHave('notes')
                        ->whereDoesntHave('labels')
                        ->where(function (Builder $attrsQuery) {
                            // Contact rỗng lưu '[]' (mảng PHP rỗng qua cast `array`)
                            // dù cột mặc định '{}' — coi cả hai là "chưa nhập gì".
                            $attrsQuery->whereNull('custom_attributes')
                                ->orWhereRaw("custom_attributes::text IN ('{}', '[]')");
                        });
                });
            });
    }

    /**
     * Contact mồ côi = mọi contact_inbox của nó đều nằm trong chunk đang xoá
     * (không còn gắn kênh nào khác) và vẫn chưa có hội thoại nào.
     *
     * @param  list<int>  $contactIds
     * @param  list<int>  $contactInboxIdsInChunk
     * @return Collection<int, int>
     */
    private function orphanContactIds(array $contactIds, array $contactInboxIdsInChunk): Collection
    {
        if ($contactIds === []) {
            return collect();
        }

        return Contact::query()
            ->whereIn('id', $contactIds)
            ->whereDoesntHave('conversations')
            ->whereDoesntHave('contactInboxes', fn (Builder $query) => $query->whereNotIn('id', $contactInboxIdsInChunk))
            ->pluck('id');
    }

    /**
     * Khoá hàng rồi soát lại đúng tiêu chí ngay lúc xoá (không phải lúc SELECT ở
     * trên) — khách có thể vừa gửi tin đầu tiên, thêm ghi chú/nhãn, hoặc gắn thêm
     * một contact_inbox khác giữa hai bước.
     *
     * @param  list<int>  $contactIds
     * @param  list<int>  $contactInboxIdsInChunk
     */
    private function deleteOrphanContacts(array $contactIds, array $contactInboxIdsInChunk): int
    {
        if ($contactIds === []) {
            return 0;
        }

        return DB::transaction(function () use ($contactIds, $contactInboxIdsInChunk) {
            $contacts = Contact::query()
                ->whereKey($contactIds)
                ->whereDoesntHave('conversations')
                ->whereDoesntHave('contactInboxes', fn (Builder $query) => $query->whereNotIn('id', $contactInboxIdsInChunk))
                ->whereDoesntHave('notes')
                ->whereDoesntHave('labels')
                ->where('blocked', false)
                ->lockForUpdate()
                ->get();

            $contacts->each->delete();

            return $contacts->count();
        });
    }

    /** @param list<int> $contactInboxIds */
    private function deleteContactInboxes(array $contactInboxIds): void
    {
        if ($contactInboxIds === []) {
            return;
        }

        DB::transaction(function () use ($contactInboxIds) {
            ContactInbox::query()
                ->whereKey($contactInboxIds)
                ->whereDoesntHave('conversations')
                ->lockForUpdate()
                ->get()
                ->each->delete();
        });
    }
}
