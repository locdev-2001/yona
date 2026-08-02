<?php

use Opcodes\LogViewer\Facades\LogViewer;

it('discovers and parses nested service process logs', function () {
    $directory = storage_path('logs/zalo-bridge');
    $path = $directory.'/log-viewer-regression.log';

    if (! is_dir($directory)) {
        mkdir($directory, 0775, true);
    }

    file_put_contents($path, implode("\n", [
        '2026-08-02 15:13:37: INFO Logged in as 614728282576931247',
        '2026-08-02 15:13:38: Zalo bridge listener started',
        '',
    ]));

    try {
        LogViewer::clearFileCache();

        $file = LogViewer::getFiles()->firstWhere('path', realpath($path));

        expect($file)->not->toBeNull()
            ->and($file->logs()->get())->toHaveCount(2);
    } finally {
        LogViewer::clearFileCache();
        @unlink($path);
    }
});
