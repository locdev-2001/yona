<?php

use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceSequence;
use App\Modules\Chat\Delivery\ComposeMessageInput;
use App\Modules\Chat\Delivery\ComposeMessageService;
use App\Modules\Chat\Delivery\Exception\ComposeMessageException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

/**
 * Soạn tin gọi THẲNG service, không qua HTTP.
 *
 * Đó chính là điều cần chứng minh: nghiệp vụ đã rời khỏi controller, nên mở cùng
 * tính năng này ra `api.php` chỉ cần thêm một controller mỏng (§0.4).
 */
function composeSetup(): array
{
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $conversation = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'widget',
        'sender_uid' => 'khach_'.Str::random(6),
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    return [$workspace, $conversation];
}

function composeAttachment(Conversation $conversation, string $mime = 'image/png', string $name = 'gui-khach.png'): Attachment
{
    // Phần lớn cột của attachments là server-controlled (không nằm trong
    // `$fillable`), nên dựng bằng gán thẳng thay vì `create()`.
    $attachment = new Attachment;
    $attachment->workspace_id = $conversation->workspace_id;
    $attachment->attachable_type = 'conversation';
    $attachment->attachable_id = $conversation->id;
    $attachment->attachment_key = (string) Str::uuid();
    $attachment->path = 'chat/'.Str::random(8).'.png';
    $attachment->original_name = $name;
    $attachment->mime = $mime;
    $attachment->size = 1024;
    $attachment->save();

    return $attachment;
}

function composeIt(Conversation $conversation, ComposeMessageInput $input)
{
    return app(ComposeMessageService::class)->compose($conversation, $input);
}

it('soạn tin chữ — cắt khoảng trắng thừa, không đẻ thêm phần nào', function () {
    [, $conversation] = composeSetup();

    $outbound = composeIt($conversation, new ComposeMessageInput(text: '  shop trả lời ạ  '));

    expect($outbound->text)->toBe('shop trả lời ạ')
        ->and($outbound->media)->toBeNull()
        ->and($outbound->sticker)->toBeNull()
        ->and($outbound->replyTo)->toBeNull()
        ->and($outbound->isEmpty())->toBeFalse();
});

it('khoảng trắng không phải nội dung', function () {
    [, $conversation] = composeSetup();

    foreach (['   ', null] as $text) {
        expect(fn () => composeIt($conversation, new ComposeMessageInput(text: $text)))
            ->toThrow(ComposeMessageException::class, 'Nội dung không được để trống.');
    }
});

it('soạn tin ảnh kèm chú thích — chú thích đi CHUNG tin, không tách làm hai', function () {
    [, $conversation] = composeSetup();
    $attachment = composeAttachment($conversation);

    $outbound = composeIt($conversation, new ComposeMessageInput(
        text: 'Ảnh sản phẩm đây ạ',
        attachmentId: $attachment->id,
    ));

    expect($outbound->text)->toBe('Ảnh sản phẩm đây ạ')
        ->and($outbound->media['media_kind'])->toBe('image')
        ->and($outbound->media['filename'])->toBe('gui-khach.png')
        ->and($outbound->media['attachment_id'])->toBe($attachment->id);

    // Địa chỉ cho nhà cung cấp tải về phải ký được và mang đúng workspace —
    // thiếu `ws` là bridge tải về mà không có ngữ cảnh tenant.
    expect(URL::hasValidSignature(Request::create($outbound->media['file_url'])))->toBeTrue()
        ->and($outbound->media['file_url'])->toContain('ws='.$conversation->workspace_id)
        ->and($outbound->media['file_url'])->toContain('/raw');

    // Địa chỉ hiển thị KHÔNG được có chữ ký: nó bị ghi thẳng vào messages.media_url
    // và phải còn xem được sau khi mọi chữ ký đã hết hạn.
    expect($outbound->media['display_url'])->not->toContain('signature=');
});

it('tệp của hội thoại khác không soạn được', function () {
    [, $conversation] = composeSetup();
    [, $other] = composeSetup();
    $attachment = composeAttachment($other);

    expect(fn () => composeIt($conversation, new ComposeMessageInput(attachmentId: $attachment->id)))
        ->toThrow(ModelNotFoundException::class);
});

