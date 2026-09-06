<?php

use App\Exceptions\MalformedCsvException;
use App\Support\Csv;

// Thay thư viện CSV của Ruby (đọc RFC 4180 + ghi kiểu gem csv-safe).

it('parses rows with headers', function () {
    [$headers, $rows] = Csv::parseWithHeaders("id,name\n1,Ahmed\n2,\"Nguyen, Loc\"\n");

    expect($headers)->toBe(['id', 'name'])
        ->and($rows)->toBe([
            ['id' => '1', 'name' => 'Ahmed'],
            ['id' => '2', 'name' => 'Nguyen, Loc'],
        ]);
});

it('strips the UTF-8 BOM', function () {
    [$headers] = Csv::parseWithHeaders("\xEF\xBB\xBFname,email\nAhmed,ahmed@example.com\n");

    expect($headers)->toBe(['name', 'email']);
});

it('drops invalid UTF-8 bytes instead of failing', function () {
    [, $rows] = Csv::parseWithHeaders("name\nAhm\xC3\x28ed\n");

    expect($rows[0]['name'])->toBe('Ahm(ed');
});

it('keeps emoji intact', function () {
    [, $rows] = Csv::parseWithHeaders("name\nT 🏠 🔥 Test\n");

    expect($rows[0]['name'])->toBe('T 🏠 🔥 Test');
});

it('raises on malformed quoting', function () {
    Csv::parse("id,name\n1,\"Clarice Uzzell,\"missing_quote,918080808080\n");
})->throws(MalformedCsvException::class);

it('neutralises formula leading characters when generating', function () {
    $csv = Csv::generate(['name', 'phone_number'], [['=HYPERLINK("http://evil.example")', '+918080808080']]);

    expect($csv)->toContain("'=HYPERLINK")
        ->and($csv)->toContain("'+918080808080");
});

it('quotes values holding separators', function () {
    expect(Csv::generate(['name'], [['Nguyen, Loc']]))->toBe("name\n\"Nguyen, Loc\"\n");
});
