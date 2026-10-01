<?php

namespace App\Services\Admin\Operations\ChannelHealth;

use App\Models\Account;
use App\Models\Inbox;
use App\Support\SuperAdminArea;
use Illuminate\Database\Eloquent\Builder;

// Gom sức khoẻ kênh của mọi hộp thư cho console quản trị. Lõi chỉ hỏi các driver
// trong ChannelHealthDetectors; không có nhánh theo loại kênh ở đây.
final class ChannelHealthInspector
{
    private const CHUNK_SIZE = 200;

    public function __construct(private readonly ChannelHealthDetectors $detectors) {}

    public function inspect(Inbox $inbox): ?ChannelProblem
    {
        if ($inbox->channel === null) {
            return new ChannelProblem('channel_missing');
        }

        foreach ($this->detectors->all() as $detector) {
            if ($detector->supports($inbox)) {
                return $detector->detect($inbox);
            }
        }

        return null;
    }

    /**
     * @return array{total: int, healthy: int, failing: int, items: list<array<string, mixed>>}
     */
    public function summary(): array
    {
        $total = 0;
        $items = [];

        $this->inboxQuery()->chunkById(self::CHUNK_SIZE, function ($inboxes) use (&$total, &$items) {
            foreach ($inboxes as $inbox) {
                $total++;
                $problem = $this->inspect($inbox);

                if ($problem !== null) {
                    $items[] = $this->describe($inbox, $problem);
                }
            }
        });

        // Vấn đề mới nhất lên đầu; vấn đề không rõ thời điểm xếp cuối.
        usort($items, fn (array $left, array $right) => strcmp((string) $right['since'], (string) $left['since']));

        return [
            'total' => $total,
            'healthy' => $total - count($items),
            'failing' => count($items),
            'items' => $items,
        ];
    }

    /** @return list<array<string, mixed>> mọi hộp thư của account, khoẻ lẫn hỏng */
    public function forAccount(Account $account): array
    {
        return $this->inboxQuery()
            ->where('account_id', $account->id)
            ->get()
            ->map(fn (Inbox $inbox) => $this->describe($inbox, $this->inspect($inbox)))
            ->all();
    }

    /** @return array<string, mixed> */
    public function describe(Inbox $inbox, ?ChannelProblem $problem): array
    {
        return [
            'inboxId' => $inbox->id,
            'inboxName' => $inbox->name,
            'accountId' => $inbox->account_id,
            'accountName' => $inbox->account?->name,
            'channelType' => $inbox->channel_type,
            'platform' => $inbox->platform()->toArray(),
            'healthy' => $problem === null,
            'problem' => $problem?->code,
            'severity' => $problem?->severity,
            'problemLabel' => $problem === null ? null : $this->problemLabel($problem->code),
            'detail' => $problem?->detail,
            'since' => $problem?->since?->toIso8601String(),
            'url' => SuperAdminArea::url("accounts/{$inbox->account_id}/overview"),
        ];
    }

    private function problemLabel(string $code): string
    {
        $key = "admin_operations.CHANNEL_HEALTH.PROBLEMS.{$code}";
        $label = __($key);

        return $label === $key ? $code : (string) $label;
    }

    /** @return Builder<Inbox> */
    private function inboxQuery(): Builder
    {
        return Inbox::query()->with(['channel', 'account:id,name'])->orderBy('id');
    }
}
