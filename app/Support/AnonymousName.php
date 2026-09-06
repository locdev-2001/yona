<?php

namespace App\Support;

use App\Models\Account;
use Illuminate\Support\Facades\Lang;

/**
 * Tên hiển thị cho khách chưa khai tên: "Gấu mèo ẩn danh" / "Anonymous Raccoon".
 *
 * Thay tên máy kiểu haikunator ("odd-wave-872") — người trực nhìn danh sách hội thoại
 * là đọc được ngay, và chữ cái đầu dùng làm avatar cũng có nghĩa.
 *
 * Nguồn chữ duy nhất là lang/{locale}/contacts.php khoá `anonymous`; ngôn ngữ chọn theo
 * `Account::$locale` để mọi kênh (widget, Telegram, Zalo, email…) ra cùng một kiểu tên.
 * Tên sinh ra được lưu thẳng vào `contacts.name`, nên chỉ sinh một lần cho mỗi contact.
 */
class AnonymousName
{
    /**
     * Số vòng thử tối đa. Vòng 1 dùng tên trần ("Cú ẩn danh"), vòng n > 1 thêm hậu tố n
     * ("Cú ẩn danh 2") khi mọi tên của vòng trước đã có người dùng trong account.
     */
    private const MAX_ROUNDS = 200;

    public function __construct(private readonly Account $account) {}

    public static function forAccount(Account $account): string
    {
        return (new self($account))->generate();
    }

    public function generate(): string
    {
        $animals = $this->animals();

        for ($round = 1; $round <= self::MAX_ROUNDS; $round++) {
            $unused = $this->unusedAmong($this->candidates($animals, $round));

            if ($unused !== []) {
                return $unused[random_int(0, count($unused) - 1)];
            }
        }

        // Van an toàn: chỉ chạm tới khi account đã dùng hết MAX_ROUNDS × số con vật tên.
        return $this->format(
            $animals[random_int(0, count($animals) - 1)],
            random_int(self::MAX_ROUNDS + 1, self::MAX_ROUNDS + 9999),
        );
    }

    /**
     * @param  list<string>  $animals
     * @return list<string>
     */
    private function candidates(array $animals, int $round): array
    {
        return array_map(fn (string $animal) => $this->format($animal, $round), $animals);
    }

    /**
     * @param  list<string>  $candidates
     * @return list<string>
     */
    private function unusedAmong(array $candidates): array
    {
        $taken = $this->account->contacts()->whereIn('name', $candidates)->pluck('name')->all();

        return array_values(array_diff($candidates, $taken));
    }

    private function format(string $animal, int $round): string
    {
        return $round === 1
            ? __('contacts.anonymous.name', ['animal' => $animal], $this->locale())
            : __('contacts.anonymous.name_numbered', ['animal' => $animal, 'number' => $round], $this->locale());
    }

    /** @return list<string> */
    private function animals(): array
    {
        $animals = $this->animalsFor($this->locale());

        return $animals !== [] ? $animals : $this->animalsFor(config('app.fallback_locale'));
    }

    /** @return list<string> */
    private function animalsFor(string $locale): array
    {
        $animals = Lang::get('contacts.anonymous.animals', [], $locale);

        return is_array($animals) ? array_values(array_filter($animals, 'is_string')) : [];
    }

    private function locale(): string
    {
        return filled($this->account->locale) ? $this->account->locale : config('app.fallback_locale');
    }
}
