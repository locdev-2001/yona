<?php

namespace App\Channels;

use App\Models\Contact;

/**
 * Kênh tự suy địa chỉ của một liên hệ trong hộp thư (source_id của contact_inbox)
 * khi lõi cần mở hội thoại mà không có tin đến nào mang sẵn địa chỉ đó. Lõi chỉ
 * hỏi qua contract này, không rẽ nhánh theo loại kênh.
 */
interface AddressesContacts
{
    /** Null khi hồ sơ liên hệ chưa có địa chỉ kênh này gửi tới được. */
    public function contactSourceId(Contact $contact): ?string;
}
