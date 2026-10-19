<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Services\Users\Username;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

// Bước đầu tiên sau đăng ký (hoặc lần đầu vào sau khi đổi sang app nhắn tin):
// chọn tên hiển thị và @username.
class WelcomeController extends Controller
{
    public function show(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if ($user->username !== null) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('v3/views/auth/welcome/Index', [
            'name' => $user->availableName(),
            'suggestedUsername' => Username::suggest($user->email, $user),
        ]);
    }

    public function store(Request $request): HttpResponse
    {
        $user = $request->user();
        $request->merge(['username' => Username::normalize($request->input('username'))]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => Username::rules($user),
        ], [
            'name.required' => __('people.NAME.REQUIRED'),
            ...Username::messages(),
        ]);

        $user->forceFill(['display_name' => $data['name'], 'username' => $data['username']])->save();

        // Trang auth và trang chat dùng hai bộ CSS khác nhau nên phải tải lại trọn trang.
        return Inertia::location(route('dashboard'));
    }
}
