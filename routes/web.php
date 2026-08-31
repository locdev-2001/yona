<?php

use App\Http\Controllers\Auth\SessionsController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::redirect('/', '/app');

Route::middleware('guest')->group(function () {
    Route::get('/app/login', [SessionsController::class, 'create'])->name('login');
    Route::post('/app/login', [SessionsController::class, 'store']);
});

Route::middleware('auth')->group(function () {
    Route::post('/app/logout', [SessionsController::class, 'destroy'])->name('logout');

    Route::get('/app', fn () => Inertia::render('dashboard/Index'))->name('dashboard');
});
