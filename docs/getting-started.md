# Getting Started — Yona

> Quick start guide for local development. From fresh checkout to first login and Zalo connection test.

## Prerequisites

- **PHP 8.3+** (Laravel 13 requirement)
- **PostgreSQL** (local)
- **Node.js 18+** (Vite build + Zalo bridge service)
- **Composer** (PHP dependency manager)
- **npm or pnpm** (Node package manager)

## 1. Environment Setup

Clone the repo and install dependencies:

```bash
git clone https://github.com/locflamedia/yona.git
cd yona

# Copy env template
cp .env.example .env

# Install PHP dependencies
composer install

# Install Node dependencies
pnpm install  # or npm install
```

## 2. Database Setup

Canonical names: dev DB `yona`, test DB `yona_test`, roles `yona_app` (runtime,
RLS-enforced) + `yona_owner` (schema owner, migrations). Details in
[local-development.md](local-development.md).

```bash
# Create both databases (as the superuser)
createdb -h 127.0.0.1 -U postgres yona
createdb -h 127.0.0.1 -U postgres yona_test

# Generate app key
php artisan key:generate

# Create roles + grants (real RLS), then migrate as the owner
make db-roles
make migrate

# Seed sample data (optional — creates test workspace + users)
php artisan db:seed
```

**Default test user after seed:**
- Email: `admin@example.com`
- Password: `password`

## 3. Start Development Server

### Backend (Laravel)

```bash
# In project root
php artisan serve

# Runs on http://localhost:8000
```

### Frontend (Vite dev server)

```bash
# In project root (separate terminal)
npm run dev

# Runs on http://localhost:5173
# Auto-proxies API to http://localhost:8000
```

### Zalo Bridge (Optional — for Inbox testing)

The Zalo bridge is a Node.js service that connects to Zalo personal accounts via QR login and sends webhooks to the app.

```bash
# In zalo-bridge/ directory
npm install
node server.js

# Runs on http://localhost:3456
# Webhook target: http://localhost:8000/api/integrations/zalo-personal/webhook
```

If you don't need Inbox testing, the app runs fine without the bridge (sends return 422 gracefully).

## 4. Login & Explore

1. Navigate to **http://localhost:8000** (or http://localhost:5173 if dev server handles it).
2. Enter test credentials:
   - Email: `admin@example.com`
   - Password: `password`
3. You're now in the test workspace.

### What You'll See

- **Dashboard:** Workspace overview (placeholder in GĐ1).
- **CRM:** Clients, Contacts, Leads, Pipeline kanban.
- **Projects:** Create projects, assign tasks, timers.
- **Inbox:** (GĐ1) Zalo personal conversations (only if bridge running + configured).
- **Settings:** Workspace name, members, RBAC, custom fields.
- **Tích hợp (Integrations):** Configure Zalo, payment methods (Phase-08).

## 5. Connect Zalo (Optional)

### Prerequisites

- Zalo personal account (any account, not OA).
- Bridge running at `http://localhost:3456`.

### Steps

1. Navigate to **Settings → Tích hợp (Integrations)**.
2. Click **Kết nối Zalo (Connect Zalo)**.
3. Scan QR code with your Zalo app.
4. Authorize bridge access.
5. Bridge will maintain session; messages start flowing into Inbox.

**Testing inbound:**
- Send a message to the account you scanned from another Zalo account.
- Should appear in Inbox in real-time (if bridge is connected).

**Testing outbound:**
- Click **Reply** on a conversation in the Inbox.
- Type a message and click **Send**.
- Should appear in the peer's Zalo.

## 6. Running Tests

```bash
# PHP tests (Pest)
php artisan test

# Specific test file
php artisan test tests/Feature/Inbox/ConversationMeteringTest.php

# JavaScript tests (if configured)
npm run test
```

## 7. Troubleshooting

### Port Already in Use

```bash
# Change Laravel port
php artisan serve --port=8001

# Change Vite port (in vite.config.ts)
# Update .env: VITE_APP_URL=http://localhost:8001
```

### Database Connection Refused

- Verify PostgreSQL is running: `psql -h 127.0.0.1 -U postgres -c "SELECT 1"`
- Check `.env` has correct host/port/user/password (`DB_USERNAME=yona_app`).
- Ensure the `yona` database exists and roles are set up (`make db-roles`).

### Zalo Bridge Connection Failed

- Verify bridge is running: `curl http://localhost:3456/health`.
- Check `.env`: `ZALO_BRIDGE_ENDPOINT=http://localhost:3456`.
- If QR won't scan, restart bridge + reload Integrations page.

### Inbound Message Not Appearing

- Bridge must be running + connected.
- Webhook signature verification: check bridge logs for `X-Zalo-Personal-Bridge-Secret` mismatch.
- Workspace must have active plan (or free defaults apply).
- Check app logs: `tail storage/logs/laravel.log`.

### Quota Exceeded

If "Quota exceeded" blocks sends:
- This is expected behavior (F5 guard). Each conversation can only send once per billing period.
- Workspace can send unlimited (no quota limits). Usage is tracked for analytics.
- Check **Settings → Billing** to see current plan.

## 8. Project Structure Quick Ref

| Folder | Purpose |
|--------|---------|
| `app/Models` | All Eloquent models (~50) |
| `app/Http/Controllers/{Domain}` | Route handlers by business domain |
| `app/Services` | Business logic, external calls, complex queries |
| `app/Modules/Integration` | Driver registration point (Zalo, payment) |
| `database/migrations` | Schema + RLS policies |
| `resources/js/pages/{domain}` | React pages (Inertia) |
| `routes/web.php` | Customer routes |
| `routes/api.php` | API + webhook routes |
| `config/integrations.php` | Toggle integration drivers (env-based) |
| `tests` | Pest test suite |

## 9. Next Steps

- **Explore CRM:** Create a client, add contacts, convert to lead.
- **Test Projects:** Create a project, assign milestones and tasks.
- **Configure Workspace:** Invite members, assign roles, create teams.
- **Read Docs:** See [docs/system-architecture.md](system-architecture.md) for architecture overview.

## Support

For issues or questions:
1. Check [troubleshooting](#7-troubleshooting) above.
2. Read feature docs in `docs/features/`.
3. Review code in `app/` and test suite in `tests/`.
4. Check recent commits/changelog: `git log --oneline | head -20`.

## Related Documentation

- [System Architecture](system-architecture.md) — codebase structure + data flows.
- [CRM Domain Definition](crm-domain-definition.md) — entity relationships.
- [CRM Business Rules](crm-business-rules.md) — invariants and constraints.
- [Feature Index](features/README.md) — per-feature documentation.
- [Messaging / Inbox](features/messaging/README.md) — Zalo inbox setup + flow.
