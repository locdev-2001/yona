<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\SuperAdminAuditLog;
use App\Services\Admin\Operations\DataBrowser;
use App\Support\SuperAdmin\AuditActionLabel;
use App\Support\SuperAdminArea;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

// Nhật ký thao tác ghi của super admin, chỉ đọc.
class AuditLogsController extends Controller
{
    public const PER_PAGE = 50;

    public const FILTERS = ['super_admin_id', 'action', 'subject_type', 'subject_id', 'from', 'to'];

    public function index(Request $request): Response
    {
        $filters = array_filter(array_map(
            fn ($value) => is_scalar($value) ? trim((string) $value) : '',
            $request->only(self::FILTERS),
        ), fn (string $value) => $value !== '');

        $logs = $this->filtered($filters)->latest('id')->paginate(self::PER_PAGE)->withQueryString();
        $subjectTypes = SuperAdminAuditLog::query()->whereNotNull('subject_type')->distinct()->orderBy('subject_type')->pluck('subject_type')->all();

        return Inertia::render('superadmin/AuditLogs', [
            'logs' => collect($logs->items())->map(fn (SuperAdminAuditLog $log) => [
                'id' => $log->id,
                'superAdminId' => $log->super_admin_id,
                'superAdminEmail' => $log->super_admin_email,
                'action' => $log->action,
                'actionLabel' => AuditActionLabel::describe((string) $log->action),
                'subjectType' => $log->subject_type,
                'subjectLabel' => AuditActionLabel::subject($log->subject_type, $log->subject_id),
                'subjectId' => $log->subject_id,
                'subjectUrl' => $this->subjectUrl($log),
                'changes' => $log->changes,
                'responseStatus' => $log->response_status,
                'statusLabel' => AuditActionLabel::status($log->response_status),
                'ipAddress' => $log->ip_address,
                'userAgent' => $log->user_agent,
                'createdAt' => $log->created_at?->toIso8601String(),
            ])->all(),
            'pagination' => ['current' => $logs->currentPage(), 'last' => $logs->lastPage(), 'total' => $logs->total()],
            'filters' => (object) $filters,
            'options' => [
                'superAdmins' => SuperAdminAuditLog::query()
                    ->whereNotNull('super_admin_id')
                    ->selectRaw('super_admin_id, max(super_admin_email) as email')
                    ->groupBy('super_admin_id')
                    ->orderBy('email')
                    ->get()
                    ->map(fn ($row) => ['value' => (string) $row->super_admin_id, 'label' => (string) ($row->email ?? "#{$row->super_admin_id}")])
                    ->all(),
                'subjectTypes' => $subjectTypes,
                'subjectTypeLabels' => collect($subjectTypes)->mapWithKeys(fn (string $type) => [$type => AuditActionLabel::subjectTypeLabel($type)])->all(),
            ],
        ]);
    }

    /** @param  array<string, string>  $filters */
    private function filtered(array $filters): Builder
    {
        return SuperAdminAuditLog::query()
            ->when(ctype_digit($filters['super_admin_id'] ?? ''), fn (Builder $query) => $query->where('super_admin_id', (int) $filters['super_admin_id']))
            ->when($filters['action'] ?? null, fn (Builder $query, string $action) => $query->where(fn (Builder $inner) => $inner
                ->where('action', 'ilike', '%'.DataBrowser::escapeLike($action).'%')
                ->orWhereIn('action', $this->actionsLabelled($action))))
            ->when($filters['subject_type'] ?? null, fn (Builder $query, string $type) => $query->where('subject_type', $type))
            ->when(ctype_digit($filters['subject_id'] ?? ''), fn (Builder $query) => $query->where('subject_id', (int) $filters['subject_id']))
            ->when($this->date($filters['from'] ?? null), fn (Builder $query, Carbon $from) => $query->where('created_at', '>=', $from->startOfDay()))
            ->when($this->date($filters['to'] ?? null), fn (Builder $query, Carbon $to) => $query->where('created_at', '<=', $to->endOfDay()));
    }

    /**
     * Route có câu mô tả chứa từ khoá (gõ "khoá" tìm được `POST accounts/{id}/suspend`).
     * Số route khác nhau trong nhật ký nhỏ (vài chục) nên lọc trong PHP.
     *
     * @return list<string>
     */
    private function actionsLabelled(string $keyword): array
    {
        return SuperAdminAuditLog::query()->distinct()->pluck('action')
            ->filter(fn (string $action) => mb_stripos(AuditActionLabel::describe($action), $keyword) !== false)
            ->values()
            ->all();
    }

    private function date(?string $value): ?Carbon
    {
        if ($value === null) {
            return null;
        }

        try {
            return Carbon::createFromFormat('Y-m-d', $value);
        } catch (Throwable) {
            return null;
        }
    }

    private function subjectUrl(SuperAdminAuditLog $log): ?string
    {
        if ($log->subject_id === null) {
            return null;
        }

        return match ($log->subject_type) {
            'accounts' => SuperAdminArea::url("accounts/{$log->subject_id}/overview"),
            'users', 'agent_bots', 'platform_apps', 'access_tokens', 'installation_configs', 'account_users', 'impersonations' => SuperAdminArea::url("{$log->subject_type}/{$log->subject_id}"),
            default => null,
        };
    }
}
