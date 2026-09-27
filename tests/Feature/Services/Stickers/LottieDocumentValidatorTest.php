<?php

use App\Services\Stickers\LottieDocumentValidator;

beforeEach(function () {
    $this->validator = new LottieDocumentValidator;
    $this->fixture = fn (string $name): string => file_get_contents(base_path("tests/Fixtures/stickers/{$name}"));
    $this->ballDocument = fn (): array => json_decode(($this->fixture)('ball-with-poster-marker.json'), true);
    $this->inspectDocument = fn (array $document): array => $this->validator->inspect(json_encode($document));
});

it('accepts clean Lottie and TGS stickers', function (string $fixture) {
    $inspection = $this->validator->inspect(($this->fixture)($fixture));

    expect($inspection)->toHaveKey('document')
        ->and($inspection['document']->layers)->not->toBeEmpty();
})->with([
    'ball-with-poster-marker.json',
    'ball-with-poster-marker.tgs',
    'pulse-without-marker.json',
    'pulse-without-marker.tgs',
    'spinner-with-precomp.json',
    'spinner-with-precomp.tgs',
]);

it('rejects each malicious fixture with its own code', function (string $fixture, string $expectedCode) {
    expect($this->validator->inspect(($this->fixture)($fixture)))->toBe(['rejection' => $expectedCode]);
})->with([
    'embedded bitmap' => ['embedded-bitmap.json', LottieDocumentValidator::EMBEDDED_IMAGE_NOT_ALLOWED],
    'external image' => ['external-image.json', LottieDocumentValidator::EXTERNAL_IMAGE_NOT_ALLOWED],
    'expression' => ['expression.json', LottieDocumentValidator::EXPRESSION_NOT_ALLOWED],
    'text layer and fonts' => ['text-layer.json', LottieDocumentValidator::TEXT_NOT_ALLOWED],
    'precomp cycle' => ['precomp-cycle.json', LottieDocumentValidator::PRECOMP_CYCLE],
    'gzip bomb' => ['gzip-bomb.tgs', LottieDocumentValidator::DECOMPRESSED_TOO_LARGE],
    'truncated json' => ['broken.json', LottieDocumentValidator::INVALID_JSON],
]);

it('stops inflating a gzip bomb long before it can exhaust memory', function () {
    $bomb = ($this->fixture)('gzip-bomb.tgs');
    expect(strlen($bomb))->toBeLessThanOrEqual(LottieDocumentValidator::MAX_UPLOAD_BYTES)
        ->and(strlen(gzdecode($bomb)))->toBeGreaterThan(64 * 1024 * 1024);

    gc_collect_cycles();
    $baseline = memory_get_usage();
    memory_reset_peak_usage();

    $inspection = $this->validator->inspect($bomb);
    $peakGrowth = memory_get_peak_usage() - $baseline;

    expect($inspection)->toBe(['rejection' => LottieDocumentValidator::DECOMPRESSED_TOO_LARGE])
        ->and($peakGrowth)->toBeLessThan(8 * 1024 * 1024);
});

it('rejects uploads over the byte limit before decoding', function () {
    $oversized = str_pad(($this->fixture)('ball-with-poster-marker.json'), LottieDocumentValidator::MAX_UPLOAD_BYTES + 1);

    expect($this->validator->inspect($oversized))->toBe(['rejection' => LottieDocumentValidator::FILE_TOO_LARGE]);
});

it('rejects damaged gzip and truncated gzip streams', function (string $bytes) {
    expect($this->validator->inspect($bytes))->toBe(['rejection' => LottieDocumentValidator::INVALID_GZIP]);
})->with([
    'garbage after the gzip header' => "\x1f\x8b\x08\x00garbage-not-deflate",
    'stream cut in the middle' => fn () => substr(gzencode(str_repeat('{"v":"5"}', 500)), 0, 40),
]);

