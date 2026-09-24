<?php

use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Support\WidgetSession;

// POST /api/v1/widget/messages nhận nhiều tệp trong MỘT tin, content là chú thích.

function attachmentsConversationFor(WidgetSession $session): Conversation
{
    return Conversation::factory()->create([
        'account_id' => $session->account->id,
        'inbox_id' => $session->inbox->id,
        'contact_id' => $session->contactInbox->contact_id,
        'contact_inbox_id' => $session->contactInbox->id,
    ]);
}

/**
 * Phần so sánh được của tin vừa tạo: bỏ khoá sinh ra theo lượt (id, thời điểm,
 * đường lưu tệp).
 *
 * @param  array<string, mixed>  $response
 * @return array<string, mixed>
 */
function comparableSentMessage(Message $message, array $response): array
{
    $volatileKeys = ['id', 'message_id', 'created_at', 'data_url', 'thumb_url', 'file_url', 'download_url'];

    return [
        'row' => $message->only(['content', 'content_type', 'message_type', 'content_attributes', 'status', 'private']),
        'attachments' => $message->attachments->map(fn (Attachment $attachment) => $attachment->only(['file_type', 'file_name', 'content_type', 'byte_size']))->all(),
        'response' => collect($response)
            ->except($volatileKeys)
            ->put('attachments', collect($response['attachments'] ?? [])->map(fn (array $item) => collect($item)->except($volatileKeys)->all())->all())
            ->all(),
    ];
}

beforeEach(function () {
    Storage::fake('public');
    $this->session = WidgetSession::make(contactAttributes: ['email' => null]);
    $this->conversation = attachmentsConversationFor($this->session);
});

it('gửi nhiều tệp một tin kèm chú thích và trả lời trích dẫn', function () {
    $quoted = Message::factory()->create([
        'account_id' => $this->session->account->id,
        'inbox_id' => $this->session->inbox->id,
        'conversation_id' => $this->conversation->id,
        'message_type' => Message::TYPE_OUTGOING,
    ]);

    $response = $this->post($this->session->url('messages'), [
        'message' => [
            'content' => 'ảnh sản phẩm',
            'reply_to' => $quoted->id,
            'attachments' => [
                UploadedFile::fake()->image('mat-truoc.png'),
                UploadedFile::fake()->image('mat-sau.jpg'),
                UploadedFile::fake()->create('bao-gia.pdf', 12, 'application/pdf'),
            ],
        ],
    ], $this->session->headers())->assertOk();

    $message = $this->conversation->messages()->incoming()->reorder('id', 'desc')->first();

    expect($this->conversation->messages()->incoming()->count())->toBe(1)
        ->and($message->content)->toBe('ảnh sản phẩm')
        ->and($message->content_attributes['in_reply_to'])->toBe($quoted->id)
        ->and($message->attachments->pluck('file_type')->all())
        ->toBe([Attachment::FILE_TYPE_IMAGE, Attachment::FILE_TYPE_IMAGE, Attachment::FILE_TYPE_FILE])
        ->and($response->json('attachments'))->toHaveCount(3)
        ->and($response->json('content'))->toBe('ảnh sản phẩm')
        ->and($response->json('content_type'))->toBe('text')
        ->and($response->json('content_attributes.in_reply_to'))->toBe($quoted->id)
        ->and($response->json('status'))->toBe('sent');
});

// Đường cũ của widget gửi một tệp không chú thích; đường mới là mảng tệp kèm chú
// thích. Mảng một tệp với chú thích rỗng phải ra đúng tin như đường cũ.
it('mảng một tệp cho kết quả y hệt đường gửi một tệp cũ', function () {
    $legacyResponse = $this->post($this->session->url('messages'), [
        'message' => [
            'attachments' => UploadedFile::fake()->image('cung-anh.png', 40, 30),
            'referer_url' => 'https://shop.example/san-pham',
            'timestamp' => 'Thu Sep 25 2026 03:00:00 GMT+0700',
        ],
    ], $this->session->headers())->assertOk()->json();
    $legacy = $this->conversation->messages()->incoming()->reorder('id', 'desc')->first();

    $arrayResponse = $this->post($this->session->url('messages'), [
        'message' => [
            'content' => '',
            'reply_to' => '',
            'attachments' => [UploadedFile::fake()->image('cung-anh.png', 40, 30)],
            'referer_url' => 'https://shop.example/san-pham',
            'timestamp' => 'Thu Sep 25 2026 03:00:00 GMT+0700',
        ],
    ], $this->session->headers())->assertOk()->json();
    $viaArray = $this->conversation->messages()->incoming()->reorder('id', 'desc')->first();

    expect($viaArray->id)->not->toBe($legacy->id)
        ->and($legacy->attachments)->toHaveCount(1)
        ->and(comparableSentMessage($viaArray, $arrayResponse))->toBe(comparableSentMessage($legacy, $legacyResponse));
});

it('tệp hỏng trong lô thì không tạo tin và không để lại tệp mồ côi', function () {
    config(['limits.maximum_file_upload_size' => 1]);

    $this->post($this->session->url('messages'), [
        'message' => [
            'content' => 'hai tệp',
            'attachments' => [
                UploadedFile::fake()->image('nho.png'),
                UploadedFile::fake()->create('qua-lon.pdf', 2048, 'application/pdf'),
            ],
        ],
    ], $this->session->headers())->assertStatus(422);

    expect($this->conversation->messages()->incoming()->count())->toBe(0)
        ->and(Storage::disk('public')->allFiles())->toBe([]);
});
