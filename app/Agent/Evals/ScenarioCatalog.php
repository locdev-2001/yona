<?php

namespace App\Agent\Evals;

use InvalidArgumentException;
use JsonException;

// Đọc kịch bản từ thư mục: mỗi tệp *.json một kịch bản, sắp theo tên tệp để thứ tự chạy
// ổn định giữa các vòng. Tên tệp phải trùng id để tìm và so sánh không nhầm.
final class ScenarioCatalog
{
    public const DEFAULT_DIRECTORY = __DIR__.'/scenarios';

    public function __construct(private readonly string $directory = self::DEFAULT_DIRECTORY) {}

    /** @return list<Scenario> */
    public function all(): array
    {
        $files = glob(rtrim($this->directory, '/').'/*.json') ?: [];
        sort($files);

        if ($files === []) {
            throw new InvalidArgumentException("No scenario file in {$this->directory}.");
        }

        $scenarios = array_map(fn (string $file) => $this->read($file), $files);
        $ids = array_map(fn (Scenario $scenario) => $scenario->id, $scenarios);

        if (count($ids) !== count(array_unique($ids))) {
            throw new InvalidArgumentException('Scenario ids must be unique.');
        }

        return $scenarios;
    }

    /**
     * @param  list<string>  $ids  rỗng = mọi kịch bản
     * @return list<Scenario>
     */
    public function select(array $ids): array
    {
        $all = $this->all();

        if ($ids === []) {
            return $all;
        }

        $known = array_map(fn (Scenario $scenario) => $scenario->id, $all);
        $unknown = array_diff($ids, $known);

        if ($unknown !== []) {
            throw new InvalidArgumentException('Unknown scenario: '.implode(', ', $unknown).'.');
        }

        return array_values(array_filter($all, fn (Scenario $scenario) => in_array($scenario->id, $ids, true)));
    }

    private function read(string $file): Scenario
    {
        try {
            $raw = json_decode((string) file_get_contents($file), true, 32, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new InvalidArgumentException(basename($file).': '.$exception->getMessage(), previous: $exception);
        }

        if (! is_array($raw)) {
            throw new InvalidArgumentException(basename($file).' must hold one scenario object.');
        }

        $scenario = Scenario::fromArray($raw);

        if (basename($file, '.json') !== $scenario->id) {
            throw new InvalidArgumentException(basename($file)." holds scenario `{$scenario->id}`: the file name must match the id.");
        }

        return $scenario;
    }
}
