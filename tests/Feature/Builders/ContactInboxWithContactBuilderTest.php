<?php

use App\Builders\ContactInboxWithContactBuilder;
use App\Jobs\Avatar\AvatarFromUrlJob;
use App\Models\Account;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Inbox;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

// Port từ spec/builders/contact_inbox_with_contact_builder_spec.rb
// (bỏ case Instagram — driver chưa port).

function builderFixtures(): array
{
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $contact = Contact::factory()->create([
        'account_id' => $account->id,
        'email' => 'xyc@example.com',
        'phone_number' => '+23423424123',
        'identifier' => '123',
    ]);

    return [$account, $inbox, $contact];
}

it('does not create contact if one already exists with the source id', function () {
    [, $inbox, $contact] = builderFixtures();
    $existing = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);

    $contactInbox = (new ContactInboxWithContactBuilder($inbox, [
        'name' => 'Contact',
        'phone_number' => '+1234567890',
        'email' => 'testemail@example.com',
    ], $existing->source_id))->perform();

    expect($contactInbox->contact->id)->toBe($contact->id);
});

it('creates contact when none exists with the source id', function () {
    [, $inbox, $contact] = builderFixtures();

    $contactInbox = (new ContactInboxWithContactBuilder($inbox, [
        'name' => 'Contact',
        'phone_number' => '+1234567890',
        'email' => 'testemail@example.com',
        'custom_attributes' => ['test' => 'test'],
    ], '123456'))->perform();

    expect($contactInbox->contact->id)->not->toBe($contact->id)
        ->and($contactInbox->contact->name)->toBe('Contact')
        ->and($contactInbox->contact->custom_attributes)->toBe(['test' => 'test'])
        ->and($contactInbox->inbox_id)->toBe($inbox->id);
});

it('truncates long contact names before creating the contact', function () {
    [, $inbox] = builderFixtures();

    $contactInbox = (new ContactInboxWithContactBuilder($inbox, [
        'name' => str_repeat('a', 300),
        'email' => 'testemail@example.com',
    ], '123456'))->perform();

    expect($contactInbox->contact->name)->toBe(str_repeat('a', 255));
});

// Lệch cố ý so với bản gốc (ghi ở reports/ux-deviations.md): thay tên máy haikunator
// ("odd-wave-872") bằng tên khách vô danh đọc được của App\Support\AnonymousName.
it('generates a fallback name when none is given', function () {
    [$account, $inbox] = builderFixtures();
    $account->update(['locale' => 'vi']);

    $contactInbox = (new ContactInboxWithContactBuilder($inbox, [
        'email' => 'anonymous@example.com',
    ], '123456'))->perform();

    expect($contactInbox->contact->name)->toEndWith(' ẩn danh');
});

it('falls back to the anonymous name when the channel sends a blank name', function () {
    [$account, $inbox] = builderFixtures();
    $account->update(['locale' => 'vi']);

    $contactInbox = (new ContactInboxWithContactBuilder($inbox, [
        'name' => '   ',
        'email' => 'blank-name@example.com',
    ], '123456'))->perform();

    expect($contactInbox->contact->name)->toEndWith(' ẩn danh');
});

it('names anonymous contacts in the language of the account', function () {
    [$account, $inbox] = builderFixtures();
    $account->update(['locale' => 'en']);

    $contactInbox = (new ContactInboxWithContactBuilder($inbox, [
        'email' => 'english@example.com',
    ], '123456'))->perform();

    expect($contactInbox->contact->name)->toStartWith('Anonymous ');
});

it('does not create contact if one already exists with the identifier', function () {
    [, $inbox, $contact] = builderFixtures();

    $contactInbox = (new ContactInboxWithContactBuilder($inbox, [
        'name' => 'Contact',
        'identifier' => $contact->identifier,
        'phone_number' => $contact->phone_number,
        'email' => 'testemail@example.com',
    ], '123456'))->perform();

    expect($contactInbox->contact->id)->toBe($contact->id);
});

it('does not create contact if one already exists with the email', function () {
    [, $inbox, $contact] = builderFixtures();

    $contactInbox = (new ContactInboxWithContactBuilder($inbox, [
        'name' => 'Contact',
        'phone_number' => '+1234567890',
        'email' => $contact->email,
    ], '123456'))->perform();

    expect($contactInbox->contact->id)->toBe($contact->id);
});

