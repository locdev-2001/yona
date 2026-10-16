<?php

namespace App\Agent\Tools\Customer;

use App\Agent\Contracts\Extensions\Tool;
use App\Agent\Contracts\Ports\CustomerProfileReader;
use App\Agent\ValueObjects\ToolCall;
use App\Agent\ValueObjects\ToolErrorCode;
use App\Agent\ValueObjects\ToolKind;
use App\Agent\ValueObjects\ToolResult;
use App\Agent\ValueObjects\ToolSpec;
use App\Agent\ValueObjects\TurnContext;

// Hồ sơ của khách đang chat (luôn là khách của hội thoại hiện tại, không nhận id nào).
final class GetCustomerProfileTool implements Tool
{
    public const NAME = 'get_customer_profile';

    public function __construct(private readonly CustomerProfileReader $profiles) {}

    public function spec(): ToolSpec
    {
        return new ToolSpec(
            self::NAME,
            'Read what the shop already knows about the customer in this conversation: name, phone, email, city, the shop\'s '
            .'custom fields (with their keys, for save_customer_info), labels, latest staff notes and their other recent '
            .'conversations. Use it before asking for contact or delivery details (never ask again for what is on file) and '
            .'when the customer refers to an earlier order or chat. name is null when the customer has not given a real name.',
            ['type' => 'object', 'properties' => [], 'additionalProperties' => false],
            ToolKind::Read,
        );
    }

    public function run(ToolCall $call, TurnContext $context): ToolResult
    {
        $profile = $this->profiles->profile($context->conversation);

        if ($profile === null) {
            return ToolResult::failure(ToolErrorCode::SourceUnavailable, 'The customer profile is not available; continue without it.');
        }

        return ToolResult::success([
            'name' => $profile->name,
            'phone_number' => $profile->phoneNumber,
            'email' => $profile->email,
            'city' => $profile->city,
            'custom_fields' => $profile->attributes,
            'labels' => $profile->labels,
            'staff_notes' => $profile->notes,
            'other_conversations' => $profile->otherConversationCount,
            'recent_conversations' => $profile->recentConversations,
        ]);
    }
}
