<?php

namespace App\Support;

/**
 * Đoạn mã nhúng widget chat vào một trang web. Một nguồn cho cả mã khách copy ở
 * trang cài đặt hộp thư website lẫn khung chat của chính Yona trên bề mặt công khai.
 *
 * Giữ nguyên từng dòng và thụt lề: đây là thứ khách dán vào website của họ.
 */
final class WidgetEmbedScript
{
    public static function render(string $baseUrl, string $websiteToken): string
    {
        return implode("\n", [
            '',
            '    <script>',
            '      (function(d,t) {',
            '        var BASE_URL="'.$baseUrl.'";',
            '        var g=d.createElement(t),s=d.getElementsByTagName(t)[0];',
            '        g.src=BASE_URL+"/packs/js/sdk.js";',
            '        g.async = true;',
            '        s.parentNode.insertBefore(g,s);',
            '        g.onload=function(){',
            '          window.chatwootSDK.run({',
            "            websiteToken: '{$websiteToken}',",
            '            baseUrl: BASE_URL',
            '          })',
            '        }',
            '      })(document,"script");',
            '    </script>',
            '    ',
        ]);
    }
}