it('does not create contact when an uppercase email of an existing contact is passed', function () {
    [, $inbox, $contact] = builderFixtures();

    $contactInbox = (new ContactInboxWithContactBuilder($inbox, [
        'name' => 'Contact',
        'phone_number' => '+1234567890',
        'email' => mb_strtoupper($contact->email),
    ], '123456'))->perform();

    expect($contactInbox->contact->id)->toBe($contact->id);
});

it('does not create contact if one already exists with the phone number', function () {
    [, $inbox, $contact] = builderFixtures();

    $contactInbox = (new ContactInboxWithContactBuilder($inbox, [
        'name' => 'Contact',
        'phone_number' => $contact->phone_number,
        'email' => 'testemail@example.com',
    ], '123456'))->perform();

    expect($contactInbox->contact->id)->toBe($contact->id);
});

// Đồng bộ avatar — bám sát `update_contact_avatar` của bản gốc:
// job chỉ chạy sau khi dựng contact inbox mới VÀ contact chưa có avatar.

it('dispatches the avatar job for a newly created contact', function () {
    Queue::fake();
    [, $inbox] = builderFixtures();

    (new ContactInboxWithContactBuilder($inbox, [
        'name' => 'Contact',
        'avatar_url' => 'https://cdn.example.com/avatar.jpg',
    ], '123456'))->perform();

    Queue::assertPushed(AvatarFromUrlJob::class);
});

it('dispatches the avatar job for an existing contact that has no avatar yet', function () {
    Queue::fake();
    [, $inbox, $contact] = builderFixtures();

    $contactInbox = (new ContactInboxWithContactBuilder($inbox, [
        'name' => 'Contact',
        'phone_number' => $contact->phone_number,
        'avatar_url' => 'https://cdn.example.com/avatar.jpg',
    ], '123456'))->perform();

    expect($contactInbox->contact->id)->toBe($contact->id);
    Queue::assertPushed(AvatarFromUrlJob::class);
});

it('does not dispatch the avatar job when the contact already has an avatar', function () {
    [, $inbox, $contact] = builderFixtures();
    Storage::fake('public');
    $contact->replaceAvatarFromContents('anh', 'avatar.png', 'image/png');

    Queue::fake();

    (new ContactInboxWithContactBuilder($inbox, [
        'name' => 'Contact',
        'phone_number' => $contact->phone_number,
        'avatar_url' => 'https://cdn.example.com/avatar.jpg',
    ], '123456'))->perform();

    Queue::assertNotPushed(AvatarFromUrlJob::class);
});

// Giới hạn CÓ THẬT của bản gốc, khoá lại để không ai tưởng là lỗi: khi contact
// inbox đã tồn tại theo source_id, builder trả về ngay — avatar/tên/số điện thoại
// đến sau KHÔNG được cập nhật. Kênh nào cần làm mới thì tự làm trong driver
// (xem `update_contact_avatar` của Telegram).
it('does not refresh the contact when the contact inbox already exists for the source id', function () {
    Queue::fake();
    [, $inbox, $contact] = builderFixtures();
    $existing = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);
    $originalName = $contact->name;

    (new ContactInboxWithContactBuilder($inbox, [
        'name' => 'Tên mới',
        'avatar_url' => 'https://cdn.example.com/avatar.jpg',
        'email' => 'moi@example.com',
    ], $existing->source_id))->perform();

    expect($contact->refresh()->name)->toBe($originalName)
        ->and($contact->email)->toBe('xyc@example.com');
    Queue::assertNotPushed(AvatarFromUrlJob::class);
});

it('tìm thấy hồ sơ đã có khi số điện thoại gửi đến viết kiểu nội địa', function () {
    [$account, $inbox] = builderFixtures();
    $existing = Contact::factory()->create(['account_id' => $account->id, 'phone_number' => '+84912345678']);

    $contactInbox = (new ContactInboxWithContactBuilder($inbox, [
        'name' => 'Khách',
        'phone_number' => '0912345678',
    ], 'nguon-sdt-noi-dia'))->perform();

    expect($contactInbox->contact_id)->toBe($existing->id);
});