it('soạn sticker — giữ NGUYÊN VĂN mảng của kênh, không đổi khóa', function () {
    [, $conversation] = composeSetup();
    $sticker = ['id' => 12345, 'cate_id' => 66, 'type' => 1, 'url' => 'https://zalo-api.zadn.vn/stk.webp'];

    $outbound = composeIt($conversation, new ComposeMessageInput(sticker: $sticker));

    // Đổi cate_id -> cateId là việc của driver Zalo. Soạn tin mà đụng vào là lõi
    // biết hình dạng payload của một nhà cung cấp.
    expect($outbound->sticker)->toBe($sticker)
        ->and($outbound->text)->toBeNull()
        ->and($outbound->media)->toBeNull()
        ->and($outbound->isEmpty())->toBeFalse();
});

it('soạn trả lời trích dẫn — trả về MODEL tin gốc, không phải id', function () {
    [, $conversation] = composeSetup();
    $original = Message::create([
        'workspace_id' => $conversation->workspace_id,
        'conversation_id' => $conversation->id,
        'direction' => 'in',
        'type' => 'text',
        'body' => 'còn phòng không shop',
        'source_id' => 'src_'.Str::random(6),
    ]);

    $outbound = composeIt($conversation, new ComposeMessageInput(
        text: 'Dạ em trả lời ạ',
        replyToMessageId: $original->id,
    ));

    // Driver kiểm `instanceof Message` để lấy tham chiếu nền tảng của tin gốc.
    expect($outbound->replyTo)->toBeInstanceOf(Message::class)
        ->and($outbound->replyTo->is($original))->toBeTrue()
        ->and($outbound->text)->toBe('Dạ em trả lời ạ');
});

it('trích dẫn phải có chữ, và không đi kèm tệp', function () {
    [, $conversation] = composeSetup();
    $original = Message::create([
        'workspace_id' => $conversation->workspace_id,
        'conversation_id' => $conversation->id,
        'direction' => 'in',
        'type' => 'text',
        'body' => 'còn phòng không shop',
        'source_id' => 'src_'.Str::random(6),
    ]);

    expect(fn () => composeIt($conversation, new ComposeMessageInput(replyToMessageId: $original->id)))
        ->toThrow(ComposeMessageException::class, 'Trả lời trích dẫn cần nội dung text.');

    expect(fn () => composeIt($conversation, new ComposeMessageInput(
        text: 'kèm ảnh nhé',
        replyToMessageId: $original->id,
        attachmentId: composeAttachment($conversation)->id,
    )))->toThrow(ComposeMessageException::class, 'Chưa hỗ trợ trả lời trích dẫn kèm tệp — gửi tách 2 tin.');
});

it('trích dẫn kèm tệp báo lỗi trước cả khi tệp đó vốn không hợp lệ', function () {
    [, $conversation] = composeSetup();
    [, $other] = composeSetup();

    $original = Message::create([
        'workspace_id' => $conversation->workspace_id,
        'conversation_id' => $conversation->id,
        'direction' => 'in',
        'type' => 'text',
        'body' => 'còn phòng không shop',
        'source_id' => 'src_'.Str::random(6),
    ]);

    // Tệp thuộc hội thoại KHÁC. Nếu ai đó viết lại theo lối "tra cứu hết rồi mới
    // kiểm luật" thì chỗ này lặng lẽ đổi 422 thành 404 — khách nhận thông báo
    // "không tìm thấy" thay vì "chưa hỗ trợ". Đây là test duy nhất canh thứ tự đó.
    expect(fn () => composeIt($conversation, new ComposeMessageInput(
        text: 'kèm ảnh nhé',
        replyToMessageId: $original->id,
        attachmentId: composeAttachment($other)->id,
    )))->toThrow(ComposeMessageException::class, 'Chưa hỗ trợ trả lời trích dẫn kèm tệp — gửi tách 2 tin.');
});
