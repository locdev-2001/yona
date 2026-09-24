<?php

use App\Channels\TextFormat;
use App\Services\Email\MarkdownRenderer;
use App\Support\Messages\OutgoingText;

// Bộ soạn lưu markdown; kênh chữ trơn không được thấy cú pháp nào của markdown.

it('chuyển markdown của bộ soạn sang chữ trơn', function (string $markdown, string $plain) {
    expect(OutgoingText::render($markdown, TextFormat::Plain))->toBe($plain);
})->with([
    'autolink bỏ dấu ngoặc nhọn' => ['Xem <https://yona.vn/bang-gia> nhé', 'Xem https://yona.vn/bang-gia nhé'],
    'link có chữ thành chữ + URL' => ['Xem [bảng giá](https://yona.vn/bang-gia) nhé', 'Xem bảng giá https://yona.vn/bang-gia nhé'],
    'link có chữ trùng URL chỉ còn URL' => ['[https://yona.vn/bang-gia](https://yona.vn/bang-gia)', 'https://yona.vn/bang-gia'],
    'chữ là URL bỏ giao thức vẫn coi là trùng' => ['[yona.vn](https://yona.vn)', 'yona.vn'],
    'email autolink' => ['Gửi <hotro@yona.vn>', 'Gửi hotro@yona.vn'],
    'nhắc tên thành @Tên' => ['Chào [@Lan Anh](mention://user/3/Lan%20Anh) nhé', 'Chào @Lan Anh nhé'],
    'bỏ dấu nhấn' => ['**đậm** _nghiêng_ *nghiêng* ~~gạch~~ `mã`', 'đậm nghiêng nghiêng gạch mã'],
    'giữ xuống dòng và dòng trống' => ["dòng 1\ndòng 2\n\n\ndòng 5", "dòng 1\ndòng 2\n\n\ndòng 5"],
    'URL có query giữ nguyên' => ['[mua](https://shop.vn/sp?id=12&ref=zalo#top)', 'mua https://shop.vn/sp?id=12&ref=zalo#top'],
    'URL có ngoặc giữ nguyên' => ['[wiki](https://vi.wikipedia.org/wiki/Ph%E1%BB%9F_(m%C3%B3n_%C4%83n))', 'wiki https://vi.wikipedia.org/wiki/Ph%E1%BB%9F_(m%C3%B3n_%C4%83n)'],
    'URL trần có gạch dưới không thành dấu nhấn' => ['Link https://x.vn/_khuyen_mai_/a_b nhé', 'Link https://x.vn/_khuyen_mai_/a_b nhé'],
    'gạch dưới giữa từ giữ nguyên' => ['ma_don_hang', 'ma_don_hang'],
    'ký tự đã escape trả về chữ gốc' => ['Giá 5\\*3 \\[khuyến mãi\\]', 'Giá 5*3 [khuyến mãi]'],
    'danh sách' => ["- áo\n- quần\n\n1. một\n2. hai", "- áo\n- quần\n\n1. một\n2. hai"],
    'chữ có < > & không bị đụng' => ['a < b > c & d', 'a < b > c & d'],
]);

it('link trong nhiều dòng giữ đúng từng dòng', function () {
    $markdown = "Chào chị,\nbảng giá: <https://yona.vn/bang-gia>\n\nđặt hàng tại [đây](https://yona.vn/dat-hang)";

    expect(OutgoingText::render($markdown, TextFormat::Plain))
        ->toBe("Chào chị,\nbảng giá: https://yona.vn/bang-gia\n\nđặt hàng tại đây https://yona.vn/dat-hang");
});

it('kênh markdown nhận nguyên nội dung', function () {
    $markdown = 'Xem <https://yona.vn> và **đậm**';

    expect(OutgoingText::render($markdown, TextFormat::Markdown))->toBe($markdown);
});

it('kênh HTML đi đúng đường dựng thân thư', function () {
    $markdown = "Xem [bảng giá](https://yona.vn/bang-gia)\ndòng 2";

    expect(OutgoingText::render($markdown, TextFormat::Html))->toBe(MarkdownRenderer::render($markdown, true));
});

it('định dạng WhatsApp đổi dấu nhấn sang cú pháp riêng và bỏ cú pháp link', function () {
    expect(OutgoingText::render('**đậm** _nghiêng_ ~~gạch~~ xem <https://yona.vn> và [giá](https://yona.vn/gia)', TextFormat::WhatsApp))
        ->toBe('*đậm* _nghiêng_ ~gạch~ xem https://yona.vn và giá https://yona.vn/gia');
});

it('định dạng HTML của Telegram escape chữ và dựng thẻ link', function () {
    expect(OutgoingText::render('a < b & **đậm** <https://yona.vn/?a=1&b=2> [giá](https://yona.vn/gia)', TextFormat::TelegramHtml))
        ->toBe('a &lt; b &amp; <b>đậm</b> <a href="https://yona.vn/?a=1&amp;b=2">https://yona.vn/?a=1&amp;b=2</a> <a href="https://yona.vn/gia">giá</a>');
});

it('nội dung rỗng giữ nguyên', function (?string $content) {
    expect(OutgoingText::render($content, TextFormat::Plain))->toBe($content);
})->with([null, '', '   ']);
