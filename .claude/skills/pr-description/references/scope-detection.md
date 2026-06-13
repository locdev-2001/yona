# Scope Detection Rules

Detect scope from changed file paths in `git diff --name-only`.

## Backend Files (BE)

Paths that indicate backend changes:
- `app/` (Models, Controllers, Services, Jobs, etc.)
- `routes/`
- `database/`
- `config/`
- `tests/` (PHP tests)
- `composer.json`, `composer.lock`
- `.php` files anywhere

## Frontend Files (FE)

Paths that indicate frontend changes:
- `resources/js/`
- `resources/css/`
- `resources/views/` (Blade templates)
- `package.json`, `pnpm-lock.yaml`
- `vite.config.js`, `tailwind.config.js`
- `.vue`, `.ts`, `.tsx`, `.jsx` files

## Scope Resolution

| Changed Files | Scope | Device |
|--------------|-------|--------|
| Only BE paths | BE | Backend API |
| Only FE paths | FE | Frontend Web |
| Both BE + FE paths | BE + FE | Backend API + Frontend Web |

## Ignored Files (don't affect scope)

- `.md` files
- `.env.example`
- `.gitignore`
- `CLAUDE.md`
- `.claude/` directory
- `storage/`
- `public/` (compiled assets)

## Migration Detection

New files matching `database/migrations/*.php`:
1. Extract table name from migration filename or file content
2. List migration script path relative to project root
3. Set DB rollback to "Yes" in Rollback section
4. Add note: "Chạy migrate trước khi restart queue worker."
