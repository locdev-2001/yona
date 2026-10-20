<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Services\Users\Friendships;
use App\Services\Users\UserDirectory;
use App\Services\Users\Username;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UsersController extends Controller
{
    // `scope=friends`: chỉ bạn bè của người tìm (chọn người thêm vào nhóm), ô tìm trống được.
    public function search(Request $request, UserDirectory $directory, Friendships $friendships): JsonResponse
    {
        $input = $request->validate([
            'q' => ['nullable', 'string', 'max:100', 'required_unless:scope,friends'],
            'scope' => ['nullable', 'in:friends'],
        ]);
        $among = ($input['scope'] ?? null) === 'friends' ? $friendships->friendIds($request->user()) : null;

        return response()->json(['payload' => $directory->search($request->user(), (string) ($input['q'] ?? ''), $among)->values()]);
    }

    public function usernameAvailability(Request $request): JsonResponse
    {
        $username = Username::normalize((string) $request->query('username'));

        return response()->json([
            'username' => $username,
            'available' => Username::isAvailable($username, $request->user()),
        ]);
    }
}
