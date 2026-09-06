<?php

use App\Http\Controllers\Public\CsatSurveyController;
use Illuminate\Support\Facades\Route;

// Gốc URL thứ hai của mặt tiền `api` (docs/code-standards.md §0.4): API cho bên
// ngoài gọi vào, KHÔNG session, KHÔNG CSRF — khác `api.php` ở chỗ không đòi
// token, người gọi tự chứng minh bằng định danh khó đoán trên URL.
//
// Port từ khối `namespace :public` trong refs/chatwoot/config/routes.rb
// (`PublicController` cũng `skip_before_action :verify_authenticity_token`).
Route::get('/csat_survey/{uuid}', [CsatSurveyController::class, 'show']);
Route::match(['put', 'patch'], '/csat_survey/{uuid}', [CsatSurveyController::class, 'update']);
