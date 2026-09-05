<?php

namespace App\Support;

use Illuminate\Contracts\Validation\Validator;

// Shape 422 của render_record_invalid (concerns/request_exception_handler.rb):
// {message: full_messages nối ', ', attributes: [tên thuộc tính lỗi]}. Validate
// của model Rails nằm ở tầng nhận input trong bản port nên chỗ dựng phản hồi lỗi
// chỉ có một.
final class RecordInvalidResponse
{
    /** @return array<string, mixed> */
    public static function validatedOrAbort(Validator $validator): array
    {
        if ($validator->fails()) {
            abort(response()->json([
                'message' => collect($validator->errors()->all())->implode(', '),
                'attributes' => $validator->errors()->keys(),
            ], 422));
        }

        return $validator->validated();
    }
}