it('rejects documents missing the minimal Lottie schema', function (Closure $breakDocument) {
    $document = ($this->ballDocument)();
    $breakDocument($document);

    expect(($this->inspectDocument)($document))->toBe(['rejection' => LottieDocumentValidator::INVALID_LOTTIE]);
})->with([
    'missing version' => [function (array &$document) {
        unset($document['v']);
    }],
    'missing layers' => [function (array &$document) {
        unset($document['layers']);
    }],
    'layers is not a list' => [function (array &$document) {
        $document['layers'] = 'none';
    }],
    'missing frame rate' => [function (array &$document) {
        unset($document['fr']);
    }],
    'empty timeline' => [function (array &$document) {
        $document['op'] = $document['ip'];
    }],
    'zero width' => [function (array &$document) {
        $document['w'] = 0;
    }],
    'height is text' => [function (array &$document) {
        $document['h'] = '512';
    }],
]);

it('rejects a JSON value that is not an object', function () {
    expect($this->validator->inspect('[1,2,3]'))->toBe(['rejection' => LottieDocumentValidator::INVALID_LOTTIE]);
});

it('rejects JSON nested deeper than a sticker ever needs', function () {
    $deeplyNested = str_repeat('[', 500).str_repeat(']', 500);

    expect($this->validator->inspect($deeplyNested))->toBe(['rejection' => LottieDocumentValidator::NESTING_TOO_DEEP]);
});

it('enforces the canvas, frame rate and duration limits', function (Closure $stretchDocument, string $expectedCode) {
    $document = ($this->ballDocument)();
    $stretchDocument($document);

    expect(($this->inspectDocument)($document))->toBe(['rejection' => $expectedCode]);
})->with([
    'wider than the canvas limit' => [function (array &$document) {
        $document['w'] = LottieDocumentValidator::MAX_CANVAS_SIZE + 1;
    }, LottieDocumentValidator::CANVAS_TOO_LARGE],
    'taller than the canvas limit' => [function (array &$document) {
        $document['h'] = LottieDocumentValidator::MAX_CANVAS_SIZE + 1;
    }, LottieDocumentValidator::CANVAS_TOO_LARGE],
    'frame rate over the limit' => [function (array &$document) {
        $document['fr'] = LottieDocumentValidator::MAX_FRAME_RATE + 1;
    }, LottieDocumentValidator::FRAME_RATE_TOO_HIGH],
    'longer than the duration limit' => [function (array &$document) {
        $document['op'] = $document['ip'] + $document['fr'] * LottieDocumentValidator::MAX_DURATION_SECONDS + 1;
    }, LottieDocumentValidator::DURATION_TOO_LONG],
]);

it('accepts a sticker exactly at the duration and frame rate limits', function () {
    $document = ($this->ballDocument)();
    $document['fr'] = LottieDocumentValidator::MAX_FRAME_RATE;
    $document['ip'] = 0;
    $document['op'] = LottieDocumentValidator::MAX_FRAME_RATE * LottieDocumentValidator::MAX_DURATION_SECONDS;

    expect(($this->inspectDocument)($document))->toHaveKey('document');
});

it('rejects font or glyph tables even without a text layer', function (string $key, array $table) {
    $document = ($this->ballDocument)();
    $document[$key] = $table;

    expect(($this->inspectDocument)($document))->toBe(['rejection' => LottieDocumentValidator::TEXT_NOT_ALLOWED]);
})->with([
    'fonts' => ['fonts', ['list' => [['fName' => 'Sans', 'fFamily' => 'Sans']]]],
    'chars' => ['chars', [['ch' => 'A', 'fFamily' => 'Sans', 'data' => []]]],
]);

it('finds expressions hidden inside precomp assets', function () {
    $document = ($this->ballDocument)();
    $wobble = $document['layers'][0];
    $wobble['ks']['o']['x'] = 'loopOut()';
    $document['assets'] = [['id' => 'inner', 'layers' => [$wobble]]];

    expect(($this->inspectDocument)($document))->toBe(['rejection' => LottieDocumentValidator::EXPRESSION_NOT_ALLOWED]);
});

it('treats a data URI image without the embedded flag as embedded', function () {
    $document = json_decode(($this->fixture)('embedded-bitmap.json'), true);
    $document['assets'][0]['e'] = 0;

    expect(($this->inspectDocument)($document))->toBe(['rejection' => LottieDocumentValidator::EMBEDDED_IMAGE_NOT_ALLOWED]);
});

