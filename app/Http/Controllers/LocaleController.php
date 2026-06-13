<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Persists the user's language preference (design-system §10). Stored on the
 * user + session; SetLocale applies it on the next request.
 */
class LocaleController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'locale' => ['required', Rule::in(['vi', 'en'])],
        ]);

        if ($user = $request->user()) {
            $user->locale = $validated['locale'];
            $user->save();
        }

        $request->session()->put('locale', $validated['locale']);

        return back();
    }
}
