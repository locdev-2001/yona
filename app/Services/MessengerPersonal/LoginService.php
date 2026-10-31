<?php

namespace App\Services\MessengerPersonal;

use App\Models\Channel\MessengerPersonal;
use App\Services\ProductEvents\ProductEventHooks;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Đăng nhập nhiều bước vào Facebook qua sidecar: mở lượt → gửi từng bước (email/SĐT +
 * mật khẩu, mã 2FA, duyệt trên thiết bị khác…) → sidecar báo xong kèm danh tính tài
 * khoản. Bước kế do Meta quyết định nên giao diện vẽ theo `step` sidecar trả về.
 *
 * Mỗi form đăng nhập giữ `login_id` của lượt nó mở và gửi kèm mọi lần nộp: form cũ (tab
 * khác, panel mở từ trước) không nộp nhầm vào lượt của form khác.
 *
 * Mật khẩu chỉ đi xuyên qua (BridgeClient → sidecar): không lưu, không ghi log.
 */
class LoginService
{
    public const ERROR_BRIDGE_UNREACHABLE = 'bridge_unreachable';

    public const ERROR_BRIDGE_REJECTED = 'bridge_rejected';

    public const ERROR_NO_LOGIN = 'login_missing';

    public const ERROR_ACCOUNT_MISMATCH = 'account_mismatch';

    public const ERROR_ACCOUNT_IN_USE = 'account_in_use';

    /** Mã đăng nhập của hợp đồng được giữ nguyên để giao diện dịch đúng câu. */
    private const LOGIN_ERROR_CODES = [
        'invalid_credentials',
        'two_factor_failed',
        'checkpoint',
        'login_expired',
        'rate_limited',
        'session_cap_reached',
        'bad_request',
    ];

    /** Tệp log riêng, ghi cả mức info dù production chỉ ghi cảnh báo vào log chung. */
    private const LOG_CHANNEL = 'messenger_personal';

    public function __construct(
        private readonly BridgeClient $bridge,
        private readonly HealthMonitor $monitor,
        private readonly ProfileSync $profiles,
    ) {}

    /** @return array<string, mixed> */
    public function start(MessengerPersonal $channel): array
    {
        $this->cancelPendingLogin($channel);

        $loginToken = (string) Str::uuid();
        $response = $this->bridge->startLogin($channel, $loginToken);
        $failure = $this->failureOf($response);

        if ($failure !== null) {
            return $failure;
        }

        $channel->update(['login_token' => $loginToken, 'last_login_at' => now()]);

        return [...$this->stepResult($channel, $response), 'login_id' => $this->loginIdOf($loginToken)];
    }

    /**
     * @param  array<string, string>  $input
     * @return array<string, mixed>
     */
    public function submit(MessengerPersonal $channel, ?string $loginId, array $input): array
    {
        if (! $this->isCurrentLogin($channel, $loginId)) {
            return [...$this->error(409, self::ERROR_NO_LOGIN), 'login_ended' => true];
        }

        $response = $this->bridge->submitLogin((string) $channel->login_token, $input);
        $failure = $this->failureOf($response);

        if ($failure !== null) {
            $loginEnded = $response?->json('login_ended') === true;

            Log::channel(self::LOG_CHANNEL)->warning('messenger_personal.login.failed', [
                'connection_id' => $channel->connectionId(),
                'error_code' => $failure['error_code'],
                'login_ended' => $loginEnded,
                'bridge_message' => $response?->json('message'),
            ]);

            if ($loginEnded) {
                $channel->update(['login_token' => null]);
            }

            return [...$failure, 'login_ended' => $loginEnded];
        }

        if ($response->json('done') === true) {
            Log::channel(self::LOG_CHANNEL)->info('messenger_personal.login.done', ['connection_id' => $channel->connectionId()]);

            return $this->finish($channel, (array) $response->json('account'));
        }

        return $this->stepResult($channel, $response);
    }

    /**
     * Ghi lại hình dạng bước Meta đòi (không có giá trị người dùng nhập) để lần đăng nhập
     * kẹt ở nhánh lạ đọc được từ log production.
     *
     * @return array<string, mixed>
     */
    private function stepResult(MessengerPersonal $channel, Response $response): array
    {
        $step = (array) $response->json('step');
        $fields = is_array($step['fields'] ?? null) ? $step['fields'] : [];

        Log::channel(self::LOG_CHANNEL)->info('messenger_personal.login.step', [
            'waiting' => $response->json('waiting') === true,
            'connection_id' => $channel->connectionId(),
            'type' => $step['type'] ?? null,
            'step_id' => $step['step_id'] ?? null,
            'instructions' => $step['instructions'] ?? null,
            'fields' => array_map(static fn ($field) => [
                'id' => $field['id'] ?? null,
                'type' => $field['type'] ?? null,
                'options' => $field['options'] ?? [],
            ], $fields),
            'attachments' => count(is_array($step['attachments'] ?? null) ? $step['attachments'] : []),
        ]);

        return ['ok' => true, 'step' => $step, 'waiting' => $response->json('waiting') === true];
    }

    /**
     * Form cũ huỷ thì bỏ qua: lượt hiện tại thuộc form khác.
     *
     * @return array<string, mixed>
     */
    public function cancel(MessengerPersonal $channel, ?string $loginId): array
    {
        if ($this->isCurrentLogin($channel, $loginId)) {
            $this->cancelPendingLogin($channel);
        }

        return ['ok' => true];
    }

