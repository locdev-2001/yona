<?php

use App\Events\RealtimeBroadcast;
use App\Http\Resources\ConversationResource;
use App\Jobs\ActionCableBroadcastJob;
use App\Models\Conversation;
use Illuminate\Broadcasting\BroadcastEvent;
use Illuminate\Support\Facades\Bus;

// Port từ spec/jobs/action_cable_broadcast_job_spec.rb (bản gốc không có spec
// riêng — kiểm hành vi perform + prepare_broadcast_data).

it('broadcasts the event to every member on its own private channel', function () {
    Bus::fake([BroadcastEvent::class]);
    (new ActionCableBroadcastJob(['token-a', 'token-b'], 'message.created', ['id' => 1, 'account_id' => 3]))->handle();

    Bus::assertDispatched(BroadcastEvent::class, 2);
    Bus::assertDispatched(BroadcastEvent::class, function (BroadcastEvent $job) {
        /** @var RealtimeBroadcast $event */
        $event = $job->event;

        return $event instanceof RealtimeBroadcast
            && $event->broadcastOn()->name === 'private-token-a'
            && $event->broadcastAs() === 'message.created'
            && $event->broadcastWith() === ['id' => 1, 'account_id' => 3];
    });
});

it('does nothing without members', function () {
    Bus::fake([BroadcastEvent::class]);
    (new ActionCableBroadcastJob([], 'message.created', ['id' => 1]))->handle();

    Bus::assertNothingDispatched();
});

it('re-reads the conversation for conversation update events', function () {
    $conversation = Conversation::factory()->create();
    $stale = ['id' => $conversation->display_id, 'account_id' => $conversation->account_id, 'status' => 'resolved'];
    $conversation->update(['priority' => Conversation::PRIORITY_HIGH]);
    Bus::fake([BroadcastEvent::class]);

    (new ActionCableBroadcastJob(['token'], 'conversation.updated', $stale))->handle();

    Bus::assertDispatched(BroadcastEvent::class, function (BroadcastEvent $job) use ($conversation) {
        $data = $job->event->broadcastWith();

        // `==`: custom_attributes/additional_attributes là stdClass, mỗi lần dựng một instance khác.
        return $data['priority'] === 'high'
            && $data['status'] === 'open'
            && $data['account_id'] === $conversation->account_id
            && $data == [...ConversationResource::pushEventData($conversation->fresh()), 'account_id' => $conversation->account_id];
    });
});

it('runs on the critical queue', function () {
    expect((new ActionCableBroadcastJob(['t'], 'x', []))->queue)->toBe('critical');
});
