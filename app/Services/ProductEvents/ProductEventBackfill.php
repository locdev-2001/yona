<?php

namespace App\Services\ProductEvents;

use App\Channels\Capability;
use App\Channels\DeclaresCapabilities;
use App\Messaging\Structured\StructuredTypeRegistry;
use App\Models\Channel\Email;
use App\Models\Channel\WebWidget;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use App\Services\Admin\Metrics\ChannelTypes;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\DB;

/**
 * Dựng sự kiện sản phẩm từ dữ liệu đã có (lệnh product-events:backfill). Mỗi
 * nguồn là một câu INSERT … SELECT … ON CONFLICT DO NOTHING với đúng khoá chống
 * trùng mà hook ghi trực tiếp dùng, nên chạy lại bao nhiêu lần cũng không nhân
 * đôi và không trùng với sự kiện đã ghi lúc chạy thật. Thuộc tính mang
 * `backfilled: true` để phân biệt.
 *
 * Không dựng được (không có dấu vết trong DB): lượt chạy macro, lượt automation
 * kích hoạt, lượt dùng câu trả lời mẫu, xuất CSV, bước onboarding.
 */
final class ProductEventBackfill
{
    private const COLUMNS = '(account_id, user_id, name, properties, dedupe_key, occurred_at, created_at)';

    public function __construct(
        private readonly ChannelTypes $channelTypes,
        private readonly StructuredTypeRegistry $structuredTypes,
    ) {}

    /** @return array<string, int> số dòng thêm mới theo tên sự kiện */
    public function run(?int $accountId = null): array
    {
        $counts = [
            ProductEventName::AccountSignedUp->value => $this->accounts($accountId),
            ProductEventName::EmailConfirmed->value => $this->emailConfirmations($accountId),
            ProductEventName::InboxCreated->value => 0,
            ProductEventName::ChannelConnected->value => 0,
            ProductEventName::FirstInboundMessage->value => $this->firstMessage(ProductEventName::FirstInboundMessage, $accountId),
            ProductEventName::FirstOutboundReply->value => $this->firstMessage(ProductEventName::FirstOutboundReply, $accountId),
            ...$this->records($accountId),
            ProductEventName::StickerSent->value => $this->messagesOfType(ProductEventName::StickerSent, $accountId),
            ProductEventName::StructuredMessageSent->value => $this->messagesOfType(ProductEventName::StructuredMessageSent, $accountId),
        ];

        [$counts[ProductEventName::InboxCreated->value], $counts[ProductEventName::ChannelConnected->value]] = $this->inboxes($accountId);

        return $counts;
    }

    private function accounts(?int $accountId): int
    {
        return $this->insert(
            "select a.id, (select au.user_id from account_users au where au.account_id = a.id order by au.id limit 1),
                ?, '{\"backfilled\":true}'::jsonb, 'account_signed_up:' || a.id, a.created_at, now()
            from accounts a where a.created_at is not null".$this->accountFilter('a.id', $accountId),
            [ProductEventName::AccountSignedUp->value, ...$this->accountBinding($accountId)],
        );
    }

    private function emailConfirmations(?int $accountId): int
    {
        return $this->insert(
            "select au.account_id, u.id, ?, '{\"backfilled\":true}'::jsonb,
                'email_confirmed:' || au.account_id || ':' || u.id, u.confirmed_at, now()
            from account_users au join users u on u.id = au.user_id
            where u.confirmed_at is not null".$this->accountFilter('au.account_id', $accountId),
            [ProductEventName::EmailConfirmed->value, ...$this->accountBinding($accountId)],
        );
    }

    private function firstMessage(ProductEventName $name, ?int $accountId): int
    {
        $isReply = $name === ProductEventName::FirstOutboundReply;
        $condition = $isReply
            ? 'm.message_type = ? and m.private = false and m.sender_type = ?'
            : 'm.message_type = ?';
        $conditionBindings = $isReply ? [Message::TYPE_OUTGOING, (new User)->getMorphClass()] : [Message::TYPE_INCOMING];
        [$platformSql, $platformBindings] = $this->platformCase('i.channel_type');

        return $this->insert(
            'select distinct on (m.account_id) m.account_id, '.($isReply ? 'm.sender_id' : 'null::bigint').", ?,
                jsonb_build_object('inbox_id', m.inbox_id, 'platform', {$platformSql}, 'backfilled', true),
                ? || m.account_id, m.created_at, now()
            from messages m join inboxes i on i.id = m.inbox_id
            where {$condition}".$this->accountFilter('m.account_id', $accountId).'
            order by m.account_id, m.created_at, m.id',
            [$name->value, ...$platformBindings, $name->value.':', ...$conditionBindings, ...$this->accountBinding($accountId)],
        );
    }

