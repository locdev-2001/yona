<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Models\Contact;
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
