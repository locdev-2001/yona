<?php

namespace App\Services\Admin\Operations;

use App\Models\Account;
use App\Models\Attachment;
use App\Support\SuperAdminArea;
use Illuminate\Support\Facades\DB;

/**
 * Dung lượng tệp trên kho lưu trữ, tính từ kích thước đã ghi khi lưu tệp (`attachments.byte_size`,
 * `stickers.byte_size`), không quét đĩa. Đính kèm gửi lại sticker (đĩa sticker, không ghi kích thước)
 * và ảnh đại diện chưa có số nên không nằm trong tổng.
 */
final class StorageUsage
{
    public const RANKING_LIMIT = 100;

    public const CATEGORIES = ['image', 'video', 'audio', 'file', 'sticker'];

    private const ATTACHMENT_CATEGORIES = [
        Attachment::FILE_TYPE_IMAGE => 'image',
        Attachment::FILE_TYPE_VIDEO => 'video',
        Attachment::FILE_TYPE_AUDIO => 'audio',
    ];

    /** @return array{totalBytes: int, categories: array<string, int>, files: int} */
    public function forAccount(Account $account): array
    {
        return $this->ranking($account->id)[0]['usage'] ?? $this->emptyUsage();
    }

    /**
     * @return array{
     *     system: array{totalBytes: int, categories: array<string, int>, files: int},
     *     disk: array{freeBytes: int|null, totalBytes: int|null},
     *     accounts: list<array{id: int, name: string, url: string, usage: array{totalBytes: int, categories: array<string, int>, files: int}}>
     * }
     */
    public function overview(): array
    {
        $accounts = $this->ranking();
        $system = $this->emptyUsage();

        foreach ($accounts as $row) {
            $system['totalBytes'] += $row['usage']['totalBytes'];
            $system['files'] += $row['usage']['files'];

            foreach ($row['usage']['categories'] as $category => $bytes) {
                $system['categories'][$category] += $bytes;
            }
        }

        $root = storage_path('app');

        return [
            'system' => $system,
            'disk' => [
                'freeBytes' => ($free = @disk_free_space($root)) === false ? null : (int) $free,
                'totalBytes' => ($total = @disk_total_space($root)) === false ? null : (int) $total,
            ],
            'accounts' => array_slice($accounts, 0, self::RANKING_LIMIT),
        ];
    }

    /** @return list<array{id: int, name: string, url: string, usage: array{totalBytes: int, categories: array<string, int>, files: int}}> */
    private function ranking(?int $accountId = null): array
    {
        $attachmentCategory = 'CASE file_type '.collect(self::ATTACHMENT_CATEGORIES)
            ->map(fn (string $category, int $fileType) => "WHEN {$fileType} THEN '{$category}'")
            ->implode(' ')." ELSE 'file' END";

        $attachments = DB::table('attachments')
            ->selectRaw("account_id, {$attachmentCategory} AS category, SUM(byte_size) AS bytes, COUNT(*) AS files")
            ->whereNotNull('path')
            ->whereNotNull('byte_size')
            ->whereNotNull('account_id')
            ->when($accountId !== null, fn ($query) => $query->where('account_id', $accountId))
            ->groupBy('account_id', 'category');

        $stickers = DB::table('stickers')
            ->join('sticker_packs', 'sticker_packs.id', '=', 'stickers.sticker_pack_id')
            ->selectRaw("sticker_packs.account_id, 'sticker' AS category, SUM(stickers.byte_size) AS bytes, COUNT(*) AS files")
            ->whereNotNull('sticker_packs.account_id')
            ->whereNotNull('stickers.byte_size')
            ->when($accountId !== null, fn ($query) => $query->where('sticker_packs.account_id', $accountId))
            ->groupBy('sticker_packs.account_id');

        $rows = DB::query()->fromSub($attachments->unionAll($stickers), 'usage')
            ->join('accounts', 'accounts.id', '=', 'usage.account_id')
            ->select('usage.account_id', 'accounts.name', 'usage.category', 'usage.bytes', 'usage.files')
            ->get();

        $byAccount = [];

        foreach ($rows as $row) {
            $byAccount[$row->account_id] ??= [
                'id' => (int) $row->account_id,
                'name' => (string) $row->name,
                'url' => SuperAdminArea::url("accounts/{$row->account_id}"),
                'usage' => $this->emptyUsage(),
            ];

            $usage = &$byAccount[$row->account_id]['usage'];
            $usage['categories'][$row->category] += (int) $row->bytes;
            $usage['totalBytes'] += (int) $row->bytes;
            $usage['files'] += (int) $row->files;
            unset($usage);
        }

        usort($byAccount, fn (array $a, array $b) => $b['usage']['totalBytes'] <=> $a['usage']['totalBytes']);

        return $byAccount;
    }

    /** @return array{totalBytes: int, categories: array<string, int>, files: int} */
    private function emptyUsage(): array
    {
        return ['totalBytes' => 0, 'categories' => array_fill_keys(self::CATEGORIES, 0), 'files' => 0];
    }
}
