<?php

use Modules\Projects\Http\Controllers\Tasks\TaskAssigneeController;
use Modules\Projects\Http\Controllers\Tasks\TaskChecklistController;
use Modules\Projects\Http\Controllers\Tasks\TaskController;
use Modules\Projects\Http\Controllers\Tasks\TaskKanbanController;
use Modules\Projects\Http\Controllers\Tasks\TaskStatusController;
use Modules\Projects\Http\Controllers\Tasks\TaskTimerController;
use Illuminate\Support\Facades\Route;

/**
 * P09 — Task routes (class-first, no closures — A4).
 * Nested under auth + workspace middleware (web.php group).
 */
Route::prefix('tasks')->name('tasks.')->group(function () {
    // Task CRUD
    Route::get('/', [TaskController::class, 'index'])->name('index');
    Route::get('/kanban', [TaskController::class, 'kanban'])->name('kanban');
    Route::post('/', [TaskController::class, 'store'])->name('store');
    Route::get('/{task}', [TaskController::class, 'show'])->name('show');
    Route::patch('/{task}', [TaskController::class, 'update'])->name('update');
    Route::delete('/{task}', [TaskController::class, 'destroy'])->name('destroy');

    // Status change
    Route::patch('/{task}/status', [TaskStatusController::class, 'update'])->name('status');

    // Kanban reorder
    Route::patch('/{task}/kanban-order', [TaskKanbanController::class, 'reorder'])->name('kanban-order');

    // Assignees
    Route::patch('/{task}/assignees', [TaskAssigneeController::class, 'update'])->name('assignees.update');

    // Checklist
    Route::post('/{task}/checklist', [TaskChecklistController::class, 'store'])->name('checklist.store');
    Route::patch('/{task}/checklist/{item}/toggle', [TaskChecklistController::class, 'toggle'])->name('checklist.toggle');
    Route::post('/{task}/checklist/reorder', [TaskChecklistController::class, 'reorder'])->name('checklist.reorder');
    Route::delete('/{task}/checklist/{item}', [TaskChecklistController::class, 'destroy'])->name('checklist.destroy');

    // Timers / Timesheets
    Route::post('/{task}/timers/start', [TaskTimerController::class, 'start'])->name('timers.start');
    Route::patch('/{task}/timers/{timer}/stop', [TaskTimerController::class, 'stop'])->name('timers.stop');
    Route::post('/{task}/timers/log', [TaskTimerController::class, 'logManual'])->name('timers.log');
    Route::patch('/{task}/timers/{timer}', [TaskTimerController::class, 'update'])->name('timers.update');
    Route::delete('/{task}/timers/{timer}', [TaskTimerController::class, 'destroy'])->name('timers.destroy');
});
