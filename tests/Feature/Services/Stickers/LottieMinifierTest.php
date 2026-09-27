<?php

use App\Services\Stickers\LottieDocumentValidator;
use App\Services\Stickers\LottieMinifier;

beforeEach(function () {
    $this->minifier = new LottieMinifier;
    $this->minify = fn (array|string $document): array => json_decode(
        $this->minifier->minify(json_decode(is_string($document) ? $document : json_encode($document))),
        true,
    );
    $this->layer = fn (int $index, array $extra = []): array => [
        'ty' => 4, 'nm' => "layer {$index}", 'ind' => $index, 'ip' => 0, 'op' => 60, 'st' => 0, 'ks' => [], 'shapes' => [], ...$extra,
    ];
});

it('drops document metadata and names but keeps marker names', function () {
    $minified = ($this->minify)([
        'v' => '5.7.0', 'nm' => 'Composition 1', 'meta' => ['g' => 'exporter'], 'fr' => 30, 'ip' => 0, 'op' => 60, 'w' => 512, 'h' => 512,
        'markers' => [['cm' => 'poster', 'nm' => 'poster', 'tm' => 45, 'dr' => 0]],
        'assets' => [['id' => 'comp_0', 'nm' => 'Pre-comp', 'layers' => [($this->layer)(1)]]],
        'layers' => [($this->layer)(1, ['shapes' => [['ty' => 'el', 'nm' => 'Ellipse Path 1']]])],
    ]);

    expect($minified)->not->toHaveKeys(['nm', 'meta'])
        ->and($minified['markers'][0])->toBe(['cm' => 'poster', 'nm' => 'poster', 'tm' => 45, 'dr' => 0])
        ->and($minified['assets'][0])->toBe(['id' => 'comp_0', 'layers' => [['ty' => 4, 'ind' => 1, 'ip' => 0, 'op' => 60, 'st' => 0, 'ks' => [], 'shapes' => []]]])
        ->and($minified['layers'][0]['shapes'][0])->toBe(['ty' => 'el']);
});

it('removes hidden layers and hidden shapes at every level', function () {
    $minified = ($this->minify)([
        'layers' => [
            ($this->layer)(1, ['hd' => true]),
            ($this->layer)(2, ['shapes' => [
                ['ty' => 'el'],
                ['ty' => 'rc', 'hd' => true],
                ['ty' => 'gr', 'it' => [['ty' => 'sr', 'hd' => true], ['ty' => 'fl']]],
            ]]),
        ],
        'assets' => [['id' => 'comp_0', 'layers' => [($this->layer)(1, ['hd' => true]), ($this->layer)(2)]]],
    ]);

    expect(array_column($minified['layers'], 'ind'))->toBe([2])
        ->and(array_column($minified['layers'][0]['shapes'], 'ty'))->toBe(['el', 'gr'])
        ->and($minified['layers'][0]['shapes'][1]['it'])->toBe([['ty' => 'fl']])
        ->and(array_column($minified['assets'][0]['layers'], 'ind'))->toBe([2]);
});

it('keeps hidden layers that other layers still depend on', function () {
    $minified = ($this->minify)(['layers' => [
        ($this->layer)(1, ['hd' => true]),
        ($this->layer)(2, ['hd' => true, 'td' => 1]),
        ($this->layer)(3, ['tt' => 1, 'parent' => 1]),
        ($this->layer)(4, ['hd' => true]),
        ($this->layer)(5, ['tp' => 4]),
        ($this->layer)(6, ['hd' => true]),
    ]]);

    expect(array_column($minified['layers'], 'ind'))->toBe([1, 2, 3, 4, 5]);
});

it('rounds numbers to two decimals and writes whole numbers without a fraction', function () {
    $minified = $this->minifier->minify(json_decode('{"fr":29.970029,"ip":0.0,"op":60.004,"c":[0.33333,0.666666,1.0,1],"t":-12.346}'));

    expect($minified)->toBe('{"fr":29.97,"ip":0,"op":60,"c":[0.33,0.67,1,1],"t":-12.35}');
});

it('keeps empty objects as objects and empty lists as lists', function () {
    $minified = $this->minifier->minify(json_decode('{"layers":[{"ty":3,"ks":{},"ef":[]}]}'));

    expect($minified)->toBe('{"layers":[{"ty":3,"ks":{},"ef":[]}]}');
});

it('produces the same bytes when minifying its own output', function () {
    $fixture = file_get_contents(base_path('tests/Fixtures/stickers/spinner-with-precomp.json'));
    $once = $this->minifier->minify(json_decode($fixture));

    expect($this->minifier->minify(json_decode($once)))->toBe($once)
        ->and(strlen($once))->toBeLessThan(strlen($fixture));
});

it('keeps a clean sticker valid after minifying', function (string $fixture) {
    $validator = new LottieDocumentValidator;
    $inspection = $validator->inspect(file_get_contents(base_path("tests/Fixtures/stickers/{$fixture}")));

    $minified = $this->minifier->minify($inspection['document']);

    expect($validator->inspect($minified))->toHaveKey('document');
})->with(['ball-with-poster-marker.tgs', 'pulse-without-marker.json', 'spinner-with-precomp.json']);
