<?php

use App\Http\RequestSigning\SignedRequestProtocol as Protocol;

// Cùng bộ vector với resources/js/shared/requestSigning/protocol.test.ts: client ký/mã hoá
// ra đúng thứ máy chủ tính lại.
function requestSigningVectors(): array
{
    return json_decode((string) file_get_contents(__DIR__.'/../../../resources/js/shared/requestSigning/vectors.json'), true);
}

it('encrypts to the shared envelope and decrypts it back', function () {
    $vector = requestSigningVectors()['encryption'];
    $key = base64_decode($vector['key']);

    expect(Protocol::encrypt($key, $vector['plaintext'], base64_decode($vector['iv'])))->toBe($vector['envelope'])
        ->and(Protocol::decrypt($key, $vector['envelope']))->toBe($vector['plaintext']);
});

it('refuses envelopes that were tampered with, truncated or sealed with another key', function (string $envelope, string $key) {
    expect(Protocol::decrypt($key, $envelope))->toBeNull();
})->with(function () {
    $vector = requestSigningVectors()['encryption'];
    $bytes = base64_decode($vector['envelope']);
    $bytes[20] = chr(ord($bytes[20]) ^ 1);
    $key = base64_decode($vector['key']);

    return [
        'flipped ciphertext bit' => [base64_encode($bytes), $key],
        'truncated' => [base64_encode(substr(base64_decode($vector['envelope']), 0, 20)), $key],
        'not base64' => ['***', $key],
        'another key' => [$vector['envelope'], str_repeat('k', 32)],
    ];
});

it('builds the shared canonical string, body digest and signature', function () {
    $vector = requestSigningVectors()['signature'];
    $canonical = Protocol::canonical($vector['method'], $vector['uri'], $vector['timestamp'], $vector['nonce'], Protocol::rawBodyDigest($vector['body']));

    expect(Protocol::rawBodyDigest($vector['body']))->toBe($vector['body_digest'])
        ->and($canonical)->toBe($vector['canonical'])
        ->and(Protocol::sign(base64_decode($vector['key']), $canonical))->toBe($vector['signature'])
        ->and(Protocol::rawBodyDigest(''))->toBe(requestSigningVectors()['empty_body_digest']);
});

it('digests multipart fields and file hashes like the browser client', function () {
    $vector = requestSigningVectors()['multipart'];
    $files = array_map(fn (string $content) => ['sha256' => hash('sha256', $content), 'size' => strlen($content)], $vector['file_contents']);

    expect($files)->toBe($vector['files'])
        ->and(Protocol::multipartDigest($vector['fields'], $files))->toBe($vector['digest'])
        ->and(Protocol::multipartDigest(array_reverse($vector['fields'], true), array_reverse($files)))->toBe($vector['digest']);
});

it('reads the browser form encoding into the same nested fields PHP builds from multipart', function () {
    $vector = requestSigningVectors()['form'];
    parse_str($vector['encoded'], $parsed);

    expect($parsed)->toBe($vector['parsed']);
});
