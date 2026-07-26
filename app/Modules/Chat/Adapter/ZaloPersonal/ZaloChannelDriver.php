<?php

namespace App\Modules\Chat\Adapter\ZaloPersonal;

use App\Contracts\SendException;
use App\Enums\TenantPermission;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\ZaloConnection;
use App\Modules\Chat\Adapter\ZaloPersonal\Delivery\ZaloInteractionService;
use App\Modules\Chat\Adapter\ZaloPersonal\Delivery\ZaloSendService;
use App\Modules\Chat\Adapter\ZaloPersonal\Exception\RateCapException;
use App\Modules\Chat\Adapter\ZaloPersonal\Exception\SendOutsideWindowException;
use App\Modules\Chat\Adapter\ZaloPersonal\Exception\ZaloCircuitOpenException;
use App\Modules\Chat\Adapter\ZaloPersonal\Exception\ZaloNotConnectedException;
use App\Modules\Chat\Adapter\ZaloPersonal\Exception\ZaloSplitBrainException;
use App\Modules\Chat\Adapter\ZaloPersonal\Intake\ZaloBackfillService;
use App\Modules\Chat\Delivery\Event\OutboundEventType;
use App\Modules\Chat\Port\AbstractChannelDriver;
use App\Modules\Chat\Port\Capability\SupportsHistoryResync;
use App\Modules\Chat\Port\Capability\SupportsPhoneVerification;
use App\Modules\Chat\Port\Capability\SupportsReactions;
use App\Modules\Chat\Port\Capability\SupportsSeenReceipts;
use App\Modules\Chat\Port\Capability\SupportsStickers;
use App\Modules\Chat\Port\ChannelCapabilities;
use App\Modules\Chat\Port\ChannelDescriptor;
use App\Modules\Chat\Port\ChannelDriver;
use Illuminate\Support\Collection;

/**
 * Channel driver cho Zalo cá nhân (zca-js bridge).
 *
 * Cài hợp đồng ChannelDriver ở Port/ — lõi không import class này.
 * Đăng ký qua ChannelRegistry::extend('zalo_personal', ...) trong ZaloPersonalServiceProvider.
 *
 * D-2 (outbound/QR/send): sendMessage → ZaloSendService.
 * D-1 (inbound): parseInbound() đã đầy đủ cho webhook RLS-bind flow.
 *
 * Diện tương tác khai qua capability interface — lõi hỏi `instanceof`, không
 * `method_exists`. Quên implement là PHPStan đỏ chứ không im lặng lúc chạy.
 *
 * @see ZaloPersonalServiceProvider
 * @see ChannelDriver
 */
class ZaloChannelDriver extends AbstractChannelDriver implements SupportsHistoryResync, SupportsPhoneVerification, SupportsReactions, SupportsSeenReceipts, SupportsStickers
{
    /** Khóa định danh kênh — dùng trong DB, hạn mức, và sổ đăng ký. */
    public const KEY = 'zalo_personal';

    /** Zalo cho kéo lịch sử lùi tối đa 30 ngày (quyết định founder 05/07). */
    private const RESYNC_DEEP_DAYS = 30;

    public function __construct(
        private readonly ZaloSendService $sendService,
        private readonly ZaloInteractionService $interactionService,
        private readonly ZaloBackfillService $backfillService,
    ) {}

    public function descriptor(): ChannelDescriptor
    {
        return self::descriptorOf();
    }

    /**
     * Danh tính của kênh là HẰNG, không phụ thuộc instance — provider khai nó
     * mà không phải dựng cả chuỗi phụ thuộc của driver.
     */
    public static function descriptorOf(): ChannelDescriptor
    {
        return new ChannelDescriptor(
            key: self::KEY,
            label: 'Zalo cá nhân',
            category: 'chat',
            logo: '/assets/images/icon_zalo.png',
            badge: 'Z',
            connectRouteName: 'integrations.zalo.index',
            managePermission: TenantPermission::ZaloManage,
        );
    }

    /**
     * P11 — flags Zalo cá nhân. canRecallOwn=false: thu hồi tin MÌNH gửi chưa
     * build (undo API có nhưng chưa wire UI — backlog).
     */
    public function capabilities(): ChannelCapabilities
    {
        return new ChannelCapabilities(
            canSendMedia: true,
            canSendSticker: true,
            canQuoteReply: true,
            canReact: true,
            canRecallOwn: false,
            hasDeliveryReceipts: true,
            hasSeenReceipts: true,
            hasTyping: true,
            canSendSeen: true,
            receiptGranularity: 'thread',
        );
    }

