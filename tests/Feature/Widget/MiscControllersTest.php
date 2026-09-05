<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Label;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Tests\Support\WidgetSession;

// Port từ spec/controllers/api/v1/widget/{events,labels,inbox_members,direct_uploads}_controller_spec.rb.

function widgetOpenConversation(WidgetSession $session): Conversation
{
    return Conversation::factory()->create([
        'account_id' => $session->account->id,
        'inbox_id' => $session->inbox->id,
        'contact_id' => $session->contact->id,
        'contact_inbox_id' => $session->contactInbox->id,
    ]);
}

describe('POST /api/v1/widget/events', function () {
    it('returns not found with an invalid website token', function () {
        WidgetSession::make();

        $this->postJson('/api/v1/widget/events', ['website_token' => ''])->assertNotFound();
    });

    it('dispatches the widget event with browser context', function () {
        $session = WidgetSession::make();
        Event::fake([DomainEvent::class]);

        $this->withHeaders([
            ...$session->headers(),
            'User-Agent' => 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language' => 'en-US,en;q=0.9',
        ])->postJson($session->url('events'), [
            'name' => 'webwidget.triggered',
            'event_info' => ['test_id' => 'test'],
        ])->assertNoContent();

        Event::assertDispatched(
            DomainEvent::class,
            fn (DomainEvent $event) => $event->type === EventType::WEBWIDGET_TRIGGERED
                && $event->data['contact_inbox']->id === $session->contactInbox->id
                && $event->data['event_info']['test_id'] === 'test'
                && $event->data['event_info']['browser_language'] === 'en'
                && $event->data['event_info']['browser']['browser_name'] === 'Chrome'
        );
    });

    it('returns not found for an unknown event name', function () {
        $session = WidgetSession::make();

        $this->postJson($session->url('events'), ['name' => 'not.an.event'], $session->headers())->assertNotFound();
    });
});

describe('widget labels', function () {
    it('returns not found with an invalid website token', function () {
        WidgetSession::make();

        $this->postJson('/api/v1/widget/labels', ['website_token' => ''])->assertNotFound();
        $this->deleteJson('/api/v1/widget/labels/support', ['website_token' => ''])->assertNotFound();
    });

    it('does not add a label that is not defined in the account', function () {
        $session = WidgetSession::make();
        $conversation = widgetOpenConversation($session);

        $this->postJson($session->url('labels'), ['label' => 'customer-support'], $session->headers())->assertNoContent();

        expect($conversation->labelList())->toBe([]);
    });

    it('adds and removes a label defined in the account', function () {
        $session = WidgetSession::make();
        Label::factory()->create(['account_id' => $session->account->id, 'title' => 'customer-support']);
        $conversation = widgetOpenConversation($session);

        $this->postJson($session->url('labels'), ['label' => 'customer-support'], $session->headers())->assertNoContent();

        expect($conversation->labelList())->toBe(['customer-support']);

        $this->deleteJson($session->url('labels/customer-support'), [], $session->headers())->assertNoContent();

        expect($conversation->labelList())->toBe([]);
    });
});

describe('GET /api/v1/widget/inbox_members', function () {
    it('returns not found with an invalid website token', function () {
        WidgetSession::make();

        $this->getJson('/api/v1/widget/inbox_members?website_token=')->assertNotFound();
    });

    it('returns the agents of the inbox without requiring a visitor session', function () {
        $session = WidgetSession::make();

        foreach (range(1, 2) as $ignored) {
            $agent = User::factory()->create();
            AccountUser::factory()->create(['account_id' => $session->account->id, 'user_id' => $agent->id]);
            $session->inbox->addMembers([$agent->id]);
        }

        $response = $this->getJson($session->url('inbox_members'))->assertOk();

        expect($response->json('payload'))->toHaveCount(2);
        expect($response->json('payload.0'))->toHaveKeys(['id', 'name', 'avatar_url', 'availability_status']);
    });
});

describe('POST /api/v1/widget/direct_uploads', function () {
    it('stores the file and returns a signed id', function () {
        Storage::fake('local');
        $session = WidgetSession::make();

        $response = $this->post(
            $session->url('direct_uploads'),
            ['file' => UploadedFile::fake()->image('avatar.png')],
            $session->headers()
        )->assertOk();

        expect($response->json('content_type'))->toBe('image/png');
        expect($response->json('signed_id'))->not->toBeNull();
    });

    it('returns not found without a visitor session', function () {
        $session = WidgetSession::make();

        $this->post($session->url('direct_uploads'), ['file' => UploadedFile::fake()->image('avatar.png')])
            ->assertNotFound();
    });
});

describe('POST /api/v1/widget/presence', function () {
    it('marks the visitor online and returns the available agents', function () {
        $session = WidgetSession::make();
        $agent = User::factory()->create();
        AccountUser::factory()->create(['account_id' => $session->account->id, 'user_id' => $agent->id]);

        $response = $this->postJson($session->url('presence'), [], $session->headers())->assertOk();

        expect($response->json('account_id'))->toBe($session->account->id);
        expect($response->json())->not->toHaveKey('contacts');
        expect($session->contact->availabilityStatus())->toBe('online');
    });

    it('returns not found without a visitor session', function () {
        $session = WidgetSession::make();

        $this->postJson($session->url('presence'))->assertNotFound();
    });
});
