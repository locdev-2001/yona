<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Http\Controllers\Controller;
use App\Jobs\Inboxes\FetchImapEmailsJob;
use App\Models\Account;
use App\Models\Channel\Email;
use App\Services\Email\Push\GooglePubSubTokenVerifier;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Pub/Sub đẩy báo "hộp Gmail có thư mới" ({emailAddress, historyId}); chỉ là tín hiệu để
 * quét IMAP ngay. Luôn trả 204: Pub/Sub thử lại khi non-2xx, mà báo sai hay không khớp
 * hộp nào thì thử lại cũng vô ích. Báo dồn dập trong vài giây gộp thành một lượt quét.
 */
class GmailPushController extends Controller
{
    private const DEBOUNCE_SECONDS = 5;

    public function __invoke(Request $request, GooglePubSubTokenVerifier $verifier): Response
    {
        if (! $verifier->verify((string) $request->bearerToken())) {
            Log::warning('[GMAIL PUSH] Bỏ qua thông báo không qua được xác thực OIDC');

            return response()->noContent();
        }

        $emailAddress = $this->emailAddress($request);

        if ($emailAddress !== null) {
            $this->fetchMailboxesOf($emailAddress);
        }

        return response()->noContent();
    }

    private function emailAddress(Request $request): ?string
    {
        $data = json_decode((string) base64_decode((string) $request->input('message.data'), true), true);
        $emailAddress = is_array($data) ? ($data['emailAddress'] ?? null) : null;

        return is_string($emailAddress) && $emailAddress !== '' ? strtolower($emailAddress) : null;
    }

    private function fetchMailboxesOf(string $emailAddress): void
    {
        $channels = Email::query()
            ->where('provider', 'google')
            ->whereRaw('LOWER(email) = ?', [$emailAddress])
            ->whereHas('account', fn ($query) => $query->where('status', Account::STATUS_ACTIVE))
            ->get();

        foreach ($channels as $channel) {
            if ($channel->inbox !== null && Cache::add('gmail_push_fetch:'.$channel->id, true, self::DEBOUNCE_SECONDS)) {
                FetchImapEmailsJob::dispatch($channel);
            }
        }
    }
}