    /**
     * Zalo cá nhân chỉ render được chữ và ảnh nguyên bản.
     *
     * Thẻ, nút, ô nhập bị HẠ CẤP về chữ — `OutboundMessage` đã rút sẵn bản chữ
     * thuần của mọi sự kiện, nên `$payload['text']` chính là bản đã hạ cấp. Zalo
     * không có khái niệm nút bấm, giả lập bằng danh sách chữ là thứ khách đọc
     * được, còn hơn nuốt mất nội dung.
     *
     * @return list<OutboundEventType>
     */
    public function supportedOutboundEvents(): array
    {
        return [OutboundEventType::Text, OutboundEventType::Media];
    }

    /**
     * Parse raw webhook payload từ bridge thành normalized shape cho IntakeService.
     *
     * Field mapping (bridge → normalized):
     *   peer_uid       = payload.peer_uid
     *   peer_name      = payload.user.name
     *   peer_avatar    = payload.user.avatar
     *   peer_phone     = null (bridge không gửi phone ở inbound — enrich async sau)
     *   direction      = payload.direction (in|out|echo; fail-safe 'in' nếu thiếu — F14)
     *   source_id      = payload.source_id
     *   type           = mapped từ inbound_kind
     *   body           = payload.content (text/caption)
     *   media_url      = payload.media_url
     *   media_meta     = {sticker, business_card, call, media_filename, ...}
     *   sender_uid     = payload.sender_uid (group sender)
     *   sender_name    = payload.sender.name
     *   sender_avatar  = payload.sender.avatar (nuôi conversations.participants)
     *   platform_sent_at = payload.platform_sent_at (ms unix → Carbon)
     *   channel_account_id = payload.channel_account_id (resolved bởi webhook controller — P08)
     *   thread_kind    = dịch từ payload.thread_type (0=user → direct, 1=group)
     *   channel        = 'zalo_personal'
     *
     * @param  array<string, mixed>  $raw
     * @return array<string, mixed>
     */
    public function parseInbound(array $raw): array
    {
        $inboundKind = $raw['inbound_kind'] ?? 'text';

        $type = match ($inboundKind) {
            'text' => 'text',
            'image' => 'image',
            'gif' => 'gif',
            'video' => 'video',
            'audio' => 'audio',
            'file' => 'file',
            'sticker' => 'sticker',
            'business_card' => 'business_card',
            'bank_card' => 'bank_card',
            'call' => 'call',
            default => 'text',
        };

        $mediaMeta = [];
        if (isset($raw['sticker'])) {
            $mediaMeta['sticker'] = $raw['sticker'];
        }
        if (isset($raw['business_card'])) {
            $mediaMeta['business_card'] = $raw['business_card'];
        }
        if (isset($raw['bank_card'])) {
            $mediaMeta['bank_card'] = $raw['bank_card'];
        }
        if (isset($raw['call'])) {
            $mediaMeta['call'] = $raw['call'];
        }
        if (isset($raw['media_filename'])) {
            $mediaMeta['media_filename'] = $raw['media_filename'];
        }
        if (isset($raw['quote'])) {
            $mediaMeta['quote'] = $raw['quote'];
        }

        // platform_sent_at: bridge gửi Unix ms → convert sang Carbon-friendly timestamp
        $platformSentAtMs = isset($raw['platform_sent_at']) ? (int) $raw['platform_sent_at'] : null;
        $platformSentAt = $platformSentAtMs ? date('Y-m-d H:i:s', (int) ($platformSentAtMs / 1000)) : null;

        // direction: F14 fail-safe — default 'in' nếu thiếu field
        $direction = $raw['direction'] ?? 'in';
        if (! in_array($direction, ['in', 'out', 'echo'], true)) {
            $direction = 'in'; // ponytail: fail-safe under-count billing an toàn hơn over-count
        }

        $user = $raw['user'] ?? [];
        $sender = $raw['sender'] ?? null;

        return [
            'channel' => 'zalo_personal',
            // P08: key duy nhất cho upsertConversation — resolved bởi webhook controller
            // (channel_account_id ổn định qua reconnect, thay vì connection_id/personal_uid).
            'channel_account_id' => isset($raw['channel_account_id']) && $raw['channel_account_id'] !== ''
                ? (string) $raw['channel_account_id']
                : null,
            'peer_uid' => (string) ($raw['peer_uid'] ?? ''),
            'peer_name' => $user['name'] ?? null,
            'peer_avatar' => $user['avatar'] ?? null,
            'peer_phone' => null, // enrich async khi có business_card.phone
            // Lớp dịch: `thread_type` là số của Zalo, lõi không được thấy nó.
            'thread_kind' => ((int) ($raw['thread_type'] ?? 0)) === 1
                ? Conversation::KIND_GROUP
                : Conversation::KIND_DIRECT,
            'direction' => $direction,
            'source_id' => isset($raw['source_id']) ? (string) $raw['source_id'] : null,
            'type' => $type,
            'body' => isset($raw['content']) ? (string) $raw['content'] : null,
            'media_url' => $raw['media_url'] ?? null,
            'media_meta' => $mediaMeta,
            'platform_sent_at' => $platformSentAt,
            'sender_uid' => $raw['sender_uid'] ?? ($sender['id'] ?? null),
            'sender_name' => $sender['name'] ?? null,
            'sender_avatar' => $sender['avatar'] ?? null,
            'sent_by' => null, // inbound = ngoài hệ thống
            'platform_meta' => $this->extractPlatformMeta($raw),
        ];
    }

