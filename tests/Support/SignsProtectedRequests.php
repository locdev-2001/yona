<?php

namespace Tests\Support;

use App\Http\Middleware\VerifySignedRequest;
use App\Http\RequestSigning\RequestBody;
use App\Http\RequestSigning\SignedRequestProtocol as Protocol;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Request as SymfonyRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Nơi DUY NHẤT test gửi request đã ký: request tới route có VerifySignedRequest được xin khoá
 * qua endpoint thật rồi mã hoá + ký giống hệt client trình duyệt, nên mọi test nhắn tin sẵn có
 * đi qua đúng đường giải mã của production. Test cần request trơn gọi withoutRequestSigning().
 */
trait SignsProtectedRequests
{
    private const SIGNING_KEY_PATHS = [
        'dashboard' => '/api/v1/request_signing_key',
        'widget' => '/api/v1/widget/request_signing_key',
    ];

    private bool $signsProtectedRequests = true;

    public function withoutRequestSigning(): static
    {
        $this->signsProtectedRequests = false;

        return $this;
    }

    public function withRequestSigning(): static
    {
        $this->signsProtectedRequests = true;

        return $this;
    }

    public function call($method, $uri, $parameters = [], $cookies = [], $files = [], $server = [], $content = null): TestResponse
    {
        $surface = $this->signsProtectedRequests && config('request_protection.signing.enabled')
            ? $this->signingSurface($method, $uri, $server)
            : null;
        $grant = $surface === null ? null : $this->requestSigningGrant($surface, $uri, $cookies, $server);

        if ($grant === null) {
            return parent::call($method, $uri, $parameters, $cookies, $files, $server, $content);
        }

        $files = array_merge($files, $this->extractFilesFromDataArray($parameters));
        [$parameters, $content] = $this->sealBody($method, $parameters, $files, $server, $content, base64_decode($grant['encryption_key']));

        $probe = Request::createFromBase(SymfonyRequest::create($this->prepareUrlForRequest($uri), $method, $parameters, $cookies, $files, $server, $content));
        $timestamp = (string) now()->getTimestamp();
        $nonce = Str::random(22);
        $canonical = Protocol::canonical($method, $probe->getRequestUri(), $timestamp, $nonce, RequestBody::digest($probe));

        $server = [
            ...$server,
            'HTTP_'.$this->serverHeaderName(Protocol::HEADER_KEY_ID) => $grant['key_id'],
            'HTTP_'.$this->serverHeaderName(Protocol::HEADER_TIMESTAMP) => $timestamp,
            'HTTP_'.$this->serverHeaderName(Protocol::HEADER_NONCE) => $nonce,
            'HTTP_'.$this->serverHeaderName(Protocol::HEADER_SIGNATURE) => Protocol::sign(base64_decode($grant['signing_key']), $canonical),
        ];

        return parent::call($method, $uri, $parameters, $cookies, $files, $server, $content);
    }

    /** @param array<string, mixed> $server */
    private function signingSurface(string $method, string $uri, array $server): ?string
    {
        try {
            $route = app('router')->getRoutes()->match(Request::create($this->prepareUrlForRequest($uri), $method, server: $server));
        } catch (HttpException) {
            return null;
        }

        foreach ($route->middleware() as $middleware) {
            if (is_string($middleware) && str_starts_with($middleware, VerifySignedRequest::class.':')) {
                return Str::after($middleware, ':');
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $cookies
     * @param  array<string, mixed>  $server
     * @return array{key_id: string, encryption_key: string, signing_key: string}|null
     */
    private function requestSigningGrant(string $surface, string $uri, array $cookies, array $server): ?array
    {
        $query = parse_url($uri, PHP_URL_QUERY);
        $keyUri = self::SIGNING_KEY_PATHS[$surface].($query ? '?'.$query : '');
        $headers = array_diff_key($server, array_flip(['CONTENT_TYPE', 'CONTENT_LENGTH', 'HTTP_CONTENT_TYPE']));

        $response = parent::call('POST', $keyUri, [], $cookies, [], [...$headers, 'HTTP_ACCEPT' => 'application/json']);
        $grant = $response->isOk() ? $response->json() : null;

        return ($grant['enabled'] ?? false) ? $grant : null;
    }

    /**
     * Cùng quy tắc với resources/js/shared/requestSigning/signer.ts: JSON thành một phong bì,
     * form/multipart gom trường chữ vào `_encrypted` (trừ `_method`), tệp giữ nguyên.
     *
     * @param  array<string, mixed>  $parameters
     * @param  array<string, mixed>  $files
     * @param  array<string, mixed>  $server
     * @return array{0: array<string, mixed>, 1: ?string}
     */
    private function sealBody(string $method, array $parameters, array $files, array $server, ?string $content, string $encryptionKey): array
    {
        if ($content !== null) {
            $decoded = json_decode($content, true);

            return [$parameters, $decoded === [] ? $content : json_encode([Protocol::ENCRYPTED_FIELD => Protocol::encrypt($encryptionKey, $content)])];
        }

        if ($parameters === [] || strtoupper($method) === 'GET') {
            return [$parameters, $content];
        }

        $plainFields = array_intersect_key($parameters, array_flip(Protocol::PLAIN_MULTIPART_FIELDS));
        $textFields = array_diff_key($parameters, $plainFields);
        $sealed = $textFields === [] ? [] : [Protocol::ENCRYPTED_FIELD => Protocol::encrypt($encryptionKey, $this->formEncode($textFields))];

        return [[...$sealed, ...$plainFields], $content];
    }

    // Như URLSearchParams của trình duyệt: mọi giá trị là chuỗi, null thành chuỗi rỗng.
    private function formEncode(array $fields, string $prefix = ''): string
    {
        $pairs = [];
        foreach ($fields as $name => $value) {
            $key = $prefix === '' ? (string) $name : $prefix.'['.$name.']';
            $pairs[] = is_array($value)
                ? $this->formEncode($value, $key)
                : rawurlencode($key).'='.rawurlencode(match (true) {
                    $value === null => '',
                    is_bool($value) => $value ? '1' : '0',
                    default => (string) $value,
                });
        }

        return implode('&', array_filter($pairs, fn (string $pair) => $pair !== ''));
    }

    private function serverHeaderName(string $header): string
    {
        return strtoupper(str_replace('-', '_', $header));
    }
}
