<?php

use App\Models\ZaloConnection;
use App\Support\DbRoleGuard;
use Illuminate\Support\Facades\DB;

/**
 * P10 — boot-guard 2-DB-role. yona_app PHẢI non-superuser (RLS mới có tác
 * dụng); guard trả danh sách connection vi phạm để production từ chối boot.
 *
 * @group rls
 */
it('yona_app (connection mặc định) KHÔNG phải superuser — RLS thật sự áp', function () {
    $row = DB::selectOne('SELECT rolsuper FROM pg_roles WHERE rolname = current_user');

    expect((bool) $row->rolsuper)->toBeFalse();
});

it('DbRoleGuard::superuserViolations trả về connection vi phạm (default không nằm trong đó)', function () {
    $violations = DbRoleGuard::superuserViolations();

    // Connection mặc định (yona_app) không bao giờ được vi phạm.
    expect($violations)->not->toContain(config('database.default'));
    // Dev: owner có thể còn superuser (runbook siết ở prod) — chỉ assert shape.
    foreach ($violations as $violation) {
        expect($violation)->toBeString();
    }
});

it('sequence zalo_connection_id_seq dùng được từ connection mặc định (P10 [d])', function () {
    $id = ZaloConnection::nextConnectionId();

    expect($id)->toBeGreaterThan(0);
});