    /**
     * P01a — platform_meta.zca_message: giữ TOÀN BỘ raw từ listener_data
     * (quyết định founder 05/07: "có gì lấy sạch hết" — payload nền tảng không
     * tái tạo được, cần cho action outbound quote/reaction/seen lẫn nhu cầu
     * tương lai chưa biết trước) + threadId/threadType chuẩn hóa từ payload.
     * P06 gate action theo field bắt buộc (msgId/cliMsgId...) — thiếu = action disable.
     * Tin backfill/legacy không có listener_data → platform_meta rỗng (action disable).
     *
     * @param  array<string, mixed>  $raw
     * @return array<string, mixed>
     */
    private function extractPlatformMeta(array $raw): array
    {
        $listenerData = $raw['listener_data'] ?? null;
        if (! is_array($listenerData)) {
            return [];
        }

        $zcaMessage = $listenerData;

        if (isset($raw['thread_id'])) {
            $zcaMessage['threadId'] = (string) $raw['thread_id'];
        }
        if (isset($raw['thread_type'])) {
            $zcaMessage['threadType'] = (int) $raw['thread_type'];
        }

        return $zcaMessage === [] ? [] : ['zca_message' => $zcaMessage];
    }

    /**
     * Gửi tin outbound qua ZaloSendService.
     * Wrap Zalo-specific exceptions thành SendException (inbox-agnostic)
     * để InboxController không cần import ChannelZalo exceptions (N1).
     *
     * @param  array<string, mixed>  $payload  {text?, media?, reply_to?: Message, sticker?}
     *
     * @throws SendException
     */
    public function sendMessage(Conversation $conversation, array $payload): Message
    {
        // P06a — quote: build zca object từ platform_meta của tin gốc (đặc thù
        // Zalo sống ở driver). Thiếu meta → SendException, KHÔNG gửi mù.
        $quote = null;
        $quoteDisplay = null;
        $replyTo = $payload['reply_to'] ?? null;
        if ($replyTo instanceof Message) {
            $quote = $this->buildZcaQuote($replyTo);
            $quoteDisplay = $this->buildQuoteDisplay($conversation, $replyTo);
        }

        try {
            return $this->sendService->send(
                conversation: $conversation,
                text: isset($payload['text']) ? (string) $payload['text'] : null,
                media: $payload['media'] ?? null,
                quote: $quote,
                sticker: $payload['sticker'] ?? null,
                quoteDisplay: $quoteDisplay,
            );
        } catch (ZaloCircuitOpenException $e) {
            throw new SendException('Kết nối Zalo đang lỗi. Vui lòng gửi tin tay hoặc thử lại sau.', 'circuit_open', $e);
        } catch (SendOutsideWindowException $e) {
            throw new SendException('Chỉ được gửi tin từ 7h–22h (ToS Zalo).', 'outside_window', $e);
        } catch (RateCapException $e) {
            throw new SendException('Đã gửi tối đa 3 tin quảng cáo trong ngày cho số này (ToS Zalo).', 'rate_cap', $e);
        } catch (ZaloNotConnectedException $e) {
            throw new SendException('Zalo chưa kết nối hoặc phiên đã hết. Vui lòng đăng nhập lại.', 'not_connected', $e);
        } catch (ZaloSplitBrainException $e) {
            throw new SendException('Phát hiện nhiều phiên Zalo cùng kết nối — đã dừng gửi để tránh gửi nhầm. Liên hệ hỗ trợ.', 'split_brain', $e);
        }
    }

    /**
     * P05 — verify SĐT nhập tay qua ZaloInteractionService (client /zca duy nhất).
     * 1 API call/lần do NGƯỜI DÙNG chủ động (không harvest — BLK-5).
     *
     * @return bool true = uid khớp peer_uid; false = không khớp / không resolve
     *
     * @throws ZaloNotConnectedException bridge/slot không sẵn sàng
     */
    public function verifySenderPhone(Conversation $conversation, string $phone): bool
    {
        return $this->interactionService->verifyPeerPhone($conversation, $phone);
    }

