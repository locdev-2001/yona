<?php

namespace App\Http\RequestSigning;

use App\Http\Middleware\VerifySignedRequest;
use Illuminate\Routing\Route;
use Illuminate\Routing\Router;

// Client không tự giữ danh sách endpoint phải ký: đọc từ chính bảng route, nên gắn hay gỡ
// middleware ở routes/*.php là đủ, không sửa JS.
final class ProtectedRoutes
{
    public function __construct(private readonly Router $router) {}

    public static function middlewareFor(string $surface): string
    {
        return VerifySignedRequest::class.':'.$surface;
    }

    /** @return list<array{methods: list<string>, pattern: string}> */
    public function for(string $surface): array
    {
        $middleware = self::middlewareFor($surface);
        $routes = [];

        foreach ($this->router->getRoutes()->getRoutes() as $route) {
            if (in_array($middleware, $route->middleware(), true)) {
                $routes[] = [
                    'methods' => array_values(array_diff($route->methods(), ['HEAD'])),
                    'pattern' => $this->pattern($route),
                ];
            }
        }

        return $routes;
    }

    private function pattern(Route $route): string
    {
        $segments = array_map(
            fn (string $segment) => preg_match('/^\{[^}]+\}$/', $segment) ? '[^/]+' : preg_quote($segment, '#'),
            explode('/', trim($route->uri(), '/')),
        );

        return '^/'.implode('/', $segments).'$';
    }
}
