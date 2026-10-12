<?php

use App\Models\Channel\Email;
use App\Models\Inbox;
use App\Services\Email\MailServerException;
use App\Services\Imap\FetchEmailService;

it('logout bị treo vẫn kết thúc nhanh và không gửi NOOP hoặc reconnect', function () {
    runStalledImapSocket('LOGOUT', function (Email $channel, string $trace) {
        $startedAt = hrtime(true);
        expect((new FetchEmailService($channel))->perform())->toBe([]);
        expect((hrtime(true) - $startedAt) / 1e9)->toBeLessThan(2.5);
        $commands = file_get_contents($trace);
        expect($commands)->toContain('LOGIN', 'EXAMINE', 'UID SEARCH', 'LOGOUT')
            ->not->toContain('NOOP');
        expect(substr_count($commands, 'LOGIN'))->toBe(1);
    });
})->skip(! extension_loaded('pcntl'), 'Cần pcntl để dựng máy chủ socket local');

it('EXAMINE bị treo được timeout và đóng socket ngay, không chờ logout', function () {
    runStalledImapSocket('EXAMINE', function (Email $channel, string $trace) {
        $startedAt = hrtime(true);
        expect(fn () => (new FetchEmailService($channel))->perform())->toThrow(MailServerException::class);
        expect((hrtime(true) - $startedAt) / 1e9)->toBeLessThan(2.5);
        expect(file_get_contents($trace))->toContain('EXAMINE')->not->toContain('LOGOUT', 'NOOP');
    });
})->skip(! extension_loaded('pcntl'), 'Cần pcntl để dựng máy chủ socket local');

it('máy chủ treo ở bước đăng nhập tới hết giờ là lỗi kết nối, không đòi kết nối lại hộp thư', function () {
    runStalledImapSocket('LOGIN', function (Email $channel) {
        try {
            (new FetchEmailService($channel))->perform();
            $this->fail('Phải ném MailServerException');
        } catch (MailServerException $exception) {
            expect($exception->isAuthentication())->toBeFalse();
        }
    });
})->skip(! extension_loaded('pcntl'), 'Cần pcntl để dựng máy chủ socket local');

function runStalledImapSocket(string $stallCommand, Closure $assertions): void
{
    $server = stream_socket_server('tcp://127.0.0.1:0');
    $port = (int) substr(strrchr(stream_socket_get_name($server, false), ':'), 1);
    $trace = tempnam(sys_get_temp_dir(), 'yona-imap-commands-');
    $child = pcntl_fork();

    if ($child === -1) {
        fclose($server);
        unlink($trace);
        throw new RuntimeException('Không tạo được tiến trình IMAP giả');
    }

    if ($child === 0) {
        $socket = stream_socket_accept($server, 5);
        if ($socket !== false) {
            fwrite($socket, "* OK IMAP test server\r\n");
            while (($line = fgets($socket)) !== false) {
                file_put_contents($trace, $line, FILE_APPEND);
                [$tag, $command] = explode(' ', trim($line), 2);
                if (str_starts_with($command, $stallCommand)) {
                    sleep(4);
                    break;
                }
                $response = match (true) {
                    str_starts_with($command, 'EXAMINE') => "* 0 EXISTS\r\n* OK [UIDVALIDITY 100] stable\r\n* OK [UIDNEXT 1] next\r\n",
                    str_starts_with($command, 'UID SEARCH') => "* SEARCH\r\n",
                    default => '',
                };
                fwrite($socket, $response.$tag." OK done\r\n");
            }
            fclose($socket);
        }
        fclose($server);
        exit(0);
    }

    fclose($server);
    try {
        config(['mail.imap_read_timeout' => 1, 'mail.imap_logout_timeout' => 1]);
        $channel = Email::factory()->create([
            'imap_address' => '127.0.0.1', 'imap_port' => $port, 'imap_enable_ssl' => false,
            'imap_login' => 'probe@example.test', 'imap_password' => 'test-only',
        ]);
        Inbox::factory()->create(['account_id' => $channel->account_id, 'channel_id' => $channel->id, 'channel_type' => 'Channel::Email']);
        $assertions($channel, $trace);
    } finally {
        posix_kill($child, SIGKILL);
        pcntl_waitpid($child, $status);
        unlink($trace);
    }
}