it('counts layers after expanding every precomp instance', function () {
    // Ba tầng, mỗi tầng 12 lớp cùng trỏ tầng dưới: tệp nhỏ nhưng trải ra 12^3 lớp.
    $document = ($this->ballDocument)();
    $shapeLayer = $document['layers'][0];
    $precompLayer = fn (string $refId): array => ['ty' => 0, 'refId' => $refId, 'ind' => 1, 'ip' => 0, 'op' => 60, 'st' => 0, 'w' => 512, 'h' => 512, 'ks' => $shapeLayer['ks']];
    $document['assets'] = [
        ['id' => 'level_1', 'layers' => array_fill(0, 12, $precompLayer('level_2'))],
        ['id' => 'level_2', 'layers' => array_fill(0, 12, $precompLayer('level_3'))],
        ['id' => 'level_3', 'layers' => array_fill(0, 12, $shapeLayer)],
    ];
    $document['layers'] = array_fill(0, 12, $precompLayer('level_1'));

    expect(strlen(json_encode($document)))->toBeLessThan(LottieDocumentValidator::MAX_UPLOAD_BYTES)
        ->and(($this->inspectDocument)($document))->toBe(['rejection' => LottieDocumentValidator::TOO_MANY_LAYERS]);
});

it('rejects plain layer lists over the layer limit', function () {
    $document = ($this->ballDocument)();
    $document['layers'] = array_fill(0, LottieDocumentValidator::MAX_LAYERS + 1, ['ty' => 3, 'ind' => 1, 'ip' => 0, 'op' => 60, 'st' => 0, 'ks' => []]);

    expect(($this->inspectDocument)($document))->toBe(['rejection' => LottieDocumentValidator::TOO_MANY_LAYERS]);
});

it('rejects precomps nested deeper than the limit', function () {
    $document = ($this->ballDocument)();
    $shapeLayer = $document['layers'][0];
    $levels = LottieDocumentValidator::MAX_PRECOMP_DEPTH + 1;
    $document['assets'] = [];
    for ($level = 1; $level <= $levels; $level++) {
        $document['assets'][] = ['id' => "level_{$level}", 'layers' => [
            $level === $levels ? $shapeLayer : ['ty' => 0, 'refId' => 'level_'.($level + 1), 'ind' => 1, 'ip' => 0, 'op' => 60, 'st' => 0, 'ks' => []],
        ]];
    }
    $document['layers'] = [['ty' => 0, 'refId' => 'level_1', 'ind' => 1, 'ip' => 0, 'op' => 60, 'st' => 0, 'ks' => []]];

    expect(($this->inspectDocument)($document))->toBe(['rejection' => LottieDocumentValidator::PRECOMP_TOO_DEEP]);
});

it('accepts precomps nested exactly to the limit', function () {
    $document = ($this->ballDocument)();
    $shapeLayer = $document['layers'][0];
    $levels = LottieDocumentValidator::MAX_PRECOMP_DEPTH;
    $document['assets'] = [];
    for ($level = 1; $level <= $levels; $level++) {
        $document['assets'][] = ['id' => "level_{$level}", 'layers' => [
            $level === $levels ? $shapeLayer : ['ty' => 0, 'refId' => 'level_'.($level + 1), 'ind' => 1, 'ip' => 0, 'op' => 60, 'st' => 0, 'ks' => []],
        ]];
    }
    $document['layers'] = [['ty' => 0, 'refId' => 'level_1', 'ind' => 1, 'ip' => 0, 'op' => 60, 'st' => 0, 'ks' => []]];

    expect(($this->inspectDocument)($document))->toHaveKey('document');
});

it('rejects a layer carrying more shapes than the limit', function () {
    $document = ($this->ballDocument)();
    $document['layers'][0]['shapes'] = array_fill(0, LottieDocumentValidator::MAX_SHAPES + 1, ['ty' => 'el']);

    expect(strlen(json_encode($document)))->toBeLessThan(LottieDocumentValidator::MAX_UPLOAD_BYTES)
        ->and(($this->inspectDocument)($document))->toBe(['rejection' => LottieDocumentValidator::TOO_MANY_SHAPES]);
});

