<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Services\Users\UserDirectory;
use App\Services\Users\Username;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UsersController extends Controller
{
    public function search(Request $request, UserDirectory $directory): JsonResponse
    {
        $query = (string) $request->validate(['q' => ['required', 'string', 'max:100']])['q'];

        return response()->json(['payload' => $directory->search($request->user(), $query)->values()]);
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
