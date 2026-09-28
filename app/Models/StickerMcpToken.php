<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

// Token cho AI gọi MCP/REST kho sticker. Token thô chỉ trả về đúng một lần lúc
// tạo; bảng giữ sha256. Được dùng hay không do StickerLibraryAccess quyết lại
// mỗi lần gọi, không chỉ lúc tạo.
class StickerMcpToken extends Model
{
    public const SCOPE_ACCOUNT = 'account';

    public const SCOPE_PLATFORM = 'platform';

    public const SCOPES = [self::SCOPE_ACCOUNT, self::SCOPE_PLATFORM];

    public const MAX_NAME_LENGTH = 100;

    private const PLAIN_TEXT_PREFIX = 'yst_';

    private const PLAIN_TEXT_RANDOM_LENGTH = 48;

    private const HASH_ALGORITHM = 'sha256';

    protected $fillable = [
        'account_id',
        'user_id',
        'name',
        'scope',
        'token_hash',
        'last_used_at',
    ];

    protected $hidden = ['token_hash'];

    protected function casts(): array
    {
        return [
            'last_used_at' => 'datetime',
        ];
    }

    /**
     * @return array{token: self, plainTextToken: string}
     */
    public static function issue(Account $account, User $creator, string $name, string $scope): array
    {
        $plainTextToken = self::PLAIN_TEXT_PREFIX.Str::random(self::PLAIN_TEXT_RANDOM_LENGTH);

        $token = self::query()->create([
            'account_id' => $account->id,
            'user_id' => $creator->id,
            'name' => $name,
            'scope' => $scope,
            'token_hash' => self::hash($plainTextToken),
        ]);

        return ['token' => $token, 'plainTextToken' => $plainTextToken];
    }

    public static function findByPlainTextToken(string $plainTextToken): ?self
    {
        if ($plainTextToken === '') {
            return null;
        }

        return self::query()->where('token_hash', self::hash($plainTextToken))->first();
    }

    public function isPlatformScope(): bool
    {
        return $this->scope === self::SCOPE_PLATFORM;
    }

    /** @return BelongsTo<Account, $this> */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    private static function hash(string $plainTextToken): string
    {
        return hash(self::HASH_ALGORITHM, $plainTextToken);
    }
}
