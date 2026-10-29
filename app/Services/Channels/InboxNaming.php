<?php

namespace App\Services\Channels;

use App\Channels\NamesInboxAfterAccount;
use App\Models\Inbox;

/**
 * Tên hộp thư của kênh tài khoản cá nhân: để trống thì dùng tên tài khoản, tài khoản đổi
 * tên thì hộp thư đổi theo — trừ khi chủ hộp thư đã tự đặt một tên khác.
 */
class InboxNaming
{
    /** Tên dùng khi chủ hộp thư để trống: tên tài khoản, chưa đăng nhập thì tên nền tảng. */
    public function automaticName(Inbox $inbox): string
    {
        $channel = $inbox->channel;
        $accountName = $channel instanceof NamesInboxAfterAccount ? $channel->accountDisplayName() : null;

        if (filled($accountName)) {
            return (string) $accountName;
        }

        return $channel !== null && method_exists($channel, 'name') ? (string) $channel->name() : '';
    }

    public function followsAccount(Inbox $inbox): bool
    {
        return $inbox->channel instanceof NamesInboxAfterAccount;
    }

    /** Tên chủ hộp thư gửi lên; để trống ở kênh tài khoản cá nhân thì lấy tên tự động. */
    public function submitted(Inbox $inbox, ?string $name): ?string
    {
        if (filled($name) || ! $this->followsAccount($inbox)) {
            return $name;
        }

        return $this->automaticName($inbox);
    }

    /**
     * Gọi sau khi tên tài khoản đổi. Hộp thư còn mang tên tự động cũ (trống, tên nền tảng,
     * hay tên tài khoản trước đó) thì theo tên mới; tên chủ hộp thư tự đặt thì giữ nguyên.
     */
    public function followAccount(Inbox $inbox, ?string $previousAccountName): void
    {
        $channel = $inbox->channel;

        if (! $channel instanceof NamesInboxAfterAccount) {
            return;
        }

        $automaticNames = array_filter([
            '',
            $previousAccountName,
            method_exists($channel, 'name') ? (string) $channel->name() : null,
        ], fn ($name) => $name !== null);

        if (! in_array((string) $inbox->name, $automaticNames, true)) {
            return;
        }

        $name = $this->automaticName($inbox);

        if ($name !== '' && $name !== $inbox->name) {
            $inbox->forceFill(['name' => $name])->save();
        }
    }
}
