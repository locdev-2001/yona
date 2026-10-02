<?php

namespace App\Search\Drivers\Meilisearch;

use App\Models\Attachment;
use App\Models\Contact;
use App\Search\Drivers\PostgresSearchEngine;
use App\Search\SearchTarget;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Hình dạng tài liệu của từng chỉ mục: trường tìm giữ nguyên chữ gốc (Meilisearch
 * tự chuẩn hoá dấu), trường lọc/sắp xếp là số — thời gian là giây Unix.
 */
final class MeilisearchDocuments
{
    private const EPOCH_SQL = 'extract(epoch from %s)::bigint';

    private const INTEGER_FIELDS = ['id', 'account_id', 'inbox_id', 'conversation_id', 'contact_id', 'message_id', 'sender_id', 'created_at', 'last_activity_at'];

    // Số điện thoại, mã định danh, mã hội thoại là chuỗi tìm nguyên văn.
    private const TEXT_FIELDS = ['display_id', 'phone_number', 'contact_phone_number', 'identifier', 'contact_identifier'];

    /** @return list<string> */
    public static function searchableAttributes(SearchTarget $target): array
    {
        return match ($target) {
            SearchTarget::Messages => ['content', 'group_sender_name'],
            SearchTarget::Files => ['file_name'],
            SearchTarget::Conversations => ['contact_name', 'mail_subject', 'display_id', 'contact_email', 'contact_phone_number', 'contact_identifier'],
            SearchTarget::Contacts => ['name', 'email', 'phone_number', 'identifier'],
        };
    }

    /** @return list<string> */
    public static function filterableAttributes(SearchTarget $target): array
    {
        return match ($target) {
            SearchTarget::Messages => ['account_id', 'inbox_id', 'conversation_id', 'sender_type', 'sender_id', 'created_at'],
            SearchTarget::Files => ['account_id', 'inbox_id', 'conversation_id', 'message_id', 'sender_type', 'sender_id', 'created_at'],
            SearchTarget::Conversations => ['account_id', 'inbox_id', 'contact_id', 'created_at', 'last_activity_at'],
            SearchTarget::Contacts => ['account_id', 'is_lead', 'created_at', 'last_activity_at'],
        };
    }

    /**
     * Tài liệu hiện có trong PostgreSQL của các id này; id vắng mặt là tài liệu đã
     * xoá hoặc không còn thuộc chỉ mục.
     *
     * @param  list<int>  $ids
     * @return list<array<string, mixed>>
     */
    public static function load(SearchTarget $target, array $ids): array
    {
        return self::query($target, $ids)->get()
            ->map(fn (object $row) => self::normalize((array) $row))
            ->all();
    }

    /** @param  list<int>  $ids */
    private static function query(SearchTarget $target, array $ids): Builder
    {
        $documents = $target->documents()->whereKey($ids)->toBase();

        return match ($target) {
            SearchTarget::Messages => $documents->select(
                'messages.id', 'messages.account_id', 'messages.inbox_id', 'messages.conversation_id',
                'messages.sender_type', 'messages.sender_id', 'messages.content',
            )->selectRaw(PostgresSearchEngine::GROUP_SENDER_NAME_SQL.' as group_sender_name')
                ->selectRaw(self::epoch('messages.created_at').' as created_at'),

            SearchTarget::Files => $documents
                ->join('messages', 'messages.id', '=', 'attachments.attachable_id')
                ->select(
                    'attachments.id', 'messages.account_id', 'messages.inbox_id', 'messages.conversation_id',
                    'messages.id as message_id', 'messages.sender_type', 'messages.sender_id',
                )->selectRaw(Attachment::DISPLAY_NAME_SQL.' as file_name')
                // Mốc nhìn lại và lọc thời gian đi theo tin chứa tệp.
                ->selectRaw(self::epoch('messages.created_at').' as created_at'),

            SearchTarget::Conversations => $documents
                ->leftJoin('contacts', 'contacts.id', '=', 'conversations.contact_id')
                ->select(
                    'conversations.id', 'conversations.account_id', 'conversations.inbox_id', 'conversations.contact_id',
                    'contacts.name as contact_name', 'contacts.email as contact_email',
                    'contacts.phone_number as contact_phone_number', 'contacts.identifier as contact_identifier',
                )->selectRaw('cast(conversations.display_id as text) as display_id')
                ->selectRaw("conversations.additional_attributes ->> 'mail_subject' as mail_subject")
                ->selectRaw(self::epoch('conversations.created_at').' as created_at')
                ->selectRaw(self::epoch('conversations.last_activity_at').' as last_activity_at'),

            SearchTarget::Contacts => $documents->select(
                'contacts.id', 'contacts.account_id', 'contacts.name', 'contacts.email', 'contacts.phone_number', 'contacts.identifier',
            )->selectRaw('contacts.contact_type = ? as is_lead', [Contact::CONTACT_TYPES[Contact::TYPE_LEAD]])
                ->selectRaw(self::epoch('contacts.created_at').' as created_at')
                ->selectRaw(self::epoch('contacts.last_activity_at').' as last_activity_at'),
        };
    }

    /**
     * @param  array<string, mixed>  $document
     * @return array<string, mixed>
     */
    private static function normalize(array $document): array
    {
        foreach ($document as $field => $value) {
            if ($value === null) {
                continue;
            }

            if (in_array($field, self::INTEGER_FIELDS, true)) {
                $document[$field] = (int) $value;
            } elseif (in_array($field, self::TEXT_FIELDS, true)) {
                $document[$field] = (string) $value;
            }
        }

        if (array_key_exists('is_lead', $document)) {
            $document['is_lead'] = (bool) $document['is_lead'];
        }

        return $document;
    }

    private static function epoch(string $column): string
    {
        return sprintf(self::EPOCH_SQL, $column);
    }

    /**
     * Id trong danh sách còn tồn tại trong PostgreSQL.
     *
     * @param  list<int>  $ids
     * @return list<int>
     */
    public static function existingIds(SearchTarget $target, array $ids): array
    {
        $model = new ($target->modelClass());

        return DB::table($model->getTable())->whereIn($model->getKeyName(), $ids)
            ->pluck($model->getKeyName())->map(fn (mixed $id) => (int) $id)->all();
    }
}
