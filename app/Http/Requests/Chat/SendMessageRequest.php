<?php

namespace App\Http\Requests\Chat;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Hợp đồng HTTP của việc gửi tin trong inbox.
 *
 * Quyền kiểm ở controller qua policy của hội thoại (route-model binding phải
 * chạy xong mới có đối tượng để kiểm), nên `authorize()` ở đây để mở.
 */
class SendMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'text' => ['nullable', 'string', 'max:5000'],
            'attachment_id' => ['nullable', 'uuid'],
            // P06a — quote-reply + sticker
            'reply_to_message_id' => ['nullable', 'uuid'],
            'sticker' => ['nullable', 'array'],
            'sticker.id' => ['required_with:sticker', 'integer', 'min:1'],
            'sticker.cate_id' => ['required_with:sticker', 'integer', 'min:0'],
            'sticker.type' => ['nullable', 'integer'],
            'sticker.url' => ['nullable', 'url:http,https'],
            'sticker.thumbnail' => ['nullable', 'url:http,https'],
        ];
    }
}
