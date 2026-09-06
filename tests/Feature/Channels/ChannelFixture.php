<?php

namespace Tests\Feature\Channels;

// Nạp payload webhook thật đã port từ spec/ của Chatwoot.
class ChannelFixture
{
    /** @return array<string, mixed> */
    public static function load(string $name): array
    {
        return json_decode(file_get_contents(base_path("tests/Fixtures/channels/{$name}.json")), true);
    }
}
