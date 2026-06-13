# Realtime broadcasting with Reverb

`laravel/reverb ^1.10` — first-party WebSocket server. Powers Conversations/Inbox (live chat, presence, typing). Client = Laravel Echo + `@inertiajs/react`. **Every channel is tenant-scoped and authorized** — broadcasting is a classic cross-tenant leak vector.

## Broadcastable event

```php
class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Message $message) {}

    public function broadcastOn(): array
    {
        // Private channel keyed by tenant + conversation — never a public channel.
        return [new PrivateChannel("tenant.{$this->message->tenant_id}.conversation.{$this->message->conversation_id}")];
    }

    public function broadcastWith(): array
    {
        return ['id' => $this->message->id, 'body' => $this->message->body, 'sender' => $this->message->sender_id];
    }

    public function broadcastAs(): string { return 'message.sent'; }
}
```
Implement `ShouldBroadcastNow` only for latency-critical events; otherwise broadcasting goes through the queue (keep a worker on the `default`/`realtime` queue).

## Channel authorization (`routes/channels.php`)

```php
Broadcast::channel('tenant.{tenantId}.conversation.{conversationId}', function (User $user, string $tenantId, string $conversationId) {
    // Reject cross-tenant first, then check the user participates in this conversation.
    if ((string) $user->tenant_id !== $tenantId) return false;
    $convo = Conversation::find($conversationId);   // tenant-scoped via global scope
    return $convo && $user->can('view', $convo)
        ? ['id' => $user->id, 'name' => $user->name]   // presence payload
        : false;
});
```
The auth callback is the security boundary — the channel-name tenant segment is **not** trusted on its own; always re-check `$user->tenant_id` and the Policy.

## Presence & typing

- **Presence channels** for "who's viewing" + typing indicators: return a member payload (above) to join. Client gets `here`/`joining`/`leaving`.
- Typing: broadcast a lightweight `UserTyping` event (use `ShouldBroadcastNow`, `toOthers()` to skip the sender) on the same private/presence channel; debounce on the client.

## Client (Echo + React 19)

```js
// resources/js/echo.js
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';        // Reverb speaks the Pusher protocol
window.Pusher = Pusher;
window.Echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
  enabledTransports: ['ws', 'wss'],
});
```
```jsx
useEffect(() => {
  const ch = window.Echo.private(`tenant.${tenantId}.conversation.${conversationId}`)
    .listen('.message.sent', (e) => append(e));   // leading dot = broadcastAs name
  return () => window.Echo.leave(`tenant.${tenantId}.conversation.${conversationId}`);
}, [conversationId]);
```

## Ops

- Run the server: `php artisan reverb:start` (supervised, e.g. Supervisor/systemd); scale horizontally with Redis as the scaling connector (`config/reverb.php` → `scaling`).
- `.env`: `BROADCAST_CONNECTION=reverb` + `REVERB_APP_*`, and matching `VITE_REVERB_*`. Keep app secret server-side only.
- Auth endpoint: broadcasting auth route runs through `web`/`auth` middleware — tenant binding must occur before channel auth.

## Anti-patterns

- Public channels for tenant data, or omitting the `$user->tenant_id` re-check in the auth callback (cross-tenant leak).
- Putting sensitive/full models in `broadcastWith()` — send minimal, already-authorized fields.
- Forgetting `toOthers()` on echo-back events (sender sees duplicates).
- No queue worker running while events use `ShouldBroadcast` (events silently never deliver).
- Leaking Echo subscriptions (no `leave()` on unmount) → memory + duplicate listeners.
