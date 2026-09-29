<?php

namespace Tests\Contracts\Channels;

use App\Models\Channel\Email;
use App\Models\Channel\TwilioSms;
use App\Models\Channel\Whatsapp;
use Illuminate\Database\Eloquent\Relations\Relation;

/**
 * Danh mục kênh cho mọi test hỏi "có những kênh nào": sổ đăng ký DUY NHẤT là morph
 * map (AppServiceProvider), nên thêm kênh mới là mọi test dựa vào đây tự thấy.
 */
final class ChannelCatalog
{
    /** @return array<string, class-string> morph type => model kênh */
    public static function morphMap(): array
    {
        return collect(Relation::morphMap())
            ->filter(fn (string $class, string $type) => str_starts_with($type, 'Channel::'))
            ->all();
    }

    /**
     * Kênh có nhiều biến thể thì mỗi biến thể là một dòng riêng, vì năng lực được
     * quyết lúc đọc model.
     *
     * @return array<string, object>
     */
    public static function variants(): array
    {
        $variants = [];

        foreach (self::morphMap() as $type => $class) {
            $variants[$type] = new $class;
        }

        $variants['Channel::Email (provider=google)'] = new Email(['provider' => 'google']);
        $variants['Channel::TwilioSms (medium=whatsapp)'] = new TwilioSms(['medium' => 'whatsapp']);
        $variants['Channel::Whatsapp (provider=whatsapp_cloud)'] = new Whatsapp(['provider' => 'whatsapp_cloud']);

        ksort($variants);

        return $variants;
    }
}
