<?php

namespace App\Http\Controllers\App;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Channel\Email;
use App\Models\Inbox;
use App\Services\Channels\ChannelSetupService;
use App\Services\Email\OAuth\EmailOAuthException;
use App\Services\Email\OAuth\EmailOAuthProvider;
use App\Services\Email\OAuth\EmailOAuthProviders;
use App\Services\Email\OAuth\EmailOAuthTokenManager;
use App\Services\Email\OAuth\EmailOAuthTokens;
use App\Services\Email\Push\MailboxPushSubscriptions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Kết nối hộp thư email bằng OAuth (lối `oauth_redirect` của giao kèo kết nối kênh) —
 * tách hẳn khỏi đăng nhập Yona (OAuthController). Bắt đầu trong phạm vi account (chỉ
 * quản trị viên), callback ở URL cố định đã khai với nhà cung cấp; `state` một lần dùng
 * giữ trong session chống CSRF và mang account/hộp thư cần kết nối lại.
 */
class EmailOAuthController extends Controller
{
    private const SESSION_PREFIX = 'email_oauth_state.';

    public function start(Request $request, Account $account, string $provider): RedirectResponse
    {
        $oauthProvider = $this->availableProvider($provider);
        $inboxId = $request->integer('inbox_id') ?: null;

        if ($inboxId !== null) {
            $inbox = $account->inboxes()->whereKey($inboxId)->where('channel_type', 'Channel::Email')->firstOrFail();
            abort_unless($inbox->channel?->provider === $provider, 404);
        } else {
            $this->ensureOpenForNewConnections($provider);
        }

        $state = Str::random(48);
        $request->session()->put(self::SESSION_PREFIX.$state, [
            'account_id' => $account->id,
            'user_id' => $request->user()->id,
            'provider' => $provider,
            'inbox_id' => $inboxId,
        ]);

        return redirect()->away($oauthProvider->authorizationUrl($state, $this->redirectUri($provider)));
    }

    public function callback(Request $request, string $provider): RedirectResponse
    {
        $oauthProvider = $this->availableProvider($provider);
        $context = $request->session()->pull(self::SESSION_PREFIX.$request->string('state'));

        abort_unless(
            is_array($context) && $context['provider'] === $provider && $context['user_id'] === $request->user()->id,
            403,
        );

        if ($context['inbox_id'] === null) {
            $this->ensureOpenForNewConnections($provider);
        }

        $account = Account::query()->findOrFail($context['account_id']);
        abort_unless(
            AccountUser::query()->where('account_id', $account->id)->where('user_id', $request->user()->id)
                ->first()?->isAdministrator() ?? false,
            403,
        );

        if ($request->filled('error') || ! $request->filled('code')) {
            return $this->failed($account, $context, 'denied');
        }

        try {
            $tokens = $oauthProvider->exchangeCode((string) $request->string('code'), $this->redirectUri($provider));
        } catch (EmailOAuthException $exception) {
            Log::warning("[EMAIL OAUTH] {$provider} đổi mã thất bại cho account {$account->id}: {$exception->getMessage()}");

            return $this->failed($account, $context, 'token');
        }

        if ($tokens->email === null || $tokens->refreshToken === null) {
            return $this->failed($account, $context, 'token');
        }

        // Kết nối lại phải đúng hộp thư cũ: đăng nhập nhầm tài khoản khác thì không ghi đè.
        if ($context['inbox_id'] !== null) {
            $current = $account->inboxes()->whereKey($context['inbox_id'])->first()?->channel;

            if (strcasecmp((string) $current?->email, $tokens->email) !== 0) {
                return $this->failed($account, $context, 'mismatch');
            }
        }

        $inbox = DB::transaction(fn () => $this->connectInbox($account, $oauthProvider, $context['inbox_id'], $tokens));
        $isNew = $inbox->wasRecentlyCreated;
        app(MailboxPushSubscriptions::class)->subscribe($inbox->channel);

        if ($isNew) {
            app(ChannelSetupService::class)->register($inbox);

            return redirect("/app/accounts/{$account->id}/settings/inboxes/new/{$inbox->id}/agents");
        }

        return redirect("/app/accounts/{$account->id}/settings/inboxes/{$inbox->id}");
    }

    private function connectInbox(Account $account, EmailOAuthProvider $provider, ?int $inboxId, EmailOAuthTokens $tokens): Inbox
    {
        $channel = $inboxId !== null
            ? $account->inboxes()->whereKey($inboxId)->firstOrFail()->channel
            : Email::query()->where('account_id', $account->id)->where('email', $tokens->email)->first();

        $channel ??= new Email(['account_id' => $account->id, 'email' => $tokens->email]);

        $channel->fill([
            'provider' => $provider->key(),
            'imap_enabled' => true,
            'imap_address' => $provider->imapHost(),
            'imap_port' => 993,
            'imap_enable_ssl' => true,
            'imap_login' => $tokens->email,
            'imap_authentication' => 'oauth',
            'smtp_enabled' => false,
        ]);
        app(EmailOAuthTokenManager::class)->store($channel, $tokens);
        $channel->save();
        $channel->reauthorized();

        $inbox = $channel->inbox;

        if ($inbox === null) {
            $inbox = $account->inboxes()->create([
                'name' => $tokens->email,
                'channel_id' => $channel->id,
                'channel_type' => $channel->getMorphClass(),
            ]);
        }

        return $inbox;
    }

    /** @param  array<string, mixed>  $context */
    private function failed(Account $account, array $context, string $reason): RedirectResponse
    {
        $path = $context['inbox_id']
            ? "settings/inboxes/{$context['inbox_id']}"
            : 'settings/inboxes/new/email';

        return redirect("/app/accounts/{$account->id}/{$path}?oauth_error={$reason}");
    }

    // Nhà cung cấp sắp ra mắt chỉ còn cho kết nối lại hộp thư đã nối, không mở hộp mới.
    private function ensureOpenForNewConnections(string $provider): void
    {
        abort_unless(Email::connection()->option($provider)?->startable() ?? false, 404);
    }

    private function availableProvider(string $provider): EmailOAuthProvider
    {
        $oauthProvider = EmailOAuthProviders::find($provider);

        abort_unless($oauthProvider?->available(), 404);

        return $oauthProvider;
    }

    private function redirectUri(string $provider): string
    {
        // Ghép từ APP_URL (không theo host request): phải khớp từng ký tự với URI đã khai
        // ở Google Cloud / Azure, sau CDN request có thể mang http://.
        return rtrim((string) config('app.url'), '/').route('email_oauth.callback', ['provider' => $provider], false);
    }
}
