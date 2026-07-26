<?php

namespace App\Modules\Chat\Store;

use App\Events\ConversationPhoneLearned;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\ProfileIdentity;
use App\Modules\Identity\Contracts\IdentityResolver;
use App\Modules\Identity\Data\ObservedIdentity;
use App\Modules\Identity\Resolve\PhoneNormalizer;
use Illuminate\Support\Carbon;

/**
 * P05 — enrich SĐT khách, mở khóa quy tắc #1 CDP (chống trùng theo SĐT).
 *
 * CHỈ 2 nguồn cho phép (BLK-5: CẤM harvest hàng loạt — rủi ro khóa acc Zalo duy nhất):
 *  1. business_card khách CHỦ ĐỘNG gửi (A1 consent-by-conduct) — DB thuần, 0 API call
 *  2. nhập tay + verify findUser (controller gọi applyPhone sau khi driver verify)
 *
 * Thứ tự mạnh: manual_verified > business_card > friend_profile > unverified.
 * Cùng hạng = take-latest (cho sửa typo); KHÔNG ghi đè nguồn mạnh bằng yếu.
 * Số chảy vào tầng ĐỊNH DANH, không vào CDP: chat nói chuyện với một cổng trung
 * tính và không biết `Contact`/`Lead` tồn tại. Chính cổng đó gộp hai hồ sơ khi
 * số này đã thuộc về người khác.
 */
class PhoneEnrichmentService
{
    private const SOURCE_STRENGTH = [
        'unverified' => 0,
        'friend_profile' => 1,
        'business_card' => 2,
        'manual_verified' => 3,
    ];

    public function __construct(
        private readonly IdentityResolver $identities,
        private readonly PhoneNormalizer $phones,
    ) {}

    /**
     * Lift SĐT từ danh thiếp khách gửi (chỉ 1-1, chỉ inbound = khách tự gửi).
     */
    public function liftFromBusinessCard(Message $message): bool
    {
        if ($message->type !== 'business_card' || $message->direction !== 'in') {
            return false;
        }

        $conversation = $message->conversation;
        if ($conversation === null || $conversation->isGroup()) {
            return false;
        }

        $phone = $message->media_meta['business_card']['phone'] ?? null;
        if ($phone === null || (string) $phone === '') {
            return false;
        }

        return $this->applyPhone($conversation, (string) $phone, 'business_card');
    }

    /**
     * Áp SĐT với source tracking + dedup CDP. Trả false nếu phone không hợp lệ
     * hoặc nguồn yếu hơn nguồn hiện có.
     */
    public function applyPhone(Conversation $conversation, string $phone, string $source, ?Carbon $verifiedAt = null): bool
    {
        $normalized = $this->phones->normalize($phone);
        if ($normalized === null) {
            return false;
        }

        // Độ mạnh của số đang có đọc từ chính bí danh — không còn bản sao nào
        // trên luồng để lệch với nó.
        if ((self::SOURCE_STRENGTH[$source] ?? 0) < $this->currentStrength($conversation)) {
            return false;
        }

        $this->linkIdentity($conversation, $normalized, $source, $verifiedAt !== null);

        // Chat dừng ở đây. Dựng/gộp hồ sơ khách là chuyện của CRM, và nó nghe
        // sự kiện này — chat không được biết `Contact` tồn tại.
        ConversationPhoneLearned::dispatch($conversation->id, $normalized, $source);

        return true;
    }

    /**
     * Gắn luồng vào một hồ sơ, dựa trên khóa thô của chính luồng.
     */
    private function attachThreadProfile(Conversation $conversation): void
    {
        $resolved = $this->identities->observe(new ObservedIdentity(
            workspaceId: $conversation->workspace_id,
            key: $conversation->channel.'_uid',
            value: $conversation->sender_uid,
            source: $conversation->channel,
            channelAccountId: $conversation->channel_account_id,
            displayName: $conversation->thread_name,
            channels: [$conversation->channel],
        ));

        $conversation->forceFill([
            'identity_id' => $resolved->identityId,
            'profile_id' => $resolved->profileId,
        ])->save();
    }

    /**
     * Nguồn của số đang gắn với hồ sơ này mạnh tới đâu.
     *
     * Chưa có số nào thì trả -1 để mọi nguồn, kể cả yếu nhất, đều ghi được.
     */
    private function currentStrength(Conversation $conversation): int
    {
        if ($conversation->profile_id === null) {
            return -1;
        }

        $source = ProfileIdentity::query()
            ->where('profile_id', $conversation->profile_id)
            ->where('key', 'phone')
            ->orderByRaw("array_position(ARRAY['unverified','friend_profile','business_card','manual_verified'], source) DESC NULLS LAST")
            ->value('source');

        return $source === null ? -1 : (self::SOURCE_STRENGTH[$source] ?? 0);
    }

    /**
     * Gắn số vào hồ sơ của luồng — và nếu số đó đã thuộc hồ sơ khác thì hai hồ
     * sơ được gộp. Đó chính là quy tắc "một số điện thoại là một người".
     */
    private function linkIdentity(Conversation $conversation, string $phone, string $source, bool $verified): void
    {
        // Luồng chưa gắn hồ sơ thì gắn trước rồi mới nối số vào. Bỏ qua ở đây là
        // số điện thoại vừa học được biến mất không dấu vết — im lặng, không lỗi.
        if ($conversation->profile_id === null) {
            $this->attachThreadProfile($conversation);
        }

        if ($conversation->profile_id === null) {
            return;
        }

        $this->identities->link($conversation->profile_id, new ObservedIdentity(
            workspaceId: $conversation->workspace_id,
            key: 'phone',
            value: $phone,
            source: $source,
            displayName: $conversation->thread_name,
            channels: [$conversation->channel],
            isVerified: $verified,
        ));
    }
}
