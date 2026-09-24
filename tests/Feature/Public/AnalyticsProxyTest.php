<?php

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request as UpstreamRequest;
use Illuminate\Support\Facades\Http;

const ANALYTICS_HOST = 'https://plausible.test';
const ANALYTICS_SCRIPT_URL = ANALYTICS_HOST.'/js/pa-test.js';
const ANALYTICS_EVENT_URL = ANALYTICS_HOST.'/api/event';
const BROWSER_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/128.0 Safari/537.36';
const PAGEVIEW_BODY = '{"n":"pageview","u":"https://yona.vn/","d":"yona.vn","r":null}';

beforeEach(function () {
    config()->set('services.plausible.host', ANALYTICS_HOST);
    config()->set('services.plausible.script_path', '/js/pa-test.js');
    config()->set('services.plausible.client_ip_header', 'CF-Connecting-IP');
});

function sendPageview(array $headers = [], string $body = PAGEVIEW_BODY)
{
    return test()->call('POST', '/yv/e', [], [], [], array_merge([
        'CONTENT_TYPE' => 'text/plain',
        'HTTP_USER_AGENT' => BROWSER_USER_AGENT,
    ], $headers), $body);
}

describe('script', function () {
    it('serves the upstream script from the app domain, cached, without cookies', function () {
        Http::fake([ANALYTICS_SCRIPT_URL => Http::response('!function(){/* plausible */}()', 200)]);

        $response = $this->get('/yv/s')->assertOk();

        expect($response->headers->get('Content-Type'))->toContain('application/javascript')
            ->and($response->getContent())->toBe('!function(){/* plausible */}()')
            ->and($response->headers->getCookies())->toBeEmpty();

        $this->get('/yv/s')->assertOk();
        Http::assertSentCount(1);
    });

    it('answers 503 when the upstream fails and does not cache the failure', function () {
        Http::fakeSequence(ANALYTICS_SCRIPT_URL)
            ->push('boom', 500)
            ->push('!function(){}()', 200);

        $this->get('/yv/s')->assertStatus(503)->assertHeader('Cache-Control', 'no-store, private');
        $this->get('/yv/s')->assertOk()->assertSee('!function(){}()', false);
    });
});

describe('event', function () {
    it('forwards the raw event with the visitor user agent and real IP', function () {
        Http::fake([ANALYTICS_EVENT_URL => Http::response('ok', 202)]);

        sendPageview(['HTTP_CF_CONNECTING_IP' => '113.161.10.20'])
            ->assertStatus(202)
            ->assertSee('ok');

        Http::assertSent(fn (UpstreamRequest $request) => $request->url() === ANALYTICS_EVENT_URL
            && $request->method() === 'POST'
            && $request->body() === PAGEVIEW_BODY
            && $request->header('User-Agent') === [BROWSER_USER_AGENT]
            && $request->header('X-Plausible-IP') === ['113.161.10.20']
            && $request->header('X-Forwarded-For') === ['113.161.10.20']
            && ! $request->hasHeader('Cookie'));
    });

    it('passes the dropped marker through so it shows up in DevTools', function () {
        Http::fake([ANALYTICS_EVENT_URL => Http::response('ok', 202, ['x-plausible-dropped' => '1'])]);

        sendPageview(['HTTP_CF_CONNECTING_IP' => '113.161.10.20'])
            ->assertStatus(202)
            ->assertHeader('x-plausible-dropped', '1');
    });

    it('falls back to the connection IP when the CDN header is not a valid IP', function () {
        Http::fake([ANALYTICS_EVENT_URL => Http::response('ok', 202)]);

        sendPageview(['HTTP_CF_CONNECTING_IP' => 'not-an-ip', 'REMOTE_ADDR' => '203.0.113.9'])->assertStatus(202);

        Http::assertSent(fn (UpstreamRequest $request) => $request->header('X-Plausible-IP') === ['203.0.113.9']);
    });

    it('needs no CSRF token and sets no cookie', function () {
        Http::fake([ANALYTICS_EVENT_URL => Http::response('ok', 202)]);

        $response = sendPageview()->assertStatus(202);

        expect($response->headers->getCookies())->toBeEmpty();
    });

    it('rejects oversized bodies without calling the analytics server', function () {
        Http::fake();

        sendPageview(body: str_repeat('a', 9000))->assertStatus(413);

        Http::assertNothingSent();
    });

    it('answers 502 when the analytics server is unreachable', function () {
        Http::fake([ANALYTICS_EVENT_URL => fn () => throw new ConnectionException('Connection refused')]);

        sendPageview()->assertStatus(502);
    });
});

describe('when analytics is not configured', function () {
    beforeEach(fn () => config()->set('services.plausible.host', null));

    it('hides both endpoints', function () {
        Http::fake();

        $this->get('/yv/s')->assertNotFound();
        sendPageview()->assertNotFound();

        Http::assertNothingSent();
    });

    it('renders no analytics snippet on pages', function () {
        $this->get('/')->assertOk()->assertDontSee('plausible.init', false);
    });
});

it('points the page snippet at the first-party paths, never at the analytics host', function () {
    $this->get('/')
        ->assertOk()
        ->assertSee('<script defer src="/yv/s"></script>', false)
        ->assertSee("plausible.init({ endpoint: '\\/yv\\/e' })", false)
        ->assertDontSee('plausible.test', false);
});
