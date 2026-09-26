<?php

use Illuminate\Support\Facades\Storage;

it('xoá ảnh thẻ cũ hơn hạn, giữ ảnh mới và tệp khác trên disk', function () {
    Storage::fake('public');
    $disk = Storage::disk('public');
    $disk->put('card-images/cu.png', 'png');
    $disk->put('card-images/moi.png', 'png');
    $disk->put('avatars/khong-dung.png', 'png');
    touch($disk->path('card-images/cu.png'), now()->subDays(31)->getTimestamp());
    touch($disk->path('avatars/khong-dung.png'), now()->subDays(90)->getTimestamp());

    $this->artisan('messaging:prune-card-images', ['--dry-run' => true])->assertSuccessful();
    expect($disk->exists('card-images/cu.png'))->toBeTrue();

    $this->artisan('messaging:prune-card-images')->assertSuccessful();

    expect($disk->exists('card-images/cu.png'))->toBeFalse()
        ->and($disk->exists('card-images/moi.png'))->toBeTrue()
        ->and($disk->exists('avatars/khong-dung.png'))->toBeTrue();
});
