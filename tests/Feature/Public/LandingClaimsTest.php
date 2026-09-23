<?php

use Illuminate\Support\Arr;

// Trang công khai là lời hứa với người chưa từng dùng Yona. Mỗi mẫu dưới đây là
// một câu từng nằm trên trang trong khi sản phẩm không làm được; câu đó quay lại
// là hứa sai lần nữa. Đọc đúng thứ trình duyệt nhận (`window.landingConfig`), vì
// đó là chỗ duy nhất khách thấy, kể cả thẻ meta mà công cụ tìm kiếm lấy làm mô tả.
const LOI_HUA_SAI = [
    '/pipeline/i' => 'không có bảng pipeline hay giai đoạn bán hàng nào',
    '/\blead\b/i' => '"Lead" chỉ là giá trị contact_type nội bộ, giao diện không có mục Lead nào',
    '/\bdeals?\b/i' => 'không có thực thể Deal',
    '/\bstages?\b|kéo thả|\bdrag\b/i' => 'không có giai đoạn nào để kéo thả',
    '/tạo việc|\btodos?\b|\btasks?\b/i' => 'automation không có hành động tạo việc',
    '/messenger|tiktok|instagram|facebook/i' => 'kênh chưa mở ở bước tạo hộp thư; tên kênh sắp có nằm trong danh sách kênh của section',
    '/bộ đếm|đếm số hội thoại|\bcounter\b|count conversations/i' => 'không còn bộ đếm hội thoại nào',
    '/nhận cả hai|takes both/i' => 'Yona không có kênh Zalo OA',
    '/22h|10pm|tin quảng cáo|promotional/i' => 'cửa sổ giờ và trần tin chủ động đã gỡ khỏi đường gửi',
    '/chọn hội thoại nào|choose which conversations/i' => 'không có bộ lọc hội thoại Zalo trước khi vào hộp thư',
];

/** @return array<string, string> khoá chấm → chuỗi hiển thị */
function chuoiTrangCongKhai(string $duong, string $locale): array
{
    $html = test()->get($duong.'?locale='.$locale)->assertOk()->getContent();

    preg_match('#window\.landingConfig = (.*?);\s*</script>#s', $html, $khop);

    $cauHinh = json_decode($khop[1] ?? 'null', true, flags: JSON_THROW_ON_ERROR);

    $chuoi = array_filter(
        Arr::dot(['meta' => $cauHinh['meta'] ?? null, 'strings' => $cauHinh['strings'] ?? null]),
        fn (mixed $giaTri) => is_string($giaTri),
    );

    // Không đọc được cấu hình thì không có chuỗi nào để quét, và test sẽ xanh
    // mà không kiểm gì cả.
    expect($chuoi)->toHaveKeys(['meta.description', 'strings.hero.subtitle']);

    return $chuoi;
}

it('không hứa tính năng sản phẩm không có', function (string $duong, string $locale) {
    $viPham = [];

    foreach (chuoiTrangCongKhai($duong, $locale) as $khoa => $chuoi) {
        foreach (LOI_HUA_SAI as $mau => $lyDo) {
            if (preg_match($mau.'u', $chuoi) === 1) {
                $viPham[] = "{$khoa}: \"{$chuoi}\" ({$lyDo})";
            }
        }
    }

    expect($viPham)->toBe([]);
})
    ->with(['/', '/zalo-ca-nhan', '/dat-lich-demo'])
    ->with(['vi', 'en']);

it('giữ lời hứa báo trước khi có gói thu phí', function (string $locale, string $camKet) {
    expect(chuoiTrangCongKhai('/', $locale)['strings.pricing.points.notice'])->toContain($camKet);
})->with([
    ['vi', 'báo trước'],
    ['en', 'tell you first'],
]);

// Một khoá chỉ có ở một ngôn ngữ thì trang ngôn ngữ kia hiện ô trống ngay giữa
// section, và không test nào khác bắt được vì React chỉ in `undefined` thành rỗng.
it('có đủ cùng một bộ khoá ở tiếng Việt và tiếng Anh', function () {
    $khoa = fn (string $locale) => array_keys(Arr::dot(trans('landing', [], $locale)));

    expect($khoa('en'))->toEqualCanonicalizing($khoa('vi'));
});
