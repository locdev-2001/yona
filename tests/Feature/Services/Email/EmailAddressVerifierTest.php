<?php

use App\Services\Email\Verification\EmailAddressVerifier;
use Illuminate\Support\Facades\Cache;
use Tests\Fixtures\FakeMailDomainResolver;

function verifierWith(FakeMailDomainResolver $resolver): EmailAddressVerifier
{
    return new EmailAddressVerifier($resolver);
}

beforeEach(fn () => Cache::flush());

it('phân loại địa chỉ theo cú pháp và DNS của tên miền', function (string $email, ?string $reason) {
    $resolver = new FakeMailDomainResolver(
        mxHosts: ['gmail.com' => ['gmail-smtp-in.l.google.com'], 'null-mx.vn' => ['']],
        addressDomains: ['chi-co-a.vn'],
    );

    $verification = verifierWith($resolver)->verify($email);

    expect($verification->reason)->toBe($reason)
        ->and($verification->deliverable())->toBe($reason === null);
})->with([
    'có MX' => ['khach@gmail.com', null],
    'không MX nhưng có A (RFC 5321 §5.1)' => ['khach@chi-co-a.vn', null],
    'MX rỗng (RFC 7505)' => ['khach@null-mx.vn', 'domain_no_mail'],
    'không MX không A' => ['khach@khong-ton-tai.vn', 'domain_not_found'],
    'thiếu @' => ['khach.gmail.com', 'invalid_syntax'],
    'hai @' => ['khach@@gmail.com', 'invalid_syntax'],
    'tên miền không có dấu chấm' => ['khach@localhost', 'invalid_syntax'],
    'phần tên quá 64 ký tự' => [str_repeat('a', 65).'@gmail.com', 'invalid_syntax'],
    'cả địa chỉ quá 254 ký tự' => ['a@'.str_repeat('b', 250).'.vn', 'invalid_syntax'],
]);

it('nhớ kết quả theo tên miền, không tra DNS lại trong một giờ', function () {
    $resolver = new FakeMailDomainResolver(mxHosts: ['gmail.com' => ['mx.gmail.com']]);
    $verifier = verifierWith($resolver);

    $verifier->verify('a@gmail.com');
    $verifier->verify('B@Gmail.com');

    expect($resolver->lookups)->toBe(1);

    $this->travel(61)->minutes();
    $verifier->verify('c@gmail.com');

    expect($resolver->lookups)->toBe(2);
});

it('tra DNS lỗi tạm thời thì cho qua và không nhớ', function () {
    $resolver = new FakeMailDomainResolver(failingDomains: ['cham.vn']);
    $verifier = verifierWith($resolver);

    expect($verifier->verify('khach@cham.vn')->deliverable())->toBeTrue();

    $verifier->verify('khach@cham.vn');

    expect($resolver->lookups)->toBe(2);
});

it('lý do đọc được nêu rõ địa chỉ', function () {
    $message = verifierWith(new FakeMailDomainResolver)->verify('khach@khong-ton-tai.vn')->message();

    expect($message)->toBe(__('errors.conversations.email_undeliverable', [
        'email' => 'khach@khong-ton-tai.vn',
        'reason' => __('errors.email_addresses.domain_not_found'),
    ]));
});
