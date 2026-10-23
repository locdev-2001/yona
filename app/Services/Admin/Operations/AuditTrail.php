<?php

namespace App\Services\Admin\Operations;

use App\Models\SuperAdminAuditLog;
use App\Models\User;
use App\Support\SuperAdminArea;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpFoundation\Response;

// Ghi nhật ký mọi thao tác ghi của super admin. Hành động và đối tượng suy từ
// mẫu route (`POST accounts/{id}/suspend` → accounts #id), payload che bí mật
// bằng SensitiveFields trước khi chạm DB.
final class AuditTrail
{
    public const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

    private const IGNORED_INPUT = ['_token', '_method'];

    private const MAX_PAYLOAD_BYTES = 16384;

    public static function isWrite(Request $request): bool
    {
        return in_array($request->getMethod(), self::WRITE_METHODS, true);
    }

    public function record(Request $request, Response $response, ?User $superAdmin): SuperAdminAuditLog
    {
        [$subjectType, $subjectId] = $this->subject($request);

        return SuperAdminAuditLog::query()->create([
            'super_admin_id' => $superAdmin?->getKey(),
            'super_admin_email' => $superAdmin?->email,
            'action' => $request->getMethod().' '.$this->routePattern($request),
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'changes' => $this->payload($request),
            'response_status' => $response->getStatusCode(),
            'ip_address' => $request->ip(),
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 512),
        ]);
    }

    private function routePattern(Request $request): string
    {
        $uri = $request->route()?->uri() ?? ltrim($request->path(), '/');
        $uri = preg_replace('#^'.preg_quote(SuperAdminArea::PREFIX, '#').'(/|$)#', '', $uri);

        return $uri === '' ? '/' : $uri;
    }

    /** @return array{0: ?string, 1: ?int} */
    private function subject(Request $request): array
    {
        $segments = array_values(array_filter(
            explode('/', $this->routePattern($request)),
            fn (string $segment) => $segment !== '' && $segment !== 'api',
        ));

        $type = isset($segments[0]) ? str_replace('-', '_', $segments[0]) : null;
        if ($type === null || str_starts_with($type, '{')) {
            return [null, null];
        }

        $next = $segments[1] ?? '';
        if (! preg_match('/^\{(\w+)\??\}$/', $next, $match)) {
            return [$type, null];
        }

        $value = $request->route($match[1]);

        return [$type, is_numeric($value) ? (int) $value : null];
    }

    /** @return array<string, mixed>|null */
    private function payload(Request $request): ?array
    {
        $input = array_merge($request->except(self::IGNORED_INPUT), $this->describeFiles($request->allFiles()));

        if ($input === []) {
            return null;
        }

        $masked = SensitiveFields::maskTree($input);
        $encoded = json_encode($masked, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

        return $encoded === false || strlen($encoded) > self::MAX_PAYLOAD_BYTES
            ? ['truncated' => true, 'keys' => array_keys($masked)]
            : $masked;
    }

    /**
     * @param  array<array-key, mixed>  $files
     * @return array<array-key, mixed>
     */
    private function describeFiles(array $files): array
    {
        return array_map(
            fn (mixed $file) => $file instanceof UploadedFile
                ? ['file' => $file->getClientOriginalName(), 'size' => $file->getSize()]
                : (is_array($file) ? $this->describeFiles($file) : null),
            $files,
        );
    }
}
