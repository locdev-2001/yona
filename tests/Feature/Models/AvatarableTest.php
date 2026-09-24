<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Models\AgentBot;
use App\Models\Contact;
use App\Models\Inbox;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;

function avatarPngBytes(): string
{
    return base64_decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    );
}

beforeEach(function () {
    Storage::fake('public');
    $this->contact = Contact::factory()->create(['name' => 'Khách cũ']);
    Event::fake([DomainEvent::class]);
});

it('gắn avatar cho record đã lưu thì hook cập nhật chạy, sự kiện mang ảnh mới', function () {
    $this->contact->replaceAvatarFromContents(avatarPngBytes(), 'avatar.png', 'image/png');

    Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::CONTACT_UPDATED
        && $event->data['contact']->is($this->contact)
        && $event->data['contact']->avatarUrl() !== '');
});

it('record còn thay đổi chờ ghi thì không lưu giữa chừng, lần save của nơi gọi mới phát sự kiện', function () {
    $this->contact->name = 'Khách mới';

    $this->contact->replaceAvatarFromContents(avatarPngBytes(), 'avatar.png', 'image/png');

    Event::assertNotDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::CONTACT_UPDATED);
    expect(Contact::query()->find($this->contact->id)->name)->toBe('Khách cũ');

    $this->contact->save();

    Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::CONTACT_UPDATED
        && $event->data['changed_attributes']['name'] === ['Khách cũ', 'Khách mới']
        && $event->data['contact']->avatarUrl() !== '');
});

it('xoá avatar thì hook cập nhật chạy, sự kiện mang thumbnail rỗng', function () {
    $this->contact->replaceAvatarFromContents(avatarPngBytes(), 'avatar.png', 'image/png');
    $path = $this->contact->avatar->path;
    Event::fake([DomainEvent::class]);

    $this->contact->removeAvatar();

    Event::assertDispatchedTimes(DomainEvent::class, 1);
    Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::CONTACT_UPDATED
        && $event->data['contact']->is($this->contact)
        && $event->data['contact']->avatarUrl() === '');
    expect($this->contact->refresh()->avatar)->toBeNull();
    Storage::disk('public')->assertMissing($path);
});

it('xoá khi chưa có avatar thì không lưu lại và không phát sự kiện', function () {
    $this->contact->removeAvatar();

    Event::assertNotDispatched(DomainEvent::class);
});

it('xoá avatar của model không phải Contact cũng lưu lại record chủ như chiều gắn', function (string $modelClass) {
    $owner = $modelClass::factory()->create();
    $owner->replaceAvatarFromContents(avatarPngBytes(), 'avatar.png', 'image/png');
    $updatedAtBeforeRemoval = $owner->refresh()->updated_at;
    $this->travel(1)->minutes();

    $owner->removeAvatar();

    $owner->refresh();
    expect($owner->avatar)->toBeNull()
        ->and($owner->updated_at->greaterThan($updatedAtBeforeRemoval))->toBeTrue();
})->with([
    'hồ sơ nhân viên' => [User::class],
    'bot' => [AgentBot::class],
    'hộp thư' => [Inbox::class],
]);
