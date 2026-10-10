<?php

use App\Messaging\Inbound\Events\EditEvent;
use App\Messaging\Inbound\Events\ReactionEvent;
use App\Messaging\Inbound\Events\RecallEvent;
use App\Messaging\Inbound\Events\ReceiptEvent;
use App\Messaging\Inbound\InboundMessage;
use App\Messaging\Inbound\InboundMessageWriter;
use App\Messaging\Inbound\InboundSender;
use App\Messaging\Inbound\MessageEventService;
use App\Models\Inbox;
use App\Models\Message;

beforeEach(function () {
    $this->inbox = Inbox::factory()->line()->create();
    $this->events = app(MessageEventService::class);
    $this->incoming = app(InboundMessageWriter::class)->write($this->inbox, new InboundSender('khach-1', 'An'), new InboundMessage(sourceId: 'in-1', text: 'hỏi'));
    $this->outgoing = $this->incoming->conversation->messages()->create([
        'account_id' => $this->inbox->account_id,
        'inbox_id' => $this->inbox->id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'trả lời',
        'source_id' => 'out-1',
        'status' => Message::STATUSES['sent'],
        'content_attributes' => ['external_source_ids' => ['out-1', 'out-1b']],
    ]);
});

it('cảm xúc: khách thả rồi gỡ; tenant thả từ app dội về chiếm ô agent', function () {
    expect($this->events->apply($this->inbox, new ReactionEvent('out-1', '❤️', 'khach-1')))->toBeTrue()
        ->and($this->outgoing->fresh()->reactionList()[0]['by'])->toBe('khach-1');

    $this->events->apply($this->inbox, new ReactionEvent('in-1', '👍', 'self-uid', isSelf: true));
    expect($this->incoming->fresh()->reactionList()[0]['by'])->toBe(Message::REACTION_BY_AGENT_PREFIX.'self');

    expect($this->events->apply($this->inbox, new ReactionEvent('out-1', null, 'khach-1')))->toBeTrue()
        ->and($this->outgoing->fresh()->reactionList())->toBe([]);
});

it('sự kiện trỏ vào bí danh của tin đi vẫn tìm ra tin gốc', function () {
    expect($this->events->apply($this->inbox, new ReactionEvent('out-1b', '😂', 'khach-1')))->toBeTrue();
});

it('thu hồi: đánh dấu xoá; tới trước tin thì nhớ và áp khi tin đến', function () {
    expect($this->events->apply($this->inbox, new RecallEvent('in-1')))->toBeTrue()
        ->and($this->incoming->fresh()->isDeleted())->toBeTrue();

    expect($this->events->apply($this->inbox, new RecallEvent('in-2')))->toBeFalse();
    $late = app(InboundMessageWriter::class)->write($this->inbox, new InboundSender('khach-1', 'An'), new InboundMessage(sourceId: 'in-2', text: 'tin tới trễ'));

    expect($this->events->applyPendingRecall($this->inbox, 'in-2'))->toBeTrue()
        ->and($late->fresh()->isDeleted())->toBeTrue();
});

it('sửa tin đổi nội dung và ghi mốc sửa', function () {
    expect($this->events->apply($this->inbox, new EditEvent('in-1', 'hỏi lại')))->toBeTrue()
        ->and($this->incoming->fresh()->content)->toBe('hỏi lại')
        ->and($this->incoming->fresh()->content_attributes)->toHaveKey('edited_at');
});

it('biên nhận theo id và theo mốc đều chỉ nâng tin đi', function () {
    expect($this->events->apply($this->inbox, ReceiptEvent::delivered(['out-1', 'in-1'])))->toBeTrue()
        ->and($this->outgoing->fresh()->status)->toBe(Message::STATUSES['delivered'])
        ->and($this->incoming->fresh()->status)->toBe(Message::STATUSES['sent']);

    $this->events->apply($this->inbox, ReceiptEvent::readUpTo('khach-1', now()->addMinute()));
    expect($this->outgoing->fresh()->status)->toBe(Message::STATUSES['read']);
});