    /**
     * P06b — seen-sync (default OFF, A4).
     *
     * Nhận Message chứ không nhận metadata nền tảng: lõi chỉ chọn TIN NÀO cần
     * báo, việc bóc `platform_meta.zca_message` là ruột Zalo nên sống ở đây.
     *
     * @param  Collection<int, Message>  $messages
     */
    public function sendSeen(Conversation $conversation, Collection $messages): bool
    {
        $zcaMessages = $messages
            ->pluck('platform_meta.zca_message')
            ->filter(fn ($zca) => is_array($zca) && $zca !== [])
            ->values()
            ->all();

        if ($zcaMessages === []) {
            return false;
        }

        return $this->interactionService->sendSeenBatch($conversation, $zcaMessages);
    }

    /**
     * P06a — thả/gỡ cảm xúc. Gate metadata nằm trong ZaloInteractionService:
     * thiếu msgId/cliMsgId là không gọi được API, phải báo lỗi chứ không
     * optimistic ghi DB rồi lệch hai chiều.
     */
    public function react(Conversation $conversation, Message $message, string $icon): void
    {
        $this->interactionService->addReaction($conversation, $message, $icon);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function searchStickers(Conversation $conversation, string $keyword): array
    {
        return $this->interactionService->searchStickers($conversation, $keyword);
    }

    /**
     * Kéo lịch sử bị mất trên MỌI slot đang kết nối của workspace.
     *
     * Vòng lặp per-connection sống ở đây chứ không ở controller: "một tài khoản
     * Zalo có thể có nhiều phiên" là đặc thù của kênh này, kênh khác không có.
     */
    public function resyncHistory(string $workspaceId): int
    {
        $connections = ZaloConnection::where('workspace_id', $workspaceId)
            ->where('state', 'connected')
            ->whereNull('deleted_at')
            ->get(['connection_id']);

        $fetched = 0;
        foreach ($connections as $connection) {
            $fetched += $this->backfillService->run($connection->connection_id, self::RESYNC_DEEP_DAYS);
        }

        return $fetched;
    }

    /**
     * SendMessageQuote shape (sendMessage.ts: qmsgOwner/qmsgId/qmsgCliId/qmsgType/
     * qmsgTs/qmsg/qmsgTTL + prepareQMSGAttach đọc propertyExt/content). Gate đủ
     * field bắt buộc + loại tin zca throw (webchat content-object, group.poll).
     *
     * @return array<string, mixed>
     *
     * @throws SendException quote_unavailable — tin cũ pre-P01/backfill thiếu meta
     */
    private function buildZcaQuote(Message $replyTo): array
    {
        $zca = $replyTo->platform_meta['zca_message'] ?? [];

        $required = ['msgId', 'cliMsgId', 'uidFrom', 'msgType', 'ts'];
        foreach ($required as $field) {
            if (! isset($zca[$field]) || $zca[$field] === '') {
                throw new SendException('Tin gốc thiếu metadata nền tảng — không trích dẫn được (tin cũ).', 'quote_unavailable');
            }
        }

        $msgType = (string) $zca['msgType'];
        $content = $zca['content'] ?? '';
        if ($msgType === 'group.poll' || ($msgType === 'webchat' && ! is_string($content))) {
            throw new SendException('Loại tin này không trích dẫn được.', 'quote_unavailable');
        }

        return array_filter([
            'msgId' => (string) $zca['msgId'],
            'cliMsgId' => (string) $zca['cliMsgId'],
            'uidFrom' => (string) $zca['uidFrom'],
            'msgType' => $msgType,
            'ts' => (string) $zca['ts'],
            'content' => $content,
            'ttl' => $zca['ttl'] ?? 0,
            'propertyExt' => $zca['propertyExt'] ?? null,
        ], fn ($v) => $v !== null);
    }

    /** @return array<string, mixed> media_meta.quote cho FE (khớp QuoteMeta shape inbound) */
    private function buildQuoteDisplay(Conversation $conversation, Message $replyTo): array
    {
        return array_filter([
            'msg_id' => $replyTo->source_id,
            'text' => $replyTo->body ?? ($replyTo->type !== 'text' ? '['.$replyTo->type.']' : null),
            'sender_name' => $replyTo->direction === 'in'
                ? ($replyTo->sender_name ?? $conversation->peer_name)
                : ($conversation->channelAccount->display_name ?? 'Bạn'),
            'msg_type' => $replyTo->type,
            'thumb' => in_array($replyTo->type, ['image', 'gif', 'video'], true) ? $replyTo->media_url : null,
        ], fn ($v) => $v !== null && $v !== '');
    }

    // connect/disconnect kế thừa no-op từ AbstractChannelDriver: luồng QR và
    // logout sống ở ZaloConnectionController, không đi qua contract.
}
