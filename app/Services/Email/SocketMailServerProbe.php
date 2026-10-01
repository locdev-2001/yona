<?php

namespace App\Services\Email;

use Symfony\Component\Mailer\Transport\Smtp\Auth\XOAuth2Authenticator;
use Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport;
use Symfony\Component\Mailer\Transport\Smtp\Stream\SocketStream;
use Throwable;
use Webklex\PHPIMAP\ClientManager;

class SocketMailServerProbe implements MailServerProbe
{
    private const TIMEOUT_SECONDS = 15;

    public function checkImap(string $host, int $port, bool $ssl, string $username, ?string $password, bool $oauth = false): void
    {
        $client = (new ClientManager)->make([
            'host' => $host,
            'port' => $port,
            'encryption' => $ssl ? 'ssl' : false,
            'validate_cert' => true,
            'username' => $username,
            'password' => $password,
            'protocol' => 'imap',
            'authentication' => $oauth ? 'oauth' : null,
            'timeout' => self::TIMEOUT_SECONDS,
        ]);

        try {
            $client->connect();
        } catch (Throwable $exception) {
            throw MailServerException::fromImap($exception, $host, $port);
        } finally {
            try {
                $client->disconnect();
            } catch (Throwable) {
                // Đã hỏng kết nối thì không còn gì để đóng.
            }
        }
    }

    public function checkSmtp(string $host, int $port, bool $implicitTls, string $username, ?string $password, bool $verifyPeer = true, bool $oauth = false): void
    {
        $transport = new EsmtpTransport($host, $port, $implicitTls || $port === 465);
        $transport->setUsername($username);
        $transport->setPassword((string) $password);

        if ($oauth) {
            $transport->setAuthenticators([new XOAuth2Authenticator]);
        }

        $stream = $transport->getStream();

        if ($stream instanceof SocketStream) {
            $stream->setTimeout(self::TIMEOUT_SECONDS);

            if (! $verifyPeer) {
                $stream->setStreamOptions(['ssl' => ['verify_peer' => false, 'verify_peer_name' => false]]);
            }
        }

        try {
            $transport->start();
        } catch (Throwable $exception) {
            throw MailServerException::fromSmtp($exception, $host, $port);
        } finally {
            try {
                $transport->stop();
            } catch (Throwable) {
                // Như trên.
            }
        }
    }
}
