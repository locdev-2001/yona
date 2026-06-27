<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Modules\Identity\Models\User;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the active locale per request (design-system §10): per-user
 * preference → session → Accept-Language → app default (vi). Datetimes stay
 * UTC; only display/formatting follows the locale.
 */
class SetLocale
{
    private const SUPPORTED = ['vi', 'en'];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        $locale = ($user instanceof User ? $user->locale : null)
            ?? $request->session()->get('locale')
            ?? $request->getPreferredLanguage(self::SUPPORTED)
            ?? config('app.locale');

        if (! in_array($locale, self::SUPPORTED, true)) {
            $locale = config('app.fallback_locale');
        }

        app()->setLocale($locale);

        return $next($request);
    }
}