it('rejects repeaters that multiply shapes past the limit', function (array $shapes) {
    $document = ($this->ballDocument)();
    $document['layers'][0]['shapes'] = $shapes;

    expect(($this->inspectDocument)($document))->toBe(['rejection' => LottieDocumentValidator::REPEATER_TOO_LARGE]);
})->with([
    'one huge repeater' => [[
        ['ty' => 'el', 'p' => ['a' => 0, 'k' => [0, 0]], 's' => ['a' => 0, 'k' => [4, 4]]],
        ['ty' => 'rp', 'c' => ['a' => 0, 'k' => LottieDocumentValidator::MAX_REPEATER_COPIES + 1]],
    ]],
    'animated copies peaking over the limit' => [[
        ['ty' => 'el', 'p' => ['a' => 0, 'k' => [0, 0]], 's' => ['a' => 0, 'k' => [4, 4]]],
        ['ty' => 'rp', 'c' => ['a' => 1, 'k' => [['t' => 0, 's' => [2]], ['t' => 30, 's' => [LottieDocumentValidator::MAX_REPEATER_COPIES * 10]]]]],
    ]],
    'end value of the old keyframe format' => [[
        ['ty' => 'el', 'p' => ['a' => 0, 'k' => [0, 0]], 's' => ['a' => 0, 'k' => [4, 4]]],
        ['ty' => 'rp', 'c' => ['a' => 1, 'k' => [['t' => 0, 's' => [2], 'e' => [LottieDocumentValidator::MAX_REPEATER_COPIES * 10]], ['t' => 30]]]],
    ]],
    'easing handles overshooting the keyframes' => [[
        ['ty' => 'el', 'p' => ['a' => 0, 'k' => [0, 0]], 's' => ['a' => 0, 'k' => [4, 4]]],
        ['ty' => 'rp', 'c' => ['a' => 1, 'k' => [
            ['t' => 0, 's' => [2], 'o' => ['x' => [0.5], 'y' => [1000]], 'i' => ['x' => [0.5], 'y' => [1000]]],
            ['t' => 30, 's' => [3]],
        ]]],
    ]],
    'nested repeaters multiplying each other' => [[
        ['ty' => 'gr', 'it' => [
            ['ty' => 'el', 'p' => ['a' => 0, 'k' => [0, 0]], 's' => ['a' => 0, 'k' => [4, 4]]],
            ['ty' => 'rp', 'c' => ['a' => 0, 'k' => 20]],
        ]],
        ['ty' => 'rp', 'c' => ['a' => 0, 'k' => 20]],
    ]],
]);

it('does not mistake keyframe easing handles for expressions', function () {
    $inspection = $this->validator->inspect(($this->fixture)('ball-with-poster-marker.json'));

    expect($inspection)->toHaveKey('document');
});

it('exposes every limit for translated messages', function () {
    expect(LottieDocumentValidator::limitPlaceholders())->toMatchArray([
        'max_upload_kb' => 100,
        'max_decompressed_kb' => 1024,
        'max_canvas' => 512,
        'max_frame_rate' => 60,
        'max_seconds' => 3,
    ]);
});

it('reads layer types by value, so a float-coded precomp or text layer cannot skip the checks', function (Closure $rewriteDocument, string $expectedCode) {
    $document = ($this->ballDocument)();
    $shapeLayer = $document['layers'][0];
    $precompLayer = fn (string $refId): array => ['ty' => 0.0, 'refId' => $refId, 'ind' => 1, 'ip' => 0, 'op' => 1, 'st' => 0, 'ks' => $shapeLayer['ks']];
    $rewriteDocument($document, $shapeLayer, $precompLayer);

    // Giữ `0.0` đúng như người upload viết; json_decode đọc ra số thực.
    expect($this->validator->inspect(json_encode($document, JSON_PRESERVE_ZERO_FRACTION)))->toBe(['rejection' => $expectedCode]);
})->with([
    'precomps fanned out behind ty 0.0' => [function (array &$document, array $shapeLayer, Closure $precompLayer) {
        $document['assets'] = [
            ['id' => 'level_1', 'layers' => array_fill(0, 12, $precompLayer('level_2'))],
            ['id' => 'level_2', 'layers' => array_fill(0, 12, $precompLayer('level_3'))],
            ['id' => 'level_3', 'layers' => array_fill(0, 12, $shapeLayer)],
        ];
        $document['layers'] = array_fill(0, 12, $precompLayer('level_1'));
    }, LottieDocumentValidator::TOO_MANY_LAYERS],
    'precomp referencing itself behind ty 0.0' => [function (array &$document, array $shapeLayer, Closure $precompLayer) {
        $document['assets'] = [['id' => 'loop', 'layers' => [$precompLayer('loop')]]];
        $document['layers'][] = $precompLayer('loop');
    }, LottieDocumentValidator::PRECOMP_CYCLE],
    'text layer written as ty 5.0' => [function (array &$document) {
        $document['layers'][] = ['ty' => 5.0, 'ind' => 3, 'ip' => 0, 'op' => 60, 'st' => 0, 'ks' => [], 't' => ['d' => ['k' => []]]];
    }, LottieDocumentValidator::TEXT_NOT_ALLOWED],
]);

