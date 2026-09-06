<?php

namespace App\Services\Reports;

use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Thay `CSVSafe.generate_line` của gem csv-safe: ô bắt đầu bằng ký tự công thức
 * bị thêm nháy đơn để bảng tính không thực thi nó.
 */
final class CsvWriter
{
    private const FORMULA_PREFIXES = ['=', '+', '-', '@', "\t", "\r"];

    /** @param list<list<mixed>> $rows */
    public static function download(string $filename, array $rows): StreamedResponse
    {
        $body = implode('', array_map(fn (array $row) => self::line($row), $rows));

        return response()->stream(fn () => print ($body), 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename={$filename}.csv",
        ]);
    }

    /** @param list<mixed> $row */
    public static function line(array $row): string
    {
        return implode(',', array_map(fn ($value) => self::field($value), $row))."\n";
    }

    // Ruby CSV chỉ bọc nháy khi ô chứa dấu phẩy, nháy kép hoặc xuống dòng.
    private static function field(mixed $value): string
    {
        $value = self::escape($value);

        return preg_match('/[",\r\n]/', $value) === 1
            ? '"'.str_replace('"', '""', $value).'"'
            : $value;
    }

    private static function escape(mixed $value): string
    {
        $value = $value === null ? '' : (string) $value;

        return $value !== '' && in_array($value[0], self::FORMULA_PREFIXES, true) ? "'".$value : $value;
    }
}
