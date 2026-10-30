<?php

namespace App\Support;

use Opcodes\LogViewer\Facades\LogViewer;
use Opcodes\LogViewer\LogLevels\LaravelLogLevel;
use Opcodes\LogViewer\Logs\Log;

/**
 * Một dòng JSON của sidecar Messenger (`storage/logs/messenger-bridge/bridge.log`).
 * Sidecar ghi lại dòng qua json.Marshal của Go nên thứ tự khoá không cố định: đọc bằng
 * json_decode, không bằng regex theo vị trí.
 */
class MessengerBridgeLog extends Log
{
    public const TYPE = 'messenger_bridge';

    public static string $name = 'Messenger bridge';

    public static array $columns = [
        ['label' => 'Datetime', 'data_path' => 'datetime'],
        ['label' => 'Severity', 'data_path' => 'level'],
        ['label' => 'Event', 'data_path' => 'message'],
    ];

    private const LEVELS = [
        'trace' => LaravelLogLevel::Debug,
        'debug' => LaravelLogLevel::Debug,
        'info' => LaravelLogLevel::Info,
        'warn' => LaravelLogLevel::Warning,
        'error' => LaravelLogLevel::Error,
        'fatal' => LaravelLogLevel::Critical,
        'panic' => LaravelLogLevel::Emergency,
    ];

    private const RESERVED_FIELDS = ['time', 'level', 'event', 'message'];

    public static function matches(string $text, ?int &$timestamp = null, ?string &$level = null): bool
    {
        $fields = self::decode($text);
        if ($fields === null) {
            return false;
        }

        try {
            $timestamp = static::parseDatetime($fields['time'])?->timestamp;
        } catch (\Exception) {
            return false;
        }
        $level = self::laravelLevel($fields['level']);

        return true;
    }

    protected function parseText(array &$matches = []): void
    {
        $matches = self::decode($this->text) ?? [];
    }

    protected function fillMatches(array $matches = []): void
    {
        $this->datetime = static::parseDatetime($matches['time'] ?? null)?->setTimezone(LogViewer::timezone());
        $this->level = self::laravelLevel($matches['level'] ?? '');
        $this->message = (string) ($matches['event'] ?? $matches['message'] ?? '');
        $this->context = array_diff_key($matches, array_flip(self::RESERVED_FIELDS));
    }

    private static function decode(string $text): ?array
    {
        $text = trim($text);
        if (! str_starts_with($text, '{')) {
            return null;
        }
        $fields = json_decode($text, true);

        return is_array($fields) && is_string($fields['time'] ?? null) && is_string($fields['level'] ?? null)
            ? $fields
            : null;
    }

    private static function laravelLevel(string $bridgeLevel): string
    {
        return self::LEVELS[strtolower($bridgeLevel)] ?? LaravelLogLevel::None;
    }
}
