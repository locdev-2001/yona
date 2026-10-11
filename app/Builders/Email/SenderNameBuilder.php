<?php

namespace App\Builders\Email;

use App\Models\Account;
use App\Models\User;
use App\Support\EmailAddress;
use Illuminate\Support\Facades\Lang;

// Dựng header `From`/`Reply-To` dạng `Tên <email>` theo ngôn ngữ của người gửi.
class SenderNameBuilder
{
    private const TRANSLATION_KEY = 'conversations.reply.email.header.friendly_name';

    private const SENDER_ONLY_TRANSLATION_KEY = 'conversations.reply.email.header.sender_only_name';

    public function __construct(
        private readonly Account $account,
        private readonly mixed $sender,
        private readonly string $senderEmail,
        private readonly string $senderName,
        private readonly ?string $businessName,
    ) {}

    public function build(): string
    {
        $address = EmailAddress::parse($this->senderEmail);

        if ($address === null) {
            return $this->localizedHeader($this->senderEmail);
        }

        return EmailAddress::format($address, $this->localizedDisplayName($address));
    }

    private function localizedDisplayName(string $address): string
    {
        // Chuỗi dịch đã chứa sẵn `<email>`; bỏ phần đó đi để còn lại tên hiển thị.
        $pattern = '/\s*[<«]\s*(?:reply\+)?'.preg_quote($address, '/').'\s*[>»]\s*/u';

        return trim((string) preg_replace($pattern, '', $this->localizedHeader($address)));
    }

    private function localizedHeader(string $address): string
    {
        return __($this->repeatsSender() ? self::SENDER_ONLY_TRANSLATION_KEY : self::TRANSLATION_KEY, [
            'sender_name' => $this->senderName,
            'business_name' => (string) $this->businessName,
            'from_email' => $address,
        ], $this->senderLocale());
    }

    // "Robert Nguyen từ Robert Nguyen" khi tên doanh nghiệp trùng tên người gửi: chỉ giữ tên người gửi.
    private function repeatsSender(): bool
    {
        return blank($this->businessName)
            || mb_strtolower(trim($this->businessName)) === mb_strtolower(trim($this->senderName));
    }

    private function senderLocale(): string
    {
        $candidates = [
            $this->sender instanceof User ? ($this->sender->ui_settings['locale'] ?? null) : null,
            $this->account->locale,
            config('app.locale'),
        ];

        foreach ($candidates as $locale) {
            if (filled($locale) && Lang::has(self::TRANSLATION_KEY, $locale)) {
                return (string) $locale;
            }
        }

        return (string) config('app.locale');
    }
}
