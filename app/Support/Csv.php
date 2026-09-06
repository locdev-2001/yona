<?php

namespace App\Support;

use App\Exceptions\MalformedCsvException;

/**
 * Thay thư viện CSV của Ruby: đọc theo RFC 4180 (báo lỗi khi trích dẫn hỏng —
 * tương đương CSV::MalformedCSVError) và ghi kiểu gem `csv-safe` (vô hiệu hóa
 * ký tự mở đầu công thức để bảng tính không thực thi nội dung).
 */
final class Csv
{
    private const FORMULA_PREFIXES = ['=', '+', '-', '@', "\t", "\r"];

    private const BOM = "\xEF\xBB\xBF";

    /**
     * Chuẩn hóa nội dung tệp: ép UTF-8 (bỏ byte hỏng) và cắt BOM.
     */
    public static function normalize(string $contents): string
    {
        if (! mb_check_encoding($contents, 'UTF-8')) {
            $substitute = mb_substitute_character();
            mb_substitute_character('none');
            $contents = mb_convert_encoding($contents, 'UTF-8', 'UTF-8');
            mb_substitute_character($substitute);
        }

        return str_starts_with($contents, self::BOM) ? substr($contents, strlen(self::BOM)) : $contents;
    }

    /**
     * @return list<list<string>>
     *
     * @throws MalformedCsvException
     */
    public static function parse(string $contents): array
    {
        $contents = self::normalize($contents);
        $rows = [];
        $row = [];
        $field = '';
        $inQuotes = false;
        $fieldStarted = false;
        $length = strlen($contents);

        for ($index = 0; $index < $length; $index++) {
            $char = $contents[$index];

            if ($inQuotes) {
                if ($char !== '"') {
                    $field .= $char;

                    continue;
                }

                $next = $contents[$index + 1] ?? null;

                if ($next === '"') {
                    $field .= '"';
                    $index++;

                    continue;
                }

                if ($next !== null && $next !== ',' && $next !== "\n" && $next !== "\r") {
                    throw new MalformedCsvException('Any value after quoted field isn\'t allowed');
                }

                $inQuotes = false;

                continue;
            }

            if ($char === '"') {
                if ($field !== '') {
                    throw new MalformedCsvException('Illegal quoting');
                }

                $inQuotes = true;
                $fieldStarted = true;

                continue;
            }

            if ($char === ',') {
                $row[] = $field;
                $field = '';
                $fieldStarted = false;

                continue;
            }

            if ($char === "\n" || $char === "\r") {
                if ($char === "\r" && ($contents[$index + 1] ?? null) === "\n") {
                    $index++;
                }

                $row[] = $field;
                $rows[] = $row;
                $row = [];
                $field = '';
                $fieldStarted = false;

                continue;
            }

            $field .= $char;
            $fieldStarted = true;
        }

        if ($inQuotes) {
            throw new MalformedCsvException('Unclosed quoted field');
        }

        if ($field !== '' || $fieldStarted || $row !== []) {
            $row[] = $field;
            $rows[] = $row;
        }

        return $rows;
    }

    /**
     * Đọc theo tiêu đề: trả về [danh sách cột, các dòng dạng map cột => giá trị].
     *
     * @return array{0: list<string>, 1: list<array<string, string>>}
     */
    public static function parseWithHeaders(string $contents): array
    {
        $rows = self::parse($contents);

        if ($rows === []) {
            return [[], []];
        }

        $headers = array_map(static fn (string $header) => trim($header), array_shift($rows));
        $records = [];

        foreach ($rows as $row) {
            if ($row === [''] || $row === []) {
                continue;
            }

            $record = [];

            foreach ($headers as $position => $header) {
                $record[$header] = $row[$position] ?? '';
            }

            $records[] = $record;
        }

        return [$headers, $records];
    }

    /**
     * @param  list<string>  $headers
     * @param  list<list<string|null>>  $rows
     */
    public static function generate(array $headers, array $rows): string
    {
        $lines = [self::line($headers)];

        foreach ($rows as $row) {
            $lines[] = self::line($row);
        }

        return implode("\n", $lines)."\n";
    }

    /** @param list<string|null> $values */
    private static function line(array $values): string
    {
        return implode(',', array_map(static fn ($value) => self::quote(self::neutralize((string) $value)), $values));
    }

    private static function neutralize(string $value): string
    {
        return $value !== '' && in_array($value[0], self::FORMULA_PREFIXES, true) ? "'".$value : $value;
    }

    private static function quote(string $value): string
    {
        return preg_match('/[",\n\r]/', $value) === 1
            ? '"'.str_replace('"', '""', $value).'"'
            : $value;
    }
}
