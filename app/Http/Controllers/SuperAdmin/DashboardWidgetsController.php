<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Services\Admin\Metrics\DateRange;
use App\Services\Admin\Metrics\WidgetRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class DashboardWidgetsController extends Controller
{
    private const DATE_FORMAT = 'Y-m-d';

    public function __construct(private readonly WidgetRegistry $registry) {}

    public function show(Request $request, string $key): JsonResponse
    {
        $widget = $this->registry->computable($key);
        abort_if($widget === null, 404);

        $range = $this->rangeFrom($request);

        return response()->json([
            'key' => $widget->key(),
            'range' => $range->toArray(),
            'data' => $this->registry->compute($widget, $range),
        ]);
    }

    private function rangeFrom(Request $request): DateRange
    {
        $input = $request->validate([
            'range' => ['nullable', 'string', Rule::in(array_keys(DateRange::PRESETS))],
            'from' => ['nullable', 'required_with:to', 'date_format:'.self::DATE_FORMAT],
            'to' => ['nullable', 'required_with:from', 'date_format:'.self::DATE_FORMAT, 'after_or_equal:from'],
        ]);

        if (isset($input['from'], $input['to'])) {
            try {
                return DateRange::between($input['from'], $input['to']);
            } catch (InvalidArgumentException) {
                throw ValidationException::withMessages([
                    'to' => __('validation.before_or_equal', ['attribute' => 'to', 'date' => DateRange::MAX_DAYS.' days']),
                ]);
            }
        }

        return DateRange::preset($input['range'] ?? DateRange::DEFAULT_PRESET);
    }
}
