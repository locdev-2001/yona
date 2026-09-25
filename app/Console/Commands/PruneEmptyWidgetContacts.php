<?php

namespace App\Console\Commands;

use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Inbox;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Xoá contact_inbox của widget website chưa từng có hội thoại/tin nhắn và
 * chưa được khách nhập bất kỳ định danh nào (email/phone/identifier/custom
 * attributes) — hồ sơ dựng thừa từ lúc /config còn tạo khách ngay lúc tải
 * trang. Contact đi kèm chỉ bị xoá theo nếu nó KHÔNG còn gắn với contact_inbox
 * nào khác (không đụng khách đã xác thực qua kênh khác).
 *
 * Chạy lại được nhiều lần: lượt sau không còn gì để xoá.
 */
class PruneEmptyWidgetContacts extends Command
{
    protected $signature = 'widget:prune-empty-contacts
        {--dry-run : Chỉ đếm, không xoá}
        {--chunk=500 : Số contact_inbox xử lý mỗi đợt}';

    protected $description = 'Xoá contact_inbox widget chưa có hội thoại và chưa từng được khách nhập định danh';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $chunkSize = max(1, (int) $this->option('chunk'));

        $inboxIds = $this->webWidgetInboxIds();

        if ($inboxIds->isEmpty()) {
            $this->components->info('Không có inbox website nào.');

            return self::SUCCESS;
        }

        $contactInboxesDeleted = 0;
        $contactsDeleted = 0;

        $this->eligibleContactInboxesQuery($inboxIds)
            ->with('contact')
            ->chunkById($chunkSize, function (Collection $contactInboxes) use ($dryRun, &$contactInboxesDeleted, &$contactsDeleted) {
                [$inboxIdsInChunk, $contactIdsToCheck] = $this->partitionChunk($contactInboxes);
                $orphanContactIds = $this->orphanContactIds($contactIdsToCheck, $inboxIdsInChunk)->all();

                // Contact_inbox của contact mồ côi sẽ bị cascade xoá cùng contact
                // (contact_inboxes.contact_id → cascadeOnDelete) — phần còn lại
                // (contact null hoặc còn dùng ở contact_inbox khác) xoá dòng riêng.
                $contactInboxIdsToDeleteDirectly = collect($contactInboxes)
                    ->reject(fn (ContactInbox $contactInbox) => in_array($contactInbox->contact_id, $orphanContactIds, true))
                    ->pluck('id')
                    ->all();

                $contactInboxesDeleted += count($inboxIdsInChunk);
                $contactsDeleted += count($orphanContactIds);

                if ($dryRun) {
                    return;
                }

                if ($orphanContactIds !== []) {
                    Contact::query()->whereIn('id', $orphanContactIds)->delete();
                }

                if ($contactInboxIdsToDeleteDirectly !== []) {
                    ContactInbox::query()->whereIn('id', $contactInboxIdsToDeleteDirectly)->delete();
                }
            });

        $this->components->info($dryRun
            ? "Thử chạy: {$contactInboxesDeleted} contact_inbox và {$contactsDeleted} contact sẽ bị xoá."
            : "Đã xoá {$contactInboxesDeleted} contact_inbox và {$contactsDeleted} contact.");

        return self::SUCCESS;
    }

    /** @return Collection<int, int> */
    private function webWidgetInboxIds(): Collection
    {
        return Inbox::query()->where('channel_type', 'Channel::WebWidget')->pluck('id');
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
     * @param  Collection<int, ContactInbox>  $contactInboxes
     * @return array{0: list<int>, 1: list<int>}
     */
    private function partitionChunk(Collection $contactInboxes): array
    {
        $inboxIds = $contactInboxes->pluck('id')->all();
        $contactIds = $contactInboxes->pluck('contact_id')->filter()->unique()->values()->all();

        return [$inboxIds, $contactIds];
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
}
