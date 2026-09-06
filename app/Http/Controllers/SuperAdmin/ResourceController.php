<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Support\SuperAdmin\Dashboard;
use App\Support\SuperAdmin\FieldPresenter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

// Port từ Administrate::ApplicationController + các controller
// refs/chatwoot/app/controllers/super_admin/*: một luồng CRUD duy nhất cho mọi
// tài nguyên, khác biệt nằm trong Dashboard tương ứng.
abstract class ResourceController extends Controller
{
    public const PER_PAGE = 20;

    public function __construct(protected readonly FieldPresenter $presenter) {}

    abstract protected function dashboard(): Dashboard;

    public function index(Request $request): Response
    {
        $dashboard = $this->dashboard();
        $query = $this->scopedQuery();
        $search = trim((string) $request->query('search', ''));

        $this->applySearch($query, $dashboard, $search);
        $this->applyOrder($query, $dashboard, $request);

        $records = $query->paginate(self::PER_PAGE)->withQueryString();
        $orderParams = (array) $request->query($dashboard->singularName(), []);

        return $this->render('Index', [
            'columns' => $this->columns($dashboard),
            'rows' => collect($records->items())->map(fn (Model $record) => [
                'url' => $this->presenter->url($record),
                'cells' => array_map(
                    fn (string $attribute) => $this->presenter->present($dashboard, $record, $attribute, false),
                    $dashboard->collectionAttributes(),
                ),
            ])->all(),
            'pagination' => [
                'current' => $records->currentPage(),
                'last' => $records->lastPage(),
                'total' => $records->total(),
            ],
            'filters' => array_keys($dashboard->collectionFilters()),
            'search' => $search,
            'order' => $orderParams['order'] ?? 'id',
            'direction' => $orderParams['direction'] ?? 'desc',
        ]);
    }

    public function show(Request $request, int $id): Response
    {
        $record = $this->findRecord($id);
        $dashboard = $this->dashboard();

        return $this->render('Show', [
            'record' => $this->recordSummary($record),
            'fields' => array_map(
                fn (string $attribute) => $this->presenter->present($dashboard, $record, $attribute),
                $dashboard->showPageAttributes(),
            ),
            ...$this->showProps($record),
        ]);
    }

    public function create(): Response
    {
        return $this->render('Form', [
            'record' => null,
            'fields' => $this->formFields($this->dashboard()->newRecord()),
            'action' => "/super_admin/{$this->dashboard()->resourceName()}",
            'method' => 'post',
        ]);
    }

