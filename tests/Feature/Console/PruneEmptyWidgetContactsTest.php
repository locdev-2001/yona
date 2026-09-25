<?php

use App\Models\Account;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Label;
use App\Models\Note;

function emptyWidgetContactInbox(Account $account, Inbox $inbox): ContactInbox
{
    $contact = Contact::factory()->create(['account_id' => $account->id]);

    return ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);
}

it('xoá contact_inbox widget rỗng cùng contact mồ côi của nó', function () {
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->webWidget()->create(['account_id' => $account->id]);
    $empty = emptyWidgetContactInbox($account, $inbox);

    $this->artisan('widget:prune-empty-contacts')->assertSuccessful();

    expect(ContactInbox::query()->whereKey($empty->id)->exists())->toBeFalse()
        ->and(Contact::query()->whereKey($empty->contact_id)->exists())->toBeFalse();
});

it('giữ lại contact_inbox đã có hội thoại', function () {
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->webWidget()->create(['account_id' => $account->id]);
    $withConversation = emptyWidgetContactInbox($account, $inbox);
    Conversation::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'contact_id' => $withConversation->contact_id,
        'contact_inbox_id' => $withConversation->id,
    ]);

    $this->artisan('widget:prune-empty-contacts')->assertSuccessful();

    expect(ContactInbox::query()->whereKey($withConversation->id)->exists())->toBeTrue();
});

it('giữ lại contact_inbox mà contact đã có email/phone/identifier hoặc custom_attributes', function () {
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->webWidget()->create(['account_id' => $account->id]);

    $withEmail = Contact::factory()->create(['account_id' => $account->id, 'email' => 'khach@example.com']);
    $withEmailInbox = ContactInbox::factory()->create(['contact_id' => $withEmail->id, 'inbox_id' => $inbox->id]);

    $withCustomAttrs = Contact::factory()->create(['account_id' => $account->id, 'custom_attributes' => ['plan' => 'pro']]);
    $withCustomAttrsInbox = ContactInbox::factory()->create(['contact_id' => $withCustomAttrs->id, 'inbox_id' => $inbox->id]);

    $this->artisan('widget:prune-empty-contacts')->assertSuccessful();

    expect(ContactInbox::query()->whereKey($withEmailInbox->id)->exists())->toBeTrue()
        ->and(ContactInbox::query()->whereKey($withCustomAttrsInbox->id)->exists())->toBeTrue();
});

it('giữ lại contact có ghi chú, nhãn, hoặc đã bị chặn', function () {
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->webWidget()->create(['account_id' => $account->id]);

    $withNote = Contact::factory()->create(['account_id' => $account->id]);
    $withNoteInbox = ContactInbox::factory()->create(['contact_id' => $withNote->id, 'inbox_id' => $inbox->id]);
    Note::factory()->create(['account_id' => $account->id, 'contact_id' => $withNote->id]);

    $withLabel = Contact::factory()->create(['account_id' => $account->id]);
    $withLabelInbox = ContactInbox::factory()->create(['contact_id' => $withLabel->id, 'inbox_id' => $inbox->id]);
    Label::factory()->create(['account_id' => $account->id, 'title' => 'vip']);
    $withLabel->addLabels('vip');

    $blocked = Contact::factory()->create(['account_id' => $account->id, 'blocked' => true]);
    $blockedInbox = ContactInbox::factory()->create(['contact_id' => $blocked->id, 'inbox_id' => $inbox->id]);

    $this->artisan('widget:prune-empty-contacts')->assertSuccessful();

    expect(ContactInbox::query()->whereKey($withNoteInbox->id)->exists())->toBeTrue()
        ->and(ContactInbox::query()->whereKey($withLabelInbox->id)->exists())->toBeTrue()
        ->and(ContactInbox::query()->whereKey($blockedInbox->id)->exists())->toBeTrue();
});

it('soát lại đúng tiêu chí ngay lúc xoá — hội thoại vừa có trước khi command chạy vẫn được giữ lại', function () {
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->webWidget()->create(['account_id' => $account->id]);
    $contactInbox = emptyWidgetContactInbox($account, $inbox);

    Conversation::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'contact_id' => $contactInbox->contact_id,
        'contact_inbox_id' => $contactInbox->id,
    ]);

    $this->artisan('widget:prune-empty-contacts')->assertSuccessful();

    expect(ContactInbox::query()->whereKey($contactInbox->id)->exists())->toBeTrue()
        ->and(Contact::query()->whereKey($contactInbox->contact_id)->exists())->toBeTrue();
});

it('không đụng contact_inbox của inbox không phải widget', function () {
    $account = Account::factory()->create();
    $zaloInbox = Inbox::factory()->zalo()->create(['account_id' => $account->id]);
    $empty = emptyWidgetContactInbox($account, $zaloInbox);

    $this->artisan('widget:prune-empty-contacts')->assertSuccessful();

    expect(ContactInbox::query()->whereKey($empty->id)->exists())->toBeTrue();
});

it('chỉ xoá contact_inbox của widget, giữ contact còn gắn với kênh khác', function () {
    $account = Account::factory()->create();
    $widgetInbox = Inbox::factory()->webWidget()->create(['account_id' => $account->id]);
    $zaloInbox = Inbox::factory()->zalo()->create(['account_id' => $account->id]);

    $contact = Contact::factory()->create(['account_id' => $account->id]);
    $widgetContactInbox = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $widgetInbox->id]);
    ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $zaloInbox->id]);

    $this->artisan('widget:prune-empty-contacts')->assertSuccessful();

    expect(ContactInbox::query()->whereKey($widgetContactInbox->id)->exists())->toBeFalse()
        ->and(Contact::query()->whereKey($contact->id)->exists())->toBeTrue();
});

it('--dry-run không xoá gì', function () {
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->webWidget()->create(['account_id' => $account->id]);
    $empty = emptyWidgetContactInbox($account, $inbox);

    $this->artisan('widget:prune-empty-contacts', ['--dry-run' => true])->assertSuccessful();

    expect(ContactInbox::query()->whereKey($empty->id)->exists())->toBeTrue()
        ->and(Contact::query()->whereKey($empty->contact_id)->exists())->toBeTrue();
});

it('chạy lại lần hai không còn gì để xoá', function () {
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->webWidget()->create(['account_id' => $account->id]);
    emptyWidgetContactInbox($account, $inbox);

    $this->artisan('widget:prune-empty-contacts')->assertSuccessful();
    $this->artisan('widget:prune-empty-contacts')->assertSuccessful();

    expect(ContactInbox::query()->where('inbox_id', $inbox->id)->count())->toBe(0);
});
