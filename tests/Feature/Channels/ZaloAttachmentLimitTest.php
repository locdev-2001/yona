<?php

use App\Channels\CapabilitySet;
use App\Channels\TextFormat;
use App\Models\AccountUser;
use App\Models\Channel\Zalo;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\User;
use App\Support\FileUploadLimit;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

// Trần tệp gửi ra kênh khai ở CapabilitySet; Zalo khai 25 MB trong khi trần tải lên
// chung của Yona là 40 MB — tệp nằm giữa hai mức phải bị chặn NGAY lúc đính kèm.

function zaloLimitFixtures(): array
{
    Storage::fake('public');
    Http::fake();

    $inbox = Inbox::factory()->zalo()->create();
    $conversation = Conversation::factory()->create([
        'account_id' => $inbox->account_id,
        'inbox_id' => $inbox->id,
        'additional_attributes' => ['thread_id' => '9876543210', 'thread_type' => 0],
    ]);
    $agent = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $inbox->account_id,
        'user_id' => $agent->id,
        'role' => AccountUser::ROLE_AGENT,
    ]);
    $inbox->addMembers([$agent->id]);

    return [$inbox, $conversation, $agent];
}

it('CapabilitySet giữ trần tệp qua withTextFormat và merge', function () {
    $set = CapabilitySet::none()->withMaxAttachmentBytes(1000);

    expect(CapabilitySet::none()->maxAttachmentBytes())->toBeNull()
        ->and($set->maxAttachmentBytes())->toBe(1000)
        ->and($set->withTextFormat(TextFormat::Plain)->maxAttachmentBytes())->toBe(1000)
        ->and($set->merge(CapabilitySet::none())->maxAttachmentBytes())->toBe(1000);
});

it('Zalo khai trần tệp đúng hằng số duy nhất và thấp hơn trần tải lên chung', function () {
    $inbox = Inbox::factory()->zalo()->create();

    expect($inbox->capabilities()->maxAttachmentBytes())->toBe(Zalo::MAX_ATTACHMENT_BYTES)
        ->and(Zalo::MAX_ATTACHMENT_BYTES)->toBeLessThan(FileUploadLimit::maxBytes())
        ->and(Inbox::factory()->create()->capabilities()->maxAttachmentBytes())->toBeNull();
});

it('chặn 422 kèm lời nhắn tiếng Việt khi tệp vượt trần Zalo, không tạo tin', function () {
    [$inbox, $conversation, $agent] = zaloLimitFixtures();

    $response = $this->actingAs($agent)
        ->post("/api/v1/accounts/{$inbox->account_id}/conversations/{$conversation->display_id}/messages", [
            'content' => 'video',
            'attachments' => [UploadedFile::fake()->create('clip.mp4', 26 * 1024, 'video/mp4')],
        ], ['Accept' => 'application/json'])
        ->assertStatus(422);

    expect($response->json('error'))->toContain('clip.mp4')->toContain('25 MB')
        ->and($conversation->messages()->count())->toBe(0)
        ->and(Storage::disk('public')->allFiles())->toBe([]);
});

it('cho qua tệp nằm trong trần Zalo', function () {
    [$inbox, $conversation, $agent] = zaloLimitFixtures();

    $this->actingAs($agent)
        ->post("/api/v1/accounts/{$inbox->account_id}/conversations/{$conversation->display_id}/messages", [
            'content' => 'video',
            'attachments' => [UploadedFile::fake()->create('clip.mp4', 24 * 1024, 'video/mp4')],
        ], ['Accept' => 'application/json'])
        ->assertSuccessful();

    expect($conversation->messages()->count())->toBe(1);
});