it('rejects a layer type that is not a whole number', function (mixed $layerType) {
    $document = ($this->ballDocument)();
    $document['layers'][0]['ty'] = $layerType;

    expect(($this->inspectDocument)($document))->toBe(['rejection' => LottieDocumentValidator::INVALID_LOTTIE]);
})->with([
    'fraction' => [0.4],
    'text' => ['0'],
    'list' => [[0]],
]);

it('rejects duplicate asset ids, since the player draws the first match', function (Closure $firstAsset) {
    $document = ($this->ballDocument)();
    $shapeLayer = $document['layers'][0];
    $precompLayer = ['ty' => 0, 'refId' => 'shared', 'ind' => 9, 'ip' => 0, 'op' => 1, 'st' => 0, 'ks' => $shapeLayer['ks']];
    $fanOut = ['id' => 'fan_out', 'layers' => array_fill(0, 50, $shapeLayer)];
    $document['assets'] = [$firstAsset($shapeLayer, $precompLayer), ['id' => 'shared', 'layers' => []], $fanOut];
    $document['layers'][] = $precompLayer;

    expect(strlen(json_encode($document)))->toBeLessThan(LottieDocumentValidator::MAX_UPLOAD_BYTES)
        ->and(($this->inspectDocument)($document))->toBe(['rejection' => LottieDocumentValidator::INVALID_LOTTIE]);
})->with([
    'heavy precomp behind an empty twin' => [fn (array $shapeLayer, array $precompLayer) => ['id' => 'shared', 'layers' => array_fill(0, 12, [...$precompLayer, 'refId' => 'fan_out'])]],
    'self-referencing precomp behind an empty twin' => [fn (array $shapeLayer, array $precompLayer) => ['id' => 'shared', 'layers' => [$precompLayer]]],
]);

it('rejects image data on an asset even when it also declares precomp layers', function (array $imageKeys, string $expectedCode) {
    $document = ($this->ballDocument)();
    $document['assets'] = [['id' => 'img', 'layers' => [], 'w' => 64, 'h' => 64, ...$imageKeys]];
    $document['layers'][] = ['ty' => 2, 'refId' => 'img', 'ind' => 9, 'ip' => 0, 'op' => 60, 'st' => 0, 'ks' => $document['layers'][0]['ks']];

    expect(($this->inspectDocument)($document))->toBe(['rejection' => $expectedCode]);
})->with([
    'embedded PNG' => [['p' => 'data:image/png;base64,iVBORw0KGgo=', 'e' => 1], LottieDocumentValidator::EMBEDDED_IMAGE_NOT_ALLOWED],
    'external file' => [['u' => 'https://example.invalid/', 'p' => 'x.png', 'e' => 0], LottieDocumentValidator::EXTERNAL_IMAGE_NOT_ALLOWED],
    'external folder alone' => [['u' => 'https://example.invalid/'], LottieDocumentValidator::EXTERNAL_IMAGE_NOT_ALLOWED],
]);

