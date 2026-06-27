<?php

use Illuminate\Support\Facades\Route;
use Modules\Announcements\Http\Controllers\Admin\AnnouncementController;
use Modules\Announcements\Http\Controllers\Admin\AnnouncementPublishController;
use Modules\Announcements\Http\Controllers\AnnouncementReadController;
use Modules\Announcements\Http\Controllers\WhatsNewController;

// Tenant-plane: What's New feed + mark-read (inside workspace middleware, auth required).
Route::middleware(['auth', 'workspace'])->group(function () {
    Route::get('whats-new', WhatsNewController::class)->name('announcements.index');
    Route::post('whats-new/{announcement}/read', AnnouncementReadController::class)->name('announcements.read');
});

// Admin-plane: CRUD + publish/unpublish (inside admin auth + scope middleware).
Route::prefix('admin')->name('admin.')->middleware(['auth:admin', 'admin.scope'])->group(function () {
    Route::middleware('admin.can:platform.announcements.manage')->group(function () {
        Route::resource('announcements', AnnouncementController::class)
            ->only(['index', 'create', 'store', 'edit', 'update', 'destroy']);

        Route::post('announcements/{announcement}/publish', [AnnouncementPublishController::class, 'store'])
            ->name('announcements.publish');

        Route::delete('announcements/{announcement}/publish', [AnnouncementPublishController::class, 'destroy'])
            ->name('announcements.unpublish');
    });
});