    /** @return array<string, int> */
    private function records(?int $accountId): array
    {
        [$platformSql, $platformBindings] = $this->platformCase('i.channel_type');
        $sources = [
            ProductEventName::LabelCreated->value => [
                "select l.account_id, null::bigint, ?, jsonb_build_object('label_id', l.id, 'backfilled', true), ? || l.id, l.created_at, now()
                from labels l where true", 'l.account_id', [],
            ],
            ProductEventName::WebhookCreated->value => [
                "select w.account_id, null::bigint, ?, jsonb_build_object('webhook_id', w.id, 'inbox_id', w.inbox_id, 'backfilled', true), ? || w.id, w.created_at, now()
                from webhooks w where true", 'w.account_id', [],
            ],
            ProductEventName::AgentBotConnected->value => [
                "select i.account_id, null::bigint, ?, jsonb_build_object('agent_bot_id', abi.agent_bot_id, 'inbox_id', abi.inbox_id, 'backfilled', true), ? || abi.id, abi.created_at, now()
                from agent_bot_inboxes abi join inboxes i on i.id = abi.inbox_id where true", 'i.account_id', [],
            ],
            ProductEventName::CampaignCreated->value => [
                "select c.account_id, null::bigint, ?, jsonb_build_object('campaign_id', c.id, 'platform', {$platformSql}, 'backfilled', true), ? || c.id, c.created_at, now()
                from campaigns c join inboxes i on i.id = c.inbox_id where true", 'c.account_id', $platformBindings,
            ],
            ProductEventName::AutomationRuleCreated->value => [
                "select r.account_id, null::bigint, ?, jsonb_build_object('automation_rule_id', r.id, 'event', r.event_name, 'backfilled', true), ? || r.id, r.created_at, now()
                from automation_rules r where true", 'r.account_id', [],
            ],
            ProductEventName::ContactsImported->value => [
                "select d.account_id, null::bigint, ?, jsonb_build_object('data_import_id', d.id, 'backfilled', true), ? || d.id, d.created_at, now()
                from data_imports d where true", 'd.account_id', [],
            ],
            ProductEventName::StickerUploaded->value => [
                "select p.account_id, null::bigint, ?, jsonb_build_object('sticker_pack_id', s.sticker_pack_id, 'backfilled', true), ? || s.id, s.created_at, now()
                from stickers s join sticker_packs p on p.id = s.sticker_pack_id where p.account_id is not null", 'p.account_id', [],
            ],
            // Không lưu lúc xuất bản: lấy lúc tạo bài làm mốc sớm nhất có thể.
            ProductEventName::HelpCenterArticlePublished->value => [
                "select a.account_id, a.author_id, ?, jsonb_build_object('article_id', a.id, 'portal_id', a.portal_id, 'backfilled', true), ? || a.id, a.created_at, now()
                from articles a where a.status = 1", 'a.account_id', [],
            ],
        ];

        $counts = [];
        foreach ($sources as $name => [$select, $accountColumn, $extraBindings]) {
            // Hai placeholder đầu là tên sự kiện và tiền tố khoá; bindings của CASE nền tảng nằm giữa.
            $bindings = $extraBindings === []
                ? [$name, $name.':']
                : [$name, ...$extraBindings, $name.':'];
            $counts[$name] = $this->insert(
                $select.$this->accountFilter($accountColumn, $accountId),
                [...$bindings, ...$this->accountBinding($accountId)],
            );
        }

        return $counts;
    }