    public function edit(int $id): Response
    {
        $record = $this->findRecord($id);

        return $this->render('Form', [
            'record' => $this->recordSummary($record),
            'fields' => $this->formFields($record),
            'action' => "/super_admin/{$this->dashboard()->resourceName()}/{$record->getKey()}",
            'method' => 'put',
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $record = $this->dashboard()->newRecord();
        $this->assign($record, $request);
        $record->save();

        return redirect("/super_admin/{$this->dashboard()->resourceName()}/{$record->getKey()}")
            ->with('notice', Str::headline(class_basename($record)).' was successfully created.');
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $record = $this->findRecord($id);
        $this->assign($record, $request);
        $record->save();

        return redirect("/super_admin/{$this->dashboard()->resourceName()}/{$record->getKey()}")
            ->with('notice', Str::headline(class_basename($record)).' was successfully updated.');
    }

    public function destroy(int $id): RedirectResponse
    {
        $this->findRecord($id)->delete();

        return redirect("/super_admin/{$this->dashboard()->resourceName()}")
            ->with('notice', Str::headline(class_basename($this->dashboard()->modelClass())).' was successfully destroyed.');
    }

    /** Khối bổ sung riêng của từng trang show (biểu mẫu, nút hành động). */
    protected function showProps(Model $record): array
    {
        return [];
    }

    protected function scopedQuery(): Builder
    {
        return $this->dashboard()->baseQuery();
    }

    protected function findRecord(int $id): Model
    {
        return $this->scopedQuery()->findOrFail($id);
    }

    /** Gán tham số form vào bản ghi; controller con đè khi cần xử lý riêng. */
    protected function assign(Model $record, Request $request): void
    {
        $dashboard = $this->dashboard();
        $payload = (array) $request->input($dashboard->singularName(), []);

        foreach ($dashboard->formAttributes() as $attribute) {
            if (array_key_exists($attribute, $payload)) {
                $record->{$attribute} = $payload[$attribute] === '' ? null : $payload[$attribute];
            }
        }
    }

    protected function render(string $page, array $props): Response
    {
        $dashboard = $this->dashboard();

        return Inertia::render("superadmin/resource/{$page}", [
            'actions' => $dashboard->availableActions(),
            'resource' => $dashboard->resourceName(),
            'resourceLabel' => $dashboard->displayName(),
            'singular' => $dashboard->singularName(),
            'singularLabel' => Str::headline($dashboard->singularName()),
            ...$props,
        ]);
    }

    protected function recordSummary(Model $record): array
    {
        return [
            'id' => $record->getKey(),
            'title' => $this->dashboard()->displayResource($record),
            'url' => $this->presenter->url($record),
        ];
    }

    /** @return list<array<string, mixed>> */
    protected function formFields(Model $record): array
    {
        $dashboard = $this->dashboard();

        return array_map(function (string $attribute) use ($dashboard, $record) {
            $type = $dashboard->attributeTypes()[$attribute] ?? 'string';
            $value = $record->exists ? $dashboard->attributeValue($record, $attribute) : null;

            return [
                'name' => $attribute,
                'label' => $dashboard->formFieldLabel($attribute) ?? Str::ucfirst(str_replace('_', ' ', $attribute)),
                'type' => $type,
                'options' => $dashboard->selectOptions($attribute),
                'depends_on' => $dashboard->formFieldDependency($attribute),
                'value' => $value instanceof Model ? $value->getKey() : $this->formValue($value),
            ];
        }, $dashboard->formAttributes());
    }

    private function formValue(mixed $value): mixed
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d\TH:i');
        }

        return is_array($value) ? json_encode($value) : $value;
    }

    private function columns(Dashboard $dashboard): array
    {
        return array_map(fn (string $attribute) => [
            'name' => $attribute,
            'label' => Str::ucfirst(str_replace('_', ' ', $attribute)),
            'html_class' => str_replace('_', '-', $dashboard->attributeTypes()[$attribute] ?? 'string'),
        ], $dashboard->collectionAttributes());
    }

    // Administrate gộp bộ lọc và ô tìm kiếm vào cùng tham số `search`: chuỗi
    // dạng `<tên bộ lọc>:` chạy bộ lọc, còn lại là tìm kiếm chuỗi.
    private function applySearch(Builder $query, Dashboard $dashboard, string $search): void
    {
        if ($search === '') {
            return;
        }

        $filters = $dashboard->collectionFilters();
        $filterName = rtrim($search, ':');

        if (str_ends_with($search, ':') && isset($filters[$filterName])) {
            $filters[$filterName]($query);

            return;
        }

        $attributes = $dashboard->searchableAttributes();

        $query->where(function (Builder $inner) use ($attributes, $search) {
            foreach ($attributes as $attribute) {
                $attribute === 'id'
                    ? $inner->orWhere('id', (int) $search)
                    : $inner->orWhere($attribute, 'ilike', "%{$search}%");
            }
        });
    }

    private function applyOrder(Builder $query, Dashboard $dashboard, Request $request): void
    {
        $params = (array) $request->query($dashboard->singularName(), []);
        $order = (string) ($params['order'] ?? 'id');
        $direction = ($params['direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';

        // Cột tính toán (count_field, quan hệ, avatar…) không tồn tại trong SQL,
        // rơi về `id` — Administrate cũng chỉ sắp xếp trên cột thật.
        $sortableTypes = ['number', 'string', 'select', 'date_time', 'confirmed_at_field', 'account_status_field', 'secret_field'];

        if (! in_array($dashboard->attributeTypes()[$order] ?? null, $sortableTypes, true)) {
            $order = 'id';
        }

        $query->orderBy($order, $direction);
    }
}
