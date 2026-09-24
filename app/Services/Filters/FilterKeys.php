<?php

namespace App\Services\Filters;

/**
 * Nguồn DUY NHẤT mô tả
 * thuộc tính chuẩn nào lọc được, kiểu dữ liệu gì và operator nào hợp lệ.
 * Thêm thuộc tính lọc mới = thêm một dòng ở đây, không sửa service.
 */
final class FilterKeys
{
    private const EQUALITY = ['equal_to', 'not_equal_to'];

    private const EQUALITY_PRESENCE = ['equal_to', 'not_equal_to', 'is_present', 'is_not_present'];

    private const TEXT = ['equal_to', 'not_equal_to', 'contains', 'does_not_contain'];

    private const DATE = ['is_greater_than', 'is_less_than', 'days_before'];

    /** @var array<string, array{attribute_type: string, data_type: string, filter_operators: list<string>}> */
    public const CONVERSATIONS = [
        'status' => ['attribute_type' => 'standard', 'data_type' => 'text', 'filter_operators' => self::EQUALITY],
        'assignee_id' => ['attribute_type' => 'standard', 'data_type' => 'text', 'filter_operators' => self::EQUALITY_PRESENCE],
        'inbox_id' => ['attribute_type' => 'standard', 'data_type' => 'text', 'filter_operators' => self::EQUALITY_PRESENCE],
        'team_id' => ['attribute_type' => 'standard', 'data_type' => 'number', 'filter_operators' => self::EQUALITY_PRESENCE],
        'contact_id' => ['attribute_type' => 'standard', 'data_type' => 'number', 'filter_operators' => self::EQUALITY],
        'priority' => ['attribute_type' => 'standard', 'data_type' => 'text', 'filter_operators' => self::EQUALITY],
        'display_id' => ['attribute_type' => 'standard', 'data_type' => 'number', 'filter_operators' => self::TEXT],
        'campaign_id' => ['attribute_type' => 'standard', 'data_type' => 'number', 'filter_operators' => self::EQUALITY_PRESENCE],
        'labels' => ['attribute_type' => 'standard', 'data_type' => 'labels', 'filter_operators' => self::EQUALITY_PRESENCE],
        'browser_language' => ['attribute_type' => 'additional_attributes', 'data_type' => 'text', 'filter_operators' => self::EQUALITY],
        'conversation_language' => ['attribute_type' => 'additional_attributes', 'data_type' => 'text', 'filter_operators' => self::EQUALITY],
        'referer' => ['attribute_type' => 'additional_attributes', 'data_type' => 'link', 'filter_operators' => self::TEXT],
        'created_at' => ['attribute_type' => 'standard', 'data_type' => 'date', 'filter_operators' => self::DATE],
        'last_activity_at' => ['attribute_type' => 'standard', 'data_type' => 'date', 'filter_operators' => self::DATE],
        'mail_subject' => ['attribute_type' => 'additional_attributes', 'data_type' => 'text', 'filter_operators' => self::TEXT],
    ];

    /** @var array<string, array{attribute_type: string, data_type: string, filter_operators: list<string>}> */
    public const CONTACTS = [
        'name' => ['attribute_type' => 'standard', 'data_type' => 'text_case_insensitive', 'filter_operators' => self::TEXT],
        'phone_number' => ['attribute_type' => 'standard', 'data_type' => 'text', 'filter_operators' => [...self::TEXT, 'starts_with']],
        'email' => ['attribute_type' => 'standard', 'data_type' => 'text_case_insensitive', 'filter_operators' => self::TEXT],
        'identifier' => ['attribute_type' => 'standard', 'data_type' => 'text_case_insensitive', 'filter_operators' => self::EQUALITY],
        'country_code' => ['attribute_type' => 'additional_attributes', 'data_type' => 'text_case_insensitive', 'filter_operators' => self::EQUALITY],
        'city' => ['attribute_type' => 'additional_attributes', 'data_type' => 'text_case_insensitive', 'filter_operators' => self::TEXT],
        'company_name' => ['attribute_type' => 'additional_attributes', 'data_type' => 'text_case_insensitive', 'filter_operators' => self::TEXT],
        'labels' => ['attribute_type' => 'standard', 'data_type' => 'labels', 'filter_operators' => self::EQUALITY_PRESENCE],
        'created_at' => ['attribute_type' => 'standard', 'data_type' => 'date', 'filter_operators' => self::DATE],
        'last_activity_at' => ['attribute_type' => 'standard', 'data_type' => 'date', 'filter_operators' => self::DATE],
        'blocked' => ['attribute_type' => 'standard', 'data_type' => 'boolean', 'filter_operators' => self::EQUALITY],
    ];

    /**
     * ATTRIBUTE_TYPES của FilterService: kiểu hiển thị của custom attribute →
     * kiểu dữ liệu SQL dùng để ép kiểu jsonb.
     *
     * @var array<string, string>
     */
    public const CUSTOM_ATTRIBUTE_DATA_TYPES = [
        'date' => 'date',
        'text' => 'text',
        'number' => 'numeric',
        'link' => 'text',
        'list' => 'text',
        'checkbox' => 'boolean',
    ];

    /** @var array<string, list<string>> */
    public const CUSTOM_ATTRIBUTE_OPERATORS = [
        'text' => ['equal_to', 'not_equal_to', 'contains', 'does_not_contain', 'is_present', 'is_not_present'],
        'numeric' => ['equal_to', 'not_equal_to', 'is_greater_than', 'is_less_than', 'is_present', 'is_not_present'],
        'date' => ['is_greater_than', 'is_less_than', 'days_before', 'is_present', 'is_not_present'],
        'boolean' => ['equal_to', 'not_equal_to', 'is_present', 'is_not_present'],
    ];
}
