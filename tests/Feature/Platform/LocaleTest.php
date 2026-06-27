<?php

use Illuminate\Support\Arr;
use Modules\Identity\Models\User;

// Bilingual i18n base (design-system §10): vi default, en fallback.

it('resolves platform strings in both locales', function () {
    app()->setLocale('vi');
    expect(__('platform.actions.save'))->toBe('Lưu');

    app()->setLocale('en');
    expect(__('platform.actions.save'))->toBe('Save');
});

it('keeps vi and en platform translation keys in sync', function () {
    $vi = trans('platform', [], 'vi');
    $en = trans('platform', [], 'en');

    expect(array_keys(Arr::dot($vi)))->toEqualCanonicalizing(array_keys(Arr::dot($en)));
});

it('persists a user language preference', function () {
    $user = User::factory()->create(['locale' => null]);

    $this->actingAs($user)->put('/locale', ['locale' => 'en'])->assertRedirect();

    expect($user->fresh()->locale)->toBe('en');
});

it('rejects an unsupported locale', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->put('/locale', ['locale' => 'fr'])->assertSessionHasErrors('locale');
});
