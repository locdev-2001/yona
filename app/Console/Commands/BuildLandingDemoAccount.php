<?php

namespace App\Console\Commands;

use App\Builders\AccountBuilder;
use App\Builders\ContactInboxWithContactBuilder;
use App\Builders\ConversationBuilder;
use App\Builders\Messages\MessageBuilder;
use App\Models\Account;
use App\Models\Channel\WebWidget;
use App\Models\Channel\Zalo;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Notification;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Dựng account demo dùng để chụp ảnh sản phẩm của landing (public/landing/*.png):
 * một cửa hàng hư cấu với hai hộp thư thật — Zalo cá nhân (Channel::Zalo, đã kết
 * nối, không cần phiên bridge) và Website — cùng bảy hội thoại bán hàng.
 *
 * Chạy lại được: mỗi lần chạy xoá sạch account mang MARKER_KEY và agent demo rồi
 * dựng lại từ đầu. Account không mang dấu đó không bao giờ bị đụng tới.
 */
class BuildLandingDemoAccount extends Command
{
    /** Dấu trong accounts.custom_attributes — cách DUY NHẤT lệnh nhận ra account của mình. */
    public const MARKER_KEY = 'landing_demo_fixture';

    public const AGENT_EMAIL = 'han@nhamay.test';

    public const AGENT_PASSWORD = 'NhaMay@2026';

    private const ACCOUNT_NAME = 'Tiệm Nhà Mây';

    private const AGENT_NAME = 'Ngọc Hân';

    private const LOCALE = 'vi';

    private const WEBSITE_URL = 'https://nhamay.test';

    /** Shop đã dùng Yona được một tuần khi ca trực trong kịch bản diễn ra. */
    private const ACCOUNT_AGE_DAYS = 7;

    private const INBOX_NAMES = [
        'zalo' => 'Zalo cá nhân',
        'website' => 'Website',
    ];

    /**
     * Kịch bản theo thứ tự tạo — thứ tự này quyết định display_id (#1…#7). Mỗi tin
     * là [số phút trước mốc --at, loại tin, nội dung]; mỗi hội thoại có đúng một tin
     * khách chưa đọc.
     */
    private const CONVERSATIONS = [
        [
            'contact' => 'Trần Thu Hà',
            'inbox' => 'zalo',
            'assigned' => true,
            'messages' => [
                [62, 'incoming', 'Shop còn size M màu be không ạ?'],
                [43, 'outgoing', 'Dạ còn chị ơi, em còn 3 cái size M màu be.'],
            ],
        ],
        [
            'contact' => 'Nguyễn Minh Khôi',
            'phone' => '+84901234567',
            'inbox' => 'zalo',
            'assigned' => true,
            'messages' => [
                [95, 'incoming', 'Anh muốn đặt 20 hộp giao quận 7, bao giờ có hàng?'],
                [88, 'outgoing', 'Dạ mai em giao được ạ, anh cho em địa chỉ nhé.'],
            ],
        ],
        [
            'contact' => 'Lê Phương Anh',
            'inbox' => 'website',
            'assigned' => true,
            'messages' => [
                [150, 'incoming', 'Shop có xuất hoá đơn VAT cho công ty không em?'],
                [140, 'outgoing', 'Dạ có chị, em xuất VAT trong ngày ạ.'],
            ],
        ],
        [
            'contact' => 'Phạm Quốc Duy',
            'inbox' => 'zalo',
            'assigned' => true,
            'messages' => [
                [190, 'incoming', 'Đơn hôm qua shop gửi chưa vậy?'],
                [185, 'outgoing', 'Dạ em gửi chiều qua rồi anh, mã vận đơn 8842731.'],
            ],
        ],
        [
            'contact' => 'Võ Thị Kim Ngân',
            'inbox' => 'website',
            'assigned' => true,
            'messages' => [
                [305, 'incoming', 'Mình muốn hỏi chính sách đổi trả trong bao lâu?'],
                [300, 'outgoing', 'Dạ 7 ngày kể từ khi nhận hàng chị nhé.'],
            ],
        ],
        [
            'contact' => 'Đặng Hoàng Nam',
            'inbox' => 'zalo',
            'assigned' => false,
            'messages' => [
                [37, 'incoming', 'Còn mẫu nào tương tự nhưng rẻ hơn không em?'],
            ],
        ],
        [
            'contact' => 'Bùi Thanh Trúc',
            'inbox' => 'zalo',
            'assigned' => false,
            'messages' => [
                [34, 'incoming', 'Cho mình xin bảng giá sỉ với ạ'],
            ],
        ],
    ];

    protected $signature = 'landing:demo-account
        {--at= : Mốc "bây giờ" của kịch bản, vd "2026-09-23 15:30 +07:00" (mặc định: hiện tại)}';

    protected $description = 'Dựng lại account demo (Zalo cá nhân + Website, 7 hội thoại) để chụp ảnh sản phẩm cho landing';

    public function handle(): int
    {
        if (app()->isProduction()) {
            $this->components->error('Lệnh chỉ dựng dữ liệu demo cho máy dev — từ chối chạy trên production.');

            return self::FAILURE;
        }

        try {
            $anchor = $this->anchor();
        } catch (InvalidArgumentException $exception) {
            $this->components->error($exception->getMessage());

            return self::FAILURE;
        }

        if ($this->agentEmailBelongsToOtherAccount()) {
            $this->components->error(sprintf(
                '%s đang là thành viên của account không phải demo — không đụng tới, dừng lại.',
                self::AGENT_EMAIL,
            ));

            return self::FAILURE;
        }

        $removed = $this->removePreviousFixture();

        // Dựng lại dòng thời gian bằng cách lùi đồng hồ tới đúng mốc của từng bước:
        // mọi hook (waiting_since, last_activity_at, first_reply_created_at, báo cáo)
        // tự đóng dấu giờ của kịch bản thay vì phải vá tay từng cột sau đó.
        $clockBefore = Carbon::getTestNow();

        try {
            [$agent, $account] = $this->buildAccount($anchor);
            $inboxes = $this->buildInboxes($account);

            $conversations = array_map(
                fn (array $scene) => $this->buildConversation($scene, $inboxes[$scene['inbox']], $agent, $anchor),
                self::CONVERSATIONS,
            );

            Carbon::setTestNow($anchor);
            $this->markNotificationsRead($account, $agent);
        } finally {
            Carbon::setTestNow($clockBefore);
        }

        $this->printSummary($account, $conversations, $removed);

        return self::SUCCESS;
    }

    private function anchor(): CarbonInterface
    {
        $option = $this->option('at');

        if (blank($option)) {
            return now();
        }

        // Đưa về múi giờ của app: Eloquent ghi datetime theo múi của chính đối tượng,
        // để nguyên "+07:00" thì mọi mốc trong DB lệch đúng 7 tiếng.
        try {
            $anchor = Carbon::parse((string) $option)->setTimezone(config('app.timezone'));
        } catch (\Throwable) {
            throw new InvalidArgumentException("Không đọc được --at=\"{$option}\".");
        }

        if ($anchor->isFuture()) {
            throw new InvalidArgumentException('--at không được ở tương lai: tin nhắn sẽ mang giờ chưa tới.');
        }

        return $anchor;
    }

    /** @return Builder<Account> */
    private function demoAccounts(): Builder
    {
        return Account::query()->where('custom_attributes->'.self::MARKER_KEY, true);
    }

    private function agentEmailBelongsToOtherAccount(): bool
    {
        $agent = User::query()->where('email', self::AGENT_EMAIL)->first();

        return $agent !== null && $agent->accounts()
            ->whereNotIn('accounts.id', $this->demoAccounts()->select('id'))
            ->exists();
    }

    private function removePreviousFixture(): int
    {
        $accounts = $this->demoAccounts()->get();

        foreach ($accounts as $account) {
            // Kênh Zalo demo chưa từng có phiên ở bridge: xoá lặng để hook của kênh
            // không gọi đăng xuất ra bridge thật đang chạy trên máy.
            Zalo::query()->where('account_id', $account->id)->get()->each->deleteQuietly();
            $account->delete();
        }

        User::query()->where('email', self::AGENT_EMAIL)->first()?->delete();

        return $accounts->count();
    }

    /** @return array{0: User, 1: Account} */
    private function buildAccount(CarbonInterface $anchor): array
    {
        Carbon::setTestNow($anchor->copy()->subDays(self::ACCOUNT_AGE_DAYS));

        return DB::transaction(function () {
            [$agent, $account] = (new AccountBuilder(
                accountName: self::ACCOUNT_NAME,
                email: self::AGENT_EMAIL,
                userFullName: self::AGENT_NAME,
                userPassword: self::AGENT_PASSWORD,
                confirmed: true,
                locale: self::LOCALE,
            ))->perform();

            $account->custom_attributes = [...($account->custom_attributes ?? []), self::MARKER_KEY => true];
            $account->finishOnboarding();

            return [$agent, $account];
        });
    }

    /** @return array<string, Inbox> */
    private function buildInboxes(Account $account): array
    {
        $zalo = Zalo::query()->create([
            'account_id' => $account->id,
            'zalo_uid' => $this->platformId(),
            'display_name' => self::ACCOUNT_NAME,
            'state' => Zalo::STATE_CONNECTED,
            'last_connected_at' => now(),
        ]);

        $website = WebWidget::query()->create([
            'account_id' => $account->id,
            'website_url' => self::WEBSITE_URL,
        ]);

        return [
            'zalo' => $this->createInbox($account, $zalo, self::INBOX_NAMES['zalo']),
            'website' => $this->createInbox($account, $website, self::INBOX_NAMES['website']),
        ];
    }

    /**
     * Tắt tự phân công để hai hội thoại "Chưa gán" của kịch bản giữ nguyên, và tắt
     * xin email để widget không chèn tin mẫu vào giữa hội thoại.
     */
    private function createInbox(Account $account, Model $channel, string $name): Inbox
    {
        return $account->inboxes()->create([
            'name' => $name,
            'channel_id' => $channel->getKey(),
            'channel_type' => $channel->getMorphClass(),
            'enable_auto_assignment' => false,
            'enable_email_collect' => false,
        ]);
    }

    /**
     * Tin trên Zalo mang mã tin của nền tảng (`source_id`) như tin thật đã đi qua
     * bridge; nhờ vậy SendReplyJob coi tin trả lời là đã gửi và không đẩy ra bridge.
     *
     * @param  array{contact: string, phone?: string, inbox: string, assigned: bool, messages: list<array{0: int, 1: string, 2: string}>}  $scene
     */
    private function buildConversation(array $scene, Inbox $inbox, User $agent, CarbonInterface $anchor): Conversation
    {
        $viaZalo = $inbox->channel instanceof Zalo;
        $threadId = $viaZalo ? $this->platformId() : null;

        Carbon::setTestNow($anchor->copy()->subMinutes($scene['messages'][0][0]));

        $contactInbox = (new ContactInboxWithContactBuilder(
            inbox: $inbox,
            contactAttributes: [
                'name' => $scene['contact'],
                'phone_number' => $scene['phone'] ?? null,
                'additional_attributes' => $viaZalo
                    ? ['social_zalo_user_id' => $threadId, 'social_zalo_user_name' => $scene['contact']]
                    : [],
            ],
            sourceId: $threadId,
        ))->perform();

        $conversation = (new ConversationBuilder([
            'assignee_id' => $scene['assigned'] ? $agent->id : null,
            'additional_attributes' => $viaZalo ? ['thread_id' => $threadId, 'thread_type' => 0] : [],
        ], $contactInbox))->perform();

        foreach ($scene['messages'] as [$minutesAgo, $messageType, $content]) {
            Carbon::setTestNow($anchor->copy()->subMinutes($minutesAgo));

            (new MessageBuilder(
                user: $agent,
                conversation: $conversation,
                params: [
                    'content' => $content,
                    'message_type' => $messageType,
                    'source_id' => $viaZalo ? $this->platformId() : null,
                ],
                incomingAllowed: true,
            ))->perform();
        }

        return $conversation;
    }

    /**
     * Agent đã lướt qua chuông thông báo nhưng chưa mở hội thoại nào: tin khách
     * vẫn chưa đọc, còn "Hộp thư của tôi" không treo số đếm.
     */
    private function markNotificationsRead(Account $account, User $agent): void
    {
        $account->notifications()
            ->where('user_id', $agent->id)
            ->unread()
            ->get()
            ->each(fn (Notification $notification) => $notification->update(['read_at' => now()]));
    }

    /** Mã số dạng Zalo (uid/msgId) — hư cấu, chỉ cần duy nhất trong hộp thư demo. */
    private function platformId(): string
    {
        return '9'.Str::padLeft((string) random_int(0, 10 ** 17), 18, '0');
    }

    /** @param  list<Conversation>  $conversations */
    private function printSummary(Account $account, array $conversations, int $removed): void
    {
        if ($removed > 0) {
            $this->components->info("Đã xoá {$removed} account demo cũ.");
        }

        $this->components->info("Đã dựng account demo #{$account->id} \"{$account->name}\".");
        $this->components->twoColumnDetail('Đăng nhập', self::AGENT_EMAIL);
        $this->components->twoColumnDetail('Mật khẩu', self::AGENT_PASSWORD);

        foreach ($conversations as $conversation) {
            $this->components->twoColumnDetail(
                sprintf('#%d %s', $conversation->display_id, $conversation->contact->name),
                "/app/accounts/{$account->id}/conversations/{$conversation->display_id}",
            );
        }
    }
}
