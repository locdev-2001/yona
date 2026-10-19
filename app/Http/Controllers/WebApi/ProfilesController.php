<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\ConfirmationInstructions;
use App\Services\Users\PrivacySettings;
use App\Services\Users\Username;
use App\Support\AlertSound\AgentAlertPreference;
use App\Support\Appearance\ColorScheme;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

// availability + auto_offline tách ở ProfileAvailabilityController;
// reset_access_token (F8), set_active_account (khi account switcher cần) chưa port.
class ProfilesController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json($this->profilePayload($request->user()));
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($request->filled('password')) {
            if (! Hash::check((string) $request->input('current_password'), $user->password)) {
                return response()->json(['message' => 'Invalid current password'], 422);
            }

            $request->validate(['password' => ['confirmed', ...User::passwordRules()]]);
            $user->password = $request->input('password');
        }

        if ($request->has('username')) {
            $request->merge(['username' => Username::normalize($request->input('username'))]);
        }

        $data = $request->validate([
            'username' => ['sometimes', ...Username::rules($user)],
            'bio' => ['sometimes', 'nullable', 'string', 'max:160'],
            ...PrivacySettings::rules(),
            'name' => ['sometimes', 'string', 'max:255'],
            'display_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email'],
            'message_signature' => ['sometimes', 'nullable', 'string'],
            'ui_settings' => ['sometimes', 'array'],
            'phone_number' => ['sometimes', 'nullable', 'string'],
            'avatar' => ['sometimes', 'file', 'mimes:jpg,jpeg,png,gif,webp', 'max:15360'],
        ], Username::messages());

        $user->fill(collect($data)->only(['name', 'display_name', 'message_signature'])->all());
        $user->forceFill(collect($data)->only(['username', 'bio'])->all());

        if (array_key_exists('privacy', $data)) {
            $user->privacy = PrivacySettings::resolve([...PrivacySettings::resolve($user->privacy), ...$data['privacy']]);
        }

        if (array_key_exists('ui_settings', $data)) {
            // Kiểm riêng: luật lồng trong cùng validate() làm validated() bỏ mất các khoá ui_settings khác.
            $request->validate([
                ...AgentAlertPreference::rules(),
                ...ColorScheme::rules(),
                // null = theo ngôn ngữ của tài khoản.
                'ui_settings.locale' => ['nullable', 'string', Rule::in(array_column(config('yona.available_locales', []), 'iso_639_1_code'))],
            ]);
            $user->ui_settings = array_merge($user->ui_settings ?? [], $data['ui_settings']);
        }

        if (array_key_exists('phone_number', $data)) {
            $user->custom_attributes = array_merge(
                $user->custom_attributes ?? [],
                ['phone_number' => $data['phone_number']],
            );
        }

        $emailChanged = isset($data['email']) && mb_strtolower($data['email']) !== $user->email;
        if ($emailChanged) {
            $this->startEmailChange($user, mb_strtolower($data['email']));
        }

        if ($request->file('avatar') instanceof UploadedFile) {
            $user->replaceAvatar($request->file('avatar'));
        }

        $user->save();

        if ($emailChanged) {
            $user->notify(new ConfirmationInstructions);
        }

        return response()->json($this->profilePayload($user));
    }

    public function destroyAvatar(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->removeAvatar();

        return response()->json($this->profilePayload($user->refresh()));
    }

    // Devise reconfirmable: email cũ giữ nguyên tới khi bấm link xác nhận
    // (ConfirmationsController sẽ hoán đổi), mail gửi về địa chỉ mới.
    private function startEmailChange(User $user, string $newEmail): void
    {
        $user->unconfirmed_email = $newEmail;
        $user->confirmation_token = Str::random(40);
        $user->confirmation_sent_at = now();
    }

    // Tương đương api/v1/models/_user.json.jbuilder (các trường đã port;
    // access_token/accounts vào F8, availability lấy theo account ở sidebar).
    private function profilePayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'display_name' => $user->display_name,
            'available_name' => $user->availableName(),
            'username' => $user->username,
            'bio' => $user->bio,
            'privacy' => PrivacySettings::resolve($user->privacy),
            'email' => $user->email,
            'unconfirmed_email' => $user->unconfirmed_email,
            'avatar_url' => $user->avatarUrl(),
            'message_signature' => $user->message_signature,
            'ui_settings' => $user->ui_settings ?? [],
            'custom_attributes' => $user->custom_attributes ?? [],
            'confirmed' => $user->isConfirmed(),
            'pubsub_token' => $user->pubsub_token,
        ];
    }
}
