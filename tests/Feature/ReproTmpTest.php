<?php
use App\Models\Inbox;
use App\Jobs\DeleteObjectJob;

it('repro via serialized job with conversation', function () {
    $inbox = Inbox::factory()->email()->create();
    $cid = $inbox->channel_id;
    $conv = \App\Models\Conversation::factory()->create(['inbox_id' => $inbox->id, 'account_id' => $inbox->account_id]);
    \App\Models\Message::factory()->create(['conversation_id' => $conv->id, 'inbox_id' => $inbox->id, 'account_id' => $inbox->account_id]);

    $job = new DeleteObjectJob($inbox);
    $payload = serialize($job);
    $restored = unserialize($payload);
    $restored->handle();

    dump('inbox rows: '.\DB::table('inboxes')->where('id', $inbox->id)->count());
    dump('channel rows: '.\DB::table('channel_email')->where('id', $cid)->count());
});
