<?php

use Illuminate\Support\Facades\Route;
use Modules\Sample\Http\Controllers\SampleController;

// Sample API route — demonstrates per-module api.php loading (F8).
// No session, no tenant context — safe for webhooks.
Route::get('/sample/ping', [SampleController::class, 'ping'])->name('sample.ping');
