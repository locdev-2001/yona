<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Chat\UserBlocks;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class UserBlocksController extends Controller
{
    public function store(Request $request, UserBlocks $blocks): Response
    {
        $userId = (int) $request->validate(['user_id' => ['required', 'integer', 'exists:users,id']])['user_id'];
        $blocks->block($request->user(), User::query()->findOrFail($userId));

        return response()->noContent();
    }

    public function destroy(Request $request, User $user, UserBlocks $blocks): Response
    {
        $blocks->unblock($request->user(), $user);

        return response()->noContent();
    }
}
