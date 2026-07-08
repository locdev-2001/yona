# Integration Module (Drivers & Extensibility)

Navigate integration features. GĐ1 implements Phase 1: Zalo personal QR login + driver pattern via `Illuminate\Support\Manager`.

## Feature Index

| Feature | Purpose | Module |
|---|---|---|
| [Zalo Personal Connect (QR)](./zalo-personal-connect.md) | Scan QR to connect Zalo personal account; bridge maintains session. | `app/Modules/Integration/Chat/ZaloPersonal/` |

## Key Decisions (GĐ1)

- **Driver pattern:** `ChannelManager` + `PaymentManager` extend `Illuminate\Support\Manager`. Register drivers via `extend()`, not inheritance.
- **Internal-first:** Core (inbox, billing) NEVER import integration drivers. Resolve from container or handle gracefully (422 if missing).
- **Toggle via config:** `config/integrations.php` env-based flags (`INTEGRATION_ZALO_PERSONAL`, `INTEGRATION_PAYMENT_MANUAL`). Core ALWAYS on.
- **Only module:** `app/Modules/Integration/` is the only production module. Everything else is standard Laravel (`app/Models`, `app/Services`, `app/Http/Controllers/`).

## Architecture

### Driver Registration

```
app/Modules/Integration/IntegrationServiceProvider::register()
  ├─ Boot ChannelManager + register drivers
  │   └─ if (config('integrations.zalo_personal.enabled'))
  │       └─ manager->extend('zalo_personal', fn() => app(ZaloChannelDriver::class))
  ├─ Boot PaymentManager + register drivers
  │   └─ if (config('integrations.payment_manual.enabled'))
  │       └─ manager->extend('manual', fn() => app(ManualPaymentDriver::class))
  └─ (Phase-08: register VnpayPaymentDriver, MomoPaymentDriver)
```

### Contracts

| Contract | Location | Methods |
|----------|----------|---------|
| `ChannelDriver` | `app/Modules/Integration/Contracts/ChannelDriver.php` | `send(peerId, message): void` |
| `PaymentDriver` | `app/Modules/Integration/Contracts/PaymentDriver.php` | `charge(amount, ref)`, `verify(ref)`, `cancel(ref)` |

### Implementations (GĐ1)

**Chat Drivers:**
- `ZaloChannelDriver` — HTTP to bridge, retry + timeout, RLS-scoped persist.
- (Phase-08: `MessengerChannelDriver`, `TikTokChannelDriver`)

**Payment Drivers:**
- `ManualPaymentDriver` — no-op driver, admin approves manually (Phase-07).
- (Phase-08: `VnpayPaymentDriver`, `MomoPaymentDriver` with webhook verification).

## Integration Catalog

Hardcoded in `IntegrationCatalog`:

```php
public static function cards(): array
{
    return [
        [
            'name' => 'Zalo Personal',
            'slug' => 'zalo_personal',
            'description' => 'Kết nối tài khoản Zalo cá nhân để nhận tin nhắn',
            'status' => 'connected' | 'disconnected',
            'url' => '/integrations/zalo',
            'icon' => '/images/zalo-logo.svg',
        ],
        // Phase-08: Messenger, TikTok cards here
    ];
}
```

## Related

- **System architecture:** [../../system-architecture.md](../../system-architecture.md) § Integration Driver Pattern.
- **Zalo inbox:** [../messaging/zalo-personal-inbox.md](../messaging/zalo-personal-inbox.md) — message ingestion.
- **Billing:** [../billing/README.md](../billing/README.md) — payment drivers.
