<?php

use App\Models\User;
use App\Notifications\ConfirmationInstructions;
use App\Notifications\ResetPasswordInstructions;
use Illuminate\Notifications\ChannelManager;
use Illuminate\Notifications\Events\NotificationSent;
use Illuminate\Notifications\SendQueuedNotifications;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;

// #157: thư xác thực không được gửi SMTP trong request, và worker phải gửi
// đúng ngôn ngữ người dùng đã chọn lúc bấm nút.

/** Chạy job như worker (locale mặc định khác) và trả về locale lúc gửi thư. */
function deliverQueuedAuthMail(string $notificationClass): string
{
    $job = Queue::pushedJobs()[SendQueuedNotifications::class][0]['job'] ?? null;
    expect($job)->not->toBeNull()
        ->and($job->notification)->toBeInstanceOf($notificationClass);

    $sentIn = null;
    Event::listen(NotificationSent::class, function () use (&$sentIn) {
        $sentIn = App::getLocale();
    });

    App::setLocale('xx');
    $job->handle(app(ChannelManager::class));

    expect(app('mailer')->getSymfonyTransport()->messages())->toHaveCount(1)
        ->and(App::getLocale())->toBe('xx');

    return (string) $sentIn;
}

beforeEach(function () {
    Queue::fake();
    config(['mail.default' => 'array']);
});

it('queues the signup confirmation mail instead of sending it in the request', function () {
    $this->post('/app/auth/signup?locale=vi', [
        'email' => 'bruce@wayne.enterprises',
        'password' => 'Password1!',
    ])->assertRedirect('/app/auth/verify-email');

    expect(app('mailer')->getSymfonyTransport()->messages())->toHaveCount(0);

    Queue::assertPushedOn('high', SendQueuedNotifications::class, function (SendQueuedNotifications $job) {
        return $job->notification instanceof ConfirmationInstructions
            && $job->notification->locale === 'vi'
            && $job->notifiables->first()->email === 'bruce@wayne.enterprises';
    });
});

it('sends the queued confirmation mail in the locale of the signup request', function (string $locale) {
    $this->post("/app/auth/signup?locale={$locale}", [
        'email' => 'bruce@wayne.enterprises',
        'password' => 'Password1!',
    ])->assertRedirect('/app/auth/verify-email');

    expect(deliverQueuedAuthMail(ConfirmationInstructions::class))->toBe($locale);
})->with(['vi', 'en']);

it('queues the password reset mail in the request locale', function (string $locale) {
    $user = User::factory()->create();

    $this->postJson("/app/auth/password?locale={$locale}", ['email' => $user->email])->assertOk();

    expect(app('mailer')->getSymfonyTransport()->messages())->toHaveCount(0)
        ->and(deliverQueuedAuthMail(ResetPasswordInstructions::class))->toBe($locale);
})->with(['vi', 'en']);
