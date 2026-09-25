<?php

use App\Http\Controllers\Public\CsatSurveyController;
use App\Http\Controllers\Public\FlowsController;
use Illuminate\Support\Facades\Route;

// Gốc URL thứ hai của mặt tiền `api` (docs/code-standards.md §0.4): API cho bên
// ngoài gọi vào, KHÔNG session, KHÔNG CSRF — khác `api.php` ở chỗ không đòi
// token, người gọi tự chứng minh bằng định danh khó đoán trên URL.
//
// Mặt tiền công khai: không kiểm CSRF.
Route::get('/csat_survey/{uuid}', [CsatSurveyController::class, 'show']);
Route::match(['put', 'patch'], '/csat_survey/{uuid}', [CsatSurveyController::class, 'update']);

// Trang công khai theo token (`/m/{token}`, phase-05 §C).
Route::get('/flows/{token}', [FlowsController::class, 'show'])->where('token', '[0-9A-Za-z]+');
Route::post('/flows/{token}/submit', [FlowsController::class, 'submit'])
    ->where('token', '[0-9A-Za-z]+')
    ->middleware('throttle:public-flow-submit');
