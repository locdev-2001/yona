<?php

use Illuminate\Support\Facades\Route;
use Modules\Sample\Http\Controllers\SampleController;

Route::get('/sample', [SampleController::class, 'index'])->name('sample.index');
