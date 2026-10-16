<?php

// Chữ cố định nhân viên AI để lại trong hội thoại: ghi chú riêng cho nhân viên (không
// nhắc tên ai).
return [
    'notices' => [
        'turn_failed' => ':agent chưa xử lý được tin này nên đã chuyển hội thoại sang thủ công. Nhờ nhân viên trả lời khách.',
        'window_closed' => ':agent chưa gửi được trả lời vì cửa sổ trả lời của kênh đã đóng.',
        'budget_exhausted' => ':agent tạm ngưng trả lời tới hết hôm nay vì đã dùng hết ngân sách AI trong ngày. Nhờ nhân viên trả lời khách.',
    ],
    'handover' => [
        'title' => ':agent chuyển hội thoại cho người (:reason)',
        'reasons' => [
            'binding_info_missing' => 'thiếu thông tin chính xác',
            'customer_requested_human' => 'khách muốn gặp nhân viên',
            'complaint' => 'khách phàn nàn',
            'out_of_scope' => 'ngoài phạm vi tư vấn',
            'other' => 'lý do khác',
        ],
        'default_note' => 'Khách hỏi điều cần thông tin chính xác (giá, chính sách, khuyến mãi, tồn kho) mà chưa tìm được nguồn trong dữ liệu của shop.',
    ],
];
