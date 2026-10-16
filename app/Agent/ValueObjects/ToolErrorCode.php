<?php

namespace App\Agent\ValueObjects;

// Tập mã lỗi đóng mà mô hình nhận trong tool_result.
enum ToolErrorCode: string
{
    case InvalidArgs = 'invalid_args';
    case UnknownRef = 'unknown_ref';
    case NotAllowedThisTurn = 'not_allowed_this_turn';
    case ChannelUnsupported = 'channel_unsupported';
    case UnverifiedSender = 'unverified_sender';
    case Duplicate = 'duplicate';
    case SourceUnavailable = 'source_unavailable';
    case Deferred = 'deferred';
}
