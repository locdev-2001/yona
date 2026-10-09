<?php

use App\Models\Account;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Search\Drivers\Meilisearch\MeilisearchDocuments;
use App\Search\SearchTarget;

it('tài liệu tin mang loại tin để lọc bỏ tin hoạt động khi tìm', function () {
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id, 'enable_auto_assignment' => false]);
    $conversation = Conversation::factory()->create(['account_id' => $account->id, 'inbox_id' => $inbox->id]);
    $activity = Message::factory()->create([
        'account_id' => $account->id, 'inbox_id' => $inbox->id, 'conversation_id' => $conversation->id,
        'message_type' => Message::TYPE_ACTIVITY, 'content' => 'nhắc hẹn',
    ]);

    [$document] = MeilisearchDocuments::load(SearchTarget::Messages, [$activity->id]);

    expect($document['message_type'])->toBe(Message::TYPE_ACTIVITY)
        ->and(MeilisearchDocuments::filterableAttributes(SearchTarget::Messages))->toContain('message_type');
});
