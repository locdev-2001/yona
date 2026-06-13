# API, Validation & Inertia 2

Boundary layer: validate input → authorize → serialize output. Inertia 2 (server) + React 19 (client) for the app UI; Eloquent/JSON:API resources for any JSON/partner API.

## Form Requests — validate at the boundary

```php
class StoreDealRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('deal.create');   // coarse feature gate; Policy guards the record
    }

    public function rules(): array
    {
        return [
            'name'      => ['required', 'string', 'max:255'],
            'value'     => ['nullable', 'decimal:0,2', 'min:0'],
            'stage'     => ['required', Rule::enum(DealStage::class)],
            'contact_id'=> ['required', Rule::exists('contacts', 'id')->where('tenant_id', $this->user()->tenant_id)],
        ];
    }
}
```
- Scope `exists`/`unique` rules to the tenant — never validate against the global table.
- Use `Rule::enum()`, `prepareForValidation()` for normalization, `passedValidation()` for derived fields.
- Controller signature `store(StoreDealRequest $req)` → `$req->validated()` is the only trusted input.

## Controller shape (thin)

```php
public function store(StoreDealRequest $request, CreateDeal $action): RedirectResponse
{
    $deal = $action->handle($request->validated());     // business logic in the Action
    return back()->with('success', 'Deal created');      // Inertia redirect = fresh props
}
```

## Eloquent API resources

```php
class DealResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'      => $this->id,
            'name'    => $this->name,
            'value'   => $this->value,
            'owner'   => UserResource::make($this->whenLoaded('owner')),  // only if eager-loaded
            'can'     => ['update' => $request->user()->can('update', $this->resource)],
        ];
    }
}
```
`whenLoaded()` prevents N+1; ship `can` flags so the UI mirrors server authz (UI is convenience, server still enforces).

## JSON:API resources (Laravel 13)

For public/partner APIs needing spec compliance — relationship inclusion (`?include=`), sparse fieldsets (`?fields[deals]=`), pagination links, JSON:API headers — use the first-party JSON:API resources instead of hand-rolling. Generate the resource, declare attributes/relationships, return from the controller. Fetch the current generator command + class API via `context7` before scaffolding.

## Inertia 2 props — send only what the page needs

```php
return Inertia::render('Deals/Index', [
    'deals'   => DealResource::collection(
        Deal::with('owner:id,name')->visibleTo($request->user())->paginate(50)
    ),
    'filters' => $request->only('search', 'stage'),
    // expensive / optional data:
    'stats'   => Inertia::defer(fn () => app(DealStats::class)->for($request->user())),  // loads after page paint
    'export'  => Inertia::lazy(fn () => /* only when explicitly requested via partial reload */),
]);
```
- **`defer`**: render page now, fetch heavy props in a follow-up request automatically.
- **`lazy`/`optional`**: only evaluated on a partial reload that asks for them (`router.reload({ only: ['export'] })`).
- **Partial reloads** (`only` / `except`) to refresh slices without a full round-trip.
- Pagination: pass Laravel's paginator through a Resource collection so `meta`/`links` reach the client; the React table reads `meta.last_page` etc.
- Validation errors flow back automatically to Inertia's `errors` — no manual wiring.

## Pagination & list contracts

- Always `paginate()`/`cursorPaginate()` tenant lists — never `get()` unbounded. Cursor pagination for infinite-scroll / very large sets (stable, keyset-based).
- Apply visibility scope (`own/team/all`) to the query before paginating — see `rbac.md`.

## Anti-patterns

- Trusting `$request->all()` / mass-assigning unvalidated input.
- `exists`/`unique` rules against the global table (cross-tenant validation leak).
- Returning whole models (`->toArray()`) instead of a Resource — leaks columns + breaks on schema change.
- Sending every relation/prop on every render — bloats payload; use `whenLoaded` + `defer`/`lazy`.