    /**
     * Ngắt chủ động: đăng xuất slot rồi hạ trạng thái. Giữ `facebook_user_id`/tên để màn
     * cấu hình còn nói được hộp thư từng gắn tài khoản nào; lần đăng nhập sau được phép
     * gắn tài khoản khác.
     *
     * @return array<string, mixed>
     */
    public function disconnect(MessengerPersonal $channel): array
    {
        $this->cancelPendingLogin($channel);
        $response = $this->bridge->logout($channel);
        $channel->markState(MessengerPersonal::STATE_DISCONNECTED, 'user_disconnected');

        return [
            'ok' => true,
            'state' => $channel->state,
            'bridge_reachable' => $response !== null && $response->successful(),
        ];
    }

    /**
     * Sidecar đã lưu phiên vào slot và đang nghe. Trùng tài khoản thì phải đăng xuất slot
     * ngay, nếu không phiên mới đá phiên của hộp thư kia ra.
     *
     * @param  array<string, mixed>  $account
     * @return array<string, mixed>
     */
    private function finish(MessengerPersonal $channel, array $account): array
    {
        $facebookUserId = filled($account['facebook_user_id'] ?? null) ? (string) $account['facebook_user_id'] : null;
        $conflict = $this->identityConflict($channel, $facebookUserId);

        if ($conflict !== null) {
            $this->bridge->logout($channel);
            $channel->update(['login_token' => null]);

            return $conflict;
        }

        $channel->update([
            'facebook_user_id' => $facebookUserId ?? $channel->facebook_user_id,
            'login_token' => null,
        ]);

        $channel->markState(MessengerPersonal::STATE_CONNECTED);
        $this->monitor->reset($channel->connectionId());
        $this->profiles->apply($channel, $account);

        if ($channel->inbox !== null) {
            app(ProductEventHooks::class)->channelConnected($channel->inbox, 'credentials');
        }

        return [
            'ok' => true,
            'done' => true,
            'account' => [
                'facebook_user_id' => $channel->facebook_user_id,
                'display_name' => $channel->display_name,
                'avatar_url' => is_string($account['avatar_url'] ?? null) ? $account['avatar_url'] : null,
            ],
        ];
    }

    /**
     * Hai kiểu sai tài khoản, câu phải khác nhau: đăng nhập nhầm tài khoản khi đang nối
     * lại chính hộp thư này, và tài khoản đã gắn vào hộp thư khác của cùng account.
     *
     * @return array<string, mixed>|null
     */
    private function identityConflict(MessengerPersonal $channel, ?string $facebookUserId): ?array
    {
        if ($facebookUserId === null) {
            return null;
        }

        $userSwitchedOnPurpose = $channel->state === MessengerPersonal::STATE_DISCONNECTED;

        if (filled($channel->facebook_user_id) && ! $userSwitchedOnPurpose && $facebookUserId !== $channel->facebook_user_id) {
            return [
                ...$this->error(409, self::ERROR_ACCOUNT_MISMATCH, ['{name}' => (string) ($channel->display_name ?: $channel->facebook_user_id)]),
                'bound_display_name' => $channel->display_name,
            ];
        }

        $takenBy = MessengerPersonal::query()
            ->where('account_id', $channel->account_id)
            ->where('facebook_user_id', $facebookUserId)
            ->whereKeyNot($channel->getKey())
            ->with('inbox')
            ->first();

        if ($takenBy === null) {
            return null;
        }

        $inboxName = $takenBy->inbox?->name ?? '#'.$takenBy->getKey();

        return [
            ...$this->error(409, self::ERROR_ACCOUNT_IN_USE, ['{inbox}' => $inboxName]),
            'inbox_name' => $inboxName,
        ];
    }

    private function isCurrentLogin(MessengerPersonal $channel, ?string $loginId): bool
    {
        return filled($channel->login_token)
            && filled($loginId)
            && hash_equals($this->loginIdOf((string) $channel->login_token), $loginId);
    }

    /** Token chỉ dành cho sidecar; trình duyệt nhận dấu băm của nó để chỉ ra lượt của mình. */
    private function loginIdOf(string $loginToken): string
    {
        return hash('sha256', $loginToken);
    }

    private function cancelPendingLogin(MessengerPersonal $channel): void
    {
        if (blank($channel->login_token)) {
            return;
        }

        $this->bridge->cancelLogin((string) $channel->login_token);
        $channel->update(['login_token' => null]);
    }

    /** @return array<string, mixed>|null */
    private function failureOf(?Response $response): ?array
    {
        if ($response === null) {
            return $this->error(503, self::ERROR_BRIDGE_UNREACHABLE);
        }

        if ($response->successful() && $response->json('ok') === true) {
            return null;
        }

        $code = (string) $response->json('code', '');
        $status = $response->status() >= 400 ? $response->status() : 502;

        if (in_array($code, self::LOGIN_ERROR_CODES, true)) {
            return $this->error($status, $code);
        }

        if ($code === 'not_found') {
            return $this->error(409, self::ERROR_NO_LOGIN);
        }

        return $this->error($status, self::ERROR_BRIDGE_REJECTED);
    }

    /**
     * Câu lấy từ lang/{locale}/inbox_mgmt.php (cùng nguồn với giao diện), placeholder
     * kiểu `{name}` nên thay bằng strtr.
     *
     * @param  array<string, string>  $replace
     * @return array{ok: false, status: int, error_code: string, message: string}
     */
    private function error(int $status, string $code, array $replace = []): array
    {
        return [
            'ok' => false,
            'status' => $status,
            'error_code' => $code,
            'message' => strtr((string) __('inbox_mgmt.MESSENGER_PERSONAL.ERRORS.'.strtoupper($code)), $replace),
        ];
    }
}
