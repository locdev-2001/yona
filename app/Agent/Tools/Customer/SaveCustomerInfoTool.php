<?php

namespace App\Agent\Tools\Customer;

use App\Agent\Contracts\Extensions\Tool;
use App\Agent\Contracts\Ports\CustomerProfileWriter;
use App\Agent\ValueObjects\CustomerDetails;
use App\Agent\ValueObjects\ProfileSkip;
use App\Agent\ValueObjects\ToolCall;
use App\Agent\ValueObjects\ToolErrorCode;
use App\Agent\ValueObjects\ToolKind;
use App\Agent\ValueObjects\ToolResult;
use App\Agent\ValueObjects\ToolSpec;
use App\Agent\ValueObjects\TurnContext;

// Lưu thông tin khách tự nói ra vào hồ sơ của khách đang chat. Chỉ điền chỗ trống, không
// bao giờ gộp hồ sơ: phần không lưu được thì hướng mô hình ghi vào ghi chú cho nhân viên.
final class SaveCustomerInfoTool implements Tool
{
    public const NAME = 'save_customer_info';

    private const MAX_CUSTOM_FIELDS = 10;

    private const SKIP_HINTS = [
        ProfileSkip::AlreadySet->value => 'the profile already holds a different value, which was kept',
        ProfileSkip::BelongsToAnotherProfile->value => 'it is on another customer\'s profile; nothing was merged',
        ProfileSkip::InvalidFormat->value => 'the value does not look valid; check it with the customer',
        ProfileSkip::UnknownAttribute->value => 'the shop has no such custom field',
        ProfileSkip::NotAnOption->value => 'the value is not one of the field\'s options',
    ];

    public function __construct(private readonly CustomerProfileWriter $profiles) {}

    public function spec(): ToolSpec
    {
        $text = fn (int $max, string $description) => ['type' => 'string', 'minLength' => 1, 'maxLength' => $max, 'description' => $description];

        return new ToolSpec(
            self::NAME,
            'Save details the customer has just told you into their profile: real name, phone number, email, city, and values '
            .'for the shop\'s custom fields (keys from get_customer_profile, e.g. a delivery address field if the shop has one). '
            .'Only empty fields are filled; existing values are never overwritten and profiles are never merged. Whatever is '
            .'not saved (for example an address when the shop has no field for it) goes into add_private_note for the staff.',
            [
                'type' => 'object',
                'properties' => [
                    'name' => $text(120, 'The name the customer gave.'),
                    'phone_number' => $text(30, 'As the customer wrote it.'),
                    'email' => $text(120, 'As the customer wrote it.'),
                    'city' => $text(80, 'City or province.'),
                    'custom_fields' => [
                        'type' => 'array',
                        'maxItems' => self::MAX_CUSTOM_FIELDS,
                        'uniqueItems' => true,
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'key' => $text(100, 'Custom field key from get_customer_profile.'),
                                'value' => $text(500, 'The value; for a list field, one of its options.'),
                            ],
                            'required' => ['key', 'value'],
                            'additionalProperties' => false,
                        ],
                    ],
                ],
                'additionalProperties' => false,
            ],
            ToolKind::Action,
        );
    }

    public function run(ToolCall $call, TurnContext $context): ToolResult
    {
        $attributes = [];

        foreach ((array) ($call->args['custom_fields'] ?? []) as $field) {
            $attributes[(string) $field['key']] = (string) $field['value'];
        }

        $field = fn (string $name) => isset($call->args[$name]) ? trim((string) $call->args[$name]) : null;

        if ($field('name') === null && $field('phone_number') === null && $field('email') === null && $field('city') === null && $attributes === []) {
            return ToolResult::failure(ToolErrorCode::InvalidArgs, 'Pass at least one detail the customer gave.');
        }

        $update = $this->profiles->save($context->conversation, new CustomerDetails(
            name: $field('name'),
            phoneNumber: $field('phone_number'),
            email: $field('email'),
            city: $field('city'),
            attributes: $attributes,
        ));

        if ($update === null) {
            return ToolResult::failure(ToolErrorCode::SourceUnavailable, 'The customer profile is not available; put the details in add_private_note instead.');
        }

        $skipped = array_map(fn (ProfileSkip $reason) => self::SKIP_HINTS[$reason->value], $update->skipped);

        return ToolResult::success(
            array_filter(['saved' => $update->saved, 'not_saved' => $skipped], fn (array $part) => $part !== []),
            $skipped === [] ? null : 'put the details that were not saved into add_private_note so the staff have them; do not tell the customer about profiles',
        );
    }
}
