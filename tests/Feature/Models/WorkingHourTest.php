<?php

use App\Models\Inbox;
use Illuminate\Validation\ValidationException;

// Port từ spec/models/working_hour_spec.rb + spec/models/concerns/out_of_offisable_shared.rb.

it('creates the seven default working hours with the inbox', function () {
    $inbox = Inbox::factory()->create();

    expect($inbox->workingHours()->count())->toBe(7)
        ->and($inbox->weeklySchedule())->toHaveCount(7)
        ->and(collect($inbox->weeklySchedule())->pluck('day_of_week')->all())->toBe([0, 1, 2, 3, 4, 5, 6]);
});

it('is open on monday 10am and closed on sunday 1pm', function () {
    $inbox = Inbox::factory()->create(['working_hours_enabled' => true, 'out_of_office_message' => 'Message']);

    $this->travelTo('2020-10-26 10:00:00');
    expect($inbox->workingNow())->toBeTrue();

    $this->travelTo('2020-11-01 13:00:00');
    expect($inbox->outOfOffice())->toBeTrue();
});

it('is open on friday 12:30 and closed on friday 17:30', function () {
    $inbox = Inbox::factory()->create(['working_hours_enabled' => true]);

    $this->travelTo('2021-09-10 12:30:00');
    expect($inbox->todayWorkingHour()->openNow())->toBeTrue();

    $this->travelTo('2021-09-10 17:30:00');
    expect($inbox->todayWorkingHour()->closedNow())->toBeTrue();
});

it('does not count as out of office when working hours are disabled', function () {
    $inbox = Inbox::factory()->create(['working_hours_enabled' => false]);

    $this->travelTo('2020-11-01 13:00:00');

    expect($inbox->outOfOffice())->toBeFalse();
});

it('stretches open all day to the full day', function () {
    $inbox = Inbox::factory()->create();
    $inbox->workingHours()->where('day_of_week', 5)->first()->update(['open_all_day' => true]);

    $this->travelTo('2022-02-18 11:00:00');
    $workingHour = $inbox->todayWorkingHour();

    expect($workingHour->open_all_day)->toBeTrue()
        ->and($workingHour->open_hour)->toBe(0)
        ->and($workingHour->open_minutes)->toBe(0)
        ->and($workingHour->close_hour)->toBe(23)
        ->and($workingHour->close_minutes)->toBe(59)
        ->and($workingHour->openNow())->toBeTrue();
});

it('rejects open all day and closed all day at the same time', function () {
    $inbox = Inbox::factory()->create();
    $workingHour = $inbox->workingHours()->where('day_of_week', 5)->first();
    $workingHour->open_all_day = true;
    $workingHour->closed_all_day = true;

    expect(fn () => $workingHour->save())
        ->toThrow(ValidationException::class, 'open_all_day and closed_all_day cannot be true at the same time');
});

it('rejects a closing time that is not after the opening time', function () {
    $inbox = Inbox::factory()->create();
    $workingHour = $inbox->workingHours()->where('day_of_week', 1)->first();

    expect(fn () => $workingHour->update(['open_hour' => 17, 'open_minutes' => 0, 'close_hour' => 9, 'close_minutes' => 0]))
        ->toThrow(ValidationException::class, 'Closing time cannot be before opening time');
});

it('requires the hour columns unless the day is closed all day', function () {
    $inbox = Inbox::factory()->create();
    $workingHour = $inbox->workingHours()->where('day_of_week', 1)->first();

    expect(fn () => $workingHour->update(['open_hour' => null]))->toThrow(ValidationException::class);

    $workingHour->update(['closed_all_day' => true, 'open_hour' => null, 'open_minutes' => null, 'close_hour' => null, 'close_minutes' => null]);

    expect($workingHour->fresh()->closed_all_day)->toBeTrue();
});

it('reads the day of week in the inbox timezone', function () {
    $inbox = Inbox::factory()->create(['working_hours_enabled' => true, 'timezone' => 'Australia/Sydney']);

    // 2022-10-09 23:00 UTC = thứ hai 10:00 giờ Sydney → còn trong giờ làm việc.
    $this->travelTo('2022-10-09 23:00:00');

    expect($inbox->todayWorkingHour()->day_of_week)->toBe(1)
        ->and($inbox->workingNow())->toBeTrue();
});

it('copies the account id from the inbox', function () {
    $inbox = Inbox::factory()->create();

    expect($inbox->workingHours()->pluck('account_id')->unique()->all())->toBe([$inbox->account_id]);
});

it('updates only the days given in the weekly schedule payload', function () {
    $inbox = Inbox::factory()->create();

    $inbox->updateWorkingHours([
        ['day_of_week' => 1, 'open_hour' => 10, 'open_minutes' => 0, 'close_hour' => 17, 'close_minutes' => 0],
    ]);

    $schedule = collect($inbox->weeklySchedule())->keyBy('day_of_week');

    expect($schedule[1]['open_hour'])->toBe(10)
        ->and($schedule[2]['open_hour'])->toBe(9);
});

it('skips days that fail validation instead of aborting the whole update', function () {
    $inbox = Inbox::factory()->create();

    $inbox->updateWorkingHours([
        ['day_of_week' => 1, 'open_hour' => 18, 'open_minutes' => 0, 'close_hour' => 9, 'close_minutes' => 0],
        ['day_of_week' => 2, 'open_hour' => 11, 'open_minutes' => 30, 'close_hour' => 19, 'close_minutes' => 0],
    ]);

    $schedule = collect($inbox->weeklySchedule())->keyBy('day_of_week');

    expect($schedule[1]['open_hour'])->toBe(9)
        ->and($schedule[2]['open_hour'])->toBe(11)
        ->and($schedule[2]['open_minutes'])->toBe(30);
});
