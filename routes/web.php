<?php

use App\Http\Controllers\AnnouncementReadController;
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\WelcomeController;
use App\Http\Controllers\WhatsNewController;
use App\Http\Controllers\WorkspaceSwitchController;
use Illuminate\Support\Facades\Route;

Route::get('/', WelcomeController::class)->name('home');

Route::middleware(['auth'])->group(function () {
    // Switch active workspace (validated against the user's memberships).
    Route::post('workspaces/{workspace}/switch', WorkspaceSwitchController::class)->name('workspaces.switch');

    // Workspace-scoped app screens require an active membership (IdentifyWorkspace).
    Route::middleware('workspace')->group(function () {
        Route::get('dashboard', DashboardController::class)->name('dashboard');

        // Announcements / What's New — tenant feed + mark-read.
        Route::get('whats-new', WhatsNewController::class)->name('announcements.index');
        Route::post('whats-new/{announcement}/read', AnnouncementReadController::class)->name('announcements.read');

        // P03 — Attachments (polymorphic, download via key not uuid).
        Route::post('attachments', [AttachmentController::class, 'store'])->name('attachments.store');
        Route::get('attachments/{attachmentKey}/download', [AttachmentController::class, 'download'])->name('attachments.download');
        Route::delete('attachments/{attachment}', [AttachmentController::class, 'destroy'])->name('attachments.destroy');

        // P03 — Tags (workspace autocomplete + entity sync).
        Route::get('tags', [TagController::class, 'index'])->name('tags.index');
        Route::post('tags/sync', [TagController::class, 'sync'])->name('tags.sync');

        // P03 — Comments (polymorphic thread).
        Route::post('comments', [CommentController::class, 'store'])->name('comments.store');
        Route::put('comments/{comment}', [CommentController::class, 'update'])->name('comments.update');
        Route::delete('comments/{comment}', [CommentController::class, 'destroy'])->name('comments.destroy');

        // P03 — Notes (internal staff, polymorphic).
        Route::post('notes', [NoteController::class, 'store'])->name('notes.store');
        Route::put('notes/{note}', [NoteController::class, 'update'])->name('notes.update');
        Route::delete('notes/{note}', [NoteController::class, 'destroy'])->name('notes.destroy');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/admin.php';