it('caps the points a polystar generates, at its highest animated value', function (array $points) {
    $document = ($this->ballDocument)();
    $document['layers'][0]['shapes'] = [['ty' => 'gr', 'it' => [
        ['ty' => 'sr', 'sy' => 2, 'pt' => $points, 'p' => ['a' => 0, 'k' => [0, 0]], 'r' => ['a' => 0, 'k' => 0], 'or' => ['a' => 0, 'k' => 200], 'os' => ['a' => 0, 'k' => 0]],
        ['ty' => 'fl', 'c' => ['a' => 0, 'k' => [1, 0, 0, 1]], 'o' => ['a' => 0, 'k' => 100]],
    ]]];

    expect(($this->inspectDocument)($document))->toBe(['rejection' => LottieDocumentValidator::POLYSTAR_TOO_COMPLEX]);
})->with([
    'static point count' => [['a' => 0, 'k' => 20000000]],
    'keyframe peak' => [['a' => 1, 'k' => [['t' => 0, 's' => [5]], ['t' => 30, 's' => [LottieDocumentValidator::MAX_POLYSTAR_POINTS + 1]]]]],
    'end value of the old keyframe format' => [['a' => 1, 'k' => [['t' => 0, 's' => [5], 'e' => [2000000]], ['t' => 30]]]],
    'easing handles overshooting the keyframes' => [['a' => 1, 'k' => [
        ['t' => 0, 's' => [3], 'o' => ['x' => [0.5], 'y' => [2000000]], 'i' => ['x' => [0.5], 'y' => [2000000]]],
        ['t' => 30, 's' => [4]],
    ]]],
]);

it('counts every polystar point toward the shape budget', function () {
    $document = ($this->ballDocument)();
    $star = ['ty' => 'sr', 'sy' => 1, 'pt' => ['a' => 0, 'k' => LottieDocumentValidator::MAX_POLYSTAR_POINTS]];
    $document['layers'][0]['shapes'] = array_fill(0, intdiv(LottieDocumentValidator::MAX_SHAPES, LottieDocumentValidator::MAX_POLYSTAR_POINTS) + 1, $star);

    expect(($this->inspectDocument)($document))->toBe(['rejection' => LottieDocumentValidator::TOO_MANY_SHAPES]);
});

it('accepts an ordinary animated star whose easing stays within its keyframes', function () {
    $document = ($this->ballDocument)();
    $document['layers'][0]['shapes'][] = ['ty' => 'sr', 'sy' => 1, 'pt' => ['a' => 1, 'k' => [
        ['t' => 0, 's' => [5], 'o' => ['x' => [0.3], 'y' => [-0.4]], 'i' => ['x' => [0.7], 'y' => [1.4]]],
        ['t' => 30, 's' => [8]],
    ]]];

    expect(($this->inspectDocument)($document))->toHaveKey('document');
});

it('rejects numbers too large to be written back as JSON', function () {
    $json = str_replace('"k":50', '"k":1e400', json_encode(($this->ballDocument)()));

    expect($json)->toContain('1e400')
        ->and($this->validator->inspect($json))->toBe(['rejection' => LottieDocumentValidator::INVALID_LOTTIE]);
});

it('checks the JSON about to be stored with the same document rules, without the upload size limit', function () {
    $document = ($this->ballDocument)();
    $document['meta'] = ['padding' => str_repeat('x', LottieDocumentValidator::MAX_UPLOAD_BYTES)];
    $selfReferencing = ($this->ballDocument)();
    $selfReferencing['assets'] = [['id' => 'loop', 'layers' => [['ty' => 0, 'refId' => 'loop', 'ind' => 1, 'ip' => 0, 'op' => 60, 'st' => 0, 'ks' => []]]]];
    $selfReferencing['layers'][] = ['ty' => 0, 'refId' => 'loop', 'ind' => 9, 'ip' => 0, 'op' => 60, 'st' => 0, 'ks' => []];

    expect($this->validator->inspectStored(json_encode($document)))->toHaveKey('document')
        ->and($this->validator->inspectStored(json_encode($selfReferencing)))->toBe(['rejection' => LottieDocumentValidator::PRECOMP_CYCLE])
        ->and($this->validator->inspectStored(str_repeat(' ', LottieDocumentValidator::MAX_DECOMPRESSED_BYTES + 1)))->toBe(['rejection' => LottieDocumentValidator::DECOMPRESSED_TOO_LARGE]);
});
