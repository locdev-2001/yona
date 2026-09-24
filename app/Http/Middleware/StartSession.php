<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Contracts\Cache\Factory as CacheFactory;
use Illuminate\Contracts\Container\Container;
use Illuminate\Contracts\Session\Session;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession as FrameworkStartSession;
use Illuminate\Session\SessionManager;
use Symfony\Component\HttpFoundation\Response;

// Một request không được ghi lại hay trả cookie cho phiên mà request khác đã huỷ
// trong lúc nó đang chạy. Phiên bị huỷ khi xoay id (đăng nhập guard nào cũng
// xoay, kể cả console quản trị dùng chung cookie với agent), đăng xuất, hoặc thu
// hồi phiên. Request chậm về sau mà vẫn ghi thì hồi sinh phiên đã huỷ trên store
// ghi đè (redis), và cookie của nó đè cookie phiên mới trong trình duyệt — trình
// duyệt quay về id cũ, mất đăng nhập vừa có.
class StartSession extends FrameworkStartSession
{
    private const CSRF_COOKIE = 'XSRF-TOKEN';

    public function __construct(SessionManager $manager, Container $container)
    {
        parent::__construct($manager, fn () => $container->make(CacheFactory::class));
    }

    protected function handleStatefulRequest(Request $request, $session, Closure $next)
    {
        $request->setLaravelSession($this->startSession($request, $session));
        $resumedSessionId = $this->resumedSessionId($request, $session);

        $this->collectGarbage($session);

        $response = $next($request);

        if ($this->destroyedWhileHandling($session, $resumedSessionId)) {
            $this->withoutCsrfCookie($response);

            return $response;
        }

        $this->storeCurrentUrl($request, $session);
        $this->addCookieToResponse($response, $session);
        $this->saveSession($request);

        return $response;
    }

    // Id phiên trình duyệt gửi lên mà store đang có dữ liệu; phiên mới tạo hay
    // cookie trỏ tới phiên đã hết hạn không tính.
    private function resumedSessionId(Request $request, Session $session): ?string
    {
        $sessionId = $session->getId();

        if ($request->cookies->get($session->getName()) !== $sessionId) {
            return null;
        }

        return $this->storeHas($session, $sessionId) ? $sessionId : null;
    }

    // Chính request này xoay id thì phiên cũ do nó huỷ, phiên mới vẫn phải lưu.
    private function destroyedWhileHandling(Session $session, ?string $resumedSessionId): bool
    {
        return $resumedSessionId !== null
            && $session->getId() === $resumedSessionId
            && ! $this->storeHas($session, $resumedSessionId);
    }

    private function storeHas(Session $session, string $sessionId): bool
    {
        return $session->getHandler()->read($sessionId) !== '';
    }

    // Cookie CSRF mang token của phiên đã huỷ cũng phải bỏ, nếu không request
    // kế tiếp của tab gửi token lệch với phiên mới.
    private function withoutCsrfCookie(Response $response): void
    {
        $config = $this->manager->getSessionConfig();

        $response->headers->removeCookie(self::CSRF_COOKIE, $config['path'], $config['domain']);
    }
}
