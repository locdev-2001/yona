# Integration Module (Drivers & Extensibility)

Navigate integration features. GĐ1 implements Phase 1: Zalo personal QR login + driver pattern via `Illuminate\Support\Manager`.

## Feature Index

| Feature | Purpose | Module |
|---|---|---|
| [Zalo Personal Connect (QR)](./zalo-personal-connect.md) | Scan QR to connect Zalo personal account; bridge maintains session. | `app/Modules/Chat/Adapter/ZaloPersonal/` |

## Key Decisions (GĐ1)

- **Driver pattern:** `ChannelRegistry` (extends `Illuminate\Support\Manager`) and `PaymentRegistry` (minimal registry, no Manager base) both take drivers via `extend()`, not inheritance.
- **Port/Adapter split:** each module owns its contracts in `Port/` and its concrete drivers in `Adapter/<vendor>/`. Adding a channel or a payment gateway means adding an adapter, never editing the port.
- **Internal-first:** Core (inbox, billing) NEVER import integration drivers. Resolve from container or handle gracefully (422 if missing).
- **Toggle via config:** `config/integrations.php` env-based flags (`INTEGRATION_ZALO_PERSONAL`, `INTEGRATION_PAYMENT_MANUAL`). Core ALWAYS on — the internal `widget` channel has no on/off flag, only `WIDGET_CHANNEL_INBOUND_SECRET`.
- **Modules hold business capabilities only:** `app/Modules/` contains `Automation`, `Chat`, `Payment`. Everything else is standard Laravel (`app/Models`, `app/Services`, `app/Http/Controllers/`).

## Architecture

### Driver Registration

There is no umbrella integration provider. Every provider is declared directly in
`bootstrap/providers.php` — no `class_exists` guard, because a guard silently skips a provider
when an FQCN changes and nobody notices.

Registries and drivers are wired independently: a driver plugs itself in through
`callAfterResolving`, so declaration order does not matter.

```
bootstrap/providers.php
  ├─ App\Modules\Chat\ChatServiceProvider::register()
  │   └─ singleton ChannelRegistry (always on — chat core cannot be switched off)
  ├─ App\Modules\Chat\Adapter\Widget\WidgetServiceProvider::register()
  │   └─ callAfterResolving(ChannelRegistry) → extend('widget', ...)   // internal, no config gate
  ├─ App\Modules\Chat\Adapter\ZaloPersonal\ZaloPersonalServiceProvider::register()
  │   └─ if (config('integrations.zalo_personal.enabled'))
  │       └─ callAfterResolving(ChannelRegistry) → extend('zalo_personal', fn() => app(ZaloChannelDriver::class))
  └─ App\Modules\Payment\PaymentServiceProvider::register()
      ├─ singleton PaymentRegistry
      └─ register(ManualPaymentServiceProvider)
          └─ if (config('integrations.payment_manual.enabled'))
              └─ callAfterResolving(PaymentRegistry) → extend('manual', fn() => app(ManualPaymentDriver::class))
```

Each external plug-in gates itself inside its own provider; the core never asks which plug-ins
are enabled.

### Contracts

| Contract | Location | Methods |
|----------|----------|---------|
| `ChannelDriver` | `app/Modules/Chat/Port/ChannelDriver.php` | `channelKey()`, `connect(workspaceId, params)`, `disconnect(workspaceId)`, `capabilities()`, `sendMessage(Conversation, payload): Message`, `parseInbound(raw): array` |
| `PaymentDriver` | `app/Modules/Payment/Port/PaymentDriver.php` | `key()`, `createCheckout(workspaceId, itemId, payload)`, `verifyCallback(data)`, `refund(purchaseId, amountCents)` |

Optional channel behaviour is declared through the marker interfaces in
`app/Modules/Chat/Port/Capability/` (`SupportsHistoryResync`, `SupportsPhoneVerification`,
`SupportsReactions`, `SupportsSeenReceipts`, `SupportsStickers`). Core selects drivers by
capability via `ChannelRegistry::supporting()` instead of naming a channel.

### Implementations (GĐ1)

**Chat Drivers:**
- `WidgetChannelDriver` (`app/Modules/Chat/Adapter/Widget/`) — the internal channel, always registered; the baseline every other channel is measured against.
- `ZaloChannelDriver` (`app/Modules/Chat/Adapter/ZaloPersonal/`) — HTTP to bridge, retry + timeout, RLS-scoped persist.
- (Phase-08: `MessengerChannelDriver`, `TikTokChannelDriver`)

**Payment Drivers:**
- `ManualPaymentDriver` (`app/Modules/Payment/Adapter/Manual/`) — no-op driver, admin approves manually (Phase-07).
- (Phase-08: `VnpayPaymentDriver`, `MomoPaymentDriver` with webhook verification).

## Integration Catalog

Hardcoded in `App\Http\ViewModels\IntegrationCatalog` (`app/Http/ViewModels/IntegrationCatalog.php`).
It is a view model, not a module concern: it only feeds the `/integrations` page, so it lives at the
HTTP edge.

```php
public function cards(): array
{
    return [
        [
            'key' => 'zalo_personal',
            'name' => 'Zalo cá nhân',
            'category' => 'chat',
            'logo' => '/assets/images/icon_zalo.png',
            'enabled' => (bool) config('integrations.zalo_personal.enabled'),
            'connected' => ZaloConnection::query()->exists(), // workspace-scoped via RLS
        ],
        // Phase-08: Messenger, TikTok cards here
    ];
}
```

The card links to the Zalo connection screen at `/integrations/zalo` (route `integrations.zalo.index`).

## Related

- **System architecture:** [../../system-architecture.md](../../system-architecture.md) § Integration Driver Pattern.
- **Zalo inbox:** [../messaging/zalo-personal-inbox.md](../messaging/zalo-personal-inbox.md) — message ingestion.
- **Channel contract:** [../messaging/channel-framework-contract.md](../messaging/channel-framework-contract.md) — what a channel driver must implement.