    private function messagesOfType(ProductEventName $name, ?int $accountId): int
    {
        if ($name === ProductEventName::StickerSent) {
            $contentTypes = [Message::CONTENT_TYPES['sticker']];
            $properties = "jsonb_build_object('source', case when m.content_attributes->'sticker'->>'id' like 'yona:%' then 'yona' else 'platform' end, 'inbox_id', m.inbox_id, 'backfilled', true)";
        } else {
            $contentTypes = array_values(array_intersect_key(Message::CONTENT_TYPES, array_flip($this->structuredTypes->contentTypes())));
            $names = array_flip(Message::CONTENT_TYPES);
            $typeCase = 'case m.content_type '.implode(' ', array_map(fn (int $value) => "when {$value} then '{$names[$value]}'", $contentTypes)).' end';
            $properties = "jsonb_build_object('type', {$typeCase}, 'inbox_id', m.inbox_id, 'backfilled', true)";
        }

        if ($contentTypes === []) {
            return 0;
        }

        return $this->insert(
            "select m.account_id, case when m.sender_type = ? then m.sender_id end, ?, {$properties}, ? || m.id, m.created_at, now()
            from messages m
            where m.message_type = ? and m.private = false and m.content_type in (".implode(', ', array_fill(0, count($contentTypes), '?')).')'
            .$this->accountFilter('m.account_id', $accountId),
            [(new User)->getMorphClass(), $name->value, $name->value.':', Message::TYPE_OUTGOING, ...$contentTypes, ...$this->accountBinding($accountId)],
        );
    }

    /**
     * Hộp thư và lúc kết nối: token/OAuth = lúc tạo; quét QR, IMAP, widget = tin
     * khách đầu tiên về hộp thư đó (dấu vết duy nhất còn lại của lần kết nối).
     *
     * @return array{0: int, 1: int}
     */
    private function inboxes(?int $accountId): array
    {
        $created = 0;
        $connected = 0;

        Inbox::query()
            ->with('channel')
            ->when($accountId !== null, fn ($query) => $query->where('account_id', $accountId))
            ->chunkById(200, function ($inboxes) use (&$created, &$connected) {
                $rows = [];
                foreach ($inboxes as $inbox) {
                    /** @var Inbox $inbox */
                    $platform = $this->channelTypes->platform($inbox->channel_type)->key;
                    $rows[] = $this->row(ProductEventName::InboxCreated, $inbox->account_id, ['inbox_id' => $inbox->id, 'platform' => $platform], "inbox_created:{$inbox->id}", $inbox->created_at);

                    foreach ($this->connections($inbox) as $method => $at) {
                        $rows[] = $this->row(
                            ProductEventName::ChannelConnected,
                            $inbox->account_id,
                            ['inbox_id' => $inbox->id, 'platform' => $platform, 'method' => $method],
                            "channel_connected:{$inbox->id}:{$method}",
                            $at,
                        );
                    }
                }

                foreach ($rows as $row) {
                    $inserted = DB::table('product_events')->insertOrIgnore($row);
                    $row['name'] === ProductEventName::InboxCreated->value ? $created += $inserted : $connected += $inserted;
                }
            });

        return [$created, $connected];
    }

    /** @return array<string, mixed> phương thức => thời điểm */
    private function connections(Inbox $inbox): array
    {
        $channel = $inbox->channel;
        $capabilities = $channel instanceof DeclaresCapabilities ? $channel->capabilities() : null;
        $connections = [];

        if ($capabilities?->has(Capability::SessionToken)) {
            $connections['token'] = $inbox->created_at;
        } elseif ($capabilities?->has(Capability::SessionOauth)) {
            $connections['oauth'] = $inbox->created_at;
        }

        $later = match (true) {
            (bool) $capabilities?->has(Capability::SessionQr) => 'qr',
            $channel instanceof Email && $channel->imap_enabled => 'imap',
            $channel instanceof WebWidget => 'widget_embed',
            default => null,
        };

        if ($later !== null) {
            $firstIncoming = Message::query()
                ->where('inbox_id', $inbox->id)
                ->where('message_type', Message::TYPE_INCOMING)
                ->min('created_at');
            if ($firstIncoming !== null) {
                $connections[$later] = $firstIncoming;
            }
        }

        return $connections;
    }

    /**
     * @param  array<string, mixed>  $properties
     * @return array<string, mixed>
     */
    private function row(ProductEventName $name, int $accountId, array $properties, string $dedupeKey, mixed $occurredAt): array
    {
        return [
            'account_id' => $accountId,
            'user_id' => null,
            'name' => $name->value,
            'properties' => json_encode([...$properties, 'backfilled' => true], JSON_THROW_ON_ERROR),
            'dedupe_key' => $dedupeKey,
            'occurred_at' => $occurredAt ?? now(),
            'created_at' => now(),
        ];
    }

    /** @param  list<mixed>  $bindings */
    private function insert(string $select, array $bindings): int
    {
        return DB::affectingStatement('insert into product_events '.self::COLUMNS.' '.$select.' on conflict do nothing', $bindings);
    }

    private function accountFilter(string $column, ?int $accountId): string
    {
        return $accountId === null ? '' : " and {$column} = ?";
    }

    /** @return list<int> */
    private function accountBinding(?int $accountId): array
    {
        return $accountId === null ? [] : [$accountId];
    }

    /** @return array{0: string, 1: list<string>} biểu thức SQL đổi channel_type thành khoá nền tảng */
    private function platformCase(string $column): array
    {
        $sql = "case {$column}";
        $bindings = [];
        foreach (array_keys(Relation::morphMap()) as $type) {
            $platform = $this->channelTypes->platform($type)->key;
            if ($platform === 'unknown') {
                continue;
            }
            $sql .= ' when ? then ?';
            array_push($bindings, $type, $platform);
        }

        return [$sql." else 'unknown' end", $bindings];
    }
}
