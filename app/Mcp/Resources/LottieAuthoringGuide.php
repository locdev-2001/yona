<?php

namespace App\Mcp\Resources;

use App\Services\Stickers\LottieDocumentValidator;
use App\Services\Stickers\StickerLibraryManager;
use App\Services\Stickers\StickerTags;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\MimeType;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Uri;
use Laravel\Mcp\Server\Resource;

// Hướng dẫn AI tự viết Lottie qua được LottieDocumentValidator. Mọi con số thay
// vào lúc đọc từ hằng số của chính cổng kiểm, đổi giới hạn thì tài liệu tự đổi.
#[Name('lottie_authoring_guide')]
#[Uri('yona://stickers/lottie-guide')]
#[MimeType('text/markdown')]
#[Description('Cách viết Lottie hợp lệ cho kho sticker Yona: giới hạn kích thước, thời lượng, số lớp/hình, những gì bị cấm, kèm một mẫu tối thiểu qua được kiểm tra.')]
class LottieAuthoringGuide extends Resource
{
    public const MINIMAL_EXAMPLE = '{"v":"5.7.4","fr":30,"ip":0,"op":60,"w":512,"h":512,"layers":[{"ty":4,"ind":1,"ip":0,"op":60,"st":0,'
        .'"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":1,"k":[{"t":0,"s":[256,160,0],"i":{"x":[0.5],"y":[1]},"o":{"x":[0.5],"y":[0]}},'
        .'{"t":30,"s":[256,352,0],"i":{"x":[0.5],"y":[1]},"o":{"x":[0.5],"y":[0]}},{"t":60,"s":[256,160,0]}]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},'
        .'"shapes":[{"ty":"gr","it":[{"ty":"el","p":{"a":0,"k":[0,0]},"s":{"a":0,"k":[160,160]}},{"ty":"fl","c":{"a":0,"k":[1,0.6,0.1,1]},"o":{"a":0,"k":100}},'
        .'{"ty":"tr","p":{"a":0,"k":[0,0]},"a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"r":{"a":0,"k":0},"o":{"a":0,"k":100}}]}]}]}';

    private const GUIDE = <<<'MARKDOWN'
        # Viết Lottie hợp lệ cho kho sticker Yona

        Sticker là hoạt ảnh Lottie (bodymovin) dạng vector. Gửi qua `upload_sticker`
        bằng `lottie_json` (chuỗi JSON) hoặc `tgs_base64` (JSON nén gzip, mã hoá base64).

        ## Giới hạn
        - Tệp gửi lên tối đa :max_upload_kb KB; JSON sau giải nén tối đa :max_decompressed_kb KB.
        - Khoá gốc bắt buộc: `v` (chuỗi, ví dụ "5.7.4"), `fr`, `ip`, `op`, `w`, `h` (số), `layers` (mảng). Cần `fr` > 0, `op` > `ip`, `w`, `h` > 0.
        - Khung `w`, `h` tối đa :max_canvas px (nên dùng hình vuông :max_canvas×:max_canvas).
        - `fr` tối đa :max_frame_rate; thời lượng (`op` - `ip`) / `fr` tối đa :max_seconds giây.
        - Tổng số lớp (precomp được trải ra, dùng ở mười chỗ tính mười lần) tối đa :max_layers.
        - Tổng số hình tối đa :max_shapes; mỗi đỉnh của polystar (`sr`) tính là một hình, một polystar tối đa :max_polystar_points đỉnh.
        - Repeater (`rp`) nhân tối đa :max_repeater_copies bản (tính dồn qua các nhóm lồng nhau).
        - Precomp lồng tối đa :max_precomp_depth tầng, mã asset không trùng, không tham chiếu vòng.

        ## Bị cấm
        - Lớp chữ (`ty` 5), bảng `fonts` hay `chars`: chuyển chữ thành hình vector.
        - Expression (chuỗi mã ở khoá `x` của thuộc tính): bake thành keyframe.
        - Ảnh bitmap (asset có `p` hoặc `u`, nhúng `data:` hay link ngoài): chỉ dùng hình vector (lớp hình `ty` 4).
        - Số vô hạn (ví dụ 1e400); `ty` của lớp phải là số nguyên.

        ## Sau khi tải
        - Sticker mới ở `processing`; máy chủ dựng ảnh xem trước rồi chuyển `ready`, hỏng thì `failed` kèm `failure_message`. Xem bằng `get_sticker_pack`.
        - Mỗi bộ tối đa :max_stickers_per_pack sticker. Tải lại đúng nội dung cũ vào cùng bộ trả về sticker cũ.
        - Nhãn tối đa :max_label ký tự; tối đa :max_keywords từ khoá, mỗi từ tối đa :max_keyword_length ký tự. Từ khoá là chữ người dùng gõ để hiện gợi ý sticker, so khớp không dấu.
        - Bộ chỉ hiện cho mọi account sau `set_sticker_pack_published` với `published: true`.
        - Kênh chat ngoài không phát hoạt ảnh nhận ảnh tĩnh vuông :outbound_image_size px dựng từ sticker: nét dày, ít chi tiết nhỏ, tương phản rõ, biểu cảm nằm ở mắt và miệng to để còn nhận ra ở cỡ này.

        ## Mẫu tối thiểu (quả bóng nảy, qua được kiểm tra)
        ```json
        :example
        ```
        MARKDOWN;

    public function handle(Request $request): Response
    {
        return Response::text(self::markdown());
    }

    public static function markdown(): string
    {
        $replacements = [
            ...LottieDocumentValidator::limitPlaceholders(),
            'max_stickers_per_pack' => StickerLibraryManager::MAX_STICKERS_PER_PACK,
            'max_label' => StickerTags::MAX_LABEL_LENGTH,
            'max_keywords' => StickerTags::MAX_KEYWORDS,
            'max_keyword_length' => StickerTags::MAX_KEYWORD_LENGTH,
            'outbound_image_size' => (int) config('yona.stickers.outbound_image_size'),
            'example' => self::MINIMAL_EXAMPLE,
        ];
        // Khoá dài thay trước để `:max_keywords` không bị `:max_keyword...` ăn mất phần đầu.
        uksort($replacements, fn (string $left, string $right) => strlen($right) <=> strlen($left));

        return strtr(self::GUIDE, array_combine(
            array_map(fn (string $key) => ':'.$key, array_keys($replacements)),
            array_map('strval', array_values($replacements)),
        ));
    }
}
