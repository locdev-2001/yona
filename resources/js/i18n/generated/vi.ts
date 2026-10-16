// Sinh bởi `php artisan i18n:generate` từ lang/{locale}/*.php — KHÔNG SỬA TAY.
const messages: Record<string, unknown> = {
    "ADMIN_ALERTS": {
        "NAV": "Cảnh báo",
        "TITLE": "Cảnh báo",
        "DESCRIPTION": "Vượt ngưỡng thì mọi super admin nhận email và thông báo đẩy khi sự cố mở và khi hồi phục. Đo lại mỗi 5 phút.",
        "RULES_TITLE": "Luật cảnh báo",
        "FIRING_SINCE": "Đang báo từ {time}",
        "RULES": {
            "failing_channels": {
                "TITLE": "Kênh đang lỗi",
                "DESCRIPTION": "Hộp thư mất phiên hoặc cần cấp quyền lại trên toàn hệ thống."
            },
            "failed_jobs": {
                "TITLE": "Job lỗi",
                "DESCRIPTION": "Số job lỗi trong cửa sổ đánh giá."
            },
            "queue_backlog": {
                "TITLE": "Job đang chờ",
                "DESCRIPTION": "Tổng job chưa được xử lý trên mọi hàng đợi."
            },
            "queue_wait": {
                "TITLE": "Thời gian chờ hàng đợi",
                "DESCRIPTION": "Job chờ lâu nhất trên mọi hàng đợi."
            },
            "zalo_bridge_down": {
                "TITLE": "zalo-bridge không phản hồi",
                "DESCRIPTION": "Bridge không trả lời thì tin Zalo không gửi, không nhận được."
            }
        },
        "STATUS": {
            "ok": "Bình thường",
            "firing": "Đang báo",
            "pending": "Vượt ngưỡng, chờ đủ cửa sổ",
            "disabled": "Đã tắt",
            "unknown": "Chưa đo"
        },
        "STATS": {
            "FIRING": "Đang báo",
            "ENABLED": "Luật đang bật",
            "INCIDENTS_7D": "Sự cố 7 ngày",
            "RECIPIENTS": "Super admin nhận email"
        },
        "COLUMNS": {
            "RULE": "Luật",
            "CURRENT": "Hiện tại",
            "THRESHOLD": "Ngưỡng",
            "WINDOW": "Cửa sổ",
            "COOLDOWN": "Chờ báo lại",
            "STATUS": "Trạng thái",
            "ENABLED": "Bật"
        },
        "WINDOW_MODE": {
            "lookback": "Đếm trong {minutes} phút gần nhất",
            "sustain": "Vượt liên tục {minutes} phút",
            "sustain_now": "Vượt là báo ngay"
        },
        "FIELDS": {
            "THRESHOLD": "Ngưỡng",
            "THRESHOLD_STATE": "Báo khi bridge không phản hồi",
            "WINDOW_MINUTES": "Cửa sổ (phút)",
            "COOLDOWN_MINUTES": "Chờ giữa hai lần báo (phút)",
            "ENABLED": "Bật luật {rule}",
            "EDIT": "Sửa",
            "EDIT_RULE": "Sửa luật {rule}",
            "SAVE": "Lưu",
            "CANCEL": "Huỷ",
            "MINUTES": "{count} phút",
            "INVALID": "Nhập số nguyên: ngưỡng từ 1 trở lên, cửa sổ và thời gian chờ từ 0 đến {max} phút."
        },
        "MEASURED": "Đo {time}",
        "OPEN_PAGE": "Mở trang liên quan",
        "DISPLAY": {
            "SECONDS": "{count} giây",
            "MINUTES": "{count} phút",
            "MINUTES_SECONDS": "{minutes} phút {seconds} giây",
            "HOURS": "{count} giờ",
            "HOURS_MINUTES": "{hours} giờ {minutes} phút",
            "DOWN": "Không phản hồi",
            "UP": "Đang phản hồi",
            "NONE": "Chưa đo"
        },
        "INCIDENTS": {
            "TITLE": "Lịch sử sự cố",
            "TOTAL": "{total} sự cố",
            "COLUMNS": {
                "RULE": "Luật",
                "OPENED": "Mở lúc",
                "RESOLVED": "Hồi phục",
                "PEAK": "Cao nhất / ngưỡng",
                "NOTIFIED": "Thông báo"
            },
            "OPEN": "Đang báo",
            "NOTIFIED": "Đã báo",
            "NOT_NOTIFIED": "Chưa báo, đang trong thời gian chờ",
            "RECOVERY_NOTIFIED": "Đã báo sự cố và hồi phục",
            "EMPTY_TITLE": "Chưa có sự cố nào",
            "EMPTY_DESCRIPTION": "Khi một chỉ số vượt ngưỡng, sự cố hiện ở đây kèm lúc mở và lúc hồi phục."
        },
        "TEST": {
            "BUTTON": "Gửi thử",
            "HINT": "Gửi email và thông báo đẩy thử tới chính bạn."
        },
        "PUSH": {
            "TITLE": "Thông báo đẩy trên trình duyệt này",
            "ON": "Trình duyệt này đang nhận cảnh báo.",
            "OFF": "Bật để nhận cảnh báo ngay trên máy, kể cả khi chưa mở email.",
            "ENABLE": "Bật thông báo đẩy",
            "DISABLE": "Tắt trên trình duyệt này",
            "UNSUPPORTED": "Trình duyệt này hoặc máy chủ chưa hỗ trợ thông báo đẩy.",
            "DENIED": "Trình duyệt đã chặn quyền thông báo. Mở cài đặt trang để cho phép rồi thử lại.",
            "FAILED": "Không bật được thông báo đẩy. Thử lại sau.",
            "SUBSCRIPTIONS": "{count} trình duyệt của bạn đang nhận"
        },
        "WIDGET": {
            "OPEN": "Sự cố đang mở",
            "LATEST": "Gần nhất",
            "NONE": "Chưa có sự cố nào.",
            "RESOLVED": "Đã hồi phục",
            "VIEW": "Mở trang Cảnh báo"
        },
        "FLASH": {
            "SAVED": "Đã lưu luật :rule.",
            "TEST_SENT": "Đã gửi thông báo thử tới :email.",
            "TEST_FAILED": "Không gửi được thông báo thử. Xem log ứng dụng."
        },
        "VALUES": {
            "UNKNOWN": "chưa đo",
            "SECONDS": ":count giây",
            "DOWN": "không phản hồi",
            "UP": "đang phản hồi"
        },
        "MAIL": {
            "OPENED_SUBJECT": "[Cảnh báo] :rule vượt ngưỡng",
            "OPENED_TITLE": "Hệ thống vừa vượt ngưỡng cảnh báo",
            "OPENED_VALUE": ":rule: :value (ngưỡng :threshold).",
            "OPENED_STATE": ":rule. :description",
            "OPENED_AT": "Bắt đầu lúc :time (giờ Việt Nam).",
            "ACTION": "Xem chi tiết",
            "RESOLVED_SUBJECT": "[Đã hồi phục] :rule",
            "RESOLVED_TITLE": "Chỉ số đã hồi phục",
            "RESOLVED_VALUE": ":rule đã về dưới ngưỡng: hiện :value (ngưỡng :threshold).",
            "RESOLVED_STATE": "Đã hết tình trạng \":rule\".",
            "RESOLVED_DURATION": "Sự cố kéo dài từ :from đến :to (giờ Việt Nam).",
            "TEST_SUBJECT": "[Thử] Cảnh báo vận hành",
            "TEST_TITLE": "Thông báo thử",
            "TEST_BODY": "Đây là thông báo thử từ trang Cảnh báo. Bạn nhận được nghĩa là kênh này đang chạy.",
            "TEST_ACTION": "Mở trang Cảnh báo",
            "FOOTER": "Chỉnh ngưỡng hoặc tắt luật tại :url",
            "SALUTATION": "Cảnh báo vận hành"
        }
    },
    "ADMIN_DASHBOARD": {
        "TITLE": "Tổng quan",
        "DESCRIPTION": "Số liệu toàn hệ thống. Mỗi ô tự tải và làm mới riêng.",
        "RANGE": {
            "LABEL": "Khoảng thời gian",
            "PRESETS": {
                "7D": "7 ngày",
                "30D": "30 ngày",
                "90D": "90 ngày"
            },
            "COMPARED": "so với kỳ trước",
            "SNAPSHOT": "Tính đến hiện tại",
            "PREVIOUS": "Kỳ trước: {value}"
        },
        "ACTIONS": {
            "CUSTOMIZE": "Tuỳ chỉnh",
            "DONE": "Xong",
            "RESET": "Về mặc định",
            "REFRESH": "Làm mới {title}",
            "HIDE": "Ẩn {title}",
            "SHOW": "Hiện lại",
            "DRAG": "Kéo để đổi chỗ {title}",
            "SIZE": "Độ rộng của {title}",
            "MENU": "Tuỳ chọn cho {title}",
            "RETRY": "Thử lại",
            "VIEW_ALL": "Xem tất cả"
        },
        "SIZES": {
            "SM": "Hẹp",
            "MD": "Vừa",
            "LG": "Rộng",
            "FULL": "Toàn dòng"
        },
        "EDIT": {
            "HINT": "Kéo tay nắm để đổi chỗ (bàn phím: Tab tới tay nắm, Space để nhấc, mũi tên để di chuyển, Space để thả). Thay đổi tự lưu.",
            "HIDDEN_TITLE": "Ô đang ẩn",
            "HIDDEN_EMPTY": "Không có ô nào đang ẩn.",
            "SAVING": "Đang lưu bố cục…",
            "SAVED": "Đã lưu bố cục.",
            "SAVE_FAILED": "Không lưu được bố cục. Thay đổi chỉ còn trên trình duyệt này.",
            "ALL_HIDDEN": "Mọi ô đang ẩn. Bấm Tuỳ chỉnh để hiện lại.",
            "PICKED_UP": "Đã nhấc {title}.",
            "MOVED_OVER": "{title} đang ở vị trí {position}.",
            "DROPPED": "Đã thả {title} ở vị trí {position}.",
            "CANCELLED": "Đã huỷ kéo {title}."
        },
        "STATE": {
            "ERROR": "Không tải được số liệu.",
            "EMPTY": "Chưa có dữ liệu trong khoảng này.",
            "UNAVAILABLE": "Không khả dụng"
        },
        "WIDGETS": {
            "KPIS": {
                "TITLE": "Chỉ số chính",
                "DESCRIPTION": "Số tổng và chênh lệch so với kỳ trước cùng độ dài."
            },
            "MESSAGES_TREND": {
                "TITLE": "Tin nhắn theo ngày",
                "DESCRIPTION": "Tin khách gửi vào và tin trả lời ra mỗi ngày."
            },
            "CONVERSATIONS_BY_CHANNEL": {
                "TITLE": "Hội thoại theo kênh",
                "DESCRIPTION": "Hội thoại mới tạo trong khoảng, chia theo loại kênh."
            },
            "CHANNEL_HEALTH": {
                "TITLE": "Sức khoẻ kênh",
                "DESCRIPTION": "Hộp thư mất phiên hoặc cần cấp quyền lại."
            },
            "ALERTS": {
                "TITLE": "Cảnh báo",
                "DESCRIPTION": "Sự cố cảnh báo đang mở và sự cố gần nhất."
            },
            "OPERATION_LINKS": {
                "TITLE": "Lối tắt vận hành",
                "DESCRIPTION": "Mở nhanh các bảng theo dõi hệ thống."
            },
            "ACTIVATION_FUNNEL": {
                "TITLE": "Phễu kích hoạt",
                "DESCRIPTION": "Chỉ tính tài khoản đăng ký trong khoảng đang xem."
            },
            "COHORT_RETENTION": {
                "TITLE": "Giữ chân theo tuần đăng ký",
                "DESCRIPTION": "Tỉ lệ tài khoản còn trả lời khách ở các tuần sau khi đăng ký (8 tuần gần nhất)."
            },
            "SIGNUPS_TREND": {
                "TITLE": "Đăng ký mới theo ngày",
                "DESCRIPTION": "Số tài khoản tạo mỗi ngày."
            },
            "TOP_ACCOUNTS": {
                "TITLE": "Tài khoản nhắn nhiều nhất",
                "DESCRIPTION": "Tối đa 8 tài khoản có nhiều tin nhất trong khoảng."
            },
            "RECENT_SIGNUPS": {
                "TITLE": "Tài khoản mới nhất",
                "DESCRIPTION": "Tối đa 8 tài khoản đăng ký gần đây nhất."
            },
            "QUEUE_HEALTH": {
                "TITLE": "Hàng đợi",
                "DESCRIPTION": "Job đang chờ, job lỗi và tiến trình xử lý."
            },
            "STICKERS": {
                "TITLE": "Kho sticker",
                "DESCRIPTION": "Kho chung và kho riêng của các tài khoản."
            },
            "SYSTEM": {
                "TITLE": "Hệ thống",
                "DESCRIPTION": "Phiên bản và dung lượng cơ sở dữ liệu."
            }
        },
        "METRICS": {
            "ACCOUNTS_TOTAL": "Tổng tài khoản",
            "ACCOUNTS_NEW": "Tài khoản mới",
            "ACCOUNTS_ACTIVE": "Tài khoản hoạt động",
            "USERS_TOTAL": "Nhân viên",
            "CONVERSATIONS_NEW": "Hội thoại mới",
            "MESSAGES_INCOMING": "Tin vào",
            "MESSAGES_OUTGOING": "Tin ra",
            "INBOXES_TOTAL": "Hộp thư"
        },
        "FUNNEL_STEPS": {
            "SIGNED_UP": "Đăng ký tài khoản",
            "CONFIRMED_EMAIL": "Xác nhận email",
            "CREATED_INBOX": "Tạo hộp thư",
            "CONNECTED_CHANNEL": "Kết nối kênh",
            "RECEIVED_MESSAGE": "Nhận tin khách đầu tiên",
            "REPLIED": "Trả lời khách lần đầu"
        },
        "FUNNEL": {
            "FROM_START": "{rate}% so với đăng ký",
            "FROM_PREVIOUS": "{rate}% so với bước trước",
            "PREVIOUS_EMPTY": "Bước trước chưa có tài khoản",
            "BASELINE": "Mốc 100% để so các bước sau"
        },
        "TREND": {
            "TOTAL": "Tổng trong khoảng",
            "PEAK": "Ngày cao nhất",
            "PEAK_INCOMING": "Ngày nhiều tin vào nhất",
            "PEAK_MESSAGES": "{count} tin, ngày {date}",
            "ON_DATE": "ngày {date}",
            "AVERAGE": "Trung bình mỗi ngày",
            "REPLY_RATIO": "Tin ra trên tin vào"
        },
        "SERIES": {
            "INCOMING": "Tin vào",
            "OUTGOING": "Tin ra",
            "SIGNUPS": "Đăng ký"
        },
        "CHART": {
            "SUMMARY": "{label}: tổng {total}, cao nhất {max} vào {date}.",
            "TABLE": "Bảng số liệu",
            "DATE": "Ngày"
        },
        "COHORT": {
            "WEEK": "Tuần đăng ký",
            "SIZE": "Tài khoản",
            "OFFSET_GROUP": "% còn trả lời khách, theo tuần sau đăng ký",
            "CELL": "Tuần {week}, tuần thứ {offset}: {active} trên {size} tài khoản ({rate}%)"
        },
        "CHANNEL_HEALTH": {
            "RATE": "Tỉ lệ khoẻ",
            "HEALTHY": "Khoẻ",
            "FAILING": "Có vấn đề",
            "TOTAL": "{count} hộp thư",
            "ALL_HEALTHY": "Mọi hộp thư đang hoạt động bình thường."
        },
        "CHANNELS": {
            "CENTER": "hội thoại"
        },
        "LISTS": {
            "MESSAGES": "{count} tin",
            "INBOXES": "{count} hộp thư",
            "NO_OWNER": "Chưa có quản trị viên"
        },
        "QUEUE": {
            "STATUS": {
                "RUNNING": "Đang chạy",
                "PAUSED": "Tạm dừng",
                "INACTIVE": "Không chạy",
                "UNAVAILABLE": "Không khả dụng"
            },
            "PENDING": "Đang chờ",
            "RECENT_FAILED": "Lỗi gần đây",
            "PROCESSES": "Tiến trình",
            "OPEN": "Mở Horizon"
        },
        "STICKERS": {
            "SHARED_PACKS": "Bộ kho chung",
            "SHARED_PUBLISHED": "Đã phát hành",
            "SHARED_STICKERS": "Sticker kho chung",
            "PRIVATE_ACCOUNTS": "Tài khoản có kho riêng",
            "PRIVATE_STICKERS": "Sticker kho riêng",
            "OPEN": "Quản lý kho chung"
        },
        "SYSTEM": {
            "VERSION": "Phiên bản",
            "PHP": "PHP",
            "LARAVEL": "Laravel",
            "ENVIRONMENT": "Môi trường",
            "DATABASE_SIZE": "Dung lượng CSDL",
            "TABLES": "Số bảng"
        },
        "LINKS": {
            "HORIZON": {
                "TITLE": "Horizon",
                "DESCRIPTION": "Hàng đợi và job"
            },
            "PULSE": {
                "TITLE": "Pulse",
                "DESCRIPTION": "Hiệu năng ứng dụng"
            },
            "LOGS": {
                "TITLE": "Nhật ký",
                "DESCRIPTION": "Log ứng dụng"
            },
            "TASKS": {
                "TITLE": "dash.yona.vn",
                "DESCRIPTION": "Công việc của đội"
            }
        }
    },
    "ADMIN_LAYOUT": {
        "labels": {
            "console_name": "Bảng quản trị",
            "close": "Đóng",
            "cancel": "Huỷ",
            "confirm": "Xác nhận",
            "save": "Lưu",
            "saving": "Đang lưu…",
            "edit": "Sửa",
            "delete": "Xoá",
            "view": "Xem",
            "actions": "Thao tác",
            "pagination": "Phân trang",
            "page_of": "Trang {current}/{last}",
            "previous_page": "Trang trước",
            "next_page": "Trang sau",
            "open_menu": "Mở menu",
            "navigation": "Điều hướng",
            "collapse_sidebar": "Thu gọn thanh bên",
            "expand_sidebar": "Mở rộng thanh bên",
            "opens_new_tab": "mở tab mới",
            "search": "Tìm kiếm",
            "search_shortcut_hint": "Tìm kiếm hoặc nhảy tới…",
            "command_title": "Bảng lệnh",
            "command_placeholder": "Nhập tên trang, tài khoản, người dùng, hộp thư, liên hệ…",
            "command_navigation": "Trang",
            "command_results": "Kết quả tìm kiếm",
            "command_loading": "Đang tìm…",
            "command_error": "Không tìm được lúc này. Thử lại sau.",
            "command_empty": "Không có kết quả cho “{query}”.",
            "command_min_chars": "Gõ ít nhất 2 ký tự để tìm trong dữ liệu.",
            "command_footer_navigate": "di chuyển",
            "command_footer_select": "mở",
            "command_footer_close": "đóng",
            "result_account": "Tài khoản",
            "result_user": "Người dùng",
            "result_inbox": "Hộp thư",
            "result_contact": "Liên hệ",
            "user_menu": "Tài khoản quản trị",
            "back_to_app": "Về trang làm việc",
            "logout": "Đăng xuất",
            "flash_notice": "Thông báo",
            "flash_error": "Có lỗi",
            "resource_description_accounts": "Doanh nghiệp đang dùng Yona, kèm hộp thư, hội thoại, thành viên và lần hoạt động gần nhất.",
            "resource_description_users": "Mọi người đăng nhập được vào Yona, kể cả super admin.",
            "resource_description_access_tokens": "Token gọi API của người dùng, agent bot và ứng dụng nền tảng.",
            "resource_description_installation_configs": "Biến cấu hình dùng chung cho toàn hệ thống.",
            "resource_description_agent_bots": "Bot nhận và trả lời tin thay nhân viên qua webhook.",
            "resource_description_platform_apps": "Ứng dụng gọi Platform API để quản lý tài khoản và người dùng.",
            "resource_description_account_users": "Thành viên của từng tài khoản và vai trò của họ.",
            "resource_description_impersonations": "Mỗi lần super admin đăng nhập hộ một người dùng, kèm lý do.",
            "records_total": "{total} bản ghi",
            "search_records": "Tìm trong {resource}…",
            "clear_search": "Xoá tìm kiếm",
            "filter": "Bộ lọc",
            "filter_all": "Tất cả",
            "new_record": "Thêm mới",
            "no_records": "Chưa có bản ghi nào",
            "no_records_hint": "Thử đổi từ khoá hoặc bộ lọc.",
            "sort_by": "Sắp xếp theo {column}",
            "delete_confirm_title": "Xoá bản ghi này?",
            "delete_confirm_description": "Không hoàn tác được. Dữ liệu liên quan có thể mất theo.",
            "edit_title": "Sửa {title}",
            "new_title": "Thêm {resource}",
            "create": "Tạo",
            "account_overview": "Tổng quan 360",
            "details": "Chi tiết",
            "enabled": "Đã bật",
            "disabled": "Chưa bật",
            "yes": "Có",
            "no": "Không",
            "show_secret": "Hiện",
            "hide_secret": "Ẩn",
            "copy": "Sao chép",
            "copied": "Đã chép",
            "empty_value": "-",
            "no_suspension_history": "Chưa có lịch sử tạm khoá nào.",
            "resend_confirmation": "Gửi lại email xác nhận",
            "reset_cache_title": "Xoá bộ nhớ đệm giao diện",
            "reset_cache_description": "Xoá khoá bộ nhớ đệm IndexedDB trong Redis; lần tải sau giao diện sẽ lấy lại dữ liệu từ máy chủ.",
            "reset_cache": "Xoá bộ nhớ đệm",
            "impersonate_title": "Đăng nhập hộ",
            "impersonate_warning": "Mọi thao tác sau khi đăng nhập hộ sẽ hiện như do {title} thực hiện.",
            "impersonate": "Đăng nhập hộ",
            "impersonate_reason": "Lý do (tối thiểu {min} ký tự, ghi vào nhật ký)",
            "impersonate_confirm": "Xác nhận và đăng nhập hộ",
            "account_users_title": "Thêm thành viên",
            "account_users_account": "Tài khoản",
            "account_users_user": "Người dùng",
            "account_users_role": "Vai trò",
            "account_users_submit": "Thêm vào tài khoản",
            "mfa": "Xác thực hai lớp",
            "settings_title": "Cài đặt",
            "settings_description": "Cấu hình chung của bản cài đặt Yona.",
            "app_config_title": "Cấu hình {section}",
            "app_config_description": "Thay đổi áp dụng cho toàn hệ thống ngay sau khi lưu.",
            "instance_status_title": "Trạng thái hệ thống",
            "instance_status_description": "Phiên bản và kết nối các dịch vụ nền.",
            "login_title": "Đăng nhập quản trị",
            "login_description": "Chỉ dành cho quản trị viên nền tảng.",
            "login_email": "Email",
            "login_email_placeholder": "ten@congty.vn",
            "login_password": "Mật khẩu",
            "login_submit": "Đăng nhập"
        },
        "groups": {
            "overview": "",
            "customers": "Khách hàng",
            "channels": "Kênh & hệ thống",
            "data": "Dữ liệu",
            "content": "Nội dung",
            "integrations": "Tích hợp",
            "config": "Cấu hình",
            "security": "Bảo mật",
            "tools": "Công cụ"
        },
        "nav": {
            "dashboard": "Tổng quan",
            "accounts": "Tài khoản",
            "users": "Người dùng",
            "channel_health": "Sức khoẻ kênh",
            "instance_status": "Trạng thái hệ thống",
            "alerts": "Cảnh báo",
            "feature_usage": "Mức dùng tính năng",
            "data": "Trình duyệt dữ liệu",
            "sticker_packs": "Kho sticker",
            "agent_bots": "Agent bot",
            "platform_apps": "Ứng dụng nền tảng",
            "access_tokens": "Access token",
            "branding": "Thương hiệu",
            "app_config": "Cấu hình ứng dụng",
            "installation_configs": "Biến cấu hình hệ thống",
            "settings": "Cài đặt",
            "audit_logs": "Nhật ký thao tác",
            "impersonations": "Đăng nhập hộ",
            "horizon": "Hàng đợi (Horizon)",
            "pulse": "Hiệu năng (Pulse)",
            "logs": "Log máy chủ",
            "dash": "dash.yona.vn"
        },
        "branding": {
            "page": {
                "title": "Thương hiệu",
                "description": "Logo, biểu tượng và favicon dùng ở mọi màn hình của Yona: trang đăng nhập, thanh bên, trang công khai, widget, thông báo đẩy. Đổi ở đây là có hiệu lực ngay, không cần deploy.",
                "upload": "Tải ảnh lên",
                "replace": "Thay ảnh",
                "uploading": "Đang tải lên…",
                "reset": "Về mặc định",
                "reset_confirm_title": "Về ảnh mặc định?",
                "reset_confirm_description": "Ảnh đã tải lên bị xoá, mọi màn hình quay về tệp mặc định của Yona.",
                "using_custom": "Đang dùng ảnh đã tải lên",
                "using_default": "Đang dùng tệp mặc định",
                "preview_alt": "Xem trước {name}"
            },
            "slots": {
                "logo": {
                    "title": "Logo",
                    "description": "Logo đầy đủ trên nền sáng: trang đăng nhập, trang chủ, trang công khai."
                },
                "logo_dark": {
                    "title": "Logo cho nền tối",
                    "description": "Bản logo đặt trên nền tối."
                },
                "logo_thumbnail": {
                    "title": "Biểu tượng",
                    "description": "Logo thu gọn hình vuông: thanh bên, widget, trang Help Center, icon thông báo đẩy. Nên dùng ảnh vuông từ 512 px."
                },
                "favicon": {
                    "title": "Favicon",
                    "description": "Icon trên tab trình duyệt. Nên dùng ICO hoặc PNG vuông 32–64 px, hoặc SVG."
                }
            },
            "requirements": "Định dạng :formats, tối đa :size.",
            "unsafe_svg": "Tệp SVG chứa script hoặc liên kết không an toàn. Hãy xuất lại SVG chỉ gồm hình vẽ.",
            "flash": {
                "updated": "Đã cập nhật ảnh thương hiệu.",
                "reset": "Đã quay về ảnh mặc định."
            }
        },
        "app_config": {
            "page_title": "Cấu hình ứng dụng",
            "page_description": "Khoá tích hợp và giới hạn của bản cài đặt, chia theo dịch vụ.",
            "default_value": "Mặc định: {value}",
            "unset_value": "Chưa đặt",
            "sections": {
                "general": "Chung",
                "facebook": "Facebook",
                "shopify": "Shopify",
                "microsoft": "Microsoft",
                "email": "Email",
                "slack": "Slack",
                "instagram": "Instagram",
                "tiktok": "TikTok",
                "whatsapp_embedded": "WhatsApp Embedded",
                "google": "Google"
            },
            "section_titles": {
                "general": "Cấu hình chung"
            },
            "fields": {
                "WEBHOOK_TIMEOUT": {
                    "title": "Thời gian chờ webhook (giây)",
                    "description": "Thời gian tối đa Yona chờ phản hồi của webhook trước khi coi là lỗi."
                },
                "MAXIMUM_FILE_UPLOAD_SIZE": {
                    "title": "Dung lượng tệp đính kèm tối đa (MB)",
                    "description": "Tệp tải lên lớn hơn mức này bị từ chối."
                },
                "FIREBASE_PROJECT_ID": {
                    "title": "Mã dự án Firebase",
                    "description": "Project ID của dự án Firebase dùng để gửi thông báo đẩy."
                },
                "FIREBASE_CREDENTIALS": {
                    "title": "Thông tin xác thực Firebase",
                    "description": "Dán nguyên nội dung tệp JSON khoá dịch vụ của Firebase."
                },
                "WIDGET_TOKEN_EXPIRY": {
                    "title": "Hạn token widget (ngày)",
                    "description": "Số ngày phiên của khách trên widget còn hiệu lực."
                },
                "FB_APP_ID": {
                    "title": "Facebook App ID",
                    "description": ""
                },
                "FB_VERIFY_TOKEN": {
                    "title": "Mã xác minh webhook Messenger",
                    "description": "Verify token khai ở webhook Messenger của ứng dụng Meta."
                },
                "FB_APP_SECRET": {
                    "title": "Facebook App Secret",
                    "description": ""
                },
                "IG_VERIFY_TOKEN": {
                    "title": "Mã xác minh webhook Instagram",
                    "description": "Verify token khai ở webhook Instagram của ứng dụng Meta."
                },
                "FACEBOOK_API_VERSION": {
                    "title": "Phiên bản Facebook API",
                    "description": "Chỉ đổi khi cần dùng phiên bản khác, bắt đầu bằng chữ v (vd. v18.0)."
                },
                "SHOPIFY_CLIENT_ID": {
                    "title": "Shopify Client ID",
                    "description": "Client ID (API key) trong tài khoản Shopify Partner."
                },
                "SHOPIFY_CLIENT_SECRET": {
                    "title": "Shopify Client Secret",
                    "description": "Client Secret (API secret key) trong tài khoản Shopify Partner."
                },
                "AZURE_APP_ID": {
                    "title": "Azure App ID",
                    "description": "App ID dùng để xác thực với tài khoản Microsoft của khách."
                },
                "AZURE_APP_SECRET": {
                    "title": "Azure App Secret",
                    "description": ""
                },
                "MAILER_INBOUND_EMAIL_DOMAIN": {
                    "title": "Tên miền nhận email",
                    "description": "Tên miền dùng để tạo địa chỉ trả lời nối tiếp hội thoại (reply+id@tenmien)."
                },
                "ACCOUNT_EMAILS_LIMIT": {
                    "title": "Giới hạn email mỗi ngày của tài khoản",
                    "description": "Số email ngoài kênh tối đa một tài khoản được gửi mỗi ngày."
                },
                "ACCOUNT_EMAILS_PLAN_LIMITS": {
                    "title": "Giới hạn email mỗi ngày theo gói",
                    "description": "Giới hạn gửi email mỗi ngày cho từng gói, dạng JSON."
                },
                "SLACK_CLIENT_ID": {
                    "title": "Slack Client ID",
                    "description": ""
                },
                "SLACK_CLIENT_SECRET": {
                    "title": "Slack Client Secret",
                    "description": ""
                },
                "INSTAGRAM_APP_ID": {
                    "title": "Instagram App ID",
                    "description": ""
                },
                "INSTAGRAM_APP_SECRET": {
                    "title": "Instagram App Secret",
                    "description": "App Secret dùng để xác thực Instagram."
                },
                "INSTAGRAM_VERIFY_TOKEN": {
                    "title": "Mã xác minh webhook Instagram",
                    "description": "Verify token khai ở webhook Instagram."
                },
                "INSTAGRAM_API_VERSION": {
                    "title": "Phiên bản Instagram API",
                    "description": "Chỉ đổi khi cần dùng phiên bản khác, bắt đầu bằng chữ v (vd. v26.0)."
                },
                "TIKTOK_APP_ID": {
                    "title": "TikTok App ID",
                    "description": ""
                },
                "TIKTOK_APP_SECRET": {
                    "title": "TikTok App Secret",
                    "description": ""
                },
                "TIKTOK_API_VERSION": {
                    "title": "Phiên bản TikTok API",
                    "description": "Chỉ đổi khi cần dùng phiên bản khác, bắt đầu bằng chữ v (vd. v1.3)."
                },
                "WHATSAPP_APP_ID": {
                    "title": "WhatsApp App ID",
                    "description": "Facebook App ID dùng cho WhatsApp Business API."
                },
                "WHATSAPP_APP_SECRET": {
                    "title": "WhatsApp App Secret",
                    "description": "App Secret cho luồng đăng ký nhúng (Embedded Signup), bắt buộc khi dùng luồng này."
                },
                "WHATSAPP_CONFIGURATION_ID": {
                    "title": "Mã cấu hình WhatsApp",
                    "description": "Configuration ID cho luồng đăng ký nhúng (Embedded Signup), bắt buộc khi dùng luồng này."
                },
                "WHATSAPP_API_VERSION": {
                    "title": "Phiên bản WhatsApp API",
                    "description": "Chỉ đổi khi cần dùng phiên bản khác, bắt đầu bằng chữ v (vd. v26.0)."
                },
                "GOOGLE_OAUTH_CLIENT_ID": {
                    "title": "Google OAuth Client ID",
                    "description": "Client ID của ứng dụng Google OAuth để kết nối email."
                },
                "GOOGLE_OAUTH_CLIENT_SECRET": {
                    "title": "Google OAuth Client Secret",
                    "description": "Client Secret của ứng dụng Google OAuth để kết nối email."
                },
                "GOOGLE_OAUTH_REDIRECT_URI": {
                    "title": "Google OAuth Redirect URI",
                    "description": "Địa chỉ chuyển hướng đã khai trong ứng dụng Google OAuth."
                }
            }
        },
        "flash": {
            "created": "Đã tạo bản ghi.",
            "updated": "Đã lưu thay đổi.",
            "destroyed": "Đã xoá bản ghi.",
            "account_user_created": "Đã thêm người dùng vào tài khoản.",
            "account_user_destroyed": "Đã gỡ người dùng khỏi tài khoản.",
            "settings_updated": "Đã lưu cấu hình.",
            "restart_required": "Cần khởi động lại web và worker để thay đổi áp dụng khắp nơi."
        },
        "filters": {
            "active": "Đang hoạt động",
            "suspended": "Tạm khoá",
            "confirmed": "Đã xác nhận",
            "unconfirmed": "Chưa xác nhận",
            "recent": "Tạo trong 30 ngày",
            "marked_for_deletion": "Chờ xoá",
            "super_admin": "Quản trị nền tảng",
            "user": "Của người dùng",
            "agent_bot": "Của agent bot",
            "platform_app": "Của ứng dụng nền tảng",
            "churn_risk": "Nguy cơ rời (14 ngày không hoạt động)"
        },
        "attributes": {
            "id": "ID",
            "name": "Tên",
            "display_name": "Tên hiển thị",
            "email": "Email",
            "unconfirmed_email": "Email chờ xác nhận",
            "password": "Mật khẩu",
            "avatar_url": "Ảnh đại diện",
            "locale": "Ngôn ngữ",
            "status": "Trạng thái",
            "type": "Loại",
            "role": "Vai trò",
            "description": "Mô tả",
            "outgoing_url": "URL webhook",
            "access_token": "Access token",
            "token": "Token",
            "owner": "Chủ sở hữu",
            "account": "Tài khoản",
            "accounts": "Tài khoản",
            "account_users": "Thành viên",
            "user": "Người dùng",
            "users": "Thành viên",
            "inviter": "Người mời",
            "inboxes": "Hộp thư",
            "conversations": "Hội thoại",
            "custom_attributes": "Thuộc tính tuỳ biến",
            "value": "Giá trị",
            "reason": "Lý do",
            "ip_address": "Địa chỉ IP",
            "provider": "Nhà cung cấp",
            "uid": "UID",
            "pubsub_token": "Pubsub token",
            "confirmation_token": "Mã xác nhận",
            "confirmation_sent_at": "Gửi xác nhận lúc",
            "confirmed_at": "Xác nhận lúc",
            "current_sign_in_at": "Đăng nhập gần nhất",
            "current_sign_in_ip": "IP đăng nhập gần nhất",
            "last_sign_in_at": "Đăng nhập trước đó",
            "last_sign_in_ip": "IP đăng nhập trước đó",
            "sign_in_count": "Số lần đăng nhập",
            "suspension_category": "Nhóm lý do tạm khoá",
            "suspension_reason": "Lý do tạm khoá",
            "suspension_history": "Lịch sử tạm khoá",
            "used_at": "Dùng lúc",
            "created_at": "Tạo lúc",
            "updated_at": "Cập nhật lúc"
        }
    },
    "ADMIN_OPERATIONS": {
        "NAV": {
            "CHANNEL_HEALTH": "Sức khoẻ kênh",
            "FEATURE_USAGE": "Mức dùng tính năng",
            "AUDIT_LOGS": "Nhật ký thao tác",
            "DATA": "Dữ liệu hệ thống"
        },
        "COMMON": {
            "OPEN_CALENDAR": "Mở lịch",
            "PREVIOUS_MONTH": "Tháng trước",
            "NEXT_MONTH": "Tháng sau",
            "WEEKDAYS": "T2,T3,T4,T5,T6,T7,CN",
            "MONTH_YEAR": "Tháng {month}, {year}",
            "NEVER": "Chưa có",
            "UNKNOWN": "Không rõ",
            "APPLY": "Lọc",
            "CLEAR": "Bỏ lọc",
            "CANCEL": "Huỷ",
            "BACK": "Quay lại",
            "CONTINUE": "Tiếp tục",
            "PREVIOUS": "Trang trước",
            "NEXT": "Trang sau",
            "PAGE": "Trang {page}",
            "OPEN_ACCOUNT": "Mở tài khoản"
        },
        "SUSPENSION": {
            "SUSPENDED": "Đã khoá tài khoản :name.",
            "UNSUSPENDED": "Đã mở khoá tài khoản :name.",
            "BLOCKED": "Tài khoản này đang bị khoá. Hãy liên hệ bộ phận hỗ trợ."
        },
        "ACCOUNT_COLUMNS": {
            "messages_7d": "Tin 7 ngày",
            "last_activity_at": "Hoạt động cuối"
        },
        "SEARCH": {
            "SUSPENDED": "đang khoá"
        },
        "CHANNEL_HEALTH": {
            "TITLE": "Sức khoẻ kênh",
            "DESCRIPTION": "Hộp thư đang mất phiên, lỗi xác thực hoặc cần đăng nhập lại trên toàn hệ thống.",
            "STATS": {
                "TOTAL": "Tổng hộp thư",
                "HEALTHY": "Đang khoẻ",
                "FAILING": "Có vấn đề",
                "ERRORS": "Đang ngừng nhận tin"
            },
            "FILTERS": {
                "SEARCH": "Tìm hộp thư hoặc tài khoản…",
                "ALL_PROBLEMS": "Mọi vấn đề",
                "ALL_PLATFORMS": "Mọi kênh",
                "PLATFORM": "Kênh",
                "SEVERITY": "Mức độ",
                "ALL_SEVERITIES": "Mọi mức độ"
            },
            "COLUMNS": {
                "INBOX": "Hộp thư",
                "ACCOUNT": "Tài khoản",
                "PROBLEM": "Vấn đề",
                "SINCE": "Từ lúc",
                "DETAIL": "Chi tiết"
            },
            "SEVERITY": {
                "error": "Ngừng hoạt động",
                "warning": "Cảnh báo"
            },
            "PROBLEMS": {
                "channel_missing": "Mất bản ghi kênh",
                "session_lost": "Mất phiên Zalo",
                "disconnected": "Zalo đã đăng xuất",
                "awaiting_login": "Chờ quét mã QR",
                "bridge_unreachable": "Không gọi được cầu nối Zalo",
                "circuit_open": "Zalo lỗi liên tiếp, tạm ngắt",
                "reauthorization_required": "Cần đăng nhập lại",
                "authorization_errors": "Lỗi xác thực (IMAP/SMTP, token)"
            },
            "DETAIL_COUNT": "{count} lần lỗi",
            "EMPTY_TITLE": "Mọi kênh đều khoẻ",
            "EMPTY_DESCRIPTION": "Không hộp thư nào đang gặp sự cố.",
            "NO_MATCH": "Không có hộp thư nào khớp bộ lọc."
        },
        "ACCOUNT_OVERVIEW": {
            "PAGE": {
                "TITLE": "Hồ sơ tài khoản",
                "DESCRIPTION": "Số liệu, thành viên, hộp thư và hoạt động của {name}."
            },
            "BACK": "Danh sách tài khoản",
            "STATUS": {
                "active": "Đang hoạt động",
                "suspended": "Đang khoá"
            },
            "CREATED_AT": "Tạo {date}",
            "LAST_ACTIVITY": "Hoạt động gần nhất: {date}",
            "ACTIONS": {
                "LOCK": "Khoá tài khoản",
                "UNLOCK": "Mở khoá",
                "IMPERSONATE": "Đăng nhập hộ",
                "EDIT": "Sửa",
                "RECORD": "Xem bản ghi",
                "AUDIT": "Nhật ký thao tác",
                "DATA": "Xem dữ liệu"
            },
            "LOCK": {
                "TITLE": "Khoá tài khoản này?",
                "DESCRIPTION": "Agent, bot và API của tài khoản bị chặn ngay; kênh ngừng nhận tin mới. Dữ liệu giữ nguyên, mở khoá lại được bất cứ lúc nào.",
                "CATEGORY": "Nhóm lý do",
                "REASON": "Lý do",
                "REASON_HINT": "Tối đa {max} ký tự, lưu vào lịch sử khoá.",
                "CONFIRM_TITLE": "Khoá ngay \"{name}\"?",
                "CONFIRM_DESCRIPTION": "Mọi thành viên sẽ không vào được tài khoản cho tới khi mở khoá.",
                "CONFIRM": "Khoá ngay"
            },
            "UNLOCK": {
                "TITLE": "Mở khoá \"{name}\"?",
                "DESCRIPTION": "Thành viên vào lại được và kênh nhận tin trở lại.",
                "CONFIRM": "Mở khoá"
            },
            "IMPERSONATE": {
                "TITLE": "Đăng nhập hộ",
                "DESCRIPTION": "Mọi thao tác sau khi đăng nhập hộ hiện như do người dùng này làm. Lý do được lưu vào nhật ký.",
                "USER": "Người dùng",
                "REASON": "Lý do (ít nhất {min} ký tự)",
                "SUBMIT": "Đăng nhập hộ (tab mới)",
                "NO_USERS": "Tài khoản chưa có thành viên nào để đăng nhập hộ."
            },
            "STATS": {
                "USERS": "Thành viên",
                "INBOXES": "Hộp thư",
                "CONVERSATIONS": "Hội thoại",
                "CONTACTS": "Liên hệ",
                "MESSAGES_7D": "Tin 7 ngày",
                "MESSAGES_30D": "Tin 30 ngày",
                "DAILY_AVERAGE": "Trung bình {value} tin/ngày"
            },
            "TABS": {
                "OVERVIEW": "Tổng quan",
                "USERS": "Thành viên",
                "INBOXES": "Hộp thư",
                "ACTIVITY": "Hoạt động",
                "STICKERS": "Sticker"
            },
            "SECTIONS": {
                "USAGE": "Lượng tin 30 ngày",
                "USAGE_TOTAL": "{count} tin",
                "ONBOARDING": "Tiến độ kích hoạt",
                "INBOXES": "Hộp thư và sức khoẻ kênh",
                "USERS": "Thành viên",
                "TIMELINE": "Hoạt động gần đây",
                "SUSPENSIONS": "Lịch sử khoá",
                "IMPERSONATIONS": "Lần đăng nhập hộ gần đây",
                "STICKERS": "Kho sticker riêng",
                "FEATURES": "Tính năng đã dùng"
            },
            "COLUMNS": {
                "NAME": "Tên",
                "EMAIL": "Email",
                "ROLE": "Vai trò",
                "LAST_SIGN_IN": "Đăng nhập gần nhất",
                "INBOX": "Hộp thư",
                "HEALTH": "Sức khoẻ",
                "SINCE": "Từ lúc",
                "ADMIN": "Quản trị viên",
                "TARGET": "Đăng nhập hộ",
                "REASON": "Lý do",
                "CATEGORY": "Nhóm",
                "AT": "Lúc"
            },
            "HEALTHY": "Khoẻ",
            "UNCONFIRMED": "Chưa xác nhận email",
            "EMPTY": {
                "USERS": "Chưa có thành viên.",
                "INBOXES": "Chưa kết nối hộp thư nào.",
                "TIMELINE": "Chưa có hoạt động.",
                "SUSPENSIONS": "Chưa từng bị khoá.",
                "IMPERSONATIONS": "Chưa có lần đăng nhập hộ nào.",
                "FEATURES": "Chưa dùng tính năng nào."
            },
            "FEATURES": {
                "COUNT": "{count} lượt",
                "DESCRIPTION": "Đếm từ sự kiện sản phẩm, không tính lượt quản trị viên làm hộ.",
                "TIMES": ":count lần"
            },
            "STICKERS": {
                "SUMMARY": "{packs} bộ · {stickers} sticker",
                "MANAGE": "Quản lý kho sticker",
                "DESCRIPTION": "Toàn quyền như quản trị viên của tài khoản: tạo bộ, tải lên, sửa, sắp xếp, xuất bản, xoá."
            },
            "ONBOARDING": {
                "CURRENT_STEP": "Đang ở bước: {step}",
                "DESCRIPTION": "Cùng sáu bước với phễu kích hoạt ở Tổng quan. Ngày là lần đầu ghi nhận nên có thể không theo thứ tự bước.",
                "DONE_COUNT": "{done}/{total} bước",
                "FINISHED": "Đã xong onboarding",
                "STEPS": {
                    "account_details": "Điền thông tin tài khoản",
                    "account_update": "Cập nhật tài khoản",
                    "invite_team": "Mời đồng đội"
                }
            },
            "AUDIT": {
                "BY": "Bởi :admin",
                "FAILED_BY": "Không thành công (mã :status), bởi :admin",
                "account_updated": {
                    "PACK": "Sửa thông tin tài khoản",
                    "NO_PACK": "Sửa thông tin tài khoản"
                },
                "account_deleted": {
                    "PACK": "Xoá tài khoản",
                    "NO_PACK": "Xoá tài khoản"
                },
                "cache_reset": {
                    "PACK": "Làm mới bộ nhớ đệm của tài khoản",
                    "NO_PACK": "Làm mới bộ nhớ đệm của tài khoản"
                },
                "unsuspended": {
                    "PACK": "Mở khoá tài khoản",
                    "NO_PACK": "Mở khoá tài khoản"
                },
                "pack_created": {
                    "PACK": "Tạo bộ sticker “:pack”",
                    "NO_PACK": "Tạo một bộ sticker"
                },
                "pack_updated": {
                    "PACK": "Sửa bộ sticker “:pack”",
                    "NO_PACK": "Sửa một bộ sticker"
                },
                "pack_deleted": {
                    "PACK": "Xoá bộ sticker “:pack”",
                    "NO_PACK": "Xoá một bộ sticker"
                },
                "pack_moved": {
                    "PACK": "Chuyển bộ sticker “:pack” sang kho chung",
                    "NO_PACK": "Chuyển một bộ sticker sang kho chung"
                },
                "pack_published": {
                    "PACK": "Xuất bản bộ sticker “:pack”",
                    "NO_PACK": "Xuất bản một bộ sticker"
                },
                "pack_unpublished": {
                    "PACK": "Ngừng xuất bản bộ sticker “:pack”",
                    "NO_PACK": "Ngừng xuất bản một bộ sticker"
                },
                "stickers_added": {
                    "PACK": "Thêm :count sticker vào bộ “:pack”",
                    "NO_PACK": "Thêm :count sticker vào kho riêng"
                },
                "stickers_reordered": {
                    "PACK": "Sắp xếp lại sticker trong bộ “:pack”",
                    "NO_PACK": "Sắp xếp lại sticker trong một bộ"
                },
                "stickers_updated": {
                    "PACK": "Sửa :count sticker trong bộ “:pack”",
                    "NO_PACK": "Sửa :count sticker trong kho riêng"
                },
                "stickers_deleted": {
                    "PACK": "Xoá :count sticker khỏi bộ “:pack”",
                    "NO_PACK": "Xoá :count sticker khỏi kho riêng"
                },
                "other_change": {
                    "PACK": "Cập nhật dữ liệu của tài khoản",
                    "NO_PACK": "Cập nhật dữ liệu của tài khoản"
                },
                "other_delete": {
                    "PACK": "Xoá dữ liệu của tài khoản",
                    "NO_PACK": "Xoá dữ liệu của tài khoản"
                }
            },
            "TIMELINE": {
                "account_created": "Tạo tài khoản “:name”",
                "user_joined": ":name tham gia với vai trò :role",
                "inbox_created": "Thêm hộp thư “:name”",
                "suspended": "Bị khoá: :reason",
                "impersonated": ":admin đăng nhập hộ :user",
                "admin_action": "Thao tác của quản trị viên",
                "last_message": "Tin nhắn gần nhất",
                "PRODUCT": {
                    "email_confirmed": "Xác nhận email",
                    "onboarding_step_completed": "Xong bước onboarding “:step”",
                    "channel_connected": "Kết nối kênh :platform: :method",
                    "first_inbound_message": "Nhận tin khách đầu tiên qua :platform",
                    "first_outbound_reply": "Trả lời khách lần đầu qua :platform",
                    "macro_run": "Chạy macro",
                    "automation_rule_created": "Tạo luật tự động",
                    "automation_rule_fired": "Luật tự động chạy",
                    "canned_response_used": "Dùng câu trả lời mẫu",
                    "campaign_created": "Tạo chiến dịch",
                    "help_center_article_published": "Xuất bản bài viết Help Center",
                    "sticker_sent": "Gửi sticker",
                    "sticker_uploaded": "Tải sticker lên kho riêng",
                    "structured_message_sent": "Gửi tin có cấu trúc",
                    "contacts_imported": "Nhập liên hệ từ CSV",
                    "contacts_exported": "Xuất liên hệ ra CSV",
                    "label_created": "Tạo nhãn",
                    "webhook_created": "Tạo webhook",
                    "agent_bot_connected": "Gắn agent bot vào hộp thư"
                }
            }
        },
        "PRODUCT_EVENTS": {
            "NAMES": {
                "account_signed_up": "Đăng ký tài khoản",
                "email_confirmed": "Xác nhận email",
                "onboarding_step_completed": "Xong bước onboarding",
                "inbox_created": "Tạo hộp thư",
                "channel_connected": "Kết nối kênh",
                "first_inbound_message": "Nhận tin khách đầu tiên",
                "first_outbound_reply": "Trả lời khách lần đầu",
                "macro_run": "Chạy macro",
                "automation_rule_created": "Tạo luật tự động",
                "automation_rule_fired": "Luật tự động chạy",
                "canned_response_used": "Dùng câu trả lời mẫu",
                "campaign_created": "Tạo chiến dịch",
                "help_center_article_published": "Xuất bản bài Help Center",
                "sticker_sent": "Gửi sticker",
                "sticker_uploaded": "Tải sticker lên kho riêng",
                "structured_message_sent": "Gửi tin có cấu trúc",
                "contacts_imported": "Nhập liên hệ CSV",
                "contacts_exported": "Xuất liên hệ CSV",
                "label_created": "Tạo nhãn",
                "webhook_created": "Tạo webhook",
                "agent_bot_connected": "Gắn agent bot"
            },
            "METHODS": {
                "token": "khoá truy cập",
                "oauth": "đăng nhập nền tảng",
                "qr": "quét mã QR",
                "imap": "IMAP lấy thư được",
                "widget_embed": "widget chạy trên website"
            }
        },
        "FEATURE_USAGE": {
            "TITLE": "Mức dùng tính năng",
            "DESCRIPTION": "Bao nhiêu tài khoản đã dùng từng tính năng, đếm từ sự kiện sản phẩm. Lượt quản trị viên làm hộ không tính.",
            "GROUPS": {
                "activation": "Mốc kích hoạt",
                "feature": "Tính năng"
            },
            "COLUMNS": {
                "FEATURE": "Tính năng",
                "ACCOUNTS_7D": "Tài khoản 7 ngày",
                "ACCOUNTS_30D": "Tài khoản 30 ngày",
                "ACCOUNTS_90D": "Tài khoản 90 ngày",
                "ACCOUNTS_ALL": "Tài khoản từ đầu",
                "EVENTS": "Tổng lượt",
                "LAST": "Lần gần nhất",
                "TREND": "Xu hướng 30 ngày"
            },
            "ACCOUNTS_HINT": "Cột tài khoản đếm số tài khoản đã dùng trong khoảng đó.",
            "UNUSED_TITLE": "Chưa tài khoản nào dùng ({count})",
            "TREND_SUMMARY": "{count} lượt trong 30 ngày",
            "OPEN": "Xem tài khoản dùng {feature}",
            "EMPTY_TITLE": "Chưa có sự kiện nào",
            "EMPTY_DESCRIPTION": "Chạy lệnh product-events:backfill để dựng sự kiện từ dữ liệu cũ.",
            "ACCOUNTS": {
                "TITLE": "Tài khoản dùng “{feature}”",
                "DESCRIPTION": "Dùng gần nhất trước, tối đa {limit} tài khoản.",
                "BACK": "Mức dùng tính năng",
                "COLUMNS": {
                    "ACCOUNT": "Tài khoản",
                    "EVENTS": "Tổng lượt",
                    "EVENTS_30D": "Lượt 30 ngày",
                    "FIRST": "Lần đầu",
                    "LAST": "Lần gần nhất"
                },
                "EMPTY_TITLE": "Chưa tài khoản nào dùng",
                "EMPTY_DESCRIPTION": "Khi một tài khoản dùng tính năng này, nó sẽ hiện ở đây."
            }
        },
        "AUDIT_LOGS": {
            "ACTIONS": {
                "suspended": "Khoá tài khoản",
                "account_created": "Tạo tài khoản",
                "member_added": "Thêm thành viên vào tài khoản",
                "member_removed": "Gỡ thành viên khỏi tài khoản",
                "user_created": "Tạo người dùng",
                "user_updated": "Sửa người dùng",
                "user_deleted": "Xoá người dùng",
                "avatar_deleted": "Xoá ảnh đại diện",
                "impersonated": "Đăng nhập hộ người dùng",
                "confirmation_resent": "Gửi lại email xác nhận",
                "agent_bot_created": "Tạo agent bot",
                "agent_bot_updated": "Sửa agent bot",
                "agent_bot_deleted": "Xoá agent bot",
                "platform_app_created": "Tạo ứng dụng nền tảng",
                "platform_app_updated": "Sửa ứng dụng nền tảng",
                "platform_app_deleted": "Xoá ứng dụng nền tảng",
                "access_token_created": "Tạo access token",
                "access_token_updated": "Sửa access token",
                "access_token_deleted": "Xoá access token",
                "installation_config_created": "Tạo biến cấu hình hệ thống",
                "installation_config_updated": "Sửa biến cấu hình hệ thống",
                "alert_rule_updated": "Sửa quy tắc cảnh báo",
                "alert_test_sent": "Gửi thử cảnh báo",
                "push_subscribed": "Bật thông báo đẩy cho bảng quản trị",
                "push_unsubscribed": "Tắt thông báo đẩy cho bảng quản trị",
                "installation_config_deleted": "Xoá biến cấu hình hệ thống",
                "app_config_saved": "Lưu cấu hình ứng dụng",
                "layout_saved": "Lưu bố cục trang Tổng quan",
                "layout_reset": "Đặt lại bố cục trang Tổng quan",
                "mfa_enabled": "Bật xác thực hai lớp",
                "mfa_verified": "Xác nhận xác thực hai lớp",
                "platform_pack_created": {
                    "PACK": "Tạo bộ sticker chung “:pack”",
                    "NO_PACK": "Tạo một bộ sticker chung"
                },
                "platform_pack_updated": {
                    "PACK": "Sửa bộ sticker chung “:pack”",
                    "NO_PACK": "Sửa một bộ sticker chung"
                },
                "platform_pack_deleted": {
                    "PACK": "Xoá bộ sticker chung “:pack”",
                    "NO_PACK": "Xoá một bộ sticker chung"
                },
                "platform_pack_published": {
                    "PACK": "Xuất bản bộ sticker chung “:pack”",
                    "NO_PACK": "Xuất bản một bộ sticker chung"
                },
                "platform_pack_unpublished": {
                    "PACK": "Ngừng xuất bản bộ sticker chung “:pack”",
                    "NO_PACK": "Ngừng xuất bản một bộ sticker chung"
                },
                "platform_stickers_added": {
                    "PACK": "Thêm :count sticker vào bộ “:pack”",
                    "NO_PACK": "Thêm :count sticker vào kho chung"
                },
                "platform_stickers_reordered": {
                    "PACK": "Sắp xếp lại sticker trong bộ “:pack”",
                    "NO_PACK": "Sắp xếp lại sticker trong kho chung"
                },
                "platform_stickers_updated": {
                    "PACK": "Sửa :count sticker trong bộ “:pack”",
                    "NO_PACK": "Sửa :count sticker trong kho chung"
                },
                "platform_stickers_deleted": {
                    "PACK": "Xoá :count sticker khỏi bộ “:pack”",
                    "NO_PACK": "Xoá :count sticker khỏi kho chung"
                }
            },
            "SUBJECTS": {
                "accounts": "Tài khoản",
                "account_users": "Thành viên",
                "users": "Người dùng",
                "agent_bots": "Agent bot",
                "platform_apps": "Ứng dụng nền tảng",
                "access_tokens": "Access token",
                "installation_configs": "Biến cấu hình",
                "sticker_packs": "Bộ sticker chung",
                "dashboard": "Trang Tổng quan",
                "app_config": "Cấu hình ứng dụng",
                "impersonations": "Đăng nhập hộ",
                "mfa": "Xác thực hai lớp"
            },
            "RESULT": {
                "success": "Thành công",
                "rejected": "Bị từ chối",
                "failed": "Lỗi máy chủ"
            },
            "RAW_ACTION": "Route",
            "HTTP_STATUS": "Mã HTTP",
            "IP_ADDRESS": "Địa chỉ IP",
            "USER_AGENT": "Trình duyệt",
            "TITLE": "Nhật ký thao tác",
            "DESCRIPTION": "Mọi thao tác ghi của quản trị viên trong bảng quản trị. Mật khẩu, token và mã xác thực đã được che.",
            "FILTERS": {
                "ADMIN": "Quản trị viên",
                "ALL_ADMINS": "Mọi quản trị viên",
                "ACTION": "Tìm hành động…",
                "SUBJECT_TYPE": "Đối tượng",
                "ALL_SUBJECTS": "Mọi đối tượng",
                "SUBJECT_ID": "ID đối tượng",
                "FROM": "Từ ngày",
                "FROM_SHORT": "Từ",
                "TO_SHORT": "Đến",
                "TO": "Đến ngày"
            },
            "COLUMNS": {
                "TIME": "Thời gian",
                "ADMIN": "Quản trị viên",
                "ACTION": "Hành động",
                "SUBJECT": "Đối tượng",
                "STATUS": "Kết quả"
            },
            "PAYLOAD": "Dữ liệu gửi kèm",
            "NO_PAYLOAD": "Không có dữ liệu gửi kèm.",
            "DELETED_ADMIN": "Quản trị viên đã xoá",
            "TOTAL": "{total} thao tác",
            "EMPTY_TITLE": "Chưa có thao tác nào",
            "EMPTY_DESCRIPTION": "Thao tác ghi trong bảng quản trị sẽ hiện ở đây."
        },
        "DATA": {
            "TITLE": "Dữ liệu hệ thống",
            "DESCRIPTION": "Xem mọi bảng ở chế độ chỉ đọc. Cột bí mật (mật khẩu, token, khoá, mã OTP, trường mã hoá) và nội dung tin nhắn của khách luôn được che.",
            "SEARCH_TABLES": "Lọc bảng…",
            "COLUMNS": {
                "TABLE": "Bảng",
                "ROWS": "Số dòng",
                "SIZE": "Dung lượng"
            },
            "APPROXIMATE": "ước tính",
            "NO_TABLES": "Không tìm thấy bảng.",
            "BACK": "Mọi bảng",
            "READ_ONLY": "Chỉ đọc",
            "MASKED_SECRET": "Đã che: dữ liệu bí mật",
            "MASKED_PERSONAL": "Đã che: nội dung khách (Nghị định 13)",
            "FILTERS": "Lọc theo cột",
            "FILTER_HINT": "Cột số khớp đúng, cột chữ khớp một phần, gõ null để tìm ô trống. Cột đã che không lọc được.",
            "SORT": "Sắp xếp theo {column}",
            "EMPTY": "Không có dòng nào.",
            "ROWS_ON_PAGE": "{count} dòng trên trang này",
            "TABLE_TITLE": "Bảng {table}",
            "SCROLL_HINT": "{count} cột, kéo ngang để xem hết",
            "PIN": {
                "LEFT": "Ghim sang trái",
                "RIGHT": "Ghim sang phải",
                "UNPIN": "Bỏ ghim cột {column}",
                "OPTIONS": "Tuỳ chọn ghim cột {column}"
            }
        },
        "STICKERS": {
            "PLATFORM_TAB": "Kho chung",
            "ACCOUNT_TAB": "Kho của tài khoản",
            "ACCOUNT_TITLE": "Kho sticker của {name}",
            "ACCOUNT_DESCRIPTION": "Toàn quyền như quản trị viên của tài khoản: tạo bộ, tải lên, sửa, sắp xếp, xuất bản, xoá, chuyển bộ sang kho chung.",
            "PICK_ACCOUNT": "Tìm tài khoản theo tên hoặc ID…",
            "PICK_ACCOUNT_TITLE": "Chọn một tài khoản",
            "PICK_ACCOUNT_HINT": "Kho riêng của tài khoản chỉ tài khoản đó dùng được. Tìm theo tên hoặc ID để mở.",
            "NO_ACCOUNTS": "Không tìm thấy tài khoản.",
            "BACK_TO_ACCOUNT": "Về tài khoản"
        }
    },
    "AGENT_BOTS": {
        "HEADER": "Bot",
        "LOADING_EDITOR": "Đang tải trình soạn thảo...",
        "DESCRIPTION": "Bot nhân viên giống như những thành viên xuất sắc nhất trong đội của bạn. Chúng lo việc lặt vặt để bạn tập trung vào việc quan trọng. Hãy thử xem. Bạn quản lý bot ở trang này hoặc tạo bot mới bằng nút \"Thêm bot\".",
        "LEARN_MORE": "Tìm hiểu về bot nhân viên",
        "COUNT": "{n} bot | {n} bot",
        "SEARCH_PLACEHOLDER": "Tìm bot...",
        "NO_RESULTS": "Không tìm thấy bot nào khớp",
        "GLOBAL_BOT": "Bot hệ thống",
        "GLOBAL_BOT_BADGE": "Hệ thống",
        "AVATAR": {
            "SUCCESS_DELETE": "Đã xóa ảnh đại diện của bot",
            "ERROR_DELETE": "Lỗi khi xóa ảnh đại diện của bot, bạn hãy thử lại"
        },
        "BOT_CONFIGURATION": {
            "TITLE": "Chọn một bot nhân viên",
            "DESC": "Gán một bot nhân viên cho hộp thư. Bot có thể xử lý phần đầu hội thoại rồi chuyển cho nhân viên thật khi cần.",
            "SUBMIT": "Cập nhật",
            "DISCONNECT": "Ngắt kết nối bot",
            "SUCCESS_MESSAGE": "Đã cập nhật bot nhân viên.",
            "DISCONNECTED_SUCCESS_MESSAGE": "Đã ngắt kết nối bot nhân viên.",
            "ERROR_MESSAGE": "Không cập nhật được bot nhân viên. Bạn hãy thử lại.",
            "DISCONNECTED_ERROR_MESSAGE": "Không ngắt kết nối được bot nhân viên. Bạn hãy thử lại.",
            "SELECT_PLACEHOLDER": "Chọn bot"
        },
        "ADD": {
            "TITLE": "Add Bot",
            "CANCEL_BUTTON_TEXT": "Huỷ",
            "API": {
                "SUCCESS_MESSAGE": "Đã thêm bot.",
                "ERROR_MESSAGE": "Không thêm được bot. Bạn hãy thử lại sau."
            }
        },
        "LIST": {
            "404": "Chưa có bot nào. Bạn có thể tạo bot bằng nút \"Thêm bot\".",
            "LOADING": "Đang tải danh sách bot...",
            "TABLE_HEADER": {
                "DETAILS": "Thông tin bot",
                "URL": "URL webhook",
                "ACTIONS": "Hành động"
            }
        },
        "DELETE": {
            "BUTTON_TEXT": "Xoá",
            "TITLE": "Xóa bot",
            "CONFIRM": {
                "TITLE": "Xác nhận xoá",
                "MESSAGE": "Bạn chắc chắn muốn xóa {name}?",
                "YES": "Có, Xoá",
                "NO": "Không, giữ"
            },
            "API": {
                "SUCCESS_MESSAGE": "Đã xóa bot.",
                "ERROR_MESSAGE": "Không xóa được bot. Bạn hãy thử lại."
            }
        },
        "EDIT": {
            "BUTTON_TEXT": "Chỉnh sửa",
            "TITLE": "Sửa bot",
            "API": {
                "SUCCESS_MESSAGE": "Đã cập nhật bot.",
                "ERROR_MESSAGE": "Không cập nhật được bot. Bạn hãy thử lại."
            }
        },
        "SECRET": {
            "LABEL": "Khóa bí mật webhook",
            "COPY": "Chép khóa bí mật",
            "COPY_SUCCESS": "Đã chép khóa bí mật",
            "TOGGLE": "Ẩn/hiện khóa bí mật",
            "CREATED_DESC": "Dùng khóa bí mật bên dưới để xác minh chữ ký webhook. Hãy chép ngay, bạn cũng có thể xem lại trong phần cài đặt bot.",
            "DONE": "Xong",
            "RESET_SUCCESS": "Đã tạo lại khóa bí mật webhook",
            "RESET_ERROR": "Không tạo lại được khóa bí mật webhook. Bạn hãy thử lại"
        },
        "ACCESS_TOKEN": {
            "TITLE": "Token truy cập",
            "DESCRIPTION": "Chép access token và cất giữ an toàn",
            "COPY_SUCCESSFUL": "Đã chép access token",
            "RESET_SUCCESS": "Đã tạo lại access token",
            "RESET_ERROR": "Không tạo lại được access token. Bạn hãy thử lại"
        },
        "FORM": {
            "AVATAR": {
                "LABEL": "Ảnh đại diện của bot"
            },
            "NAME": {
                "LABEL": "Tên bot",
                "PLACEHOLDER": "Nhập tên bot",
                "REQUIRED": "Tên bot là bắt buộc"
            },
            "DESCRIPTION": {
                "LABEL": "Mô tả",
                "PLACEHOLDER": "Bot này sẽ làm gì?"
            },
            "WEBHOOK_URL": {
                "LABEL": "URL webhook",
                "PLACEHOLDER": "https://example.com/webhook",
                "REQUIRED": "URL webhook là bắt buộc"
            },
            "ERRORS": {
                "NAME": "Tên bot là bắt buộc",
                "URL": "URL webhook là bắt buộc",
                "VALID_URL": "Bạn hãy nhập URL hợp lệ bắt đầu bằng http:// hoặc https://"
            },
            "CANCEL": "Huỷ",
            "CREATE": "Tạo bot",
            "UPDATE": "Cập nhật bot"
        },
        "WEBHOOK": {
            "DESCRIPTION": "Cấu hình một bot webhook để nối với dịch vụ riêng của bạn. Bot sẽ nhận và xử lý sự kiện từ hội thoại rồi trả lời."
        },
        "TYPES": {
            "WEBHOOK": "Bot webhook"
        }
    },
    "AGENT_MGMT": {
        "HEADER": "Nhân viên",
        "HEADER_BTN_TXT": "Thêm nhà cung cấp / nhân viên",
        "LOADING": "Tải danh sách nhà cung cấp",
        "DESCRIPTION": "Nhân viên là thành viên trong đội chăm sóc khách hàng của bạn, có thể xem và trả lời tin nhắn của khách. Danh sách bên dưới là toàn bộ nhân viên trong tài khoản của bạn.",
        "LEARN_MORE": "Tìm hiểu về vai trò người dùng",
        "AGENT_TYPES": {
            "ADMINISTRATOR": "Quản trị viên",
            "AGENT": "Nhân viên"
        },
        "COUNT": "{n} nhân viên | {n} nhân viên",
        "LIST": {
            "404": "Không có tác nhân nào được liên kết với tài khoản này",
            "TITLE": "Quản lý các nhân viên trong nhóm của bạn",
            "DESC": "Bạn có thể thêm / bớt nhân viên vào / trong nhóm của mình.",
            "NAME": "Tên",
            "EMAIL": "EMAIL",
            "STATUS": "Trạng thái",
            "ACTIONS": "Hành động",
            "VERIFIED": "Đã xác minh",
            "VERIFICATION_PENDING": "Đang chờ xác minh",
            "AVAILABLE_CUSTOM_ROLE": "Quyền của vai trò tùy chỉnh hiện có"
        },
        "ADD": {
            "TITLE": "Thêm nhân viên vào nhóm của bạn",
            "DESC": "Bạn có thể thêm những người có thể xử lý hỗ trợ cho hộp thư của bạn.",
            "CANCEL_BUTTON_TEXT": "Huỷ",
            "FORM": {
                "NAME": {
                    "LABEL": "Tên nhà cung cấp",
                    "PLACEHOLDER": "Vui lòng nhập tên nhà cung cấp"
                },
                "AGENT_TYPE": {
                    "LABEL": "Loại nhà cung cấp",
                    "PLACEHOLDER": "Vui lòng chọn loại",
                    "ERROR": "Loại nhà cung cấp là bắt buộc"
                },
                "EMAIL": {
                    "LABEL": "Email",
                    "PLACEHOLDER": "Vui lòng nhập email"
                },
                "SUBMIT": "Thêm nhà cung cấp"
            },
            "API": {
                "SUCCESS_MESSAGE": "Nhân viên được thêm thành công",
                "EXIST_MESSAGE": "Email đã được sử dung, vui lòng chọn email khác.",
                "ERROR_MESSAGE": "Không kết nối được máy chủ. Bạn hãy thử lại sau."
            }
        },
        "DELETE": {
            "BUTTON_TEXT": "Xoá",
            "API": {
                "SUCCESS_MESSAGE": "Nhân viên được xoá thành công",
                "ERROR_MESSAGE": "Không kết nối được máy chủ. Bạn hãy thử lại sau."
            },
            "CONFIRM": {
                "TITLE": "Xác nhận xoá",
                "MESSAGE": "Bạn có muốn xoá? ",
                "YES": "Có, xoá ",
                "NO": "Không, giữ "
            }
        },
        "EDIT": {
            "TITLE": "Chỉnh sửa nhà cung cấp",
            "FORM": {
                "NAME": {
                    "LABEL": "Tên nhà cung cấp",
                    "PLACEHOLDER": "Vui lòng nhập tên nhà cung cấp"
                },
                "AGENT_TYPE": {
                    "LABEL": "Loại nhà cung cấp",
                    "PLACEHOLDER": "Vui lòng chọn loại",
                    "ERROR": "Loại nhà cung cấp là bắt buộc"
                },
                "EMAIL": {
                    "LABEL": "Emails",
                    "PLACEHOLDER": "Vui lòng nhập email"
                },
                "AGENT_AVAILABILITY": {
                    "LABEL": "Khả dụng",
                    "PLACEHOLDER": "Bạn hãy chọn trạng thái trực",
                    "ERROR": "Trạng thái trực là bắt buộc"
                },
                "SUBMIT": "Chỉnh sửa nhà cung cấp"
            },
            "BUTTON_TEXT": "Chỉnh sửa",
            "CANCEL_BUTTON_TEXT": "Huỷ",
            "API": {
                "SUCCESS_MESSAGE": "Nhân viên được cập nhật thành công",
                "ERROR_MESSAGE": "Không kết nối được máy chủ. Bạn hãy thử lại sau."
            },
            "PASSWORD_RESET": {
                "ADMIN_RESET_BUTTON": "Đặt lại mật khẩu",
                "ADMIN_SUCCESS_MESSAGE": "Một email với hướng dẫn đặt lại mật khẩu đã được gửi đến nhân viên",
                "SUCCESS_MESSAGE": "Đặt lại mật khẩu nhân viên thành công",
                "ERROR_MESSAGE": "Không kết nối được máy chủ. Bạn hãy thử lại sau."
            }
        },
        "SEARCH_PLACEHOLDER": "Tìm kiếm nhân viên...",
        "NO_RESULTS": "Không tìm thấy nhân viên nào khớp",
        "SEARCH": {
            "NO_RESULTS": "Không tìm thấy kết quả."
        },
        "MULTI_SELECTOR": {
            "PLACEHOLDER": "Không có",
            "TITLE": {
                "AGENT": "Chọn thành viên",
                "TEAM": "Chọn nhóm"
            },
            "LIST": {
                "NONE": "Không có"
            },
            "SEARCH": {
                "NO_RESULTS": {
                    "AGENT": "Không tìm thấy nhà cung cấp",
                    "TEAM": "Không tìm thấy nhóm nào"
                },
                "PLACEHOLDER": {
                    "AGENT": "Tìm kiếm nhân viên",
                    "TEAM": "Tìm kiếm nhóm",
                    "INPUT": "Tìm nhân viên"
                }
            }
        }
    },
    "AGENT_REPORTS": {
        "HEADER": "Tổng quan nhân viên",
        "DESCRIPTION": "Theo dõi hiệu suất nhân viên bằng các chỉ số chính như số hội thoại, thời gian phản hồi, thời gian xử lý và số ca đã xong. Bấm vào tên nhân viên để xem chi tiết.",
        "LOADING_CHART": "Đang tải các biểu đồ dữ liệu...",
        "NO_ENOUGH_DATA": "Chúng tôi không nhận được đủ điểm dữ liệu để tạo báo cáo, Vui lòng thử lại sau.",
        "DOWNLOAD_AGENT_REPORTS": "Tải xuống báo cáo nhân viên",
        "FILTER_DROPDOWN_LABEL": "Chọn nhân viên",
        "FILTERS": {
            "INPUT_PLACEHOLDER": {
                "AGENTS": "Tìm kiếm nhân viên"
            }
        },
        "METRICS": {
            "CONVERSATIONS": {
                "NAME": "Các hội thoại",
                "DESC": "( Tổng cộng )"
            },
            "INCOMING_MESSAGES": {
                "NAME": "Tin nhắn nhận được",
                "DESC": "( Tổng cộng )"
            },
            "OUTGOING_MESSAGES": {
                "NAME": "Tin nhắn gửi đi",
                "DESC": "( Tổng cộng )"
            },
            "FIRST_RESPONSE_TIME": {
                "NAME": "Thời gian phản hồi đầu tiên",
                "DESC": "( Trung bình )",
                "INFO_TEXT": "Tổng số hội thoại được sử dụng để tính toán:",
                "TOOLTIP_TEXT": "Thời gian phản hồi đầu tiên là {metricValue} (dựa trên {conversationCount} hội thoại)"
            },
            "RESOLUTION_TIME": {
                "NAME": "Thời gian giải quyết",
                "DESC": "( Trung bình )",
                "INFO_TEXT": "Tổng số hội thoại được sử dụng để tính toán:",
                "TOOLTIP_TEXT": "Thời gian giải quyết là {metricValue} (dựa trên {conversationCount} hội thoại)"
            },
            "RESOLUTION_COUNT": {
                "NAME": "Số lượng giải quyết",
                "DESC": "( Tổng cộng )"
            }
        },
        "CUSTOM_DATE_RANGE": {
            "CONFIRM": "Áp dụng",
            "PLACEHOLDER": "Chọn phạm vi ngày"
        }
    },
    "ALERT_SOUND": {
        "TONE_LABEL": "Âm báo",
        "PREVIEW": "Nghe thử",
        "TONES": {
            "DING": "Ding",
            "BELL": "Chuông",
            "CHIME": "Chuông gió",
            "DRUMROLL": "Trống dồn",
            "MAGIC": "Phép màu",
            "PING": "Ping",
            "RINGTONE": "Nhạc chuông"
        }
    },
    "APP_GLOBAL": {
        "TRIAL_MESSAGE": "ngày dùng thử còn lại.",
        "TRAIL_BUTTON": "Mua Ngay",
        "DELETED_USER": "Người dùng bị xoá",
        "EMAIL_VERIFICATION_PENDING": "Có vẻ bạn chưa xác minh địa chỉ email. Hãy kiểm tra hộp thư để tìm email xác minh.",
        "RESEND_VERIFICATION_MAIL": "Gửi lại email xác minh",
        "EMAIL_VERIFICATION_SENT": "Đã gửi email xác minh. Bạn hãy kiểm tra hộp thư.",
        "ACCOUNT_SUSPENDED": {
            "TITLE": "Tài khoản bị ngưng",
            "MESSAGE": "Tài khoản của bạn bị tạm ngưng. Vui lòng liên hệ với nhóm hỗ trợ để biết thêm thông tin.",
            "MANAGE_BILLING": "Quản lý thanh toán"
        },
        "NO_ACCOUNTS": {
            "TITLE": "Không tìm thấy tài khoản nào",
            "MESSAGE_CLOUD": "Hiện bạn chưa thuộc tài khoản nào. Nếu bạn nghĩ đây là nhầm lẫn, hãy liên hệ đội hỗ trợ của chúng tôi.",
            "MESSAGE_SELF_HOSTED": "Hiện bạn chưa thuộc tài khoản nào. Bạn hãy liên hệ quản trị viên.",
            "LOGOUT": "Log out"
        },
        "PLACEHOLDER": {
            "TITLE": "Phần này chưa sẵn sàng",
            "TITLE_NAMED": "{name} chưa sẵn sàng",
            "DESCRIPTION": "Chúng tôi sẽ mở ngay khi xong.",
            "BACK": "Quay lại hội thoại"
        }
    },
    "ASSIGNMENT_POLICY": {
        "INDEX": {
            "HEADER": {
                "TITLE": "Phân công nhân viên",
                "DESCRIPTION": "Đặt ra chính sách để quản lý khối lượng việc và điều hướng hội thoại theo nhu cầu của từng hộp thư và từng nhân viên. Tìm hiểu thêm tại đây"
            },
            "ASSIGNMENT_POLICY": {
                "TITLE": "Chính sách phân công",
                "DESCRIPTION": "Quản lý cách hội thoại được giao trong các hộp thư.",
                "FEATURES": [
                    "Chia hội thoại đều nhau hoặc theo sức chứa còn trống",
                    "Thêm quy tắc chia việc công bằng để không nhân viên nào bị quá tải",
                    "Thêm hộp thư vào chính sách — mỗi hộp thư một chính sách"
                ]
            },
            "AGENT_CAPACITY_POLICY": {
                "TITLE": "Chính sách sức chứa nhân viên",
                "DESCRIPTION": "Quản lý khối lượng việc của nhân viên.",
                "FEATURES": [
                    "Đặt số hội thoại tối đa cho mỗi hộp thư",
                    "Tạo ngoại lệ theo nhãn và theo thời gian",
                    "Thêm nhân viên vào chính sách — mỗi nhân viên một chính sách"
                ]
            }
        },
        "AGENT_ASSIGNMENT_POLICY": {
            "INDEX": {
                "HEADER": {
                    "TITLE": "Chính sách phân công",
                    "CREATE_POLICY": "Chính sách mới"
                },
                "CARD": {
                    "ORDER": "Thứ tự",
                    "PRIORITY": "Mức độ ưu tiên",
                    "ACTIVE": "Đang bật",
                    "INACTIVE": "Đang tắt",
                    "POPOVER": "Hộp thư đã thêm",
                    "EDIT": "Chỉnh sửa"
                },
                "NO_RECORDS_FOUND": "Chưa có chính sách phân công nào"
            },
            "CREATE": {
                "HEADER": {
                    "TITLE": "Tạo chính sách phân công"
                },
                "CREATE_BUTTON": "Tạo chính sách",
                "API": {
                    "SUCCESS_MESSAGE": "Đã tạo chính sách phân công",
                    "ERROR_MESSAGE": "Tạo chính sách phân công thất bại",
                    "INBOX_LINKED": "Đã gắn hộp thư vào chính sách"
                }
            },
            "EDIT": {
                "HEADER": {
                    "TITLE": "Sửa chính sách phân công"
                },
                "EDIT_BUTTON": "Cập nhật chính sách",
                "CONFIRM_ADD_INBOX_DIALOG": {
                    "TITLE": "Thêm hộp thư",
                    "DESCRIPTION": "Hộp thư {inboxName} đang gắn với một chính sách khác. Bạn chắc chắn muốn gắn nó vào chính sách này? Hộp thư sẽ được gỡ khỏi chính sách kia.",
                    "CONFIRM_BUTTON_LABEL": "Tiếp tục",
                    "CANCEL_BUTTON_LABEL": "Huỷ"
                },
                "INBOX_LINK_PROMPT": {
                    "TITLE": "Gắn hộp thư vào chính sách",
                    "DESCRIPTION": "Bạn có muốn gắn hộp thư này vào chính sách phân công không?",
                    "LINK_BUTTON": "Gắn hộp thư",
                    "CANCEL_BUTTON": "Bỏ qua"
                },
                "API": {
                    "SUCCESS_MESSAGE": "Đã cập nhật chính sách phân công",
                    "ERROR_MESSAGE": "Cập nhật chính sách phân công thất bại"
                },
                "INBOX_API": {
                    "ADD": {
                        "SUCCESS_MESSAGE": "Đã thêm hộp thư vào chính sách",
                        "ERROR_MESSAGE": "Thêm hộp thư vào chính sách thất bại"
                    },
                    "REMOVE": {
                        "SUCCESS_MESSAGE": "Đã gỡ hộp thư khỏi chính sách",
                        "ERROR_MESSAGE": "Gỡ hộp thư khỏi chính sách thất bại"
                    }
                }
            },
            "FORM": {
                "NAME": {
                    "LABEL": "Tên chính sách:",
                    "PLACEHOLDER": "Nhập tên chính sách"
                },
                "DESCRIPTION": {
                    "LABEL": "Mô tả:",
                    "PLACEHOLDER": "Nhập mô tả"
                },
                "STATUS": {
                    "LABEL": "Trạng thái:",
                    "PLACEHOLDER": "Chọn trạng thái",
                    "ACTIVE": "Chính sách đang bật",
                    "INACTIVE": "Chính sách đang tắt"
                },
                "ASSIGNMENT_ORDER": {
                    "LABEL": "Thứ tự phân công",
                    "ROUND_ROBIN": {
                        "LABEL": "Chia lần lượt",
                        "DESCRIPTION": "Giao hội thoại đều nhau cho các nhân viên."
                    },
                    "BALANCED": {
                        "LABEL": "Cân bằng",
                        "DESCRIPTION": "Giao hội thoại theo sức chứa còn trống.",
                        "PREMIUM_MESSAGE": "Hãy nâng cấp để dùng phân công cân bằng và quản lý sức chứa nhân viên.",
                        "PREMIUM_BADGE": "Premium"
                    }
                },
                "ASSIGNMENT_PRIORITY": {
                    "LABEL": "Ưu tiên phân công",
                    "EARLIEST_CREATED": {
                        "LABEL": "Tạo sớm nhất",
                        "DESCRIPTION": "Hội thoại tạo trước được giao trước."
                    },
                    "LONGEST_WAITING": {
                        "LABEL": "Chờ lâu nhất",
                        "DESCRIPTION": "Hội thoại chờ lâu nhất được giao trước."
                    }
                },
                "FAIR_DISTRIBUTION": {
                    "LABEL": "Chính sách chia việc công bằng",
                    "DESCRIPTION": "Set the maximum number of conversations that can be assigned per agent within a time window to avoid overloading any one agent. This required field defaults to 100 conversations per hour.",
                    "INPUT_MAX": "Giao tối đa",
                    "DURATION": "hội thoại cho mỗi nhân viên trong mỗi"
                },
                "EXCLUDE_OLDER_THAN": {
                    "LABEL": "Bỏ qua hội thoại quá cũ",
                    "DESCRIPTION": "Bỏ qua hội thoại chưa ai nhận mà cũ hơn mốc này. Mặc định 7 ngày; xóa trống để tắt."
                },
                "INBOXES": {
                    "LABEL": "Hộp thư đã thêm",
                    "DESCRIPTION": "Thêm những hộp thư sẽ áp dụng chính sách này.",
                    "ADD_BUTTON": "Thêm hộp thư",
                    "DROPDOWN": {
                        "SEARCH_PLACEHOLDER": "Tìm và chọn hộp thư để thêm",
                        "ADD_BUTTON": "Thêm"
                    },
                    "EMPTY_STATE": "Chưa có hộp thư nào trong chính sách này, hãy thêm một hộp thư để bắt đầu",
                    "API": {
                        "SUCCESS_MESSAGE": "Đã thêm hộp thư vào chính sách",
                        "ERROR_MESSAGE": "Thêm hộp thư vào chính sách thất bại"
                    }
                }
            },
            "DELETE_POLICY": {
                "SUCCESS_MESSAGE": "Đã xóa chính sách phân công",
                "ERROR_MESSAGE": "Xóa chính sách phân công thất bại"
            }
        },
        "AGENT_CAPACITY_POLICY": {
            "INDEX": {
                "HEADER": {
                    "TITLE": "Sức chứa nhân viên",
                    "CREATE_POLICY": "Chính sách mới"
                },
                "CARD": {
                    "POPOVER": "Nhân viên đã thêm",
                    "EDIT": "Chỉnh sửa"
                },
                "NO_RECORDS_FOUND": "Chưa có chính sách sức chứa nhân viên nào"
            },
            "CREATE": {
                "HEADER": {
                    "TITLE": "Tạo chính sách sức chứa nhân viên"
                },
                "CREATE_BUTTON": "Tạo chính sách",
                "API": {
                    "SUCCESS_MESSAGE": "Đã tạo chính sách sức chứa nhân viên",
                    "ERROR_MESSAGE": "Tạo chính sách sức chứa nhân viên thất bại"
                }
            },
            "EDIT": {
                "HEADER": {
                    "TITLE": "Sửa chính sách sức chứa nhân viên"
                },
                "EDIT_BUTTON": "Cập nhật chính sách",
                "CONFIRM_ADD_AGENT_DIALOG": {
                    "TITLE": "Thêm nhân viên",
                    "DESCRIPTION": "{agentName} đang gắn với một chính sách khác. Bạn chắc chắn muốn gắn vào chính sách này? Nhân viên sẽ được gỡ khỏi chính sách kia.",
                    "CONFIRM_BUTTON_LABEL": "Tiếp tục",
                    "CANCEL_BUTTON_LABEL": "Huỷ"
                },
                "API": {
                    "SUCCESS_MESSAGE": "Đã cập nhật chính sách sức chứa nhân viên",
                    "ERROR_MESSAGE": "Cập nhật chính sách sức chứa nhân viên thất bại"
                },
                "AGENT_API": {
                    "ADD": {
                        "SUCCESS_MESSAGE": "Đã thêm nhân viên vào chính sách",
                        "ERROR_MESSAGE": "Thêm nhân viên vào chính sách thất bại"
                    },
                    "REMOVE": {
                        "SUCCESS_MESSAGE": "Đã gỡ nhân viên khỏi chính sách",
                        "ERROR_MESSAGE": "Gỡ nhân viên khỏi chính sách thất bại"
                    }
                },
                "INBOX_LIMIT_API": {
                    "ADD": {
                        "SUCCESS_MESSAGE": "Đã thêm hạn mức hộp thư",
                        "ERROR_MESSAGE": "Thêm hạn mức hộp thư thất bại"
                    },
                    "UPDATE": {
                        "SUCCESS_MESSAGE": "Đã cập nhật hạn mức hộp thư",
                        "ERROR_MESSAGE": "Cập nhật hạn mức hộp thư thất bại"
                    },
                    "DELETE": {
                        "SUCCESS_MESSAGE": "Đã xóa hạn mức hộp thư",
                        "ERROR_MESSAGE": "Xóa hạn mức hộp thư thất bại"
                    }
                }
            },
            "FORM": {
                "NAME": {
                    "LABEL": "Tên chính sách:",
                    "PLACEHOLDER": "Nhập tên chính sách"
                },
                "DESCRIPTION": {
                    "LABEL": "Mô tả:",
                    "PLACEHOLDER": "Nhập mô tả"
                },
                "INBOX_CAPACITY_LIMIT": {
                    "LABEL": "Hạn mức sức chứa theo hộp thư",
                    "ADD_BUTTON": "Thêm hộp thư",
                    "FIELD": {
                        "SELECT_INBOX": "Chọn hộp thư",
                        "MAX_CONVERSATIONS": "Số hội thoại tối đa",
                        "SET_LIMIT": "Đặt hạn mức"
                    },
                    "EMPTY_STATE": "Chưa đặt hạn mức hộp thư nào"
                },
                "EXCLUSION_RULES": {
                    "LABEL": "Quy tắc loại trừ",
                    "DESCRIPTION": "Hội thoại thỏa các điều kiện sau sẽ không tính vào sức chứa của nhân viên",
                    "TAGS": {
                        "LABEL": "Loại trừ hội thoại có gắn nhãn nhất định",
                        "ADD_TAG": "add tag",
                        "DROPDOWN": {
                            "SEARCH_PLACEHOLDER": "Tìm và chọn nhãn để thêm"
                        },
                        "EMPTY_STATE": "Chính sách này chưa có nhãn nào."
                    },
                    "DURATION": {
                        "LABEL": "Loại trừ hội thoại cũ hơn một khoảng thời gian",
                        "PLACEHOLDER": "Đặt thời gian"
                    }
                },
                "USERS": {
                    "LABEL": "Nhân viên được gán",
                    "DESCRIPTION": "Thêm những nhân viên sẽ áp dụng chính sách này.",
                    "ADD_BUTTON": "Thêm nhân viên",
                    "DROPDOWN": {
                        "SEARCH_PLACEHOLDER": "Tìm và chọn nhân viên để thêm",
                        "ADD_BUTTON": "Thêm"
                    },
                    "EMPTY_STATE": "Chưa thêm nhân viên nào",
                    "API": {
                        "SUCCESS_MESSAGE": "Đã thêm nhân viên vào chính sách",
                        "ERROR_MESSAGE": "Thêm nhân viên vào chính sách thất bại"
                    }
                }
            },
            "DELETE_POLICY": {
                "SUCCESS_MESSAGE": "Đã xóa chính sách sức chứa nhân viên",
                "ERROR_MESSAGE": "Xóa chính sách sức chứa nhân viên thất bại"
            }
        },
        "DELETE_POLICY": {
            "TITLE": "Xóa chính sách",
            "DESCRIPTION": "Bạn chắc chắn muốn xóa chính sách này? Không thể hoàn tác.",
            "CONFIRM_BUTTON_LABEL": "Xoá",
            "CANCEL_BUTTON_LABEL": "Huỷ"
        }
    },
    "ATTRIBUTES_MGMT": {
        "HEADER": "Thuộc tính tùy chỉnh",
        "HEADER_BTN_TXT": "Thêm thuộc tính Tùy chỉnh",
        "LOADING": "Đang lấy thuộc tính tuỳ chỉnh",
        "DESCRIPTION": "A custom attribute tracks additional details about your contacts or conversations—such as the subscription plan or the date of their first purchase. You can add different types of custom attributes, such as text, lists, or numbers, to capture the specific information you need.",
        "LEARN_MORE": "Tìm hiểu thêm về thuộc tính tùy chỉnh",
        "COUNT": "{n} thuộc tính | {n} thuộc tính",
        "SEARCH_PLACEHOLDER": "Tìm kiếm nhiều thuộc tính...",
        "NO_RESULTS": "Không tìm thấy thuộc tính nào khớp",
        "ATTRIBUTE_MODELS": {
            "CONVERSATION": "Hội thoại",
            "CONTACT": "Liên hệ",
            "COMPANY": "Công ty"
        },
        "ATTRIBUTE_TYPES": {
            "TEXT": "Văn bản",
            "NUMBER": "Số",
            "LINK": "Liên kết",
            "DATE": "Ngày",
            "LIST": "Danh sách",
            "CHECKBOX": "Hộp kiểm"
        },
        "ADD": {
            "TITLE": "Thêm thuộc tính Tùy chỉnh",
            "SUBMIT": "Tạo",
            "CANCEL_BUTTON_TEXT": "Huỷ",
            "FORM": {
                "NAME": {
                    "LABEL": "Tên hiển thị",
                    "PLACEHOLDER": "Nhập tên hiển thị của thuộc tính tuỳ chỉnh",
                    "ERROR": "Tên bắt buộc có"
                },
                "DESC": {
                    "LABEL": "Mô tả",
                    "PLACEHOLDER": "Điền mô tả của thuộc tính tuỳ chỉnh",
                    "ERROR": "Mô tả bắt buộc có"
                },
                "MODEL": {
                    "LABEL": "Áp dụng cho",
                    "PLACEHOLDER": "Vui lòng chọn một",
                    "ERROR": "Mô hình bắt buộc có"
                },
                "TYPE": {
                    "LABEL": "Kiểu",
                    "PLACEHOLDER": "Vui lòng chọn một kiểu",
                    "ERROR": "Kiểu bắt buộc có",
                    "LIST": {
                        "LABEL": "Giá trị của danh sách",
                        "PLACEHOLDER": "Vui lòng nhập giá trị và ấn phím enter",
                        "ERROR": "Phải có ít nhất 1 giá trị"
                    }
                },
                "KEY": {
                    "LABEL": "Khóa",
                    "PLACEHOLDER": "Nhập khóa của thuộc tính tuỳ chỉnh",
                    "ERROR": "Cần có khóa",
                    "IN_VALID": "Khóa không hợp lệ"
                },
                "REGEX_PATTERN": {
                    "LABEL": "Mẫu regex",
                    "PLACEHOLDER": "Bạn hãy nhập mẫu regex cho thuộc tính tùy chỉnh. (Không bắt buộc)"
                },
                "REGEX_CUE": {
                    "LABEL": "Gợi ý regex",
                    "PLACEHOLDER": "Bạn hãy nhập gợi ý cho mẫu regex. (Không bắt buộc)"
                },
                "ENABLE_REGEX": {
                    "LABEL": "Bật kiểm tra bằng regex"
                },
                "BADGES": {
                    "PRE_CHAT": "Trước chat",
                    "RESOLUTION": "Khi xử lý xong"
                }
            },
            "API": {
                "SUCCESS_MESSAGE": "Thuộc tính tuỳ chỉnh được thêm thành công!",
                "ERROR_MESSAGE": "Không tạo được thuộc tính tùy chỉnh. Bạn hãy thử lại sau."
            }
        },
        "DELETE": {
            "BUTTON_TEXT": "Xoá",
            "API": {
                "SUCCESS_MESSAGE": "Thuộc tính tuỳ chỉnh bị xoá thành công.",
                "ERROR_MESSAGE": "Không thể xoá thuộc tính tuỳ chỉnh. Thử lại."
            },
            "CONFIRM": {
                "TITLE": "Bạn có chắc muốn xoá - {attributeName}",
                "PLACE_HOLDER": "Vui lòng điền {attributeName} để xác nhận",
                "MESSAGE": "Xoá sẽ loại bỏ thuộc tính tuỳ chỉnh",
                "YES": "Xoá ",
                "NO": "Huỷ"
            }
        },
        "EDIT": {
            "TITLE": "Sửa Thuộc tính Tùy chỉnh",
            "UPDATE_BUTTON_TEXT": "Cập nhật",
            "TYPE": {
                "LIST": {
                    "LABEL": "Giá trị của danh sách",
                    "PLACEHOLDER": "Vui lòng nhập giá trị và ấn phím enter"
                }
            },
            "API": {
                "SUCCESS_MESSAGE": "Thuộc tính tuỳ chỉnh được sửa thành công",
                "ERROR_MESSAGE": "Đã xảy ra lỗi khi cập nhật thuộc tính tuỳ chỉnh, vui lòng thử lại"
            }
        },
        "TABS": {
            "HEADER": "Thuộc tính tùy chỉnh",
            "CONVERSATION": "Hội thoại",
            "CONTACT": "Liên lạc",
            "COMPANY": "Công ty"
        },
        "LIST": {
            "TABLE_HEADER": {
                "NAME": "Tên",
                "DESCRIPTION": "Mô tả",
                "TYPE": "Kiểu",
                "KEY": "Khóa"
            },
            "BUTTONS": {
                "EDIT": "Chỉnh sửa",
                "DELETE": "Xoá"
            },
            "EMPTY_RESULT": {
                "404": "Không có thuộc tính tuỳ chỉnh nào được tạo",
                "NOT_FOUND": "Không có thuộc tính tuỳ chỉnh nào được cấu hình"
            },
            "REGEX_PATTERN": {
                "LABEL": "Mẫu regex",
                "PLACEHOLDER": "Bạn hãy nhập mẫu regex cho thuộc tính tùy chỉnh. (Không bắt buộc)"
            },
            "REGEX_CUE": {
                "LABEL": "Gợi ý regex",
                "PLACEHOLDER": "Bạn hãy nhập gợi ý cho mẫu regex. (Không bắt buộc)"
            },
            "ENABLE_REGEX": {
                "LABEL": "Bật kiểm tra bằng regex"
            }
        },
        "BADGES": {
            "PRE_CHAT": "Trước chat",
            "RESOLUTION": "Khi xử lý xong"
        }
    },
    "AUTH": {
        "failed": "Thông tin đăng nhập không đúng. Bạn hãy thử lại.",
        "unconfirmed": "Bạn cần xác nhận địa chỉ email trước khi tiếp tục. Hãy xác nhận email :email.",
        "throttle": "Bạn đã đăng nhập sai quá nhiều lần. Hãy thử lại sau :seconds giây.",
        "page_expired": "Trang đã mở quá lâu nên cần làm mới. Bạn thử lại nhé.",
        "signup": {
            "invalid_email": "Bạn hãy nhập địa chỉ email hợp lệ.",
            "user_exists": "Địa chỉ email này đã có người dùng.",
            "failed": "Chưa tạo được tài khoản. Bạn hãy thử lại."
        },
        "oauth": {
            "failed": "Chưa đăng nhập được. Bạn hãy thử lại.",
            "unverified_email": "Email này chưa được nhà cung cấp xác minh nên không dùng để đăng nhập được.",
            "not_allowed": "Tài khoản này không đăng nhập theo cách này được. Bạn hãy đăng nhập bằng mật khẩu."
        }
    },
    "AUTO_ASSIGNMENT": {
        "default_policy_name": "Chính sách mặc định",
        "policy_actor": "Hệ thống tự động hóa qua {policy_name}"
    },
    "AUTOMATION": {
        "system_name": "Hệ thống tự động hóa",
        "HEADER": "Tự động hóa",
        "DESCRIPTION": "Tự động hóa thay thế và rút gọn những việc tay chân lặp đi lặp lại như gắn nhãn hay giao hội thoại cho đúng nhân viên. Nhờ vậy cả đội tập trung vào thế mạnh của mình và bớt thời gian cho việc vặt.",
        "LEARN_MORE": "Tìm hiểu thêm về tự động hóa",
        "COUNT": "{n} quy tắc tự động hóa | {n} quy tắc tự động hóa",
        "HEADER_BTN_TXT": "Tạo tự động hóa",
        "LOADING": "Đang lấy quy tắc tự động hóa",
        "SEARCH_PLACEHOLDER": "Tìm quy tắc tự động hóa...",
        "NO_RESULTS": "Không tìm thấy quy tắc tự động hóa nào khớp",
        "ADD": {
            "TITLE": "Thêm quy tắc tự động hóa",
            "SUBMIT": "Tạo",
            "CANCEL_BUTTON_TEXT": "Huỷ",
            "FORM": {
                "NAME": {
                    "LABEL": "Tên quy tắc",
                    "PLACEHOLDER": "Nhập tên quy tắc",
                    "ERROR": "Cần phải có tên"
                },
                "DESC": {
                    "LABEL": "Mô tả",
                    "PLACEHOLDER": "Nhập mô tả quy tắc",
                    "ERROR": "Cần phải có mô tả"
                },
                "EVENT": {
                    "LABEL": "Sự kiện",
                    "PLACEHOLDER": "Vui lòng chọn một",
                    "ERROR": "Cần phải có sự kiện"
                },
                "RUN_TYPE": {
                    "LABEL": "Khi nào quy tắc này chạy?",
                    "OPTIONS": {
                        "INSTANT": {
                            "LABEL": "Chạy ngay",
                            "DESCRIPTION": "Chạy ngay khi có sự kiện, miễn là điều kiện khớp."
                        },
                        "WAIT": {
                            "LABEL": "Chạy sau một khoảng chờ",
                            "DESCRIPTION": "Chờ một khoảng thời gian rồi chỉ chạy nếu mọi thứ vẫn như cũ. Nếu có thay đổi, quy tắc bị bỏ qua."
                        }
                    }
                },
                "WAIT": {
                    "LABEL": "Điều kiện chờ",
                    "WHEN_LABEL": "Khi",
                    "STATUS_LABEL": "Trạng thái là",
                    "FOR_LABEL": "For",
                    "INBOX_LABEL": "Hộp thư",
                    "ERROR": "Khoảng chờ phải từ 10 phút đến 30 ngày",
                    "OPTIONS": {
                        "CONVERSATION_STATUS": "Hội thoại giữ nguyên một trạng thái",
                        "CUSTOMER_UNRESPONSIVE": "Khách chưa trả lời",
                        "AGENT_UNRESPONSIVE": "Chưa đồng đội nào trả lời"
                    },
                    "DURATION": {
                        "MINUTES": "{count} phút | {count} phút",
                        "HOURS": "{count} giờ | {count} giờ",
                        "DAYS": "{count} ngày | {count} ngày"
                    },
                    "EXPLANATION": {
                        "CONVERSATION_STATUS": "Đồng hồ bắt đầu chạy khi hội thoại chuyển sang trạng thái này. Nếu sau {duration} vẫn ở đó, các hành động bên dưới sẽ chạy. Nếu trạng thái đổi trước đó thì không có gì xảy ra.",
                        "CUSTOMER_UNRESPONSIVE": "Đồng hồ bắt đầu chạy khi một đồng đội trả lời. Nếu sau {duration} khách vẫn chưa hồi âm, các hành động bên dưới sẽ chạy. Nếu khách trả lời thì không có gì xảy ra, và lần đồng đội trả lời kế tiếp sẽ tính lại từ đầu.",
                        "AGENT_UNRESPONSIVE": "Đồng hồ bắt đầu chạy khi khách gửi tin nhắn. Nếu sau {duration} chưa đồng đội nào trả lời, các hành động bên dưới sẽ chạy. Nếu có người trả lời trước đó thì không có gì xảy ra."
                    },
                    "FOOTNOTE": "Chỉ hoạt động mới bắt đầu tính giờ. Những hội thoại đang nằm sẵn ở trạng thái này sẽ được tính vào lần kế tiếp có việc gì xảy ra với chúng."
                },
                "CONDITIONS": {
                    "LABEL": "Điều kiện"
                },
                "ACTIONS": {
                    "LABEL": "Hành động"
                }
            },
            "CONDITION_BUTTON_LABEL": "Thêm Điều kiện",
            "ACTION_BUTTON_LABEL": "Thêm Hành động",
            "API": {
                "SUCCESS_MESSAGE": "Quy tắc tự động hóa thêm thành công",
                "ERROR_MESSAGE": "Không thể tạo quy tắc tự động hóa, Vui lòng thử lại sau"
            }
        },
        "LIST": {
            "TABLE_HEADER": {
                "NAME": "Tên",
                "ACTIVE": "Đang bật",
                "CREATED_ON": "Ngày tạo",
                "ACTIONS": "Hành động"
            },
            "404": "Không tìm thấy quy tắc tự động hóa",
            "404_DELAYED": "Chưa có quy tắc nào chạy sau một khoảng chờ",
            "TABS": {
                "INSTANT": "Chạy ngay",
                "DELAYED": "Chạy sau một khoảng chờ"
            },
            "DELAY_BADGE": "Chạy sau {delay}",
            "DELAY_DISABLED_BANNER": "Tài khoản này đang tắt chế độ chạy trễ, nên các quy tắc chạy sau một khoảng chờ bên dưới đang tạm dừng cho tới khi bật lại."
        },
        "DELETE": {
            "CONFIRM": {
                "TITLE": "Xác nhận xoá",
                "MESSAGE": "Bạn có chắc muốn xoá ",
                "YES": "Có, xoá ",
                "NO": "Không, giữ "
            },
            "API": {
                "SUCCESS_MESSAGE": "Quy tắc tự động hóa được xoá thành công",
                "ERROR_MESSAGE": "Không thể xoá quy tắc tự động hóa, Vui lòng thử lại sau"
            }
        },
        "EDIT": {
            "TITLE": "Sửa quy tắc tự động hóa",
            "SUBMIT": "Cập nhật",
            "CANCEL_BUTTON_TEXT": "Huỷ",
            "API": {
                "SUCCESS_MESSAGE": "Quy tắc tự động hóa được thêm thành công",
                "ERROR_MESSAGE": "Không thể cập nhật quy tắc tự động hóa, Vui lòng thử lại sau"
            }
        },
        "CLONE": {
            "TOOLTIP": "Nhân bản",
            "API": {
                "SUCCESS_MESSAGE": "Quy tắc tự động hóa mô phỏng thành công",
                "ERROR_MESSAGE": "Không thể mô phỏng quy tắc tự động hóa, Vui lòng thử lại sau"
            }
        },
        "FORM": {
            "EDIT": "Chỉnh sửa",
            "CREATE": "Tạo",
            "DELETE": "Xoá",
            "CANCEL": "Huỷ",
            "RESET_MESSAGE": "Thay đổi loại sự kiện sẽ đặt lại điều kiện và sự kiện mà bạn đã thêm bên dưới"
        },
        "CONDITION": {
            "DELETE_MESSAGE": "Bạn cần có ít nhất một điều kiện để lưu",
            "CONTACT_CUSTOM_ATTR_LABEL": "Thuộc tính Liên hệ Tùy chỉnh",
            "CONVERSATION_CUSTOM_ATTR_LABEL": "Tùy chỉnh Thuộc tính hội thoại"
        },
        "ACTION": {
            "DELETE_MESSAGE": "Bạn cần có ít nhất một hành động để lưu",
            "TEAM_MESSAGE_INPUT_PLACEHOLDER": "Viết tin nhắn ở đây",
            "TEAM_DROPDOWN_PLACEHOLDER": "Chọn nhóm",
            "EMAIL_INPUT_PLACEHOLDER": "Nhập email",
            "URL_INPUT_PLACEHOLDER": "Nhập URL",
            "INSERT_CONTACT_EMAIL": "Dùng email của liên hệ"
        },
        "TOGGLE": {
            "ACTIVATION_TITLE": "Kích hoạt quy tắc tự động hóa",
            "DEACTIVATION_TITLE": "Vô hiệu hóa quy tắc tự động hóa",
            "ACTIVATION_DESCRIPTION": "Thao tác này sẽ kích hoạt quy tắc tự động hóa tên '{automationName}'. Bạn có chắc là muốn tiếp tục?",
            "DEACTIVATION_DESCRIPTION": "Thao tác này sẽ vô hiệu hóa quy tắc tự động hóa tên '{automationName}'. Bạn có chắc là muốn tiếp tục?",
            "CONFIRMATION_LABEL": "Có",
            "CANCEL_LABEL": "Không"
        },
        "EVENTS": {
            "CONVERSATION_CREATED": "Hội thoại đã được tạo",
            "CONVERSATION_UPDATED": "Hội thoại đã được cập nhật",
            "MESSAGE_CREATED": "Có tin nhắn mới",
            "CONVERSATION_RESOLVED": "Hội thoại đã xử lý xong",
            "CONVERSATION_OPENED": "Hội thoại được mở"
        },
        "ACTIONS": {
            "ASSIGN_AGENT": "Giao cho nhân viên",
            "ASSIGN_TEAM": "Giao cho một nhóm",
            "REMOVE_ASSIGNED_AGENT": "Bỏ nhân viên đang phụ trách",
            "REMOVE_ASSIGNED_TEAM": "Bỏ nhóm đang phụ trách",
            "ADD_LABEL": "Gắn một nhãn",
            "REMOVE_LABEL": "Gỡ một nhãn",
            "SEND_EMAIL_TO_TEAM": "Gửi email cho nhóm",
            "SEND_MESSAGE": "Gửi một tin nhắn",
            "ADD_PRIVATE_NOTE": "Thêm một ghi chú riêng",
            "MUTE_CONVERSATION": "Tắt tiếng hội thoại",
            "SNOOZE_CONVERSATION": "Tạm dừng hội thoại",
            "OPEN_CONVERSATION": "Mở hội thoại",
            "PENDING_CONVERSATION": "Đánh dấu hội thoại là đang chờ",
            "RESOLVE_CONVERSATION": "Giải quyết hội thoại",
            "CHANGE_PRIORITY": "Đổi mức ưu tiên"
        },
        "ATTRIBUTES": {
            "MESSAGE_TYPE": "Loại tin nhắn",
            "PRIVATE_NOTE": "Ghi chú riêng",
            "MESSAGE_CONTAINS": "Nội dung tin nhắn",
            "EMAIL": "Email",
            "INBOX": "Hộp thư",
            "CONVERSATION_LANGUAGE": "Ngôn ngữ hội thoại",
            "PHONE_NUMBER": "Số điện thoại",
            "STATUS": "Trạng thái",
            "BROWSER_LANGUAGE": "Ngôn ngữ của Trình duyệt",
            "MAIL_SUBJECT": "Tiêu đề email",
            "COUNTRY_NAME": "Quốc gia",
            "COMPANY_NAME": "Công ty",
            "REFERER_LINK": "Liên kết nguồn",
            "ASSIGNEE_NAME": "Người phụ trách",
            "TEAM_NAME": "Nhóm",
            "PRIORITY": "Mức độ ưu tiên",
            "LABELS": "Nhãn"
        },
        "NONE_OPTION": "Không có",
        "LAST_RESPONDING_AGENT": "Nhân viên trả lời gần nhất",
        "MESSAGE_TYPES": {
            "INCOMING": "Tin nhắn đến",
            "OUTGOING": "Tin nhắn đi"
        },
        "PRIORITY_TYPES": {
            "NONE": "Không có",
            "LOW": "Thấp",
            "MEDIUM": "Trung bình",
            "HIGH": "Cao",
            "URGENT": "Cấp bách"
        },
        "ERRORS": {
            "VALUE_REQUIRED": "Giá trị bắt buộc có",
            "ACTION_PARAMETERS_REQUIRED": "Tham số của hành động là bắt buộc",
            "ATLEAST_ONE_CONDITION_REQUIRED": "Cần ít nhất một điều kiện",
            "ATLEAST_ONE_ACTION_REQUIRED": "Cần ít nhất một hành động"
        }
    },
    "BILLING_SETTINGS": {
        "TITLE": "Phí",
        "DESCRIPTION": "Quản lý gói dịch vụ tại đây, nâng cấp gói để đội của bạn có thêm nhiều tính năng.",
        "CURRENT_PLAN": {
            "TITLE": "Gói hiện tại",
            "PLAN_NOTE": "Bạn hiện đã đăng ký gói **{plan}** với **{quantity}** giấy phép",
            "SEAT_COUNT": "Số chỗ ngồi",
            "RENEWS_ON": "Gia hạn vào",
            "CURRENCY": "Loại tiền"
        },
        "CURRENCY": {
            "SELECT": {
                "TITLE": "Chọn loại tiền thanh toán",
                "DESCRIPTION": "Chọn loại tiền bạn muốn dùng để thanh toán. Không đổi được sau khi gói đã tạo."
            },
            "OPTIONS": {
                "USD": "Đô la Mỹ (USD)",
                "BRL": "Real Brazil (BRL)"
            }
        },
        "VIEW_PRICING": "Xem bảng giá",
        "MANAGE_SUBSCRIPTION": {
            "TITLE": "Quản lý thuê bao của bạn",
            "DESCRIPTION": "Xem các hóa đơn trước đây của bạn, chỉnh sửa chi tiết thanh toán hoặc hủy thuê bao của bạn.",
            "BUTTON_TXT": "Đi tới cổng thanh toán"
        },
        "CAPTAIN": {
            "TITLE": "Captain",
            "DESCRIPTION": "Quản lý mức dùng và tín dụng của Captain AI.",
            "BUTTON_TXT": "Mua thêm tín dụng",
            "DOCUMENTS": "Tài liệu",
            "RESPONSES": "Responses",
            "UPGRADE": "Gói miễn phí không có Captain, hãy nâng cấp ngay để dùng trợ lý, copilot và nhiều thứ khác.",
            "REFRESH_CREDITS": "Làm mới"
        },
        "CHAT_WITH_US": {
            "TITLE": "Cần hỗ trợ?",
            "DESCRIPTION": "Bạn có gặp phải bất kỳ vấn đề nào trong thanh toán không? Hãy cho chúng tôi biết.",
            "BUTTON_TXT": "Trò chuyện với chúng tôi"
        },
        "NO_BILLING_USER": "Tài khoản thanh toán của bạn đang được định cấu hình. Hãy làm mới trang và thử lại.",
        "TOPUP": {
            "BUY_CREDITS": "Mua thêm tín dụng",
            "MODAL_TITLE": "Mua tín dụng AI",
            "MODAL_DESCRIPTION": "Mua thêm tín dụng cho Captain AI.",
            "CREDITS": "TÍN DỤNG",
            "ONE_TIME": "một lần",
            "POPULAR": "Phổ biến nhất",
            "NOTE_TITLE": "Ghi chú:",
            "NOTE_DESCRIPTION": "Tín dụng được cộng ngay và hết hạn sau 6 tháng. Bạn cần có gói đang hoạt động mới dùng được tín dụng. Tín dụng mua thêm được dùng sau khi hết tín dụng hằng tháng của gói.",
            "CANCEL": "Huỷ",
            "PURCHASE": "Mua tín dụng",
            "LOADING": "Đang tải các lựa chọn...",
            "FETCH_ERROR": "Không tải được các gói tín dụng. Bạn hãy thử lại.",
            "RETRY": "Thử lại",
            "PURCHASE_ERROR": "Không xử lý được giao dịch. Bạn hãy thử lại.",
            "PURCHASE_SUCCESS": "Đã cộng {credits} tín dụng vào tài khoản của bạn",
            "CONFIRM": {
                "TITLE": "Xác nhận mua",
                "DESCRIPTION": "Bạn sắp mua {credits} tín dụng với giá {amount}.",
                "INSTANT_DEDUCTION_NOTE": "Thẻ đã lưu của bạn sẽ bị trừ tiền ngay khi xác nhận.",
                "GO_BACK": "Quay lại",
                "CONFIRM_PURCHASE": "Xác nhận mua"
            }
        }
    },
    "BOT_REPORTS": {
        "HEADER": "Báo cáo bot",
        "METRIC": {
            "TOTAL_CONVERSATIONS": {
                "LABEL": "Số hội thoại",
                "TOOLTIP": "Tổng số hội thoại do bot xử lý"
            },
            "TOTAL_RESPONSES": {
                "LABEL": "Tổng số câu trả lời",
                "TOOLTIP": "Tổng số câu trả lời bot đã gửi"
            },
            "RESOLUTION_RATE": {
                "LABEL": "Tỷ lệ xử lý xong",
                "TOOLTIP": "Số hội thoại bot xử lý xong / tổng số hội thoại bot tiếp nhận * 100"
            },
            "HANDOFF_RATE": {
                "LABEL": "Tỷ lệ chuyển giao",
                "TOOLTIP": "Số hội thoại chuyển cho nhân viên / tổng số hội thoại bot tiếp nhận * 100"
            }
        }
    },
    "BREADCRUMB": {
        "ARIA_LABEL": "Đường dẫn phân cấp"
    },
    "BULK_ACTION": {
        "CONVERSATIONS_SELECTED": "{conversationCount} hội thoại đã được chọn",
        "NONE": "Không có",
        "CLEAR_SELECTION": "Bỏ chọn",
        "ASSIGN_AGENT_CONFIRMATION_LABEL": "Bạn chắc chắn muốn giao {n} hội thoại cho {agentName}? | Bạn chắc chắn muốn giao {n} hội thoại cho {agentName}?",
        "UNASSIGN_AGENT_CONFIRMATION_LABEL": "Bạn chắc chắn muốn bỏ người phụ trách của {n} hội thoại? | Bạn chắc chắn muốn bỏ người phụ trách của {n} hội thoại?",
        "YES": "Có",
        "CANCEL": "Huỷ",
        "SEARCH_INPUT_PLACEHOLDER": "Tìm kiếm",
        "ASSIGN_AGENT_TOOLTIP": "Gán nhân viên",
        "ASSIGN_TEAM_TOOLTIP": "Gán nhóm",
        "ASSIGN_SUCCESFUL": "Hội thoại đã được phân công thành công.",
        "ASSIGN_FAILED": "Giao hội thoại thất bại. Bạn hãy thử lại.",
        "RESOLVE_SUCCESFUL": "Hội thoại đã được giải quyết thành công.",
        "RESOLVE_FAILED": "Đánh dấu xử lý xong thất bại. Bạn hãy thử lại.",
        "ALL_CONVERSATIONS_SELECTED_ALERT": "Chỉ những hội thoại hiển thị trên trang này mới có thể được chọn.",
        "UPDATE": {
            "CHANGE_STATUS": "Thay đổi trạng thái",
            "SNOOZE_UNTIL": "Báo lại",
            "UPDATE_SUCCESFUL": "Đã cập nhật trạng thái hội thoại thành công.",
            "UPDATE_FAILED": "Cập nhật hội thoại thất bại. Bạn hãy thử lại."
        },
        "RESOLVE": {
            "ALL_MISSING_ATTRIBUTES": "Không đánh dấu xử lý xong được vì còn thiếu thuộc tính bắt buộc",
            "PARTIAL_SUCCESS": "Một số hội thoại còn thiếu thuộc tính bắt buộc nên đã bị bỏ qua"
        },
        "LABELS": {
            "ASSIGN_LABELS": "Gắn nhãn",
            "REMOVE_LABELS": "Gỡ nhãn",
            "ASSIGN_SELECTED_LABELS": "Gán các nhãn đã chọn",
            "REMOVE_SELECTED_LABELS": "Gỡ các nhãn đã chọn",
            "ASSIGN_SUCCESFUL": "Các nhãn được gán thành công.",
            "ASSIGN_FAILED": "Gắn nhãn thất bại. Bạn hãy thử lại.",
            "REMOVE_SUCCESFUL": "Đã gỡ nhãn.",
            "REMOVE_FAILED": "Gỡ nhãn thất bại. Bạn hãy thử lại."
        },
        "TEAMS": {
            "NONE": "Không có",
            "ASSIGN_TEAM_CONFIRMATION_LABEL": "Bạn chắc chắn muốn giao {n} hội thoại cho {teamName}? | Bạn chắc chắn muốn giao {n} hội thoại cho {teamName}?",
            "UNASSIGN_TEAM_CONFIRMATION_LABEL": "Bạn chắc chắn muốn bỏ nhóm phụ trách của {n} hội thoại? | Bạn chắc chắn muốn bỏ nhóm phụ trách của {n} hội thoại?",
            "ASSIGN_SUCCESFUL": "Đã giao cho nhóm.",
            "ASSIGN_FAILED": "Giao cho nhóm thất bại. Bạn hãy thử lại."
        }
    },
    "CAMPAIGN": {
        "LIVE_CHAT": {
            "HEADER_TITLE": "Chiến dịch chat trực tuyến",
            "NEW_CAMPAIGN": "Tạo chiến dịch",
            "CARD": {
                "STATUS": {
                    "ENABLED": "Bật",
                    "DISABLED": "Không bật"
                },
                "CAMPAIGN_DETAILS": {
                    "SENT_BY": "Gửi bởi",
                    "BOT": "Bot",
                    "FROM": "từ",
                    "URL": "URL:"
                }
            },
            "EMPTY_STATE": {
                "TITLE": "Chưa có chiến dịch chat trực tuyến nào",
                "SUBTITLE": "Chủ động nhắn tin để kết nối với khách hàng. Bấm \"Tạo chiến dịch\" để bắt đầu."
            },
            "CREATE": {
                "TITLE": "Tạo chiến dịch chat trực tuyến",
                "CANCEL_BUTTON_TEXT": "Huỷ",
                "CREATE_BUTTON_TEXT": "Tạo",
                "FORM": {
                    "TITLE": {
                        "LABEL": "Tiêu đề",
                        "PLACEHOLDER": "Vui lòng điền tiêu đề của chiến dịch",
                        "ERROR": "Tiêu đề bắt buộc có"
                    },
                    "MESSAGE": {
                        "LABEL": "Tin nhắn",
                        "PLACEHOLDER": "Vui lòng điền thông điệp của chiến dịch",
                        "ERROR": "Thông điệp bắt buộc có"
                    },
                    "INBOX": {
                        "LABEL": "Chọn hộp thư",
                        "PLACEHOLDER": "Chọn hộp thư",
                        "ERROR": "Cần phải có kênh"
                    },
                    "SENT_BY": {
                        "LABEL": "Gửi bởi",
                        "PLACEHOLDER": "Bạn hãy chọn người gửi",
                        "ERROR": "Người gửi cần có"
                    },
                    "END_POINT": {
                        "LABEL": "URL",
                        "PLACEHOLDER": "Vui lòng nhập URL",
                        "ERROR": "Vui lòng nhập một URL hợp lệ"
                    },
                    "TIME_ON_PAGE": {
                        "LABEL": "Thời gian trên trang(Giây)",
                        "PLACEHOLDER": "Vui lòng nhập thời gian",
                        "ERROR": "Thời gian trên trang là bắt buộc"
                    },
                    "QUICK_REPLIES": {
                        "LABEL": "Chip trả lời nhanh",
                        "HINT": "Tối đa 3 chip hiện dưới lời mời. Khách bấm là mở khung chat và gửi đúng chữ đó.",
                        "PLACEHOLDER": "Ví dụ: Còn hàng không?",
                        "ITEM": "Chip {index}",
                        "ERROR": "Mỗi chip tối đa 40 ký tự và không trùng nhau"
                    },
                    "SHOW_TO": {
                        "LABEL": "Mời ai",
                        "ALL": "Mọi khách",
                        "NEW": "Khách chưa từng nhắn",
                        "RETURNING": "Khách đã từng nhắn"
                    },
                    "OTHER_PREFERENCES": {
                        "TITLE": "Tùy chọn khác",
                        "ENABLED": "Vận hành chiến dịch",
                        "TRIGGER_ONLY_BUSINESS_HOURS": "Chỉ kích hoạt trong giờ làm việc"
                    },
                    "BUTTONS": {
                        "CREATE": "Tạo",
                        "CANCEL": "Huỷ"
                    },
                    "API": {
                        "SUCCESS_MESSAGE": "Đã tạo chiến dịch chat trực tuyến",
                        "ERROR_MESSAGE": "Đã có lỗi. Vui lòng thử lại."
                    }
                }
            },
            "EDIT": {
                "TITLE": "Sửa chiến dịch chat trực tuyến",
                "FORM": {
                    "API": {
                        "SUCCESS_MESSAGE": "Đã cập nhật chiến dịch chat trực tuyến",
                        "ERROR_MESSAGE": "Đã có lỗi. Vui lòng thử lại."
                    }
                }
            }
        },
        "CONFIRM_DELETE": {
            "TITLE": "Bạn có chắc muốn xoá?",
            "DESCRIPTION": "Thao tác xóa là vĩnh viễn, không thể hoàn tác.",
            "CONFIRM": "Xoá",
            "API": {
                "SUCCESS_MESSAGE": "Chiến dịch được xoá thành công",
                "ERROR_MESSAGE": "Đã có lỗi. Vui lòng thử lại."
            }
        }
    },
    "CANNED_MGMT": {
        "HEADER": "Câu trả lời mẫu",
        "LEARN_MORE": "Tìm hiểu thêm về câu trả lời mẫu",
        "DESCRIPTION": "Câu trả lời mẫu là những đoạn trả lời soạn sẵn giúp bạn phản hồi hội thoại thật nhanh. Nhân viên gõ ký tự \"/\" rồi mã tắt để chèn câu trả lời mẫu vào hội thoại. ",
        "COUNT": "{n} câu trả lời mẫu | {n} câu trả lời mẫu",
        "HEADER_BTN_TXT": "Thêm câu trả lời mẫu",
        "LOADING": "Đang tải câu trả lời mẫu...",
        "SEARCH_PLACEHOLDER": "Tìm câu trả lời mẫu...",
        "NO_RESULTS": "Không tìm thấy câu trả lời mẫu nào khớp",
        "SEARCH_404": "Không có kết quả nào phù hợp.",
        "LIST": {
            "404": "Chưa có câu trả lời mẫu nào trong tài khoản này.",
            "TITLE": "Quản lý câu trả lời mẫu",
            "DESC": "Câu trả lời mẫu là những đoạn trả lời soạn sẵn dùng để phản hồi hội thoại thật nhanh.",
            "TABLE_HEADER": {
                "SHORT_CODE": "Mã tắt",
                "CONTENT": "Nội dung",
                "ACTIONS": "Hành động"
            },
            "UNKNOWN_CARD_TYPE": "Thẻ"
        },
        "ADD": {
            "TITLE": "Thêm câu trả lời mẫu",
            "DESC": "Câu trả lời mẫu là những đoạn trả lời soạn sẵn dùng để phản hồi hội thoại thật nhanh.",
            "CANCEL_BUTTON_TEXT": "Huỷ",
            "FORM": {
                "SHORT_CODE": {
                    "LABEL": "Mã tắt",
                    "PLACEHOLDER": "Bạn hãy nhập mã tắt.",
                    "ERROR": "Mã tắt là bắt buộc."
                },
                "CONTENT": {
                    "LABEL": "Tin nhắn",
                    "PLACEHOLDER": "Hãy viết nội dung bạn muốn lưu làm mẫu để dùng sau này.",
                    "ERROR": "Nội dung là bắt buộc."
                },
                "SUBMIT": "Gửi"
            },
            "API": {
                "SUCCESS_MESSAGE": "Đã thêm câu trả lời mẫu.",
                "ERROR_MESSAGE": "Không kết nối được máy chủ. Bạn hãy thử lại."
            }
        },
        "EDIT": {
            "TITLE": "Sửa câu trả lời mẫu",
            "CANCEL_BUTTON_TEXT": "Huỷ",
            "FORM": {
                "SHORT_CODE": {
                    "LABEL": "Mã tắt",
                    "PLACEHOLDER": "Bạn hãy nhập mã tắt.",
                    "ERROR": "Mã tắt là bắt buộc."
                },
                "CONTENT": {
                    "LABEL": "Tin nhắn",
                    "PLACEHOLDER": "Hãy viết nội dung bạn muốn lưu làm mẫu để dùng sau này.",
                    "ERROR": "Thông điệp bắt buộc có."
                },
                "SUBMIT": "Gửi"
            },
            "BUTTON_TEXT": "Chỉnh sửa",
            "API": {
                "SUCCESS_MESSAGE": "Đã cập nhật câu trả lời mẫu.",
                "ERROR_MESSAGE": "Không kết nối được máy chủ. Bạn hãy thử lại."
            },
            "CARD_VIEW": {
                "TYPE_LABEL": "Loại thẻ",
                "HINT": "Câu trả lời mẫu này gửi một thẻ. Muốn đổi nội dung thẻ, hãy vào một hội thoại, gửi thẻ mới rồi lưu làm câu trả lời mẫu."
            }
        },
        "DELETE": {
            "BUTTON_TEXT": "Xoá",
            "API": {
                "SUCCESS_MESSAGE": "Đã xóa câu trả lời mẫu.",
                "ERROR_MESSAGE": "Không kết nối được máy chủ. Bạn hãy thử lại."
            },
            "CONFIRM": {
                "TITLE": "Xác nhận xoá",
                "MESSAGE": "Bạn có chắc muốn xoá? ",
                "YES": "Có, xóa ",
                "NO": "Không, giữ lại "
            }
        }
    },
    "CAPTAIN_SETTINGS": {
        "TITLE": "Thiết lập Captain",
        "DESCRIPTION": "Cấu hình mô hình AI và tính năng cho Captain. Captain tính phí theo tín dụng; mỗi hành động Captain thực hiện sẽ trừ tín dụng tùy mô hình bạn chọn.",
        "LOADING": "Đang tải cấu hình Captain...",
        "LINK_TEXT": "Tìm hiểu thêm về tín dụng Captain",
        "NOT_ENABLED": "Tài khoản của bạn chưa bật Captain. Hãy nâng cấp gói để dùng các tính năng Captain.",
        "MODEL_CONFIG": {
            "TITLE": "Cấu hình mô hình",
            "DESCRIPTION": "Chọn mô hình AI cho từng tính năng.",
            "SELECT_MODEL": "Chọn mô hình",
            "CREDITS_PER_MESSAGE": "{credits} tín dụng/tin nhắn",
            "COMING_SOON": "Sắp có",
            "EDITOR": {
                "TITLE": "Tính năng soạn thảo",
                "DESCRIPTION": "Hỗ trợ soạn tin thông minh, sửa ngữ pháp, chỉnh giọng văn và trau chuốt nội dung trong trình soạn tin nhắn."
            },
            "ASSISTANT": {
                "TITLE": "Trợ lý",
                "DESCRIPTION": "Xử lý câu trả lời tự động, tóm tắt hội thoại và gợi ý câu trả lời thông minh khi trao đổi với khách."
            },
            "COPILOT": {
                "TITLE": "Co-pilot",
                "DESCRIPTION": "Đưa gợi ý theo bối cảnh, gợi ý bài viết trong kho kiến thức và nhận định chủ động ngay trong lúc trò chuyện."
            }
        },
        "FEATURES": {
            "TITLE": "Các tính năng",
            "DESCRIPTION": "Bật hoặc tắt các tính năng dùng AI.",
            "AUDIO_TRANSCRIPTION": {
                "TITLE": "Chuyển giọng nói thành văn bản",
                "DESCRIPTION": "Tự động chuyển tin nhắn thoại và bản ghi cuộc gọi thành văn bản tìm kiếm được.",
                "MODEL_TITLE": "Mô hình chuyển giọng nói thành văn bản",
                "MODEL_DESCRIPTION": "Chọn mô hình AI dùng để chuyển tin nhắn thoại thành văn bản"
            },
            "HELP_CENTER_SEARCH": {
                "TITLE": "Lập chỉ mục tìm kiếm trung tâm trợ giúp",
                "DESCRIPTION": "Dùng AI để tìm kiếm theo ngữ cảnh trong các bài viết trung tâm trợ giúp."
            },
            "LABEL_SUGGESTION": {
                "TITLE": "Gợi ý nhãn",
                "DESCRIPTION": "Tự động gợi ý nhãn phù hợp cho hội thoại dựa trên nội dung và bối cảnh.",
                "MODEL_TITLE": "Mô hình gợi ý nhãn",
                "MODEL_DESCRIPTION": "Chọn mô hình AI dùng để phân tích hội thoại và gợi ý nhãn phù hợp"
            }
        },
        "API": {
            "SUCCESS": "Đã cập nhật thiết lập Captain.",
            "ERROR": "Cập nhật thiết lập Captain thất bại. Bạn hãy thử lại."
        }
    },
    "CHANNEL_SELECTOR": {
        "COMING_SOON": "Sắp ra mắt"
    },
    "CHAT_LIST": {
        "LOADING": "Đang tải các hội thoại",
        "LOAD_MORE_CONVERSATIONS": "Tải thêm các hội thoại",
        "EOF": "Tất cả các hội thoại đã được tải 🎉",
        "LIST": {
            "404": "Không có bất kì hoạt động trò chuyện nào trong nhóm.",
            "NONE_ASSIGNED_TO_ME": "Chưa có hội thoại nào được gán cho bạn.",
            "NONE_UNASSIGNED": "Mọi hội thoại đều đã có người phụ trách.",
            "VIEW_UNASSIGNED": "Xem {count} hội thoại chưa gán",
            "VIEW_ALL": "Xem tất cả {count} hội thoại"
        },
        "FAILED_TO_SEND": "Gửi thất bại",
        "FETCH_ERROR": "Không tải được hội thoại. Bạn hãy thử lại.",
        "TAB_HEADING": "Các hội thoại",
        "MENTION_HEADING": "Nhắn đến",
        "UNATTENDED_HEADING": "Không giám sát",
        "SEARCH": {
            "INPUT": "Tìm kiếm",
            "LABEL": "Tìm hội thoại trong danh sách đang xem",
            "CLEAR": "Xoá từ khoá",
            "COMPOSE": "Soạn tin nhắn mới",
            "NO_RESULTS": "Không có hội thoại nào khớp “{query}” trong danh sách đang xem.",
            "CONTACTS_HEADING": "Liên hệ",
            "CONVERSATIONS_HEADING": "Hội thoại"
        },
        "FILTER_ALL": "Tất cả",
        "SELECTION_MODE": {
            "START": "Chọn nhiều hội thoại",
            "EXIT": "Thoát chọn nhiều"
        },
        "MORE_ACTIONS": "Thêm thao tác",
        "FILTER_PANEL": {
            "BUTTON": "Lọc hội thoại",
            "BUTTON_ACTIVE": "Lọc hội thoại, {count} bộ lọc đang bật",
            "TITLE": "Lọc hội thoại",
            "ACTIVE": "Bộ lọc đang bật",
            "REMOVE": "Bỏ lọc {name}",
            "UNREAD": "{count} hội thoại chưa đọc",
            "STATUS": "Trạng thái",
            "CHANNEL": "Kênh",
            "ALL_CHANNELS": "Mọi kênh",
            "LABEL": "Nhãn",
            "SORT": "Sắp xếp",
            "ADVANCED": "Lọc nâng cao",
            "CLEAR": "Xoá lọc",
            "STATUS_ITEMS": {
                "open": "Đang mở",
                "pending": "Chờ xử lý",
                "snoozed": "Báo lại",
                "resolved": "Đã giải quyết",
                "all": "Tất cả"
            },
            "SORT_ITEMS": {
                "last_activity_at_desc": "Mới nhất",
                "waiting_since_asc": "Chờ lâu nhất",
                "unread": "Chưa đọc nhiều"
            }
        },
        "ASSIGNEE_TYPE_TABS": {
            "me": "Của tôi",
            "unassigned": "Chưa gán",
            "all": "Tất cả"
        },
        "CHAT_STATUS_FILTER_ITEMS": {
            "open": {
                "TEXT": "Mở"
            },
            "resolved": {
                "TEXT": "Đã được giải quyết"
            },
            "pending": {
                "TEXT": "Chờ giải quyết"
            },
            "snoozed": {
                "TEXT": "Tạm dừng"
            },
            "all": {
                "TEXT": "Tất cả"
            }
        },
        "VIEW_FILTER": "Xem",
        "CHAT_TIME_STAMP": {
            "CREATED": {
                "LATEST": "Đã tạo",
                "OLDEST": "Tạo vào lúc:"
            },
            "LAST_ACTIVITY": {
                "NOT_ACTIVE": "Hoạt động cuối:",
                "ACTIVE": "Hoạt động cuối"
            }
        },
        "SORT_ORDER_ITEMS": {
            "last_activity_at_asc": {
                "TEXT": "Hoạt động cuối: cũ nhất trước"
            },
            "last_activity_at_desc": {
                "TEXT": "Hoạt động cuối: mới nhất trước"
            },
            "created_at_desc": {
                "TEXT": "Ngày tạo: mới nhất trước"
            },
            "created_at_asc": {
                "TEXT": "Ngày tạo: cũ nhất trước"
            },
            "priority_desc": {
                "TEXT": "Ưu tiên: cao nhất trước"
            },
            "priority_asc": {
                "TEXT": "Ưu tiên: thấp nhất trước"
            },
            "waiting_since_asc": {
                "TEXT": "Đang chờ trả lời: lâu nhất trước"
            },
            "waiting_since_desc": {
                "TEXT": "Đang chờ trả lời: ngắn nhất trước"
            },
            "priority_desc_created_at_asc": {
                "TEXT": "Ưu tiên: cao nhất trước, Ngày tạo: cũ nhất trước"
            },
            "unread": {
                "TEXT": "Số tin chưa đọc: nhiều nhất trước"
            }
        },
        "ATTACHMENTS": {
            "image": {
                "CONTENT": "Tin nhắn hình ảnh"
            },
            "audio": {
                "CONTENT": "Tin nhắn thoại"
            },
            "video": {
                "CONTENT": "Tin nhắn video"
            },
            "file": {
                "CONTENT": "Tập tin đính kèm"
            },
            "location": {
                "CONTENT": "Địa điểm"
            },
            "ig_reel": {
                "CONTENT": "Reel Instagram"
            },
            "fallback": {
                "CONTENT": "có một đường dẫn chia sẻ"
            },
            "contact": {
                "CONTENT": "Liên hệ được chia sẻ"
            },
            "embed": {
                "CONTENT": "Nội dung nhúng"
            },
            "sticker": {
                "CONTENT": "Sticker"
            }
        },
        "CHAT_SORT_BY_FILTER": {
            "TITLE": "Sắp xếp hội thoại",
            "DROPDOWN_TITLE": "Sắp bởi",
            "ITEMS": {
                "LATEST": {
                    "NAME": "Hoạt động cuối lúc",
                    "LABEL": "Hoạt động cuối"
                },
                "CREATED_AT": {
                    "NAME": "Tạo vào lúc",
                    "LABEL": "Tạo vào lúc"
                },
                "LAST_USER_MESSAGE_AT": {
                    "NAME": "Tin nhắn khách gửi cuối lúc",
                    "LABEL": "Tin nhắn cuối"
                }
            }
        },
        "RECEIVED_VIA_EMAIL": "Nhận được từ email",
        "VIEW_TWEET_IN_TWITTER": "Xem tweet trên Twitter",
        "REPLY_TO_TWEET": "Trả lời cho tweet này",
        "LINK_TO_STORY": "Đến xem lịch sử instagram",
        "SENT": "Gửi thành công",
        "READ": "Đọc thành công",
        "DELIVERED": "Đã gửi thành công",
        "NO_MESSAGES": "Không có tin nhắn",
        "SENDER_YOU": "Bạn",
        "NO_CONTENT": "Không có nội dung",
        "FRIEND_REQUEST": "[Lời mời kết bạn]",
        "HIDE_QUOTED_TEXT": "Ẩn thư trích dẫn",
        "SHOW_QUOTED_TEXT": "Hiện thư trích dẫn",
        "MESSAGE_READ": "Đọc",
        "SENDING": "Đang gửi",
        "UNREAD_COUNT_OVERFLOW": "9+"
    },
    "CHOICE_TOGGLE": {
        "YES": "Có",
        "NO": "Không"
    },
    "COMBOBOX": {
        "PLACEHOLDER": "Chọn một mục...",
        "EMPTY_SEARCH_RESULTS": "Không có mục nào cho từ khóa \"{searchTerm}\"",
        "EMPTY_STATE": "Không tìm thấy kết quả.",
        "SEARCH_PLACEHOLDER": "Tìm kiếm...",
        "MORE": "+{count} mục nữa"
    },
    "COMMAND_BAR": {
        "SEARCH_PLACEHOLDER": "Tìm kiếm hoặc nhảy đến",
        "SNOOZE_PLACEHOLDER": "Nhập một mốc thời gian, ví dụ: ngày mai, 2 giờ nữa, thứ sáu tới, 15 tháng 1...",
        "SECTIONS": {
            "GENERAL": "Chung",
            "REPORTS": "Báo cáo",
            "CONVERSATION": "Hội thoại",
            "BULK_ACTIONS": "Thao tác hàng loạt",
            "CHANGE_ASSIGNEE": "Thay đổi người được phân công",
            "CHANGE_PRIORITY": "Đổi mức ưu tiên",
            "CHANGE_TEAM": "Thay đổi nhóm",
            "SNOOZE_CONVERSATION": "Tạm dừng hội thoại",
            "EXECUTE_MACRO": "Chạy macro",
            "ADD_LABEL": "Thêm nhãn vào hội thoại",
            "REMOVE_LABEL": "Xoá nhãn khỏi hội thoại",
            "SETTINGS": "Cài đặt",
            "AI_ASSIST": "Trợ lý AI",
            "SNOOZE_NOTIFICATION": "Tạm ẩn thông báo"
        },
        "COMMANDS": {
            "GO_TO_MY_INBOX": "Mở trang thông báo",
            "COMPOSE_CONVERSATION": "Soạn tin nhắn mới",
            "GO_TO_CONVERSATION_DASHBOARD": "Đi tới Trang tổng quan hội thoại",
            "GO_TO_CONTACTS_DASHBOARD": "Đi tới Trang tổng quan liên hệ",
            "GO_TO_CAPTAIN": "Mở Captain",
            "GO_TO_CALLS_DASHBOARD": "Mở bảng điều khiển cuộc gọi",
            "GO_TO_CAMPAIGNS": "Mở chiến dịch",
            "GO_TO_HELP_CENTER": "Mở trung tâm trợ giúp",
            "GO_TO_REPORTS_OVERVIEW": "Đi đến Tổng quan Báo cáo",
            "GO_TO_CONVERSATION_REPORTS": "Đi tới Trang Báo cáo hội thoại",
            "GO_TO_AGENT_REPORTS": "Đi đến Báo cáo Nhân viên",
            "GO_TO_LABEL_REPORTS": "Đi đến Báo cáo Nhãn",
            "GO_TO_INBOX_REPORTS": "Đi đến Báo cáo Kênh",
            "GO_TO_TEAM_REPORTS": "Đi đến Báo cáo nhóm",
            "GO_TO_CSAT_REPORTS": "Mở báo cáo CSAT",
            "GO_TO_BOT_REPORTS": "Mở báo cáo bot",
            "GO_TO_SLA_REPORTS": "Mở báo cáo SLA",
            "GO_TO_SETTINGS_AGENTS": "Đi đến Cài đặt Nhân viên",
            "GO_TO_SETTINGS_TEAMS": "Đi đến Cài đặt nhóm",
            "GO_TO_SETTINGS_INBOXES": "Đi đến Cài đặt Kênh",
            "GO_TO_SETTINGS_TEMPLATES": "Mở mẫu tin",
            "GO_TO_SETTINGS_LABELS": "Đi đến Cài đặt Nhãn",
            "GO_TO_SETTINGS_CUSTOM_ATTRIBUTES": "Mở thuộc tính tùy chỉnh",
            "GO_TO_SETTINGS_AUTOMATION": "Mở tự động hóa",
            "GO_TO_SETTINGS_MACROS": "Mở macro",
            "GO_TO_SETTINGS_CANNED_RESPONSES": "Đi đến Cài đặt Tin trả lời mẫu",
            "GO_TO_SETTINGS_SLA": "Mở thiết lập SLA",
            "GO_TO_SETTINGS_APPLICATIONS": "Đi đến Cài đặt Ứng dụng",
            "GO_TO_SETTINGS_DATA": "Mở dữ liệu",
            "GO_TO_SETTINGS_AUDIT_LOGS": "Mở nhật ký kiểm toán",
            "GO_TO_SETTINGS_BILLING": "Mở thanh toán",
            "GO_TO_SETTINGS_ACCOUNT": "Đi đến Cài đặt Tài khoản",
            "GO_TO_SETTINGS_PROFILE": "Đi đến Cài đặt Hồ sơ",
            "CHANGE_LANGUAGE": "Đổi ngôn ngữ giao diện",
            "CHANGE_APPEARANCE": "Đổi chế độ màu (sáng / tối)",
            "ADD_LABELS_TO_CONVERSATION": "Thêm nhãn vào hội thoại",
            "ASSIGN_AN_AGENT": "Gán cho nhân viên",
            "AI_ASSIST": "Trợ lý AI",
            "ASSIGN_PRIORITY": "Đặt mức ưu tiên",
            "ASSIGN_A_TEAM": "Phân công một nhóm",
            "EXECUTE_A_MACRO": "Chạy một macro",
            "MUTE_CONVERSATION": "Tắt tiếng hội thoại",
            "UNMUTE_CONVERSATION": "Bật tiếng hội thoại",
            "REMOVE_LABEL_FROM_CONVERSATION": "Xoá nhãn khỏi hội thoại",
            "REOPEN_CONVERSATION": "Mở lại hội thoại",
            "RESOLVE_CONVERSATION": "Giải quyết hội thoại",
            "SEND_TRANSCRIPT": "Gửi bản ghi qua email",
            "SNOOZE_CONVERSATION": "Tạm dừng hội thoại",
            "UNTIL_NEXT_REPLY": "Cho đến phản hồi kế tiếp",
            "UNTIL_NEXT_WEEK": "Cho đến tuần sau",
            "UNTIL_TOMORROW": "Cho đến ngày mai",
            "UNTIL_NEXT_MONTH": "Tới tháng sau",
            "AN_HOUR_FROM_NOW": "Trong một giờ nữa",
            "UNTIL_CUSTOM_TIME": "Tùy chỉnh...",
            "SNOOZE_NOTIFICATION": "Tạm ẩn thông báo"
        },
        "NO_RESULTS": "Không tìm thấy kết quả nào",
        "FOOTER": {
            "SELECT": "để chọn",
            "NAVIGATE": "để di chuyển",
            "CLOSE": "để đóng",
            "MOVE_TO_PARENT": "quay lại nhóm trên",
            "ESC_KEY": "esc"
        }
    },
    "COMMON": {
        "OR": "Hoặc",
        "CLICK_HERE": "click vào đây"
    },
    "COMPONENTS": {
        "LOADER": {
            "LABEL": "Đang tải"
        },
        "CODE": {
            "BUTTON_TEXT": "Sao chép",
            "CODEPEN": "Mở trong CodePen",
            "COPY_SUCCESSFUL": "Đã chép"
        },
        "SHOW_MORE_BLOCK": {
            "SHOW_MORE": "Xem thêm",
            "SHOW_LESS": "Xem ít"
        },
        "FILE_BUBBLE": {
            "DOWNLOAD": "Tải xuống",
            "UPLOADING": "Đang tải lên...",
            "INSTAGRAM_STORY_UNAVAILABLE": "Hội thoại này không còn nữa.",
            "INSTAGRAM_STORY_REPLY": "Đã trả lời story của bạn:"
        },
        "LOCATION_BUBBLE": {
            "SEE_ON_MAP": "Xem trên bản đồ"
        },
        "FORM_BUBBLE": {
            "SUBMIT": "Gửi"
        },
        "MEDIA": {
            "IMAGE_UNAVAILABLE": "Ảnh này không còn nữa.",
            "LOADING_FAILED": "Tải thất bại",
            "TAP_TO_RELOAD": "Bấm để tải lại",
            "OPEN_IMAGE": "Xem ảnh",
            "OPEN_VIDEO": "Xem video",
            "OPEN_FILE": "Mở tệp",
            "ATTACHMENTS_COUNT": "{count} tệp",
            "REMOVE_ATTACHMENT": "Bỏ tệp này"
        }
    },
    "COMPOSE_NEW_CONVERSATION": {
        "CONTACT_SEARCH": {
            "ERROR_MESSAGE": "Chúng tôi không tìm kiếm được. Bạn hãy thử lại."
        },
        "DRAFT": {
            "TITLE": "Tin nhắn mới",
            "EMPTY": "Chưa có tin nhắn. Chọn người nhận và kênh gửi rồi soạn tin bên dưới.",
            "SENDING": "Đang mở hội thoại và gửi tin…",
            "COMPOSER_LOCKED": "Chọn người nhận và kênh gửi để bắt đầu soạn",
            "SUBJECT_LABEL": "Chủ đề:",
            "NEW_CONTACT_BADGE": "Liên hệ mới",
            "CREATE_CONTACT": "Tạo liên hệ mới: {address}",
            "CONTACT_LOAD_FAILED": "Không tải được liên hệ. Bạn hãy chọn lại người nhận.",
            "LOADING_CHANNELS": "Đang tìm kênh gửi được tới người này…",
            "LOAD_CHANNELS_FAILED": "Không tải được danh sách kênh gửi.",
            "CREATED_ELSEWHERE": "Đã tạo hội thoại mới từ bản nháp.",
            "OPEN_CONVERSATION": "Mở hội thoại",
            "RETRY": "Thử lại",
            "UNAVAILABLE": {
                "MESSAGING_WINDOW_CLOSED": "Đã quá thời gian kênh cho phép nhắn kể từ tin cuối của khách",
                "REAUTHORIZATION_REQUIRED": "Kênh đang mất kết nối, cần đăng nhập lại",
                "EMAIL_UNDELIVERABLE": "Email của liên hệ này không nhận được thư",
                "OTHER": "Kênh này hiện không gửi được tới người này"
            },
            "EMAIL_CHECK": {
                "CHECKING": "Đang kiểm tra địa chỉ email…",
                "INVALID_SYNTAX": "Địa chỉ email sai định dạng — không gửi được.",
                "DOMAIN_NOT_FOUND": "Tên miền của địa chỉ này không tồn tại — thư sẽ không tới được.",
                "DOMAIN_NO_MAIL": "Tên miền của địa chỉ này không nhận thư — thư sẽ không tới được.",
                "UNDELIVERABLE": "Địa chỉ email này không nhận được thư."
            },
            "ERRORS": {
                "NO_RECIPIENT": "Chọn người nhận trước khi gửi.",
                "NO_CHANNEL": "Chọn một kênh gửi được trước khi gửi.",
                "EMAIL_CHECKING": "Đang kiểm tra địa chỉ email, bạn chờ một chút rồi gửi.",
                "EMAIL_UNDELIVERABLE": "Địa chỉ email này không nhận được thư, hãy kiểm tra lại người nhận.",
                "SUBJECT_REQUIRED": "Thư email cần có chủ đề."
            }
        },
        "FORM": {
            "ERROR_MESSAGE": "Có lỗi khi tạo hội thoại. Bạn hãy thử lại sau.",
            "NO_INBOX_ALERT": "Không có hộp thư nào để bắt đầu hội thoại với liên hệ này.",
            "CONTACT_SELECTOR": {
                "LABEL": "Đến:",
                "TAG_INPUT_PLACEHOLDER": "Nhập ít nhất 2 ký tự để tìm theo tên, email hoặc số điện thoại",
                "NO_RESULTS": "Không tìm thấy liên hệ nào",
                "CHANGE": "Đổi người nhận"
            },
            "INBOX_SELECTOR": {
                "LABEL": "Gửi qua:",
                "PICK_CONTACT_FIRST": "Chọn người nhận để xem các hộp thư gửi được"
            },
            "EMAIL_OPTIONS": {
                "SUBJECT_PLACEHOLDER": "Nhập tiêu đề email tại đây"
            }
        }
    },
    "CONTACT_FORM": {
        "FORM": {
            "SUBMIT": "Gửi",
            "CANCEL": "Huỷ",
            "AVATAR": {
                "LABEL": "Avatar của liên hệ"
            },
            "NAME": {
                "PLACEHOLDER": "Nhập tên đầy đủ của liên hệ",
                "LABEL": "Tên đầy đủ"
            },
            "BIO": {
                "PLACEHOLDER": "Nhập tiểu sử của liên hệ",
                "LABEL": "Tiểu sử"
            },
            "EMAIL_ADDRESS": {
                "PLACEHOLDER": "Nhập địa chỉ email của liên hệ",
                "LABEL": "Email",
                "DUPLICATE": "Địa chỉ email này đang được sử dụng cho một liên hệ khác.",
                "ERROR": "Vui lòng nhập một địa chỉ email hợp lệ."
            },
            "PHONE_NUMBER": {
                "PLACEHOLDER": "Nhập số điện thoại của liên hệ",
                "LABEL": "Số điện thoại",
                "HELP": "Số điện thoại phải theo chuẩn E.164, ví dụ: +84912345678 [+][mã quốc gia][mã vùng][số điện thoại]. Bạn có thể chọn mã quốc gia trong danh sách.",
                "ERROR": "Số điện thoại nên rỗng hoặc thuộc định dạng E.164",
                "DIAL_CODE_ERROR": "Bạn hãy chọn mã quốc gia trong danh sách",
                "DUPLICATE": "Số điện thoại này đang được dùng cho một liên hệ khác."
            },
            "LOCATION": {
                "PLACEHOLDER": "Nhập vị trí của liên hệ",
                "LABEL": "Địa điểm"
            },
            "COMPANY_NAME": {
                "PLACEHOLDER": "Nhập tên công ty",
                "LABEL": "Tên công ty"
            },
            "COUNTRY": {
                "PLACEHOLDER": "Nhập tên thành phố",
                "LABEL": "Tên nước",
                "SELECT_PLACEHOLDER": "Chọn",
                "REMOVE": "Xoá",
                "SELECT_COUNTRY": "Chọn quốc gia"
            },
            "CITY": {
                "PLACEHOLDER": "Nhập tên thành phố",
                "LABEL": "Thành phố"
            },
            "SOCIAL_PROFILES": {
                "FACEBOOK": {
                    "PLACEHOLDER": "Nhập tên người dùng Facebook",
                    "LABEL": "Facebook"
                },
                "TWITTER": {
                    "PLACEHOLDER": "Nhập tên người dùng Twitter",
                    "LABEL": "Twitter"
                },
                "LINKEDIN": {
                    "PLACEHOLDER": "Nhập tên người dùng LinkedIn",
                    "LABEL": "LinkedIn"
                },
                "GITHUB": {
                    "PLACEHOLDER": "Nhập tên người dùng Github",
                    "LABEL": "Github"
                }
            }
        },
        "DELETE_AVATAR": {
            "API": {
                "SUCCESS_MESSAGE": "Hình đại diện liên hệ đã được xóa thành công",
                "ERROR_MESSAGE": "Không thể xóa hình đại diện liên hệ. Vui lòng thử lại sau."
            }
        },
        "SUCCESS_MESSAGE": "Liên hệ được lưu thành công",
        "ERROR_MESSAGE": "Đã có lỗi, vui lòng thử lại"
    },
    "CONTACT_PANEL": {
        "ADD_EMAIL_ADDRESS": "Thêm email",
        "ADD_PHONE_NUMBER": "Thêm số điện thoại",
        "ADD_COMPANY": "Thêm công ty",
        "NOT_AVAILABLE": "Không có sẵn",
        "EMAIL_ADDRESS": "Địa chỉ email",
        "PHONE_NUMBER": "Số điện thoại",
        "IDENTIFIER": "Định danh",
        "COPY_SUCCESSFUL": "Đã sao chép mã thành công",
        "COMPANY": "Công ty",
        "LOCATION": "Vị trí",
        "BROWSER_LANGUAGE": "Ngôn ngữ của Trình duyệt",
        "CONVERSATION_TITLE": "Chi tiết của hội thoại",
        "VIEW_PROFILE": "Xem hồ sơ cá nhân",
        "BROWSER": "Trình duyệt",
        "OS": "Hệ điều hành",
        "INITIATED_FROM": "Bắt đầu từ",
        "INITIATED_AT": "Bắt đầu lúc",
        "IP_ADDRESS": "Địa chỉ IP",
        "CREATED_AT_LABEL": "Đã tạo",
        "NEW_MESSAGE": "Tin nhắn mới",
        "START_NEW_CONVERSATION": "Bắt đầu hội thoại mới",
        "DELETE_CONTACT": "Xoá liên hệ",
        "MORE_ACTIONS": "Thao tác khác",
        "CALL": "Gọi",
        "CALL_INITIATED": "Đang gọi cho liên hệ…",
        "CALL_FAILED": "Không bắt đầu được cuộc gọi. Bạn hãy thử lại.",
        "WHATSAPP_CALL_PERMISSION_REQUESTED": "Đã gửi yêu cầu xin phép gọi tới liên hệ. Hãy thử lại sau khi họ đồng ý.",
        "WHATSAPP_CALL_PERMISSION_PENDING": "Vừa gửi yêu cầu xin phép gọi rồi. Hãy thử lại sau khi liên hệ đồng ý.",
        "CLICK_TO_EDIT": "Bấm để sửa",
        "VOICE_INBOX_PICKER": {
            "TITLE": "Chọn hộp thư thoại"
        },
        "CONVERSATIONS": {
            "NO_RECORDS_FOUND": "Không có hội thoại trước đó được liên kết với liên hệ này.",
            "TITLE": "Hội thoại trước đó"
        },
        "LABELS": {
            "CONTACT": {
                "TITLE": "Nhãn danh bạ",
                "ERROR": "Không thể sửa nhãn"
            },
            "CONVERSATION": {
                "TITLE": "Nhãn hội thoại",
                "ADD_BUTTON": "Thêm nhãn"
            },
            "LABEL_SELECT": {
                "TITLE": "Thêm nhãn",
                "PLACEHOLDER": "Tìm nhãn",
                "NO_RESULT": "Không tìm thấy nhãn",
                "CREATE_LABEL": "Tạo mới nhãn",
                "CREATE_NAMED": "Tạo nhãn \"{title}\"",
                "CUSTOMIZE": "Tùy chỉnh"
            }
        },
        "MERGE_CONTACT": "Hợp nhất liên hệ",
        "CONTACT_ACTIONS": "Hành động với liên hệ",
        "MUTE_CONTACT": "Chặn liên hệ",
        "UNMUTE_CONTACT": "Bỏ chặn liên hệ",
        "MUTED_SUCCESS": "Đã chặn liên hệ này. Bạn sẽ không nhận thông báo về các hội thoại sau này.",
        "UNMUTED_SUCCESS": "Đã bỏ chặn liên hệ này.",
        "SEND_TRANSCRIPT": "Gửi bản ghi",
        "EDIT_LABEL": "Chỉnh sửa",
        "SIDEBAR_SECTIONS": {
            "CUSTOM_ATTRIBUTES": "Thuộc tính tùy chỉnh",
            "CONTACT_LABELS": "Nhãn danh bạ",
            "PREVIOUS_CONVERSATIONS": "Hội thoại trước đó",
            "NO_RECORDS_FOUND": "Không có thuộc tính nào được tìm thấy"
        }
    },
    "CONTACTS": {
        "online": {
            "delete": "{contact_name} đang trực tiếng, vui lòng thử lại sau"
        },
        "anonymous": {
            "name": ":animal ẩn danh",
            "name_numbered": ":animal ẩn danh :number",
            "animals": [
                "Gấu mèo",
                "Gấu trúc",
                "Gấu trúc đỏ",
                "Gấu túi",
                "Gấu Bắc Cực",
                "Gấu nâu",
                "Sóc",
                "Sóc bay",
                "Sóc chuột",
                "Thỏ",
                "Nhím",
                "Rái cá",
                "Hải ly",
                "Chồn sương",
                "Chồn đất",
                "Thú lười",
                "Thú mỏ vịt",
                "Tê tê",
                "Chuột lang",
                "Chuột túi",
                "Cáo đỏ",
                "Cáo tuyết",
                "Mèo mướp",
                "Mèo con",
                "Mèo rừng",
                "Cún con",
                "Hổ con",
                "Sư tử con",
                "Báo tuyết",
                "Báo đốm",
                "Nai vàng",
                "Hươu sao",
                "Hươu cao cổ",
                "Tuần lộc",
                "Linh dương",
                "Ngựa vằn",
                "Cừu non",
                "Lạc đà",
                "Lạc đà không bướu",
                "Voi",
                "Hà mã",
                "Tê giác",
                "Cá heo",
                "Cá voi xanh",
                "Hải cẩu",
                "Sư tử biển",
                "Rùa biển",
                "Sao biển",
                "Sứa biển",
                "Bạch tuộc",
                "Cá hề",
                "Cá vàng",
                "Cá koi",
                "Cá nóc",
                "Cá đuối",
                "San hô",
                "Hải quỳ",
                "Nhím biển",
                "Cú",
                "Chim cánh cụt",
                "Chim ruồi",
                "Bồ câu",
                "Bồ nông",
                "Hải âu",
                "Hồng hạc",
                "Thiên nga",
                "Uyên ương",
                "Công",
                "Sơn ca",
                "Họa mi",
                "Chào mào",
                "Vành khuyên",
                "Chích chòe",
                "Sếu đầu đỏ",
                "Hạc trắng",
                "Én nhỏ",
                "Đại bàng",
                "Đom đóm",
                "Bọ rùa",
                "Chuồn chuồn",
                "Ong mật",
                "Dế mèn",
                "Bọ ngựa",
                "Kiến vàng",
                "Châu chấu",
                "Ốc sên",
                "Kỳ giông",
                "Kỳ lân",
                "Phượng hoàng"
            ]
        }
    },
    "CONTACTS_BULK_ACTIONS": {
        "ASSIGN_LABELS": "Gán nhãn",
        "REMOVE_LABELS": "Gỡ nhãn",
        "ASSIGN_LABELS_SUCCESS": "Các nhãn được gán thành công.",
        "ASSIGN_LABELS_FAILED": "Gắn nhãn thất bại",
        "REMOVE_LABELS_SUCCESS": "Đã gỡ nhãn.",
        "REMOVE_LABELS_FAILED": "Gỡ nhãn thất bại",
        "DESCRIPTION": "Chọn nhãn bạn muốn gắn cho các liên hệ đã chọn.",
        "NO_LABELS_FOUND": "Chưa có nhãn nào.",
        "SELECTED_COUNT": "Đã chọn {count}",
        "CLEAR_SELECTION": "Bỏ chọn",
        "SELECT_ALL": "Chọn tất cả ({count})",
        "DELETE_CONTACTS": "Xoá",
        "DELETE_SUCCESS": "Đã xóa liên hệ.",
        "DELETE_FAILED": "Xóa liên hệ thất bại.",
        "DELETE_DIALOG": {
            "TITLE": "Xóa các liên hệ đã chọn",
            "SINGULAR_TITLE": "Xóa liên hệ đã chọn",
            "DESCRIPTION": "Thao tác này sẽ xóa vĩnh viễn {count} liên hệ đã chọn. Không thể hoàn tác.",
            "SINGULAR_DESCRIPTION": "Thao tác này sẽ xóa vĩnh viễn liên hệ đã chọn. Không thể hoàn tác.",
            "CONFIRM_MULTIPLE": "Xóa liên hệ",
            "CONFIRM_SINGLE": "Xoá liên hệ"
        }
    },
    "CONTACTS_FILTER": {
        "TITLE": "Lọc liên hệ",
        "SUBTITLE": "Thêm bộ lọc bên dưới và ấn 'áp dụng bộ lọc' để lọc liên hệ.",
        "EDIT_CUSTOM_SEGMENT": "Sửa nhóm khách",
        "CUSTOM_VIEWS_SUBTITLE": "Thêm hoặc bớt bộ lọc rồi cập nhật nhóm khách của bạn.",
        "ADD_NEW_FILTER": "Thêm Bộ lọc",
        "CLEAR_ALL_FILTERS": "Xoá tất cả bộ lọc",
        "FILTER_DELETE_ERROR": "Bạn nên có ít nhất 1 bộ lọc để lưu",
        "SUBMIT_BUTTON_LABEL": "Gửi",
        "UPDATE_BUTTON_LABEL": "Cập nhật nhóm khách",
        "CANCEL_BUTTON_LABEL": "Huỷ",
        "CLEAR_BUTTON_LABEL": "Xoá bộ lọc",
        "EMPTY_VALUE_ERROR": "Giá trị bắt buộc có",
        "SEGMENT_LABEL": "Tên nhóm khách",
        "SEGMENT_QUERY_LABEL": "Điều kiện nhóm khách",
        "TOOLTIP_LABEL": "Lọc liên hệ",
        "QUERY_DROPDOWN_LABELS": {
            "AND": "VÀ",
            "OR": "HOẶC"
        },
        "OPERATOR_LABELS": {
            "equal_to": "Bằng",
            "not_equal_to": "Không bằng",
            "contains": "Bao gồm",
            "does_not_contain": "Không bao gồm",
            "is_present": "Có",
            "is_not_present": "Không có",
            "is_greater_than": "Lớn hơn",
            "is_lesser_than": "Nhỏ hơn",
            "days_before": "Khoảng x ngày trước"
        },
        "ERRORS": {
            "VALUE_REQUIRED": "Giá trị bắt buộc có"
        },
        "ATTRIBUTES": {
            "NAME": "Tên",
            "EMAIL": "Thư điện tử",
            "PHONE_NUMBER": "Số Điện Thoại",
            "IDENTIFIER": "Định danh",
            "CITY": "Tỉnh / Thành phố",
            "COUNTRY": "Quốc gia",
            "CUSTOM_ATTRIBUTE_LIST": "Danh sách",
            "CUSTOM_ATTRIBUTE_TEXT": "Văn bản",
            "CUSTOM_ATTRIBUTE_NUMBER": "Số",
            "CUSTOM_ATTRIBUTE_LINK": "Liên kết",
            "CUSTOM_ATTRIBUTE_CHECKBOX": "Ô đánh dấu",
            "CREATED_AT": "Tạo vào lúc",
            "LAST_ACTIVITY": "Hành động cuối cùng",
            "REFERER_LINK": "Liên kết người gới thiệu",
            "BLOCKED": "Đã chặn",
            "LABELS": "Nhãn"
        },
        "GROUPS": {
            "STANDARD_FILTERS": "Bộ lọc tiêu chuẩn",
            "ADDITIONAL_FILTERS": "Bộ lọc bổ sung",
            "CUSTOM_ATTRIBUTES": "Thuộc tính tùy chỉnh"
        }
    },
    "CONTACTS_LAYOUT": {
        "HEADER": {
            "TITLE": "Liên hệ",
            "SEARCH_TITLE": "Tìm kiếm liên hệ",
            "ACTIVE_TITLE": "Liên hệ đang hoạt động",
            "SEARCH_PLACEHOLDER": "Tìm kiếm...",
            "MESSAGE_BUTTON": "Tin nhắn",
            "SEND_MESSAGE": "Gửi tin nhắn",
            "BLOCK_CONTACT": "Chặn liên hệ",
            "UNBLOCK_CONTACT": "Bỏ chặn liên hệ",
            "BREADCRUMB": {
                "CONTACTS": "Liên hệ"
            },
            "ACTIONS": {
                "CONTACT_CREATION": {
                    "ADD_CONTACT": "Thêm liên hệ",
                    "EXPORT_CONTACT": "Xuất liên hệ",
                    "IMPORT_CONTACT": "Nhập liên hệ",
                    "SAVE_CONTACT": "Lưu liên hệ",
                    "EMAIL_ADDRESS_DUPLICATE": "Địa chỉ email này đang được sử dụng cho một liên hệ khác.",
                    "PHONE_NUMBER_DUPLICATE": "Số điện thoại này đang được dùng cho một liên hệ khác.",
                    "SUCCESS_MESSAGE": "Liên hệ được lưu thành công",
                    "ERROR_MESSAGE": "Không lưu được liên hệ. Bạn hãy thử lại sau."
                },
                "BLOCK_SUCCESS_MESSAGE": "Đã chặn liên hệ này",
                "BLOCK_ERROR_MESSAGE": "Không chặn được liên hệ. Bạn hãy thử lại sau.",
                "UNBLOCK_SUCCESS_MESSAGE": "Đã bỏ chặn liên hệ này",
                "UNBLOCK_ERROR_MESSAGE": "Không bỏ chặn được liên hệ. Bạn hãy thử lại sau.",
                "IMPORT_CONTACT": {
                    "TITLE": "Nhập liên hệ",
                    "DESCRIPTION": "Nhập liên hệ bằng một file CSV.",
                    "DOWNLOAD_LABEL": "Tải xuống tệp CSV mẫu.",
                    "LABEL": "Tệp CSV:",
                    "CHOOSE_FILE": "Chọn tệp",
                    "CHANGE": "Đổi",
                    "CANCEL": "Huỷ",
                    "IMPORT": "Nhập",
                    "SUCCESS_MESSAGE": "Chúng tôi sẽ gửi email báo cho bạn khi nhập xong.",
                    "ERROR_MESSAGE": "Đã có lỗi, vui lòng thử lại",
                    "STATUS": {
                        "PENDING": "Đang chờ tới lượt nhập...",
                        "PROCESSING": "Đang nhập liên hệ...",
                        "COMPLETED": "Đã nhập {processed} trên {total} dòng.",
                        "FAILED": "Nhập liên hệ thất bại."
                    },
                    "DOWNLOAD_FAILED_RECORDS": "Tải về những dòng không nhập được"
                },
                "EXPORT_CONTACT": {
                    "TITLE": "Xuất liên hệ",
                    "DESCRIPTION": "Xuất nhanh một tệp csv chứa đầy đủ thông tin liên hệ của bạn",
                    "CONFIRM": "Xuất",
                    "SUCCESS_MESSAGE": "Đang xuất danh sách liên hệ. Khi tệp sẵn sàng, chúng tôi sẽ gửi email kèm đường dẫn tải về cho bạn.",
                    "ERROR_MESSAGE": "Đã có lỗi, vui lòng thử lại"
                },
                "SORT_BY": {
                    "LABEL": "Sắp bởi",
                    "OPTIONS": {
                        "NAME": "Tên",
                        "EMAIL": "Email",
                        "PHONE_NUMBER": "Số điện thoại",
                        "COMPANY": "Công ty",
                        "COUNTRY": "Quốc gia",
                        "CITY": "Tỉnh / Thành phố",
                        "LAST_ACTIVITY": "Hành động cuối cùng",
                        "CREATED_AT": "Tạo vào lúc"
                    }
                },
                "ORDER": {
                    "LABEL": "Sắp xếp",
                    "OPTIONS": {
                        "ASCENDING": "Tăng dần",
                        "DESCENDING": "Giảm dần"
                    }
                },
                "FILTERS": {
                    "CREATE_SEGMENT": {
                        "TITLE": "Bạn có muốn lưu bộ lọc này không?",
                        "CONFIRM": "Lưu bộ lọc",
                        "LABEL": "Tên",
                        "PLACEHOLDER": "Nhập tên của bộ lọc",
                        "ERROR": "Hãy nhập tên hợp lệ",
                        "SUCCESS_MESSAGE": "Đã lưu bộ lọc",
                        "ERROR_MESSAGE": "Không lưu được bộ lọc. Bạn hãy thử lại sau."
                    },
                    "DELETE_SEGMENT": {
                        "TITLE": "Xác nhận xoá",
                        "DESCRIPTION": "Bạn chắc chắn muốn xóa bộ lọc này?",
                        "CONFIRM": "Có, Xoá",
                        "CANCEL": "Không, hủy",
                        "SUCCESS_MESSAGE": "Đã xóa bộ lọc",
                        "ERROR_MESSAGE": "Không xóa được bộ lọc. Bạn hãy thử lại sau."
                    }
                }
            }
        },
        "PAGINATION_FOOTER": {
            "SHOWING": "Đang hiển thị {startItem} - {endItem} trong {totalItems} liên hệ"
        },
        "FILTER": {
            "NAME": "Tên",
            "EMAIL": "Email",
            "PHONE_NUMBER": "Số điện thoại",
            "IDENTIFIER": "Định danh",
            "COUNTRY": "Quốc gia",
            "CITY": "Tỉnh / Thành phố",
            "COMPANY": "Công ty",
            "CREATED_AT": "Tạo vào lúc",
            "LAST_ACTIVITY": "Hành động cuối cùng",
            "REFERER_LINK": "Liên kết người giới thiệu",
            "BLOCKED": "Đã chặn",
            "BLOCKED_TRUE": "Đúng",
            "BLOCKED_FALSE": "Sai",
            "BUTTONS": {
                "CLEAR_FILTERS": "Xóa các bộ lọc",
                "UPDATE_SEGMENT": "Cập nhật nhóm khách",
                "APPLY_FILTERS": "Áp dụng bộ lọc",
                "ADD_FILTER": "Thêm bộ lọc"
            },
            "TITLE": "Lọc liên hệ",
            "EDIT_SEGMENT": "Sửa bộ lọc",
            "SEGMENT": {
                "LABEL": "Tên nhóm khách",
                "INPUT_PLACEHOLDER": "Nhập tên nhóm khách"
            },
            "ACTIVE_FILTERS": {
                "MORE_FILTERS": "+ {count} bộ lọc nữa",
                "CLEAR_FILTERS": "Xóa các bộ lọc"
            }
        },
        "IDENTIFICATION": {
            "ALL": "Tất cả",
            "IDENTIFIED": "Đã định danh",
            "UNIDENTIFIED": "Chưa định danh"
        },
        "CARD": {
            "OF": "của",
            "UNIDENTIFIED_BADGE": "Chưa định danh",
            "UNIDENTIFIED_HINT": "Chưa có email, số điện thoại hay mã định danh — hiện chỉ biết khách qua kênh nhắn tin.",
            "VIEW_DETAILS": "Xem chi tiết",
            "EDIT_DETAILS_FORM": {
                "TITLE": "Chỉnh sửa liên hệ chi tiết",
                "FORM": {
                    "FIRST_NAME": {
                        "PLACEHOLDER": "Nhập tên"
                    },
                    "LAST_NAME": {
                        "PLACEHOLDER": "Nhập họ"
                    },
                    "EMAIL_ADDRESS": {
                        "PLACEHOLDER": "Nhập địa chỉ email",
                        "DUPLICATE": "Địa chỉ email này đang được sử dụng cho một liên hệ khác."
                    },
                    "PHONE_NUMBER": {
                        "PLACEHOLDER": "Nhập số điện thoại",
                        "DUPLICATE": "Số điện thoại này đang được dùng cho một liên hệ khác."
                    },
                    "CITY": {
                        "PLACEHOLDER": "Nhập tên thành phố"
                    },
                    "COUNTRY": {
                        "PLACEHOLDER": "Chọn quốc gia"
                    },
                    "BIO": {
                        "PLACEHOLDER": "Nhập phần giới thiệu"
                    },
                    "COMPANY_NAME": {
                        "PLACEHOLDER": "Nhập tên công ty"
                    }
                },
                "UPDATE_BUTTON": "Cập nhật liên hệ",
                "SUCCESS_MESSAGE": "Đã cập nhật liên hệ",
                "ERROR_MESSAGE": "Không cập nhật được liên hệ. Bạn hãy thử lại sau."
            },
            "SOCIAL_MEDIA": {
                "TITLE": "Sửa liên kết mạng xã hội",
                "FORM": {
                    "FACEBOOK": {
                        "PLACEHOLDER": "Thêm Facebook"
                    },
                    "GITHUB": {
                        "PLACEHOLDER": "Thêm Github"
                    },
                    "INSTAGRAM": {
                        "PLACEHOLDER": "Thêm Instagram"
                    },
                    "TELEGRAM": {
                        "PLACEHOLDER": "Thêm Telegram"
                    },
                    "TIKTOK": {
                        "PLACEHOLDER": "Thêm TikTok"
                    },
                    "LINKEDIN": {
                        "PLACEHOLDER": "Thêm LinkedIn"
                    },
                    "TWITTER": {
                        "PLACEHOLDER": "Thêm Twitter"
                    }
                }
            },
            "DELETE_CONTACT": {
                "MESSAGE": "Thao tác này là vĩnh viễn, không thể hoàn tác.",
                "BUTTON": "Xóa ngay"
            }
        },
        "DETAILS": {
            "CREATED_AT": "Tạo {date}",
            "LAST_ACTIVITY": "Hoạt động lần cuối {date}",
            "DELETE_CONTACT_DESCRIPTION": "Xóa vĩnh viễn liên hệ này. Không thể hoàn tác",
            "DELETE_CONTACT": "Xoá liên hệ",
            "DELETE_DIALOG": {
                "TITLE": "Xác nhận xoá",
                "DESCRIPTION": "Bạn chắc chắn muốn xóa liên hệ này?",
                "CONFIRM": "Có, Xoá",
                "API": {
                    "SUCCESS_MESSAGE": "Liên hệ đã được xóa thành công",
                    "ERROR_MESSAGE": "Không thể xoá liên hệ. Vui lòng thử lại sau."
                }
            },
            "AVATAR": {
                "UPLOAD": {
                    "ERROR_MESSAGE": "Không tải được ảnh đại diện. Bạn hãy thử lại sau.",
                    "SUCCESS_MESSAGE": "Đã tải ảnh đại diện lên"
                },
                "DELETE": {
                    "SUCCESS_MESSAGE": "Hình đại diện đã được xóa thành công",
                    "ERROR_MESSAGE": "Không xóa được ảnh đại diện. Bạn hãy thử lại sau."
                }
            }
        },
        "SIDEBAR": {
            "TABS": {
                "ATTRIBUTES": "Thuộc tính",
                "HISTORY": "Lịch sử",
                "NOTES": "Ghi chú",
                "MEDIA": "Tệp đính kèm",
                "MERGE": "Gộp"
            },
            "HISTORY": {
                "EMPTY_STATE": "Không có hội thoại trước đó được liên kết với liên hệ này"
            },
            "ATTRIBUTES": {
                "SEARCH_PLACEHOLDER": "Tìm thuộc tính",
                "UNUSED_ATTRIBUTES": "{count} thuộc tính đang dùng | {count} thuộc tính chưa dùng",
                "EMPTY_STATE": "Tài khoản này chưa có thuộc tính tùy chỉnh nào cho liên hệ. Bạn có thể tạo trong phần cài đặt.",
                "YES": "Có",
                "NO": "Không",
                "TRIGGER": {
                    "SELECT": "Chọn giá trị",
                    "INPUT": "Nhập giá trị"
                },
                "VALIDATIONS": {
                    "INVALID_NUMBER": "Số không hợp lệ",
                    "REQUIRED": "Giá trị hợp lệ bắt buộc có",
                    "INVALID_INPUT": "Giá trị không hợp lệ",
                    "INVALID_URL": "URL không hợp lệ",
                    "INVALID_DATE": "Ngày không hợp lệ"
                },
                "NO_ATTRIBUTES": "Không có thuộc tính nào được tìm thấy",
                "API": {
                    "SUCCESS_MESSAGE": "Thuộc tính được cập nhật thành công",
                    "DELETE_SUCCESS_MESSAGE": "Thuộc tính được xoá thành công",
                    "UPDATE_ERROR": "Không thể cập nhật thuộc tính. Vui lòng thử lại sau",
                    "DELETE_ERROR": "Không thể xoá thuộc tính. Vui lòng thử lại sau"
                }
            },
            "MERGE": {
                "TITLE": "Hợp nhất liên hệ",
                "DESCRIPTION": "Gộp hai hồ sơ thành một, gồm mọi thuộc tính và hội thoại. Nếu có xung đột, thuộc tính của liên hệ chính được ưu tiên.",
                "PRIMARY": "Liên hệ chính",
                "PRIMARY_HELP_LABEL": "Sẽ được giữ lại",
                "PRIMARY_REQUIRED_ERROR": "Bạn hãy chọn một liên hệ để gộp trước khi tiếp tục",
                "PARENT": "Sẽ được gộp vào",
                "PARENT_HELP_LABEL": "Sẽ được xoá",
                "EMPTY_STATE": "Không tìm thấy liên hệ nào",
                "PLACEHOLDER": "Tìm liên hệ chính",
                "SEARCH_PLACEHOLDER": "Tìm kiếm liên hệ",
                "SEARCH_ERROR_MESSAGE": "Không tìm được liên hệ. Bạn hãy thử lại sau.",
                "SUCCESS_MESSAGE": "Liên hệ được gộp thành công",
                "ERROR_MESSAGE": "Không thể hợp nhất liên lạc, thử lại!",
                "IS_SEARCHING": "Đang tìm kiếm...",
                "BUTTONS": {
                    "CANCEL": "Huỷ",
                    "CONFIRM": "Hợp nhất liên hệ"
                }
            },
            "NOTES": {
                "PLACEHOLDER": "Thêm ghi chú",
                "WROTE": "đã viết",
                "YOU": "Bạn",
                "SAVE": "Lưu ghi chú",
                "ADD_NOTE": "Thêm ghi chú cho liên hệ",
                "EXPAND": "Mở rộng",
                "COLLAPSE": "Thu gọn",
                "NO_NOTES": "Chưa có ghi chú nào, bạn có thể thêm ghi chú ở trang chi tiết liên hệ.",
                "EMPTY_STATE": "Liên hệ này chưa có ghi chú nào. Bạn có thể thêm ghi chú bằng ô bên trên.",
                "CONVERSATION_EMPTY_STATE": "Chưa có ghi chú nào. Dùng nút Thêm ghi chú để tạo."
            }
        },
        "EMPTY_STATE": {
            "TITLE": "Tài khoản này chưa có liên hệ nào",
            "SUBTITLE": "Bấm nút bên dưới để bắt đầu thêm liên hệ mới",
            "BUTTON_LABEL": "Thêm liên hệ",
            "SEARCH_EMPTY_STATE_TITLE": "Không có liên hệ nào khớp với tìm kiếm của bạn 🔍",
            "LIST_EMPTY_STATE_TITLE": "Không có liên hệ nào trong khung nhìn này 📋",
            "ACTIVE_EMPTY_STATE_TITLE": "Hiện chưa có liên hệ nào đang hoạt động 🌙"
        },
        "LOAD_MORE": "Tải thêm"
    },
    "CONTACTS_PAGE": {
        "LIST": {
            "TABLE_HEADER": {
                "SOCIAL_PROFILES": "Hồ sơ mạng xã hội"
            }
        }
    },
    "CONVERSATION": {
        "REFERRAL": {
            "AD_LABEL": "Quảng cáo",
            "POST_LABEL": "Bài viết",
            "VIEW_AD": "Xem quảng cáo",
            "WELCOME_MESSAGE_LABEL": "Tin nhắn điền sẵn: ",
            "REPLIED_BELOW": "Khách đã trả lời bên dưới"
        },
        "SELECT_A_CONVERSATION": "Vui lòng chọn một hội thoại từ ngăn bên trái",
        "CSAT_REPLY_MESSAGE": "Bạn hãy vui lòng đánh giá hội thoại",
        "404": "Xin lỗi, chúng tôi không thể tìm thấy hội thoại. Vui lòng thử lại",
        "SWITCH_VIEW_LAYOUT": "Chuyển đổi bố cục",
        "DASHBOARD_APP_TAB_MESSAGES": "Tin nhắn",
        "UNVERIFIED_SESSION": "Danh tính của người dùng này không được xác thực",
        "NO_MESSAGE_1": "Uh oh! Có vẻ như không có tin nhắn nào từ khách hàng trong hộp thư của bạn.",
        "NO_MESSAGE_2": " gửi tin nhắn đến trang của bạn!",
        "NO_INBOX_1": "Hola! Có vẻ như bạn chưa thêm bất kỳ hộp thư nào.",
        "NO_INBOX_2": " để bắt đầu",
        "NO_INBOX_AGENT": "Uh Oh! Có vẻ như bạn không thuộc bất kỳ hộp thư nào. Vui lòng liên hệ với quản trị viên của bạn",
        "SEARCH_MESSAGES": "Tìm kiếm tin nhắn trong các hội thoại",
        "VIEW_ORIGINAL": "Xem bản gốc",
        "VIEW_TRANSLATED": "Xem bản dịch",
        "EMPTY_STATE": {
            "CMD_BAR": "để mở bảng lệnh",
            "KEYBOARD_SHORTCUTS": "để xem phím tắt"
        },
        "SEARCH": {
            "TITLE": "Tìm kiếm tin nhắn",
            "RESULT_TITLE": "Các kết quả tìm kiếm",
            "LOADING_MESSAGE": "Định dạng dữ liệu...",
            "PLACEHOLDER": "Nhập bất kỳ văn bản nào để tìm kiếm tin nhắn",
            "NO_MATCHING_RESULTS": "Không tìm thấy kết quả."
        },
        "UNREAD_MESSAGES": "Tin nhắn chưa đọc",
        "UNREAD_MESSAGE": "Tin nhắn chưa đọc",
        "CLICK_HERE": "Click vào đây",
        "LOADING_INBOXES": "Đang tải hộp thư",
        "LOADING_CONVERSATIONS": "Đang tải hội thoại",
        "CANNOT_REPLY": "Bạn không thể trả lời do",
        "24_HOURS_WINDOW": "Giới hạn thời lượng tin nhắn 24 giờ",
        "48_HOURS_WINDOW": "Giới hạn thời lượng tin nhắn 48 giờ",
        "API_HOURS_WINDOW": "Bạn chỉ trả lời được hội thoại này trong vòng {hours} giờ",
        "NOT_ASSIGNED_TO_YOU": "Hội thoại này không được phân công cho bạn. Bạn có muốn phân công hội thoại này cho chính mình?",
        "ASSIGN_TO_ME": "Phân công cho tôi",
        "BOT_HANDOFF_MESSAGE": "Hội thoại này đang do {assigneeName} phụ trách.",
        "BOT_HANDOFF_FALLBACK_ASSIGNEE": "a bot",
        "BOT_HANDOFF_ACTION": "Nhận lại",
        "BOT_HANDOFF_REOPEN_ACTION": "Đánh dấu hội thoại là đang mở",
        "BOT_HANDOFF_SUCCESS": "Hội thoại đã được chuyển cho bạn",
        "BOT_HANDOFF_ERROR": "Không nhận lại được hội thoại. Bạn hãy thử lại.",
        "TWILIO_WHATSAPP_CAN_REPLY": "Bạn chỉ có thể phản hồi hội thoại này bằng tin nhắn mẫu vì",
        "TWILIO_WHATSAPP_24_HOURS_WINDOW": "Giới hạn thời lượng tin nhắn 24 giờ",
        "OLD_INSTAGRAM_INBOX_REPLY_BANNER": "Tài khoản Instagram này đã chuyển sang hộp thư kênh Instagram mới. Mọi tin nhắn mới sẽ hiện ở đó. Bạn không gửi được tin từ hội thoại này nữa.",
        "INSTAGRAM_RESTRICTION_BANNER": "Nhắn tin Instagram đang bị ảnh hưởng bởi sự cố ở tầng API phía Meta, không phải lỗi của {installationName}. Một số tin nhắn hoặc thao tác có thể chậm hoặc không dùng được. Chúng tôi đang phối hợp chặt với Meta để xử lý sớm nhất.",
        "INSTAGRAM_RESTRICTION_STATUS_LINK": "Xem cập nhật tình trạng",
        "REPLYING_TO": "Bạn đang trả lời:",
        "REMOVE_SELECTION": "Xóa lựa chọn",
        "DOWNLOAD": "Tải xuống",
        "UNKNOWN_FILE_TYPE": "Tập tin chưa xác định",
        "SAVE_CONTACT": "Lưu liên hệ",
        "NO_CONTENT": "Không có nội dung để hiển thị",
        "MESSAGE_DELETED": "Tin nhắn đã bị xoá",
        "SHARED_ATTACHMENT": {
            "CONTACT": "{sender} đã chia sẻ một liên hệ",
            "LOCATION": "{sender} đã chia sẻ một vị trí",
            "FILE": "{sender} đã chia sẻ một tệp",
            "MEETING": "{sender} đã bắt đầu một cuộc họp",
            "BUSINESS_CARD": "{sender} đã gửi một danh thiếp",
            "BANK_CARD": "{sender} đã gửi một tài khoản ngân hàng",
            "REMINDER": "{sender} đã tạo một nhắc hẹn",
            "FRIEND_REQUEST": "{sender} đã gửi lời mời kết bạn"
        },
        "ZALO": {
            "BUSINESS_CARD": {
                "FALLBACK_NAME": "Danh thiếp",
                "VIEW_PROFILE": "Xem hồ sơ"
            },
            "BANK_CARD": {
                "FALLBACK_NAME": "Tài khoản ngân hàng",
                "COPY_ACCOUNT_NUMBER": "Sao chép số tài khoản",
                "COPIED": "Đã sao chép"
            },
            "REMINDER": {
                "FALLBACK_TITLE": "Nhắc hẹn"
            },
            "CALL": {
                "VOICE": "Cuộc gọi thoại",
                "VIDEO": "Cuộc gọi video",
                "MISSED": "nhỡ",
                "BUSY": "máy bận",
                "CANCELED": "đã huỷ"
            }
        },
        "LINK_PREVIEW": {
            "FALLBACK_TITLE": "Liên kết"
        },
        "FRIEND_REQUEST": {
            "TITLE": "Lời mời kết bạn"
        },
        "SEND_CARD": {
            "BUTTON": "Gửi thẻ",
            "PREVIEW": "Khách thấy thế này",
            "PREVIEW_EMPTY": "Điền thông tin để xem trước",
            "SEND": "Gửi",
            "CANCEL": "Huỷ",
            "REMOVE": "Xoá",
            "REVIEW_TITLE": "Xem lại thẻ trước khi gửi",
            "REVIEW_HINT": "Thẻ từ câu trả lời mẫu, xem lại rồi bấm Gửi.",
            "SAVE_AS_CANNED": "Lưu làm câu trả lời mẫu",
            "SAVE_AS_CANNED_LABEL": "Mã tắt",
            "SAVE_AS_CANNED_PLACEHOLDER": "Ví dụ: ck-tra-truoc",
            "SAVE_AS_CANNED_SUCCESS": "Đã lưu làm câu trả lời mẫu.",
            "SAVE_AS_CANNED_ERROR": "Không lưu được, bạn hãy thử lại.",
            "QUICK_REPLIES": {
                "TITLE": "Trả lời nhanh",
                "HINT": "Câu hỏi kèm 2–6 lựa chọn để khách bấm",
                "QUESTION": "Câu hỏi",
                "OPTIONS": "Lựa chọn",
                "OPTION": "Lựa chọn {index}",
                "ADD_OPTION": "Thêm lựa chọn"
            },
            "PRODUCT": {
                "TITLE": "Thẻ sản phẩm",
                "HINT": "Ảnh, giá, biến thể và nút Đặt mua",
                "NAME": "Tên sản phẩm",
                "UPLOAD_IMAGE": "Tải ảnh lên",
                "CHANGE_IMAGE": "Đổi ảnh",
                "UPLOADING": "Đang tải…",
                "PRICE": "Giá bán (đ)",
                "COMPARE_AT": "Giá cũ (đ)",
                "STOCK_LABEL": "Dòng tồn kho",
                "STOCK_PLACEHOLDER": "Còn 2 cái",
                "MAX_QUANTITY": "Số lượng tối đa",
                "VARIANTS": "Biến thể",
                "VARIANT_NAME": "Tên nhóm",
                "VARIANT_NAME_PLACEHOLDER": "Màu",
                "VARIANT_OPTIONS": "Các lựa chọn, cách nhau bằng dấu phẩy",
                "VARIANT_OPTIONS_PLACEHOLDER": "Lam, Ngà, Ngọc",
                "ADD_VARIANT": "Thêm nhóm biến thể",
                "LINK": "Link sản phẩm trên website (không bắt buộc)",
                "ORDER_BUTTON": "Đặt mua",
                "VIEW_BUTTON": "Xem"
            },
            "BANK_TRANSFER": {
                "TITLE": "Thẻ chuyển khoản",
                "HINT": "Mã VietQR, số tài khoản, số tiền và nội dung",
                "ACCOUNT": "Tài khoản nhận tiền",
                "AMOUNT": "Số tiền (đ, không bắt buộc)",
                "AMOUNT_PLACEHOLDER": "Để trống nếu khách tự nhập",
                "MEMO": "Nội dung chuyển khoản",
                "MEMO_HINT": "Ngân hàng chỉ đọc chữ không dấu, tối đa 25 ký tự; Yona tự lược dấu.",
                "NO_ACCOUNTS": "Chưa có tài khoản nhận tiền nào bạn được phép gửi. Quản trị viên thêm ở Cài đặt → Chuyển khoản.",
                "ADD_ACCOUNT": "Thêm tài khoản nhận tiền",
                "NEW_ACCOUNT_TITLE": "Tài khoản nhận tiền mới"
            },
            "SCHEDULE": {
                "TITLE": "Chọn lịch nhận hàng",
                "HINT": "Khách chọn ngày và khung giờ trên một trang riêng",
                "TITLE_LABEL": "Tiêu đề",
                "SLOTS": "Khung giờ",
                "DATE": "Ngày",
                "TIME": "Khung giờ",
                "TIME_PLACEHOLDER": "8:00 đến 10:00",
                "ADD_SLOT": "Thêm khung giờ",
                "NOTE": "Ghi chú cho khách (không bắt buộc)",
                "NOTE_PLACEHOLDER": "Đơn #GM1024, giao tới 12 Hàng Bông"
            },
            "ERRORS": {
                "ACCOUNT_REQUIRED": "Chọn tài khoản nhận tiền",
                "AMOUNT_INVALID": "Số tiền không hợp lệ",
                "SLOTS_REQUIRED": "Cần ít nhất một khung giờ có ngày và giờ",
                "QUESTION_REQUIRED": "Cần có câu hỏi",
                "TOO_FEW_OPTIONS": "Cần ít nhất 2 lựa chọn",
                "OPTION_TOO_LONG": "Mỗi lựa chọn tối đa 80 ký tự",
                "DUPLICATE_OPTION": "Hai lựa chọn đang trùng nhau",
                "TITLE_REQUIRED": "Cần có tên sản phẩm",
                "COMPARE_AT_INVALID": "Giá cũ phải lớn hơn giá bán",
                "LINK_INVALID": "Link phải bắt đầu bằng http:// hoặc https://",
                "VARIANT_EMPTY": "Nhóm biến thể cần ít nhất một lựa chọn"
            }
        },
        "STRUCTURED": {
            "CHOICE_OF": "Trả lời cho: {question}",
            "DELIVERY": {
                "TEXT_NUMBERED": "Kênh này không có nút: khách nhận chữ kèm danh sách số",
                "TEXT": "Kênh này không vẽ được thẻ: khách nhận bản chữ",
                "IMAGE_TEXT": "Kênh này không vẽ được thẻ: khách nhận ảnh thẻ kèm chữ"
            },
            "MARK_BANK_TRANSFER_PAID": "Đánh dấu đã nhận tiền"
        },
        "SENT_FROM_NATIVE_APP": "từ {source}",
        "SENT_OUTSIDE_APP": "gửi ngoài Yona",
        "MESSAGE_ACTIONS": {
            "REPLY": "Trả lời",
            "MORE": "Thêm hành động",
            "REACT": "Thả cảm xúc",
            "FORWARD": "Chuyển tiếp",
            "RECALL": "Thu hồi với mọi người",
            "DELETE": "Xoá",
            "COPIED": "Đã sao chép nội dung tin nhắn",
            "COPY_FAILED": "Không sao chép được. Bạn hãy thử lại.",
            "TRANSLATION": {
                "LOADING": "Đang dịch…",
                "FAILED": "Chưa dịch được tin nhắn này. Bạn hãy thử lại sau.",
                "CLOSE": "Đóng"
            },
            "RECALL_CONFIRMATION": {
                "TITLE": "Thu hồi tin nhắn này với cả khách?",
                "MESSAGE": "Tin nhắn sẽ biến mất ở cả phía khách và không khôi phục lại được."
            }
        },
        "REACTIONS": {
            "TITLE": "Cảm xúc",
            "YOU": "Bạn",
            "TAP_TO_REMOVE": "Bấm để gỡ",
            "SUMMARY": "{count} cảm xúc, bấm để xem ai đã thả"
        },
        "REPLY_QUOTE": {
            "ORIGINAL": "Tin nhắn gốc",
            "JUMP": "Xem tin nhắn gốc"
        },
        "FORWARD": {
            "TITLE": "Chuyển tiếp tin nhắn",
            "SEARCH_PLACEHOLDER": "Tìm theo tên, số điện thoại hoặc mã hội thoại",
            "RECENT": "Hội thoại gần đây",
            "EMPTY": "Không tìm thấy hội thoại nào",
            "LOAD_FAILED": "Không tải được danh sách hội thoại.",
            "RETRY": "Thử lại",
            "MAX_REACHED": "Mỗi lần chuyển tiếp tối đa {max} hội thoại",
            "SUBMIT_COUNT": "Chuyển tiếp ({count})",
            "SUCCESS": "Đã chuyển tiếp tới {count} hội thoại",
            "OPEN": "Mở hội thoại",
            "PARTIAL": "Đã chuyển tiếp {ok}/{total} hội thoại. {error}",
            "FAILED": "Chưa chuyển tiếp được. {error}",
            "REMOVE_TARGET": "Bỏ chọn {name}"
        },
        "FORWARDED": {
            "LABEL": "Đã chuyển tiếp",
            "FROM": "Chuyển tiếp từ {name}",
            "SOURCE_CONVERSATION": "Chuyển tiếp từ hội thoại #{id}"
        },
        "MESSAGE_FAILURE": {
            "RETRY": "Thử lại",
            "RETRY_FAILED": "Chưa gửi lại được. Bạn thử lại giúp nhé.",
            "HINT": {
                "session_lost": "Kênh đã mất kết nối. Bạn kết nối lại hộp thư rồi thử lại nhé.",
                "circuit_open": "Đang tạm dừng gửi vì lỗi liên tiếp. Bạn thử lại sau ít phút.",
                "bridge_unreachable": "Không gọi được dịch vụ của kênh. Bạn thử lại sau giây lát.",
                "secret_mismatch": "Kênh đang sai cấu hình. Bạn báo quản trị viên kiểm tra — thử lại cũng không gửi được.",
                "media_fetch_failed": "Không đọc được tệp đính kèm. Bạn gửi lại tệp nhé.",
                "email_bounced": "Địa chỉ của khách không nhận thư — thử lại cũng không tới. Bạn sửa email của khách rồi gửi lại."
            }
        },
        "MESSAGE_SENDER": {
            "IN_GROUP": "Do {name} gửi trong nhóm"
        },
        "UPLOADING_ATTACHMENTS": "Đang tải file đính kèm...",
        "REPLIED_TO_STORY": "Đã trả lời story của bạn",
        "UNSUPPORTED_MESSAGE": "This message is unsupported. You can view this message on the Facebook / Instagram app.",
        "UNSUPPORTED_MESSAGE_FACEBOOK": "Không hỗ trợ loại tin nhắn này. Bạn có thể xem tin này trong ứng dụng Facebook Messenger.",
        "UNSUPPORTED_MESSAGE_INSTAGRAM": "Không hỗ trợ loại tin nhắn này. Bạn có thể xem tin này trong ứng dụng Instagram.",
        "UNSUPPORTED_MESSAGE_TIKTOK": "Không hỗ trợ loại tin nhắn này. Bạn có thể xem tin này trong ứng dụng TikTok.",
        "UNSUPPORTED_MESSAGE_WHATSAPP": "Không hỗ trợ loại tin nhắn này. Bạn có thể xem tin này trong ứng dụng WhatsApp.",
        "WHATSAPP_FLOW_RESPONSE": "Đã gửi phản hồi biểu mẫu",
        "WHATSAPP_REFERRAL": {
            "AD": "Quảng cáo"
        },
        "SUCCESS_DELETE_MESSAGE": "Tin nhắn được xoá thành công",
        "FAIL_DELETE_MESSSAGE": "Không thể xoá tin nhắn! Thử lại",
        "NO_RESPONSE": "Không có phản hồi",
        "RESPONSE": "Phản hồi",
        "RATING_TITLE": "Đánh giá",
        "FEEDBACK_TITLE": "Phản hồi",
        "REPLY_MESSAGE_NOT_FOUND": "Không tìm thấy tin nhắn",
        "JUMP_TO_MESSAGE_NOT_FOUND": "Tin nhắn này không còn trong hội thoại",
        "SCROLL_TO_LATEST": "Xuống tin mới nhất",
        "SCROLL_TO_LATEST_UNSEEN": "{count} tin mới",
        "CAPTAIN_GENERATION": {
            "TITLE": "Câu trả lời này được tạo ra thế nào?",
            "GENERATED_BY": "Do Captain tạo",
            "LOADING": "Đang tải chi tiết…",
            "EMPTY": "Không có chi tiết tạo nội dung cho tin nhắn này.",
            "TIMELINE": "Các bước tạo nội dung",
            "STEP_TOOL": "Đã gọi {name}",
            "STEP_HANDOFF": "Đã chuyển cho {name}",
            "REASONING": "Lập luận",
            "SOURCES": "Kho kiến thức",
            "SOURCES_SUMMARY": "{count} kết quả | {count} kết quả",
            "MODEL": "Tạo bằng {model}",
            "CREDITS": "Tín dụng: {credits}"
        },
        "CARD": {
            "SHOW_LABELS": "Hiển thị nhãn",
            "HIDE_LABELS": "Ẩn nhãn",
            "LABELS_COUNT": "{count} nhãn"
        },
        "VOICE_CALL": {
            "INCOMING_CALL": "Cuộc gọi đến",
            "OUTGOING_CALL": "Cuộc gọi đi",
            "CALL_IN_PROGRESS": "Đang trong cuộc gọi",
            "NO_ANSWER": "Không trả lời",
            "NO_ANSWER_OUTBOUND_LABEL": "Không trả lời",
            "NO_ANSWER_OUTBOUND_SUBTEXT": "Liên hệ không bắt máy",
            "MISSED_CALL": "Cuộc gọi nhỡ",
            "MISSED_CALL_INBOUND_SUBTEXT": "Không nhân viên nào bắt máy",
            "MISSED_CALL_DECLINED_BY": "{agentName} đã từ chối",
            "CALL_ENDED": "Đã kết thúc cuộc gọi",
            "HANDLED_BY": "{agentName} phụ trách",
            "NOT_ANSWERED_YET": "Chưa ai trả lời",
            "CALLING": "Đang gọi…",
            "THEY_ANSWERED": "Họ đã bắt máy",
            "YOU_ANSWERED": "Bạn đã bắt máy",
            "AGENT_ANSWERED": "{agentName} đã bắt máy",
            "JOIN_CALL": "Vào cuộc gọi",
            "CALL_BACK": "Gọi lại",
            "TRANSCRIPT_SHOW_MORE": "Xem thêm",
            "TRANSCRIPT_SHOW_LESS": "Thu gọn"
        },
        "SEARCH_IN_CONVERSATION": {
            "OPEN": "Tìm trong hội thoại",
            "PLACEHOLDER": "Tìm trong hội thoại",
            "OLDER": "Kết quả cũ hơn (Enter)",
            "NEWER": "Kết quả mới hơn (Shift+Enter)",
            "CLOSE": "Đóng tìm kiếm (Esc)",
            "NO_RESULTS": "Không thấy",
            "ERROR": "Lỗi, thử lại"
        },
        "HEADER": {
            "RESOLVE_ACTION": "Giải quyết",
            "REOPEN_ACTION": "Mở lại",
            "OPEN_ACTION": "Mở",
            "MORE_ACTIONS": "Thao tác khác",
            "OPEN": "Nhiều",
            "CLOSE": "Đóng",
            "DETAILS": "chi tiết",
            "COPY_ID_SUCCESS": "Đã chép ID hội thoại",
            "SNOOZED_UNTIL": "Tạm ẩn tới",
            "SNOOZED_UNTIL_TOMORROW": "Tạm dừng đến ngày mai",
            "SNOOZED_UNTIL_NEXT_WEEK": "Tạm dừng đến tuần sau",
            "SNOOZED_UNTIL_NEXT_REPLY": "Tạm dừng đến khi có phản hồi",
            "WHATSAPP_CALL": "Bắt đầu cuộc gọi WhatsApp",
            "WHATSAPP_CALL_FAILED": "Không bắt đầu được cuộc gọi WhatsApp.",
            "VOICE_CALL": "Bắt đầu cuộc gọi",
            "VOICE_CALL_FAILED": "Không bắt đầu được cuộc gọi.",
            "WHATSAPP_CALL_PERMISSION_REQUESTED": "Đã gửi yêu cầu xin phép gọi tới liên hệ. Hãy thử lại sau khi họ đồng ý.",
            "WHATSAPP_CALL_PERMISSION_PENDING": "Vừa gửi yêu cầu xin phép gọi rồi. Hãy thử lại sau khi liên hệ đồng ý.",
            "SLA_STATUS": {
                "FRT": "FRT {status}",
                "NRT": "NRT {status}",
                "RT": "RT {status}",
                "MISSED": "trễ hạn",
                "DUE": "quá hạn"
            }
        },
        "ASSIGNEE": {
            "OWNED_BY_ME": "Phụ trách: Bạn",
            "OWNED_BY": "Phụ trách: {name}",
            "UNASSIGNED": "Chưa gán người phụ trách",
            "YOU": "Bạn",
            "UNASSIGNED_SHORT": "Chưa gán",
            "CHANGE": "Đổi người phụ trách",
            "ASSIGN_TO": "Giao cho",
            "ASSIGN_TO_ME": "Giao cho tôi",
            "UNASSIGN": "Bỏ giao"
        },
        "RESOLVE_DROPDOWN": {
            "MARK_PENDING": "Chờ xử lý",
            "SNOOZE_UNTIL": "Báo lại…",
            "MARK_UNREAD": "Đánh dấu chưa đọc",
            "CHANGE_STATUS": "Đổi trạng thái hội thoại",
            "CURRENT_STATUS": {
                "open": "Đang mở",
                "resolved": "Đã giải quyết",
                "pending": "Chờ xử lý",
                "snoozed": "Báo lại"
            },
            "SNOOZE": {
                "TITLE": "Tạm dừng đến khi",
                "NEXT_REPLY": "Phản hồi kế tiếp",
                "TOMORROW": "Ngày mai",
                "NEXT_WEEK": "Tuần sau"
            }
        },
        "MENTION": {
            "AGENTS": "Nhân viên",
            "TEAMS": "Nhóm"
        },
        "PICKER": {
            "VARIABLE": {
                "SEARCH_PLACEHOLDER": "Tìm biến",
                "DESCRIPTION": "Mô tả",
                "VALUE": "Giá trị",
                "NO_VALUE": "Hội thoại này chưa có giá trị"
            },
            "EMOJI": {
                "SEARCH_PLACEHOLDER": "Tìm biểu tượng cảm xúc",
                "EMPTY_STATE": "Gõ để tìm biểu tượng cảm xúc"
            },
            "MACRO": {
                "SEARCH_PLACEHOLDER": "Tìm macro",
                "ACTION_COUNT": "1 hành động | {count} hành động"
            },
            "MENTION": {
                "SEARCH_PLACEHOLDER": "Tìm nhân viên và nhóm",
                "FILTER": {
                    "ALL": "Tất cả"
                },
                "AVAILABILITY": "Trạng thái trực",
                "ROLE": "Vai trò",
                "AUTO_ASSIGN": "Tự động phân công",
                "ENABLED": "Đang bật",
                "DISABLED": "Đang tắt",
                "YOU_ARE_A_MEMBER": "Bạn là thành viên của nhóm này"
            },
            "GROUP_MEMBER": {
                "TITLE": "Thành viên nhóm"
            }
        },
        "CUSTOM_SNOOZE": {
            "TITLE": "Tạm dừng đến khi",
            "APPLY": "Báo lại",
            "CANCEL": "Huỷ"
        },
        "PRIORITY": {
            "TITLE": "Mức độ ưu tiên",
            "OPTIONS": {
                "NONE": "Không có",
                "URGENT": "Cấp bách",
                "HIGH": "Cao",
                "MEDIUM": "Trung bình",
                "LOW": "Thấp"
            },
            "CHANGE_PRIORITY": {
                "SELECT_PLACEHOLDER": "Không có",
                "INPUT_PLACEHOLDER": "Chọc mức ưu tiên",
                "NO_RESULTS": "Không tìm thấy kết quả",
                "SUCCESSFUL": "Đã đổi mức ưu tiên của hội thoại {conversationId} thành {priority}",
                "FAILED": "Không đổi được mức ưu tiên. Bạn hãy thử lại."
            }
        },
        "DELETE_CONVERSATION": {
            "TITLE": "Xóa hội thoại #{conversationId}",
            "DESCRIPTION": "Bạn chắc chắn muốn xóa hội thoại này?",
            "CONFIRM": "Xoá"
        },
        "CARD_CONTEXT_MENU": {
            "PIN": "Ghim hội thoại",
            "UNPIN": "Bỏ ghim hội thoại",
            "PIN_ERROR": "Không ghim được hội thoại. Vui lòng thử lại.",
            "UNPIN_ERROR": "Không bỏ ghim được hội thoại. Vui lòng thử lại.",
            "MOVE_PIN_TOP": "Đưa lên đầu nhóm ghim",
            "MOVE_PIN_UP": "Lên một bậc",
            "MOVE_PIN_DOWN": "Xuống một bậc",
            "REORDER_PIN_ERROR": "Không đổi được thứ tự hội thoại đã ghim. Vui lòng thử lại.",
            "DRAG_PIN_HINT": "Kéo thẻ hội thoại đã ghim để đổi thứ tự trong nhóm ghim.",
            "PINNED": "Đã ghim",
            "MORE_ACTIONS": "Thao tác hội thoại",
            "PENDING": "Đánh dấu chưa giải quyết",
            "RESOLVED": "Đánh dấu là đã giải quyết",
            "MARK_AS_UNREAD": "Đánh dấu là chưa đọc",
            "MARK_AS_READ": "Đánh dấu đã đọc",
            "REOPEN": "Mở lại hội thoại",
            "SNOOZE": {
                "TITLE": "Báo lại",
                "NEXT_REPLY": "Cho đến phản hồi kế tiếp",
                "TOMORROW": "Cho đến ngày mai",
                "NEXT_WEEK": "Cho đến tuần sau"
            },
            "ASSIGN_AGENT": "Gán nhân viên",
            "ASSIGN_LABEL": "Gán nhãn",
            "SEARCH_LABELS": "Tìm nhãn",
            "NO_LABELS_FOUND": "Không tìm thấy nhãn",
            "AGENTS_LOADING": "Đang tải điện thoại viên...",
            "ASSIGN_TEAM": "Gán nhóm",
            "DELETE": "Xóa hội thoại",
            "OPEN_IN_NEW_TAB": "Mở ở tab mới",
            "COPY_LINK": "Chép liên kết hội thoại",
            "COPY_LINK_SUCCESS": "Đã chép liên kết hội thoại",
            "API": {
                "AGENT_ASSIGNMENT": {
                    "SUCCESFUL": "Id hội thoại {conversationId} được gán cho \"{agentName}\"",
                    "FAILED": "Không thể gán điện thoại viên. Vui lòng thử lại."
                },
                "LABEL_ASSIGNMENT": {
                    "SUCCESFUL": "Đã gắn nhãn #{labelName} cho hội thoại {conversationId}",
                    "FAILED": "Không thể gán nhãn. Vui lòng thử lại."
                },
                "LABEL_REMOVAL": {
                    "SUCCESFUL": "Đã gỡ nhãn #{labelName} khỏi hội thoại {conversationId}",
                    "FAILED": "Không gỡ được nhãn. Bạn hãy thử lại."
                },
                "TEAM_ASSIGNMENT": {
                    "SUCCESFUL": "Đã gán nhóm \"{team}\" cho hội thoại id {conversationId}",
                    "FAILED": "Không thể gán nhóm. Vui lòng thử lại."
                }
            }
        },
        "FOOTER": {
            "MESSAGE_SIGN_TOOLTIP": "Chữ ký tin nhắn",
            "ENABLE_SIGN_TOOLTIP": "Bật chữ ký",
            "DISABLE_SIGN_TOOLTIP": "Tắt chữ ký",
            "MSG_INPUT": "Nhập tin nhắn… (/ để chọn câu trả lời mẫu)",
            "PRIVATE_MSG_INPUT": "Ghi chú nội bộ (Shift + Enter để xuống dòng) — chỉ nhân viên thấy",
            "MSG_INPUT_TOUCH": "Nhập tin nhắn…",
            "PRIVATE_MSG_INPUT_TOUCH": "Ghi chú nội bộ — chỉ nhân viên thấy",
            "MESSAGING_RESTRICTED": "Bạn không trả lời được hội thoại này",
            "MESSAGING_RESTRICTED_WHATSAPP": "Do giới hạn cửa sổ 24 giờ, bạn chỉ trả lời được bằng tin mẫu",
            "MESSAGING_RESTRICTED_API": "Do giới hạn cửa sổ nhắn tin, bạn chỉ trả lời được bằng tin mẫu",
            "MESSAGE_SIGNATURE_NOT_CONFIGURED": "Chữ ký cuối tin nhắn chưa được cài đặt, xin hãy cài đặt một chữ ký trong phần cài đặt hồ sơ.",
            "MESSAGE_SIGNATURE_NOT_CONFIGURED_SHORT": "Chưa có chữ ký tin nhắn — bấm để cài đặt",
            "RESIZE_COMPOSER": "Kéo để đổi chiều cao ô soạn tin",
            "COPILOT_MSG_INPUT": "Cho copilot thêm lời nhắc hoặc hỏi thêm bất cứ điều gì... Nhấn enter để gửi theo dõi",
            "CLICK_HERE": "Bấm vào đây để cập nhật",
            "WHATSAPP_TEMPLATES": "Mẫu Whatsapp"
        },
        "REPLYBOX": {
            "REPLY": "Trả lời",
            "PRIVATE_NOTE": "Lưu ý riêng",
            "SEND": "Gửi",
            "CREATE": "Thêm ghi chú",
            "INSERT_READ_MORE": "Đọc thêm",
            "DISMISS_REPLY": "Bỏ trả lời",
            "REPLYING_TO": "Đang trả lời:",
            "TIP_EMOJI_ICON": "Hiển thị chọn emoji",
            "TIP_STICKER_ICON": "Gửi sticker",
            "TIP_ATTACH_ICON": "Đính kèm tệp",
            "TIP_AUDIORECORDER_ICON": "Ghi âm thanh",
            "TIP_AUDIORECORDER_PERMISSION": "Cho phép truy cập ghi âm",
            "TIP_AUDIORECORDER_ERROR": "Không thể mở bản ghi âm",
            "AUDIO_CONVERSION_FAILED": "Chuyển đổi âm thanh thất bại. Bạn hãy thử lại.",
            "DRAG_DROP": "Kéo thả vào đây để đính kèm",
            "IMAGE_UPLOAD_SUCCESS": "Ảnh tải lên thành công",
            "START_AUDIO_RECORDING": "Bắt đầu ghi âm",
            "STOP_AUDIO_RECORDING": "Dừng ghi âm",
            "VOICE_RECORDER": {
                "RECORDING": "Đang ghi âm",
                "WAITING_FOR_PERMISSION": "Đang chờ bạn cho phép dùng micro…",
                "CANCEL": "Huỷ",
                "PREVIEW": "Nghe lại bản ghi âm",
                "DISCARD": "Xoá",
                "SEND": "Gửi bản ghi âm",
                "MAX_DURATION_REACHED": "Bản ghi đã dừng vì đạt tối đa {minutes} phút. Bạn nghe lại rồi gửi nhé.",
                "PERMISSION_DENIED": "Trình duyệt chưa cho Yona dùng micro. Bấm biểu tượng ổ khoá cạnh địa chỉ trang, cho phép Micro rồi thử lại.",
                "NO_MICROPHONE": "Không tìm thấy micro. Cắm micro hoặc tai nghe có micro rồi thử lại.",
                "MICROPHONE_BUSY": "Micro đang bị ứng dụng khác giữ (gọi video, ghi âm…). Tắt ứng dụng đó rồi thử lại.",
                "UNSUPPORTED": "Trình duyệt này không ghi âm được. Hãy dùng bản mới của Chrome, Edge, Firefox hoặc Safari.",
                "FAILED": "Không ghi âm được. Bạn thử lại nhé."
            },
            "COPILOT_THINKING": "Copilot đang suy nghĩ",
            "EMAIL_HEAD": {
                "TO": "TO",
                "ADD_BCC": "Thêm bcc",
                "CC": {
                    "LABEL": "CC",
                    "PLACEHOLDER": "Các email phân biệt bởi dấu phẩy",
                    "ERROR": "Vui lòng điền địa chỉ email hợp lệ"
                },
                "BCC": {
                    "LABEL": "BCC",
                    "PLACEHOLDER": "Các email phân biệt bởi dấu phẩy",
                    "ERROR": "Vui lòng điền địa chỉ email hợp lệ"
                }
            },
            "UNDEFINED_VARIABLES": {
                "TITLE": "Biến chưa có giá trị",
                "MESSAGE": "Tin nhắn của bạn có {undefinedVariablesCount} biến chưa có giá trị: {undefinedVariables}. Bạn vẫn muốn gửi chứ?",
                "CONFIRM": {
                    "YES": "Gửi",
                    "CANCEL": "Huỷ"
                }
            },
            "QUOTED_REPLY": {
                "ENABLE_TOOLTIP": "Kèm theo nội dung thư được trích dẫn",
                "DISABLE_TOOLTIP": "Không kèm nội dung thư được trích dẫn",
                "REMOVE_PREVIEW": "Bỏ phần thư được trích dẫn",
                "COLLAPSE": "Thu gọn xem trước",
                "EXPAND": "Mở rộng xem trước"
            }
        },
        "STICKER_PICKER": {
            "SEARCH_PLACEHOLDER": "Tìm sticker",
            "SUGGESTED_KEYWORDS": "cảm ơn,chào,ok,haha,yêu,buồn,xin lỗi,chúc mừng",
            "RECENT": "Gần đây",
            "PACK": "Bộ sticker",
            "STICKER": "Sticker",
            "EMPTY_RECENT": "Chưa có sticker nào gần đây. Gõ từ khoá hoặc chọn một gợi ý để tìm.",
            "EMPTY_PACK": "Bộ này chưa có sticker nào.",
            "NO_RESULTS": "Không tìm thấy sticker cho “{query}”.",
            "LOAD_FAILED": "Chưa tải được sticker, bạn thử lại nhé.",
            "RETRY": "Thử lại",
            "SUGGESTIONS": "Sticker gợi ý",
            "DISMISS_SUGGESTIONS": "Ẩn sticker gợi ý"
        },
        "VISIBLE_TO_AGENTS": "Lưu ý riêng: Chỉ hiển thị với bạn và nhóm của bạn",
        "CHANGE_STATUS": "Trạng thái hội thoại đã thay đổi",
        "CHANGE_STATUS_FAILED": "Thay đổi trạng thái hội thoại không thành công",
        "CHANGE_AGENT": "Người Được Chỉ Định Cuộc Hội Thoại đã thay đổi",
        "CHANGE_AGENT_FAILED": "Thay đổi người được gán không thành công",
        "ASSIGN_LABEL_SUCCESFUL": "Đã gán nhãn thành công",
        "ASSIGN_LABEL_FAILED": "Gán nhãn không thành công",
        "CHANGE_TEAM": "Nhóm hội thoại đã được thay đổi",
        "SUCCESS_DELETE_CONVERSATION": "Đã xóa hội thoại",
        "FAIL_DELETE_CONVERSATION": "Không xóa được hội thoại! Bạn hãy thử lại",
        "FILE_SIZE_LIMIT": "Tệp vượt quá {MAXIMUM_SUPPORTED_FILE_UPLOAD_SIZE} MB mức hạn chế",
        "FILE_TYPE_NOT_SUPPORTED": "Hội thoại này không hỗ trợ loại tệp {fileName}",
        "MESSAGE_ERROR": "Không thể gửi tin nhắn này, vui lòng thử lại sau",
        "SENT_BY": "Gửi bởi:",
        "SENT_VIA_PLATFORM": "qua {platform}",
        "BOT": "Bot",
        "NATIVE_APP": "Ứng dụng gốc",
        "NATIVE_APP_ADVISORY": "Tin nhắn này được gửi thẳng từ ứng dụng {source}, không qua Yona.",
        "NATIVE_APP_ADVISORY_UNKNOWN_SOURCE": "Tin nhắn này được gửi thẳng từ ứng dụng của kênh, không qua Yona.",
        "SEND_FAILED": "Không thể gửi tin nhắn! Thử lại",
        "TRY_AGAIN": "thử lại",
        "ASSIGNMENT": {
            "SELECT_AGENT": "Chọn nhân viên",
            "REMOVE": "Xoá",
            "ASSIGN": "Gán"
        },
        "CONTEXT_MENU": {
            "COPY": "Sao chép nội dung",
            "REPLY_TO": "Trả lời tin nhắn này",
            "DELETE": "Xoá",
            "CREATE_A_CANNED_RESPONSE": "Tạo câu trả lời mẫu",
            "TRANSLATE": "Dịch",
            "COPY_PERMALINK": "Sao chép liên kết tới tin",
            "OPEN_IN_SOURCE": "Mở trong {name}",
            "COPY_IMAGE": "Sao chép hình ảnh",
            "IMAGE_COPIED": "Đã sao chép hình ảnh",
            "LINK_COPIED": "Đã sao chép liên kết tới tin nhắn",
            "DELETE_CONFIRMATION": {
                "TITLE": "Bạn chắc chắn muốn xóa tin nhắn này?",
                "MESSAGE": "Bạn không thể hoàn tác thao tác này",
                "DELETE": "Xoá",
                "CANCEL": "Huỷ"
            },
            "REPORT_MESSAGE": {
                "LABEL": "Báo lỗi tin nhắn",
                "TITLE": "Báo lỗi tin nhắn của Captain",
                "DESCRIPTION": "Thấy có vấn đề với câu trả lời AI này? Hãy cho chúng tôi biết chỗ sai, đội ngũ sẽ xem lại để Captain trả lời chính xác hơn.",
                "PROBLEM_TYPE": "Loại vấn đề",
                "PROBLEM_TYPE_PLACEHOLDER": "Chọn loại vấn đề",
                "DESCRIPTION_LABEL": "Mô tả",
                "DESCRIPTION_PLACEHOLDER": "Mô tả chi tiết vấn đề",
                "SUBMIT": "Gửi báo lỗi",
                "SUCCESS": "Cảm ơn bạn đã báo. Đội ngũ của chúng tôi sẽ xem lại.",
                "ERROR": "Không gửi được báo lỗi cho tin nhắn này. Bạn hãy thử lại.",
                "REASONS": {
                    "incorrect_information": "Thông tin sai",
                    "inappropriate_response": "Câu trả lời không phù hợp",
                    "incomplete_response": "Câu trả lời thiếu ý",
                    "outdated_information": "Thông tin lỗi thời",
                    "other": "Khác"
                }
            }
        },
        "SIDEBAR": {
            "CONTACT": "Liên hệ",
            "CLOSE_OVERLAY": "Đóng bảng thông tin",
            "COPILOT": "Copilot"
        },
        "VOICE_WIDGET": {
            "INCOMING_CALL": "Cuộc gọi đến",
            "OUTGOING_CALL": "Cuộc gọi đi",
            "CALL_IN_PROGRESS": "Đang trong cuộc gọi",
            "NOT_ANSWERED_YET": "Chưa ai trả lời",
            "HANDLED_IN_ANOTHER_TAB": "Đang xử lý ở tab khác",
            "REJECT_CALL": "Từ chối",
            "DISMISS_CALL": "Bỏ qua",
            "JOIN_CALL": "Vào cuộc gọi",
            "END_CALL": "Kết thúc",
            "MUTE": "Tắt micro",
            "UNMUTE": "Bật micro",
            "VIEW_CHAT_HISTORY": "Xem lịch sử chat",
            "GO_TO_CONVERSATION": "Mở hội thoại"
        }
    },
    "CONVERSATION_CUSTOM_ATTRIBUTES": {
        "ADD_BUTTON_TEXT": "Tạo thuộc tính",
        "NO_RECORDS_FOUND": "Không có thuộc tính nào được tìm thấy",
        "UPDATE": {
            "SUCCESS": "Thuộc tính cập nhật thành công",
            "ERROR": "Không thể cập nhật thuộc tính. Vui lòng thử lại sau"
        },
        "ADD": {
            "TITLE": "Thêm",
            "SUCCESS": "Thuộc tính được thêm thành công",
            "ERROR": "Không thể thêm thuộc tính. Vui lòng thử lại sau"
        },
        "DELETE": {
            "SUCCESS": "Thuộc tính xoá thành công",
            "ERROR": "Không thể xoá thuộc tính. Vui lòng thử lại sau"
        },
        "ATTRIBUTE_SELECT": {
            "TITLE": "Thêm thuộc tính",
            "PLACEHOLDER": "Tìm kiếm thuộc tính",
            "NO_RESULT": "Không có thuộc tính nào được tìm thấy"
        }
    },
    "CONVERSATION_PARTICIPANTS": {
        "SIDEBAR_MENU_TITLE": "Đang tham gia",
        "SIDEBAR_TITLE": "Người tham gia hội thoại",
        "NO_RECORDS_FOUND": "Không tìm thấy kết quả",
        "ADD_PARTICIPANTS": "Chọn người tham gia",
        "REMANING_PARTICIPANTS_TEXT": "+{count} người khác",
        "REMANING_PARTICIPANT_TEXT": "+{count} người khác",
        "TOTAL_PARTICIPANTS_TEXT": "{count} người đang tham gia.",
        "TOTAL_PARTICIPANT_TEXT": "{count} người đang tham gia.",
        "NO_PARTICIPANTS_TEXT": "Chưa có ai tham gia!.",
        "WATCH_CONVERSATION": "Tham gia hội thoại",
        "YOU_ARE_WATCHING": "Bạn đang tham gia",
        "API": {
            "ERROR_MESSAGE": "Không cập nhật được, bạn hãy thử lại!",
            "SUCCESS_MESSAGE": "Đã cập nhật người tham gia!"
        }
    },
    "CONVERSATION_SIDEBAR": {
        "ASSIGNEE_LABEL": "Nhân viên được phân công",
        "SELF_ASSIGN": "Phân công cho tôi",
        "TEAM_LABEL": "Nhóm được phân công",
        "SELECT": {
            "PLACEHOLDER": "Không có"
        },
        "ACCORDION": {
            "CONTACT_DETAILS": "Chi tiết liên hệ",
            "CONVERSATION_ACTIONS": "Hành động của hội thoại",
            "CONVERSATION_LABELS": "Nhãn hội thoại",
            "CONVERSATION_INFO": "Thông tin hội thoại",
            "CONTACT_NOTES": "Ghi chú liên hệ",
            "CONTACT_ATTRIBUTES": "Thuộc tính của liên hệ",
            "PREVIOUS_CONVERSATION": "Hội thoại trước đó",
            "MACROS": "Macro",
            "LINEAR_ISSUES": "Issue Linear đã gắn",
            "SHOPIFY_ORDERS": "Đơn hàng Shopify",
            "SHARED_FILES": "Ảnh/video, tệp và liên kết"
        },
        "SHARED_FILES": {
            "EMPTY": "Chưa có tệp đính kèm nào",
            "DOWNLOAD": "Tải tệp về",
            "DOWNLOAD_ERROR": "Không tải được tệp. Bạn hãy thử lại.",
            "MEDIA_HEADING": "Ảnh và video",
            "FILES_HEADING": "Tệp",
            "VIEW_ALL": "Xem tất cả",
            "SHOW_LESS": "Thu gọn",
            "MORE_COUNT": "+{count}",
            "UNTITLED_FILE": "Tệp chưa đặt tên",
            "JUMP_TO_MESSAGE": "Tới tin nhắn",
            "TAB_MEDIA": "Ảnh/video",
            "TAB_FILES": "Tệp",
            "TAB_LINKS": "Liên kết",
            "EMPTY_TAB": "Chưa có gì trong hội thoại này",
            "LOAD_MORE": "Xem thêm",
            "LOAD_ERROR": "Không tải được. Bạn hãy thử lại.",
            "OPEN_LINK": "Mở liên kết",
            "OPEN_SCREEN": "Xem ảnh/video, tệp và liên kết",
            "BACK": "Quay lại"
        },
        "SHOPIFY": {
            "ORDER_ID": "Đơn #{id}",
            "ERROR": "Lỗi khi tải đơn hàng",
            "NO_SHOPIFY_ORDERS": "Không có đơn hàng nào",
            "FINANCIAL_STATUS": {
                "PENDING": "Chờ giải quyết",
                "AUTHORIZED": "Đã tạm giữ tiền",
                "PARTIALLY_PAID": "Đã trả một phần",
                "PAID": "Đã thanh toán",
                "PARTIALLY_REFUNDED": "Đã hoàn một phần",
                "REFUNDED": "Đã hoàn tiền",
                "VOIDED": "Đã hủy"
            },
            "FULFILLMENT_STATUS": {
                "FULFILLED": "Đã giao",
                "PARTIALLY_FULFILLED": "Đã giao một phần",
                "UNFULFILLED": "Chưa giao"
            }
        }
    },
    "CONVERSATION_WORKFLOW": {
        "INDEX": {
            "HEADER": {
                "TITLE": "Luồng hội thoại",
                "DESCRIPTION": "Cấu hình quy tắc và các trường bắt buộc khi xử lý xong hội thoại."
            }
        },
        "REQUIRED_ATTRIBUTES": {
            "TITLE": "Thuộc tính bắt buộc khi xử lý xong",
            "DESCRIPTION": "Khi đánh dấu hội thoại đã xử lý xong, nhân viên sẽ được nhắc điền những thuộc tính này nếu chưa có.",
            "NO_ATTRIBUTES": "Chưa thêm thuộc tính nào",
            "ADD": {
                "TITLE": "Thêm thuộc tính",
                "SEARCH_PLACEHOLDER": "Tìm kiếm nhiều thuộc tính"
            },
            "SAVE": {
                "SUCCESS": "Đã cập nhật thuộc tính bắt buộc",
                "ERROR": "Không cập nhật được thuộc tính bắt buộc, bạn hãy thử lại"
            },
            "MODAL": {
                "TITLE": "Giải quyết hội thoại",
                "DESCRIPTION": "Hãy điền các thuộc tính tùy chỉnh sau trước khi đánh dấu hội thoại đã xử lý xong",
                "ACTIONS": {
                    "RESOLVE": "Giải quyết hội thoại",
                    "CANCEL": "Huỷ"
                },
                "PLACEHOLDERS": {
                    "TEXT": "Viết ghi chú...",
                    "NUMBER": "Nhập một con số",
                    "LINK": "Thêm liên kết",
                    "DATE": "Chọn ngày",
                    "LIST": "Chọn một mục"
                },
                "CHECKBOX": {
                    "YES": "Có",
                    "NO": "Không"
                }
            },
            "PAYWALL": {
                "TITLE": "Nâng cấp để dùng thuộc tính bắt buộc",
                "AVAILABLE_ON": "Tính năng thuộc tính hội thoại bắt buộc có ở gói Business và Enterprise.",
                "UPGRADE_PROMPT": "Hãy nâng cấp gói để nhắc nhân viên điền thuộc tính bắt buộc trước khi đóng hội thoại.",
                "UPGRADE_NOW": "Nâng cấp ngay",
                "CANCEL_ANYTIME": "Bạn có thể đổi hoặc hủy gói bất cứ lúc nào"
            },
            "ENTERPRISE_PAYWALL": {
                "AVAILABLE_ON": "Tính năng thuộc tính hội thoại bắt buộc có ở các gói trả phí.",
                "UPGRADE_PROMPT": "Hãy nâng cấp lên gói trả phí để bắt buộc điền thuộc tính trước khi đóng hội thoại.",
                "ASK_ADMIN": "Bạn hãy liên hệ quản trị viên để nâng cấp."
            }
        }
    },
    "CONVERSATIONS": {
        "activity": {
            "status": {
                "resolved": "Hội thoại được đánh dấu là đã giải quyết bởi {user_name}",
                "contact_resolved": "Hội thoại đã được giải quyết bởi {contact_name}",
                "open": "Hội thoại đã được mở lại bởi {user_name}",
                "pending": "Hội thoại được đánh dấu là chưa giải quyết bởi {user_name}",
                "snoozed": "Hội thoại đã được tạm dừng lại bởi {user_name}",
                "auto_resolved_days": "Hội thoại được đánh dấu là đã giải quyết bởi hệ thống vì {count} ngày không hoạt động",
                "auto_resolved_hours": "Hệ thống đánh dấu hội thoại là đã xử lý xong vì không có hoạt động nào trong {count} giờ",
                "auto_resolved_minutes": "Hệ thống đánh dấu hội thoại là đã xử lý xong vì không có hoạt động nào trong {count} phút",
                "system_auto_open": "Hệ thống mở lại hội thoại do có tin nhắn mới."
            },
            "priority": {
                "added": "{user_name} thiết lập độ ưu tiên thành {new_priority}",
                "updated": "{user_name} thay đổi mức độ ưu tiên từ {old_priority} thành {new_priority}",
                "removed": "{user_name} bỏ mức độ ưu tiên"
            },
            "assignee": {
                "self_assigned": "{user_name} phân công chính mình vào hội thoại này",
                "assigned": "Chỉ định {assignee_name} bởi {user_name}",
                "removed": "Hội thoại chưa được chỉ định bởi {user_name}"
            },
            "team": {
                "assigned": "Chỉ định {team_name} bởi {user_name}",
                "assigned_with_assignee": "Phân công cho {assignee_name} thông qua {team_name} bởi {user_name}",
                "removed": "Huỷ phân công cho {team_name} bởi {user_name}"
            },
            "labels": {
                "added": "{user_name} thêm {labels}",
                "removed": "{user_name} xoá {labels}"
            },
            "csat": {
                "not_sent_due_to_messaging_window": "Chưa gửi được khảo sát CSAT do giới hạn gửi tin ra ngoài"
            },
            "auto_resolve": {
                "not_sent_due_to_messaging_window": "Chưa gửi được tin tự động xử lý xong do giới hạn gửi tin ra ngoài"
            },
            "agent_bot": {
                "error_moved_to_open": "Hệ thống đánh dấu hội thoại là đang mở do bot nhân viên gặp lỗi."
            },
            "muted": "{user_name} đã tắt tiếng hội thoại",
            "unmuted": "{user_name} đã bật tiếng hội thoại"
        },
        "reply": {
            "email": {
                "header": {
                    "notifications": "Thông báo",
                    "from_with_name": "{assignee_name} từ {inbox_name} <{from_email}>",
                    "reply_with_name": "{assignee_name} từ {inbox_name} <reply+{reply_email}>",
                    "friendly_name": "{sender_name} từ {business_name} <{from_email}>",
                    "sender_only_name": "{sender_name} <{from_email}>",
                    "professional_name": "{business_name} <{from_email}>"
                }
            },
            "email_subject": "Tin nhắn mới về hội thoại này",
            "transcript_subject": "Bản ghi hội thoại"
        },
        "templates": {
            "ways_to_reach_you_message_body": "Trong lúc chờ đội ngũ hỗ trợ phản hồi, bạn hãy để lại email để nhận được thông báo nhanh nhất nhé.",
            "email_input_box_message_body": "Nhận thông báo qua email",
            "csat_input_message_body": "Bạn thấy lần hỗ trợ này thế nào?"
        },
        "messages": {
            "deleted": "Tin nhắn đã bị xoá",
            "business_card": "[Danh thiếp]",
            "bank_card": "[Tài khoản ngân hàng]",
            "reminder": "[Nhắc hẹn]",
            "call": "[Cuộc gọi]",
            "link": "[Liên kết]",
            "friend_request": "[Lời mời kết bạn]"
        }
    },
    "COPILOT": {
        "TRY_THESE_PROMPTS": "Thử các gợi ý sau"
    },
    "CREATE_ACCOUNT": {
        "NO_ACCOUNT_WARNING": "Ồ ồ! Chúng tôi không thể tìm thấy bất kỳ tài khoản {installationName} nào. Vui lòng tạo một tài khoản mới để tiếp tục.",
        "NEW_ACCOUNT": "Tạo mới tài khoản",
        "SELECTOR_SUBTITLE": "Tạo mới một tài khoản",
        "API": {
            "SUCCESS_MESSAGE": "Tài khoản được tạo thành công",
            "EXIST_MESSAGE": "Tài khoản đã tồn tại",
            "ERROR_MESSAGE": "Không kết nối được máy chủ. Bạn hãy thử lại sau."
        },
        "FORM": {
            "NAME": {
                "LABEL": "Tên công ty",
                "PLACEHOLDER": "Công ty Hoa Sen"
            },
            "SUBMIT": "Gửi",
            "CANCEL": "Huỷ"
        }
    },
    "CSAT": {
        "TITLE": "Đánh giá hội thoại",
        "PLACEHOLDER": "Cho chúng tôi biết thêm...",
        "RATINGS": {
            "POOR": "😞 Kém",
            "FAIR": "😑 Tạm được",
            "AVERAGE": "😐 Bình thường",
            "GOOD": "😀 Tốt",
            "EXCELLENT": "😍 Tuyệt vời"
        }
    },
    "CSAT_REPORTS": {
        "HEADER": "Báo cáo CSAT",
        "NO_RECORDS": "Chưa có phản hồi nào",
        "NO_RECORDS_DESCRIPTION": "Phản hồi khảo sát CSAT sẽ hiện ở đây khi khách bắt đầu đánh giá.",
        "DOWNLOAD": "Tải về các báo cáo CSAT",
        "DOWNLOAD_FAILED": "Tải báo cáo CSAT thất bại",
        "FILTERS": {
            "ADD_FILTER": "Thêm bộ lọc",
            "CLEAR_ALL": "Xóa tất cả",
            "NO_FILTER": "Không có bộ lọc nào",
            "INPUT_PLACEHOLDER": {
                "AGENTS": "Tìm kiếm nhân viên",
                "INBOXES": "Tìm hộp thư",
                "TEAMS": "Tìm kiếm nhóm",
                "RATINGS": "Tìm mức đánh giá"
            },
            "AGENTS": {
                "LABEL": "Nhân viên"
            },
            "INBOXES": {
                "LABEL": "Hộp thư"
            },
            "TEAMS": {
                "LABEL": "Nhóm"
            },
            "RATINGS": {
                "LABEL": "Đánh giá"
            }
        },
        "TABLE": {
            "HEADER": {
                "CONTACT_NAME": "Liên hệ",
                "AGENT_NAME": "Nhân viên",
                "RATING": "Đánh giá",
                "FEEDBACK_TEXT": "Bình luận phản hồi",
                "CONVERSATION": "Hội thoại",
                "CUSTOMER": "Khách hàng",
                "RESPONSE": "Phản hồi",
                "HANDLED_BY": "Người phụ trách"
            },
            "UNKNOWN_CUSTOMER": "Khách hàng không rõ"
        },
        "NO_AGENT": "Chưa có nhân viên phụ trách",
        "NO_FEEDBACK": "Không có góp ý",
        "METRIC": {
            "TOTAL_RESPONSES": {
                "LABEL": "Tổng số phản hồi",
                "TOOLTIP": "Tổng số phản hồi thu thập được"
            },
            "SATISFACTION_SCORE": {
                "LABEL": "Mức độ hài lòng",
                "TOOLTIP": "Tổng số phản hồi tích cực / Tổng số phản hồi * 100"
            },
            "RESPONSE_RATE": {
                "LABEL": "Tỷ lệ phản hồi",
                "TOOLTIP": "Tổng số phản hồi / Tổng số tin nhắn khảo sát CSAT đã gửi * 100"
            },
            "RATING_DISTRIBUTION": "Phân bố mức đánh giá"
        }
    },
    "CUSTOM_ATTRIBUTES": {
        "BUTTON": "Thêm thuộc tính tùy chỉnh",
        "COPY_SUCCESSFUL": "Đã sao chép mã thành công",
        "SHOW_MORE": "Xem tất cả thuộc tính",
        "SHOW_LESS": "Thu gọn thuộc tính",
        "ACTIONS": {
            "COPY": "Sao chép thuộc tính",
            "DELETE": "Xoá thuộc tính",
            "EDIT": "Sửa thuộc tính"
        },
        "ADD": {
            "TITLE": "Tạo thuộc tính tùy chỉnh",
            "DESC": "Thêm thông tin tuỳ chỉnh vào liên hệ này."
        },
        "FORM": {
            "CREATE": "Thêm thuộc tính",
            "CANCEL": "Huỷ",
            "NAME": {
                "LABEL": "Tên thuộc tính tùy chỉnh",
                "PLACEHOLDER": "Ví dụ: shopify id",
                "ERROR": "Tên thuộc tính tuỳ chỉnh không hợp lệ"
            },
            "VALUE": {
                "LABEL": "Giá trị của thuộc tính",
                "PLACEHOLDER": "Ví dụ: 11901 "
            },
            "ADD": {
                "TITLE": "Tạo thuộc tính mới ",
                "SUCCESS": "Thuộc tính được thêm thành công",
                "ERROR": "Không thể thêm thuộc tính. Vui lòng thử lại sau"
            },
            "UPDATE": {
                "SUCCESS": "Thuộc tính được cập nhật thành công",
                "ERROR": "Không thể cập nhật thuộc tính. Vui lòng thử lại sau"
            },
            "DELETE": {
                "SUCCESS": "Thuộc tính được xoá thành công",
                "ERROR": "Không thể xoá thuộc tính. Vui lòng thử lại sau"
            },
            "ATTRIBUTE_SELECT": {
                "TITLE": "Thêm nhiều thuộc tính",
                "PLACEHOLDER": "Tìm kiếm nhiều thuộc tính",
                "NO_RESULT": "Không có thuộc tính nào được tìm thấy"
            },
            "ATTRIBUTE_TYPE": {
                "LIST": {
                    "PLACEHOLDER": "Chọn giá trị",
                    "SEARCH_INPUT_PLACEHOLDER": "Tìm kiếm giá trị",
                    "NO_RESULT": "Không tìm thấy kết quả"
                }
            }
        },
        "VALIDATIONS": {
            "REQUIRED": "Giá trị hợp lệ bắt buộc có",
            "INVALID_URL": "URL không hợp lệ",
            "INVALID_INPUT": "Giá trị không hợp lệ"
        }
    },
    "DASHBOARD_APPS": {
        "LOADING_MESSAGE": "Đang tải dữ liệu..."
    },
    "DATA_IMPORTS": {
        "HEADER": "Dữ liệu",
        "DESCRIPTION": "Đưa liên hệ và hội thoại cũ từ công cụ hỗ trợ khác vào tài khoản này. Mỗi lần nhập chạy nền nên bạn vẫn làm việc bình thường, theo dõi tiến độ và xem lại những mục bị bỏ qua.",
        "LOADING": "Đang tải danh sách lần nhập",
        "DEFAULT_IMPORT_NAME": "Nhập từ Intercom",
        "DEFAULT_IMPORT_NAMES": {
            "INTERCOM": "Nhập từ Intercom",
            "FRESHDESK": "Nhập từ Freshdesk"
        },
        "TABS": {
            "IMPORT": "Nhập",
            "EXPORT": "Xuất"
        },
        "TYPES": {
            "CONTACTS": "Liên hệ",
            "CONVERSATIONS": "Các hội thoại",
            "MESSAGES": "Tin nhắn"
        },
        "DRAWER": {
            "TITLE": "Lần nhập mới",
            "SOURCE": "Nguồn",
            "NAME": "Tên lần nhập",
            "NAME_PLACEHOLDER": "Chuyển dữ liệu hỗ trợ tháng 7",
            "ACCESS_KEY": "Access key Intercom",
            "ACCESS_KEY_PLACEHOLDER": "Dán access key Intercom của bạn",
            "INTERCOM_ACCESS_KEY": "Access key Intercom",
            "INTERCOM_ACCESS_KEY_PLACEHOLDER": "Dán access key Intercom của bạn",
            "FRESHDESK_API_KEY": "API key Freshdesk",
            "FRESHDESK_API_KEY_PLACEHOLDER": "Dán API key Freshdesk của bạn",
            "FRESHDESK_DOMAIN": "Tên miền Freshdesk",
            "FRESHDESK_DOMAIN_PLACEHOLDER": "acme.freshdesk.com",
            "DATA_TYPES": "Dữ liệu cần nhập",
            "VALIDATING": "Đang kiểm tra access key...",
            "VALID_KEY": "Access key hợp lệ.",
            "INVALID_KEY": "Không xác thực được access key này.",
            "ACTIVE_IMPORT": "Hãy chờ lần nhập đang chạy xong rồi mới bắt đầu lần mới.",
            "CANCEL": "Huỷ",
            "IMPORT": "Nhập"
        },
        "EXPORT": {
            "TITLE": "Tính năng xuất sắp có",
            "DESCRIPTION": "Xuất liên hệ và hội thoại khỏi tài khoản này. Luồng này sắp ra mắt.",
            "COMING_SOON": "Sắp có"
        },
        "TABLE": {
            "TITLE": "Các lần nhập gần đây",
            "EMPTY": "Chưa có lần nhập nào",
            "EMPTY_DESCRIPTION": "Hãy bắt đầu một lần nhập để đưa lịch sử khách hàng sẵn có vào tài khoản này.",
            "NEW_IMPORT": "Nhập",
            "COUNT": "{count} lần nhập",
            "UNNAMED": "Lần nhập chưa đặt tên",
            "IMPORTED_COUNT": "Đã nhập {count}",
            "VIEW": "Xem lần nhập",
            "NAME": "Tên",
            "TYPE": "Kiểu",
            "STATUS": "Trạng thái",
            "IMPORTED": "Đã nhập",
            "CREATED": "Đã tạo",
            "RETRY": "Thử lại",
            "ABANDON": "Bỏ dở"
        },
        "DETAIL": {
            "BACK": "Quay lại danh sách nhập",
            "ERRORS": "Lỗi",
            "SKIP_LOGS": "Nhật ký bỏ qua",
            "SOURCE": "Nguồn",
            "IMPORT_TYPES": "Loại dữ liệu nhập",
            "CREATED": "Đã tạo",
            "DURATION": "Thời lượng",
            "INITIATED_BY": "Người bắt đầu",
            "PROGRESS": "Tiến độ nhập",
            "PROGRESS_WITH_TOTAL": "Đã nhập {imported} trên {total}",
            "PROGRESS_WITHOUT_TOTAL": "Đã nhập {imported}",
            "PROGRESS_OF_TOTAL": "trên {total} đã nhập",
            "PROGRESS_IMPORTED": "đã nhập",
            "LAST_UPDATED_TOOLTIP": "Cập nhật lần cuối {time}",
            "NO_SKIP_LOGS": "Không có bản ghi nào bị bỏ qua hay lỗi.",
            "DOWNLOAD_SKIP_LOGS": "Tải CSV",
            "DOWNLOAD_ERROR_LOGS": "Tải CSV",
            "ALL_SKIP_LOGS": "Tất cả",
            "KIND": "Loại",
            "NO_ERRORS": "Không có lỗi nào.",
            "ERROR_CODE": "Mã",
            "SOURCE_OBJECT": "Đối tượng nguồn",
            "MESSAGE": "Tin nhắn"
        },
        "MONITOR": {
            "LIVE": "Cập nhật mỗi {seconds} giây",
            "LAST_UPDATED": "Cập nhật lần cuối {time}",
            "REFRESH": "Làm mới",
            "REFRESHING": "Đang làm mới",
            "STAGES": {
                "unknown": "Đang chờ cập nhật",
                "queued": "Đang xếp hàng",
                "contacts": "Đang nhập liên hệ",
                "conversations": "Đang nhập hội thoại",
                "finalizing": "Đang hoàn tất",
                "completed": "Hoàn tất",
                "completed_with_errors": "Xong nhưng có lỗi",
                "failed": "Thất bại",
                "abandoned": "Đã bỏ dở"
            }
        },
        "ALERTS": {
            "IMPORT_STARTED": "Đã bắt đầu nhập.",
            "IMPORT_RETRIED": "Lần nhập đã được xếp hàng để chạy tiếp.",
            "IMPORT_RETRY_FAILED": "Không thử lại được lần nhập này.",
            "IMPORT_ABANDONED": "Đã bỏ dở lần nhập.",
            "IMPORT_FAILED": "Không bắt đầu được lần nhập."
        }
    },
    "DATE_PICKER": {
        "PREVIOUS_PERIOD": "Kỳ trước",
        "NEXT_PERIOD": "Kỳ sau",
        "WEEK_NUMBER": "Tuần #{weekNumber}",
        "APPLY_BUTTON": "Áp dụng",
        "CLEAR_BUTTON": "Xóa",
        "DATE_RANGE_INPUT": {
            "START": "Ngày bắt đầu",
            "END": "Ngày kết thúc"
        },
        "DATE_RANGE_OPTIONS": {
            "TITLE": "KHOẢNG THỜI GIAN",
            "LAST_7_DAYS": "7 ngày cuối",
            "LAST_30_DAYS": "30 ngày cuối",
            "LAST_3_MONTHS": "3 tháng vừa qua",
            "LAST_6_MONTHS": "6 tháng vừa qua",
            "LAST_YEAR": "Năm ngoái",
            "THIS_WEEK": "Tuần này",
            "MONTH_TO_DATE": "Tháng này",
            "CUSTOM_RANGE": "Phạm vi ngày tùy chỉnh"
        }
    },
    "DAYS_OF_WEEK": {
        "SUNDAY": "Chủ nhật",
        "MONDAY": "Thứ hai",
        "TUESDAY": "Thứ ba",
        "WEDNESDAY": "Thứ tư",
        "THURSDAY": "Thứ năm",
        "FRIDAY": "Thứ sáu",
        "SATURDAY": "Thứ bảy"
    },
    "DELETE_CONTACT": {
        "BUTTON_LABEL": "Xoá liên lạc",
        "TITLE": "Xoá liên hệ",
        "DESC": "Xoá chi tiết liên hệ",
        "CONFIRM": {
            "TITLE": "Xác nhận xoá",
            "MESSAGE": "Bạn có muốn xoá? ",
            "YES": "Có, Xoá",
            "NO": "Không, giữ"
        },
        "API": {
            "SUCCESS_MESSAGE": "Liên hệ đã được xóa thành công",
            "ERROR_MESSAGE": "Không thể xoá liên hệ. Vui lòng thử lại sau."
        }
    },
    "DIALOG": {
        "BUTTONS": {
            "CANCEL": "Huỷ",
            "CONFIRM": "Xác nhận"
        }
    },
    "DROPDOWN_MENU": {
        "SEARCH_PLACEHOLDER": "Tìm kiếm...",
        "EMPTY_STATE": "Không tìm thấy kết quả.",
        "SEARCHING": "Đang tìm kiếm..."
    },
    "DURATION_INPUT": {
        "MINUTES": "Phút",
        "HOURS": "Giờ",
        "DAYS": "Ngày",
        "PLACEHOLDER": "Nhập khoảng thời gian"
    },
    "EDIT_CONTACT": {
        "BUTTON_LABEL": "Chỉnh sửa liên hệ",
        "TITLE": "Chỉnh sửa liên hệ",
        "DESC": "Chỉnh sửa liên hệ chi tiết"
    },
    "EMAIL_HEADER": {
        "FROM": "Từ",
        "TO": "Đến",
        "BCC": "Bcc",
        "CC": "Cc",
        "SUBJECT": "Chủ đề",
        "EXPAND": "Xem toàn bộ thư",
        "COLLAPSE": "Thu gọn thư",
        "BODY_FRAME_TITLE": "Nội dung thư"
    },
    "EMAIL_TRANSCRIPT": {
        "TITLE": "Gửi bản ghi hội thoại",
        "DESC": "Gửi bản sao của bản ghi hội thoại đến địa chỉ email được chỉ định",
        "SUBMIT": "Gửi",
        "CANCEL": "Huỷ",
        "SEND_EMAIL_SUCCESS": "Bản ghi hội thoại đã được gửi thành công",
        "SEND_EMAIL_ERROR": "Có lỗi, xin vui lòng thử lại",
        "SEND_EMAIL_PAYMENT_REQUIRED": "Gói hiện tại của bạn không có tính năng gửi bản ghi hội thoại qua email. Hãy nâng cấp để dùng.",
        "FORM": {
            "SEND_TO_CONTACT": "Gửi bảng điểm cho khách hàng",
            "SEND_TO_AGENT": "Gửi bản ghi cho nhân viên được phân công",
            "SEND_TO_OTHER_EMAIL_ADDRESS": "Gửi bản ghi tới một địa chỉ email khác",
            "EMAIL": {
                "PLACEHOLDER": "Nhập địa chỉ emai",
                "ERROR": "Vui lòng nhập một địa chỉ email hợp lệ"
            }
        }
    },
    "EMOJI_ICON_PICKER": {
        "TABS": {
            "ICONS": "Biểu tượng",
            "EMOJIS": "Biểu tượng cảm xúc"
        },
        "SEARCH_EMOJI": "Tìm biểu tượng cảm xúc…",
        "SEARCH_ICON": "Tìm biểu tượng…",
        "FREQUENTLY_USED": "Hay dùng",
        "NO_EMOJI": "Không có biểu tượng cảm xúc nào khớp",
        "NO_ICON": "Không có biểu tượng nào khớp",
        "REMOVE": "Xoá",
        "STYLE": {
            "OUTLINE": "Biểu tượng nét viền",
            "FILLED": "Biểu tượng nền đặc"
        },
        "COLORS": {
            "SLATE": "Xám đá",
            "RED": "Red",
            "ORANGE": "Cam",
            "AMBER": "Hổ phách",
            "GREEN": "Xanh lá",
            "TEAL": "Xanh mòng két",
            "BLUE": "Xanh dương",
            "INDIGO": "Chàm",
            "VIOLET": "Tím",
            "PINK": "Hồng"
        }
    },
    "ERROR_PAGES": {
        "not_found": {
            "meta": {
                "title": "Không tìm thấy trang · Yona",
                "description": "Đường dẫn này không dẫn tới trang nào của Yona."
            },
            "eyebrow": "Lỗi 404",
            "title": "Không tìm thấy trang này",
            "lead": "Đường dẫn có thể đã đổi, trang đã bị gỡ, hoặc địa chỉ gõ thiếu một ký tự. Kiểm tra lại đường dẫn, hoặc đi tiếp từ một trong hai chỗ dưới đây.",
            "home": "Về trang chủ"
        }
    },
    "ERRORS": {
        "webhook": {
            "invalid": "Sự kiện không hợp lệ"
        },
        "openai": {
            "invalid_api_key": "API key của OpenAI không hợp lệ hoặc đã bị thu hồi. Hãy kiểm tra lại khóa trong bảng điều khiển OpenAI của bạn."
        },
        "dyte": {
            "invalid_message_type": "Loại tin nhắn không hợp lệ. Hành động không được phép",
            "realtimekit_credentials_required": "Cần có thông tin xác thực Cloudflare RealtimeKit. Hãy xóa kết nối Dyte hiện có và tạo lại bằng thông tin Cloudflare RealtimeKit."
        },
        "slack": {
            "invalid_channel_id": "Kênh Slack không hợp lệ. Bạn hãy thử lại"
        },
        "reports": {
            "date_range_too_long": "Khoảng thời gian không được quá 6 tháng"
        },
        "inboxes": {
            "connection_not_open": "Cách kết nối này chưa mở, hãy chọn cách kết nối khác"
        },
        "conversations": {
            "resolved": "Hội thoại đã kết thúc nên không nhận thêm tin nhắn",
            "contact_unreachable": "Liên hệ chưa có địa chỉ để gửi qua hộp thư này",
            "email_undeliverable": "Không gửi được thư tới :email: :reason"
        },
        "email_addresses": {
            "invalid_syntax": "địa chỉ email sai định dạng",
            "domain_not_found": "tên miền không tồn tại",
            "domain_no_mail": "tên miền này không nhận thư"
        },
        "messages": {
            "email_bounced": "Địa chỉ :email không nhận được thư: :reason",
            "email_bounced_without_reason": "Địa chỉ :email không nhận được thư, máy chủ bên nhận đã trả thư về",
            "email_send_failed": "Máy chủ thư từ chối gửi: :reason",
            "email_send_failed_unknown": "Không gửi được thư qua máy chủ thư của hộp này"
        },
        "custom_filters": {
            "number_of_records": "Đã đạt giới hạn. Số lượng tuỳ chọn lọc tối đa cho mỗi mỗi người dùng mỗi tài khoản là 1000.",
            "invalid_attribute": "Invalid attribute key - [{key}]. The key should be one of [{allowed_keys}] or a custom attribute defined in the account.",
            "invalid_operator": "Invalid operator. The allowed operators for {attribute_name} are [{allowed_keys}].",
            "invalid_query_operator": "Toán tử điều kiện phải là \"AND\" hoặc \"OR\".",
            "invalid_value": "Invalid value. The values provided for {attribute_name} are invalid"
        },
        "mfa": {
            "already_enabled": "Xác thực hai lớp đã bật rồi",
            "not_enabled": "Chưa bật xác thực hai lớp",
            "invalid_code": "Mã xác minh không đúng",
            "invalid_backup_code": "Mã dự phòng không đúng",
            "invalid_token": "Token xác thực hai lớp sai hoặc đã hết hạn",
            "invalid_credentials": "Thông tin đăng nhập hoặc mã xác minh không đúng"
        },
        "sessions": {
            "cannot_revoke_current": "Bạn không thể thu hồi phiên đang dùng."
        },
        "contacts": {
            "phone_number_invalid": "Số điện thoại không hợp lệ. Nhập số trong nước như 0912 345 678, hoặc số nước ngoài kèm mã nước như +1 202 555 0123.",
            "email_taken": "Email này đã thuộc về một liên hệ khác",
            "phone_number_taken": "Số điện thoại này đã thuộc về một liên hệ khác",
            "identifier_taken": "Mã định danh này đã thuộc về một liên hệ khác",
            "import": {
                "failed": "Chưa chọn tệp"
            },
            "export": {
                "success": "Chúng tôi sẽ thông báo khi tệp xuất danh sách liên hệ đã sẵn sàng."
            }
        },
        "meta": {
            "action": {
                "missing_source_id": "Tin này chưa có mã bên Meta nên chưa thả cảm xúc được.",
                "outside_messaging_window": "Khách chưa nhắn gì trong 24 giờ qua nên Messenger không cho thả cảm xúc. Hãy trả lời khách, khi khách nhắn lại thì thả được."
            }
        },
        "zalo": {
            "send": {
                "circuit_open": "Kết nối Zalo đang lỗi liên tục, tạm dừng gửi một lát.",
                "session_lost": "Phiên Zalo đã hết, bạn quét lại mã QR giúp mình nhé.",
                "bridge_unreachable": "Chưa gọi được dịch vụ Zalo, bạn thử lại sau ít phút.",
                "secret_mismatch": "Dịch vụ Zalo đang sai cấu hình (khoá gửi tin), bạn báo quản trị viên giúp nhé.",
                "zalo_rejected": "Zalo từ chối tin này (:detail).",
                "media_fetch_failed": "Không đọc được tệp đính kèm để gửi (:detail).",
                "unknown": "Chưa gửi được tin này ra Zalo (:detail).",
                "attachment_failed": "Không gửi được tệp \":filename\": :reason"
            },
            "action": {
                "session_lost": "Phiên Zalo đã hết, bạn quét lại mã QR giúp mình nhé.",
                "bridge_unreachable": "Chưa gọi được dịch vụ Zalo, bạn thử lại sau ít phút.",
                "secret_mismatch": "Dịch vụ Zalo đang sai cấu hình (khoá gửi tin), bạn báo quản trị viên giúp nhé.",
                "zalo_rejected": "Zalo từ chối thao tác này (:detail).",
                "bad_request": "Zalo không còn nhận ra tin này (:detail).",
                "missing_source_id": "Tin này chưa sang tới Zalo nên chưa đổi được ở đó.",
                "emoji_not_supported": "Zalo không có biểu cảm này.",
                "unknown": "Thao tác này chưa sang được Zalo (:detail)."
            }
        },
        "stickers": {
            "capability_not_supported": "Kênh này chưa gửi được sticker.",
            "not_found": "Không tìm thấy sticker này, bạn chọn sticker khác giúp mình nhé.",
            "bad_request": "Chưa tìm được sticker với từ khoá này, bạn thử từ khoá khác nhé.",
            "private_note": "Không gửi sticker trong ghi chú riêng được.",
            "outgoing_only": "Sticker chỉ gửi được trong tin trả lời khách.",
            "with_attachments": "Sticker được gửi riêng, không kèm tệp.",
            "missing_sticker_id": "Bạn chọn một sticker để gửi nhé."
        },
        "sticker_uploads": {
            "unsupported_file_type": "Chỉ nhận ảnh PNG, JPG, WebP hoặc GIF.",
            "file_too_large": "Ảnh tải lên tối đa :max_upload_mb MB.",
            "file_unreadable": "Không đọc được tệp vừa tải lên, bạn thử lại nhé.",
            "invalid_edit": "Thông số chỉnh ảnh sticker không hợp lệ, bạn chỉnh lại rồi tải lên nhé.",
            "image_unreadable": "Không đọc được ảnh này, bạn lưu lại thành PNG hoặc JPG rồi tải lên nhé.",
            "image_too_large": "Ảnh quá lớn để làm sticker (quá nhiều điểm ảnh hoặc hoạt ảnh quá dài), bạn thu nhỏ hoặc cắt ngắn rồi tải lại nhé.",
            "too_many_frames": "Ảnh động có quá nhiều khung hình, bạn cắt bớt rồi tải lại nhé.",
            "image_empty": "Xoá nền xong ảnh không còn gì, bạn giảm độ nhạy xoá nền hoặc tắt xoá nền nhé.",
            "original_missing": "Không còn ảnh gốc của sticker này, bạn tải ảnh lên lại nhé.",
            "sticker_busy": "Sticker này đang được dựng, bạn chờ vài giây rồi chỉnh lại nhé.",
            "duplicate_in_pack": "Bộ đã có một sticker giống hệt với cách chỉnh này.",
            "render_failed": "Không dựng được sticker từ ảnh này.",
            "render_timeout": "Ảnh này xử lý quá lâu, bạn thử ảnh nhỏ hơn hoặc ít khung hình hơn nhé.",
            "renderer_unavailable": "Máy chủ chưa dựng được sticker lúc này, bạn thử lại sau nhé.",
            "storage_write_failed": "Không lưu được tệp sticker, bạn thử lại sau nhé."
        },
        "sticker_library": {
            "pack_full": "Mỗi bộ có tối đa :max sticker. Bạn xoá bớt hoặc tạo bộ mới nhé.",
            "too_many_packs": "Mỗi account có tối đa :max bộ sticker.",
            "upload_throttled": "Bạn tải sticker hơi nhanh, chờ một chút rồi thử lại nhé.",
            "forbidden": "Tài khoản của bạn chưa được dùng kho sticker này.",
            "label_too_long": "Nhãn tối đa :max ký tự.",
            "too_many_keywords": "Tối đa :max từ khoá.",
            "keyword_not_text": "Từ khoá phải là chữ.",
            "keyword_too_long": "Từ khoá «:input» dài quá :max ký tự.",
            "pack_name_required": "Bạn đặt tên cho bộ sticker nhé.",
            "pack_name_too_long": "Tên bộ tối đa :max ký tự.",
            "invalid_destination": "Kho đích phải là kho riêng hoặc kho nền tảng."
        },
        "widget_recall": {
            "capability_not_supported": "Kênh này chưa cho thu hồi tin nhắn.",
            "not_own_message": "Bạn chỉ thu hồi được tin nhắn của chính mình.",
            "already_recalled": "Tin nhắn này đã được thu hồi.",
            "recall_window_expired": "Đã quá hạn thu hồi tin nhắn này."
        },
        "forward": {
            "not_forwardable": "Loại tin này chưa chuyển tiếp được.",
            "attachment_unavailable": "Tệp :filename không còn trên máy chủ nên không chuyển tiếp được.",
            "capability_not_supported": "Hộp thư :inbox không gửi được :items.",
            "sticker_unavailable": "Hộp thư :inbox không gửi được sticker này.",
            "reply_window_closed": "Hội thoại này đã hết thời gian được phép trả lời.",
            "target_not_found": "Không tìm thấy hội thoại hoặc bạn không có quyền.",
            "no_targets": "Chọn ít nhất một hội thoại.",
            "too_many_targets": "Mỗi lần chuyển tiếp tối đa :max hội thoại.",
            "capabilities": {
                "outbound_text": "tin chữ",
                "outbound_image": "ảnh",
                "outbound_video": "video",
                "outbound_audio": "âm thanh",
                "outbound_file": "tệp",
                "outbound_sticker": "sticker"
            }
        },
        "custom_attribute_definition": {
            "attribute_key_format": "chỉ được chứa chữ cái, chữ số, dấu gạch dưới, dấu gạch nối và dấu chấm",
            "key_conflict": "Khóa này không dùng được vì có thể trùng với thuộc tính mặc định."
        }
    },
    "FEATURE_SPOTLIGHT": {
        "LEARN_MORE": "Tìm hiểu thêm",
        "WATCH_VIDEO": "Xem video"
    },
    "FILTER": {
        "TITLE": "Lọc hội thoại",
        "SUBTITLE": "Thêm các bộ lọc của bạn bên dưới và nhấn \"Áp dụng bộ lọc\", để loại bỏ các hội thoại lộn xộn.",
        "EDIT_CUSTOM_FILTER": "Sửa Thư Mục",
        "CUSTOM_VIEWS_SUBTITLE": "Thêm hoặc xóa bộ lọc và cập nhật thư mục của bạn.",
        "ADD_NEW_FILTER": "Thêm bộ lọc",
        "FILTER_DELETE_ERROR": "Rât tiếc, dường như chưa có sự thay đổi nào! Hãy thêm ít nhất một bộ lọc để lưu nó.",
        "SUBMIT_BUTTON_LABEL": "Áp dụng bộ lọc",
        "UPDATE_BUTTON_LABEL": "Cập nhật thư mục",
        "CANCEL_BUTTON_LABEL": "Huỷ",
        "CLEAR_BUTTON_LABEL": "Xóa các bộ lọc",
        "FOLDER_LABEL": "Tên Thư Mục",
        "FOLDER_QUERY_LABEL": "Truy vấn Thư mục",
        "EMPTY_VALUE_ERROR": "Giá trị bắt buộc có.",
        "TOOLTIP_LABEL": "Lọc hội thoại",
        "QUERY_DROPDOWN_LABELS": {
            "AND": "VÀ",
            "OR": "HOẶC"
        },
        "INPUT_PLACEHOLDER": "Nhập giá trị",
        "MULTI_VALUE_INPUT_PLACEHOLDER": "Nhập một giá trị rồi nhấn Enter để thêm giá trị khác",
        "MULTI_VALUE_INPUT_PLACEHOLDER_SHORT": "Nhập một giá trị",
        "CONTACT_SEARCH_PLACEHOLDER": "Tìm kiếm liên hệ",
        "CONTACT_FALLBACK": "Liên hệ #{id}",
        "OPERATOR_LABELS": {
            "equal_to": "Bằng",
            "not_equal_to": "Không bằng",
            "does_not_contain": "Không bao gồm",
            "is_present": "Có",
            "is_not_present": "Không có",
            "is_greater_than": "Lớn hơn",
            "is_less_than": "Nhỏ hơn",
            "days_before": "Khoảng x ngày trước",
            "starts_with": "Bắt đầu với",
            "equalTo": "Bằng",
            "notEqualTo": "Không bằng",
            "contains": "Chứa",
            "doesNotContain": "Không bao gồm",
            "isPresent": "Có",
            "isNotPresent": "Không có",
            "isGreaterThan": "Lớn hơn",
            "isLessThan": "Nhỏ hơn",
            "daysBefore": "Khoảng x ngày trước",
            "startsWith": "Bắt đầu với"
        },
        "PREVIEW_OPERATOR_LABELS": {
            "equal_to": "là",
            "not_equal_to": "không là",
            "contains": "chứa",
            "does_not_contain": "không chứa",
            "is_present": "có giá trị",
            "is_not_present": "không có giá trị",
            "is_greater_than": "lớn hơn",
            "is_less_than": "nhỏ hơn",
            "days_before": "trước (số ngày)",
            "starts_with": "bắt đầu bằng"
        },
        "ATTRIBUTE_LABELS": {
            "TRUE": "Đúng",
            "FALSE": "Sai"
        },
        "ATTRIBUTES": {
            "STATUS": "Trạng thái",
            "ASSIGNEE_NAME": "Tên người được phân công",
            "INBOX_NAME": "Tên kênh",
            "TEAM_NAME": "Tên nhóm",
            "CONTACT": "Liên hệ",
            "CONVERSATION_IDENTIFIER": "Định danh hội thoại",
            "CAMPAIGN_NAME": "Tên chiến dịch",
            "LABELS": "Nhãn",
            "BROWSER_LANGUAGE": "Ngôn ngữ của trình duyệt",
            "PRIORITY": "Mức độ ưu tiên",
            "COUNTRY_NAME": "Tên quốc gia",
            "REFERER_LINK": "Liên kết người giới thiệu",
            "CUSTOM_ATTRIBUTE_LIST": "Danh sách",
            "CUSTOM_ATTRIBUTE_TEXT": "Văn bản",
            "CUSTOM_ATTRIBUTE_NUMBER": "Số",
            "CUSTOM_ATTRIBUTE_LINK": "Liên kết",
            "CUSTOM_ATTRIBUTE_CHECKBOX": "Hộp kiểm",
            "CREATED_AT": "Tạo vào lúc",
            "LAST_ACTIVITY": "Hành động cuối cùng"
        },
        "ERRORS": {
            "VALUE_REQUIRED": "Giá trị bắt buộc có",
            "ATTRIBUTE_KEY_REQUIRED": "Khóa thuộc tính là bắt buộc",
            "FILTER_OPERATOR_REQUIRED": "Toán tử lọc là bắt buộc",
            "VALUE_MUST_BE_BETWEEN_1_AND_998": "Giá trị phải nằm trong khoảng 1 đến 998"
        },
        "GROUPS": {
            "STANDARD_FILTERS": "Bộ lọc tiêu chuẩn",
            "ADDITIONAL_FILTERS": "Bộ lọc bổ sung",
            "CUSTOM_ATTRIBUTES": "Thuộc tính tùy chỉnh"
        },
        "CUSTOM_VIEWS": {
            "ADD": {
                "TITLE": "Bạn có muốn lưu bộ lọc này không?",
                "LABEL": "Đặt tên bộ lọc này",
                "PLACEHOLDER": "Đặt tên cho bộ lọc của bạn để tham khảo sau.",
                "ERROR_MESSAGE": "Cần phải có tên.",
                "SAVE_BUTTON": "Lưu bộ lọc",
                "CANCEL_BUTTON": "Huỷ",
                "API_FOLDERS": {
                    "SUCCESS_MESSAGE": "Thư mục được tạo thành công.",
                    "ERROR_MESSAGE": "Có lỗi xảy ra lúc tạo thư mục."
                },
                "API_SEGMENTS": {
                    "SUCCESS_MESSAGE": "Phân khúc được tạo thành công.",
                    "ERROR_MESSAGE": "Có lỗi xảy ra lúc tạo phân khúc."
                }
            },
            "EDIT": {
                "EDIT_BUTTON": "Sửa thư mục"
            },
            "DELETE": {
                "DELETE_BUTTON": "Xoá bộ lọc",
                "MODAL": {
                    "CONFIRM": {
                        "TITLE": "Xác nhận xoá",
                        "MESSAGE": "Bạn có chắc chắn muốn xoá bộ lọc ",
                        "YES": "Có, xoá",
                        "NO": "Không, giữ nó"
                    }
                },
                "API_FOLDERS": {
                    "SUCCESS_MESSAGE": "Thư mục bị xoá thành công.",
                    "ERROR_MESSAGE": "Có lỗi xảy ra lúc xoá thư mục."
                },
                "API_SEGMENTS": {
                    "SUCCESS_MESSAGE": "Phân khúc được xoá thành công.",
                    "ERROR_MESSAGE": "Có lỗi xảy ra lúc xoá phân khúc."
                }
            }
        }
    },
    "FLOWS": {
        "not_found": "Liên kết không hợp lệ hoặc đã hết hạn.",
        "loading": "Đang tải…",
        "send_failed": "Chưa gửi được, thử lại nhé.",
        "submitted_title": "Đã ghi nhận",
        "submitted_body": "Cảm ơn bạn, shop đã nhận được thông tin.",
        "close": "Đóng",
        "you_can_close_tab": "Bạn có thể đóng trang này.",
        "open_in_new_tab": "Mở trong tab mới",
        "schedule": {
            "day_section": "Ngày",
            "time_section": "Khung giờ",
            "full_note": "Khung gạch ngang đã hết chỗ.",
            "no_slots": "Hiện chưa có khung giờ nào trống.",
            "confirm": "Xác nhận {day}, {time}",
            "choose_slot": "Chọn một khung giờ"
        },
        "form": {
            "submit": "Gửi thông tin",
            "check_field": "Kiểm tra lại {field}"
        },
        "order_tracking": {
            "ref": "Đơn #{ref}",
            "eta": "Dự kiến nhận {date}",
            "fee_included": "Đã gồm phí giao",
            "total": "Tổng tiền",
            "track_order": "Theo dõi trên website",
            "statuses": {
                "placed": "Đã đặt",
                "confirmed": "Đã xác nhận",
                "shipped": "Đã gửi hàng",
                "delivering": "Đang giao",
                "delivered": "Đã nhận hàng",
                "cancelled": "Đã huỷ"
            }
        },
        "bank_transfer": {
            "copy": "Chép",
            "copied": "Đã chép",
            "bank_name": "Ngân hàng",
            "account_number": "Số tài khoản",
            "account_name": "Chủ tài khoản",
            "amount": "Số tiền",
            "transfer_note": "Nội dung chuyển khoản",
            "instructions": "Hướng dẫn"
        },
        "product": {
            "variant": "Phân loại",
            "quantity": "Số lượng",
            "max_quantity": "Tối đa {max}",
            "note_label": "Ghi chú cho shop",
            "note_placeholder": "Không bắt buộc",
            "subtotal": "Tạm tính",
            "submit": "Gửi yêu cầu đặt hàng",
            "select_variant": "Chọn đủ phân loại trước khi đặt"
        }
    },
    "GALLERY_VIEW": {
        "ERROR_DOWNLOADING": "Không tải được tệp đính kèm. Bạn hãy thử lại",
        "VIEW_AVATAR": "Xem ảnh đại diện {name}",
        "ZOOM_IN": "Phóng to",
        "ZOOM_OUT": "Thu nhỏ",
        "ROTATE_LEFT": "Xoay trái",
        "ROTATE_RIGHT": "Xoay phải",
        "DOWNLOAD": "Tải xuống",
        "CLOSE": "Đóng",
        "PREVIOUS": "Ảnh trước",
        "NEXT": "Ảnh sau"
    },
    "GENERAL": {
        "SHOWING_RESULTS": "Hiển thị {firstIndex}-{lastIndex} trong {totalCount} mục",
        "PHONE_INPUT": {
            "PLACEHOLDER": "Tìm kiếm",
            "EMPTY_STATE": "Không tìm thấy kết quả"
        },
        "CLOSE": "Đóng",
        "BETA": "Beta",
        "BETA_DESCRIPTION": "Tính năng này đang ở giai đoạn beta và có thể thay đổi khi chúng tôi hoàn thiện.",
        "ACCEPT": "Đồng ý",
        "DISCARD": "Bỏ",
        "PREFERRED": "Ưu tiên"
    },
    "GENERAL_SETTINGS": {
        "TITLE": "Cài đặt tài khoản",
        "DESCRIPTION": "Thiết lập chung cho cả tài khoản doanh nghiệp.",
        "LANGUAGE": {
            "TITLE": "Ngôn ngữ",
            "NOTE": "Ngôn ngữ của widget chat trên website và của dashboard với những ai chưa tự chọn ngôn ngữ riêng. Trang nhúng widget vẫn chọn được ngôn ngữ khác bằng tuỳ chọn locale trong mã nhúng.",
            "UPDATE_SUCCESS": "Đã đổi ngôn ngữ tài khoản",
            "UPDATE_ERROR": "Chưa đổi được ngôn ngữ, bạn thử lại nhé"
        },
        "BACK": "Trở về",
        "FORM": {
            "AUTO_RESOLVE": {
                "TITLE": "Tự động đánh dấu hội thoại đã xử lý xong",
                "NOTE": "Thiết lập này cho phép tự động đánh dấu hội thoại đã xử lý xong sau một khoảng thời gian không có hoạt động.",
                "DURATION": {
                    "LABEL": "Thời gian không hoạt động",
                    "HELP": "Khoảng thời gian không có hoạt động, sau đó hội thoại tự được đánh dấu xử lý xong",
                    "PLACEHOLDER": "30",
                    "ERROR": "Thời gian tự đánh dấu xử lý xong phải từ 10 phút đến 999 ngày",
                    "API": {
                        "SUCCESS": "Đã cập nhật thiết lập tự đánh dấu xử lý xong",
                        "ERROR": "Cập nhật thiết lập tự đánh dấu xử lý xong thất bại"
                    }
                },
                "MESSAGE": {
                    "LABEL": "Tin nhắn tùy chỉnh khi tự đánh dấu xử lý xong",
                    "PLACEHOLDER": "Hệ thống đánh dấu hội thoại là đã xử lý xong vì không có hoạt động nào trong 15 ngày",
                    "HELP": "Tin nhắn gửi cho khách sau khi hội thoại tự được đánh dấu xử lý xong"
                },
                "PREFERENCES": "Tùy chọn",
                "LABEL": {
                    "LABEL": "Gắn nhãn sau khi tự đánh dấu xử lý xong",
                    "PLACEHOLDER": "Chọn một nhãn"
                },
                "IGNORE_WAITING": {
                    "LABEL": "Bỏ qua hội thoại đang chờ nhân viên trả lời"
                },
                "UPDATE_BUTTON": "Lưu thay đổi"
            }
        }
    },
    "HELP_CENTER": {
        "TITLE": "Trung tâm trợ giúp",
        "NEW_PAGE": {
            "DESCRIPTION": "Tạo cổng trợ giúp tự phục vụ cho khách hàng. Giúp họ tìm câu trả lời ngay mà không phải chờ đợi, giảm số câu hỏi lặp lại, tăng hiệu suất nhân viên và nâng chất lượng hỗ trợ.",
            "CREATE_PORTAL_BUTTON": "Tạo cổng"
        },
        "HEADER": {
            "FILTER": "Lọc bởi",
            "SORT": "Sắp bởi",
            "LOCALE": "Ngôn ngữ",
            "SETTINGS_BUTTON": "Cài đặt",
            "NEW_BUTTON": "Bài mới",
            "DROPDOWN_OPTIONS": {
                "PUBLISHED": "Đã phát hành",
                "DRAFT": "Nháp",
                "ARCHIVED": "Đã lưu trữ"
            },
            "TITLES": {
                "ALL_ARTICLES": "Tất cả bài viết",
                "MINE": "Các bài của tôi",
                "DRAFT": "Các bài nháp",
                "ARCHIVED": "Các bài lưu"
            },
            "LOCALE_SELECT": {
                "TITLE": "Chọn ngôn ngữ",
                "PLACEHOLDER": "Chọn ngôn ngữ",
                "NO_RESULT": "Không tìm thấy ngôn ngữ nào",
                "SEARCH_PLACEHOLDER": "Tìm ngôn ngữ"
            }
        },
        "EDIT_HEADER": {
            "ALL_ARTICLES": "Tất cả bài viết",
            "PUBLISH_BUTTON": "Phát hành",
            "MOVE_TO_ARCHIVE_BUTTON": "Di chuyển đến lưu trữ",
            "PREVIEW": "Xem trước",
            "ADD_TRANSLATION": "Thêm bản dịch",
            "OPEN_SIDEBAR": "Mở thanh bên",
            "CLOSE_SIDEBAR": "Đóng thanh bên",
            "SAVING": "Đang lưu...",
            "SAVED": "Đã lưu"
        },
        "ARTICLE_EDITOR": {
            "IMAGE_UPLOAD": {
                "TITLE": "Tải lên hình ảnh",
                "UPLOADING": "Đang tải lên...",
                "SUCCESS": "Ảnh tải lên thành công",
                "ERROR": "Lỗi khi tải ảnh lên",
                "UN_AUTHORIZED_ERROR": "Bạn không có quyền tải ảnh lên",
                "ERROR_FILE_SIZE": "Kích thước ảnh phải nhỏ hơn {size}MB",
                "ERROR_FILE_FORMAT": "Ảnh phải có định dạng jpg, jpeg hoặc png",
                "ERROR_FILE_DIMENSIONS": "Kích thước ảnh phải nhỏ hơn 2000 x 2000"
            }
        },
        "ARTICLE_SETTINGS": {
            "TITLE": "Cài đặt bài viết",
            "FORM": {
                "CATEGORY": {
                    "LABEL": "Danh mục",
                    "TITLE": "Chọn loại",
                    "PLACEHOLDER": "Chọn loại",
                    "NO_RESULT": "Không tìm thấy loại",
                    "SEARCH_PLACEHOLDER": "Tìm danh mục"
                },
                "AUTHOR": {
                    "LABEL": "Tác giả",
                    "TITLE": "Chọn tác giả",
                    "PLACEHOLDER": "Chọn tác giả",
                    "NO_RESULT": "Không tìm thấy tác giả",
                    "SEARCH_PLACEHOLDER": "Tìm tác giả"
                },
                "META_TITLE": {
                    "LABEL": "Tiêu đề meta",
                    "PLACEHOLDER": "Thêm Tiêu đề meta"
                },
                "META_DESCRIPTION": {
                    "LABEL": "Mô tả meta",
                    "PLACEHOLDER": "Thêm mô tả meta của bạn để có kết quả SEO tốt hơn..."
                },
                "META_TAGS": {
                    "LABEL": "Các thẻ meta",
                    "PLACEHOLDER": "Thêm các thẻ meta bằng dấu phẩy..."
                }
            },
            "BUTTONS": {
                "ARCHIVE": "Lưu trữ bài viết",
                "DELETE": "Xoá bài"
            }
        },
        "ARTICLE_SEARCH_RESULT": {
            "UNCATEGORIZED": "Chưa được phân loại",
            "SEARCH_RESULTS": "Kết quả tìm cho {query}",
            "EMPTY_TEXT": "Tìm bài viết để chèn vào câu trả lời.",
            "SEARCH_LOADER": "Đang tìm kiếm...",
            "INSERT_ARTICLE": "Thêm vào",
            "NO_RESULT": "Không có bài viết nào",
            "COPY_LINK": "Sao chép bài viết vào bộ nhớ tạm",
            "OPEN_LINK": "Mở bài viên trong tab mới",
            "PREVIEW_LINK": "Xem trước bài viết"
        },
        "PORTAL": {
            "HEADER": "Cổng",
            "DEFAULT": "Mặc định",
            "NEW_BUTTON": "Cổng mới",
            "ACTIVE_BADGE": "có hiệu lực",
            "CHOOSE_LOCALE_LABEL": "Chọn một ngôn ngữ",
            "LOADING_MESSAGE": "Đang tải cổng...",
            "ARTICLES_LABEL": "bài viết",
            "NO_PORTALS_MESSAGE": "Không có cổng nào",
            "ADD_NEW_LOCALE": "Thêm ngôn ngữ",
            "POPOVER": {
                "TITLE": "Cổng",
                "PORTAL_SETTINGS": "Cài đặt cổng",
                "SUBTITLE": "Bạn có nhiều cổng và có thể có các ngôn ngữ khác nhau cho mỗi cổng.",
                "CANCEL_BUTTON_LABEL": "Huỷ",
                "CHOOSE_LOCALE_BUTTON": "Chọn ngôn ngữ"
            },
            "PORTAL_SETTINGS": {
                "LIST_ITEM": {
                    "HEADER": {
                        "COUNT_LABEL": "bài viết",
                        "ADD": "Thêm ngôn ngữ",
                        "VISIT": "Xem trang",
                        "SETTINGS": "Cài đặt",
                        "DELETE": "Xoá"
                    },
                    "PORTAL_CONFIG": {
                        "TITLE": "Cấu hình Cổng thông tin",
                        "ITEMS": {
                            "NAME": "Tên",
                            "DOMAIN": "Tên miền tuỳ chỉnh",
                            "SLUG": "Đường dẫn",
                            "TITLE": "Tiêu đề cổng",
                            "THEME": "Màu chủ đề",
                            "SUB_TEXT": "Tiêu đề phụ của cổng thông tin"
                        }
                    },
                    "AVAILABLE_LOCALES": {
                        "TITLE": "Các ngôn ngữ sẵn có",
                        "TABLE": {
                            "NAME": "Tên ngôn ngữ",
                            "CODE": "Mã ngôn ngữ",
                            "ARTICLE_COUNT": "Số lượng bài",
                            "CATEGORIES": "Số danh mục",
                            "SWAP": "Chuyển",
                            "DELETE": "Xoá",
                            "DEFAULT_LOCALE": "Mặc định"
                        }
                    }
                },
                "DELETE_PORTAL": {
                    "TITLE": "Xóa cổng thông tin",
                    "MESSAGE": "Bạn có chắc chắn muốn xóa cổng thông tin này",
                    "YES": "Có, xóa cổng thông tin",
                    "NO": "Không, giữ cổng thông tin",
                    "API": {
                        "DELETE_SUCCESS": "Đã xóa cổng thông tin thành công",
                        "DELETE_ERROR": "Lỗi khi xóa cổng thông tin"
                    }
                },
                "SEND_CNAME_INSTRUCTIONS": {
                    "API": {
                        "SUCCESS_MESSAGE": "Đã gửi hướng dẫn CNAME",
                        "ERROR_MESSAGE": "Có lỗi khi gửi hướng dẫn CNAME"
                    }
                }
            },
            "EDIT": {
                "HEADER_TEXT": "Sửa cổng thông tin",
                "TABS": {
                    "BASIC_SETTINGS": {
                        "TITLE": "Thông tin cơ bản"
                    },
                    "CUSTOMIZATION_SETTINGS": {
                        "TITLE": "Tuỳ chỉnh cổng thông tin"
                    },
                    "CATEGORY_SETTINGS": {
                        "TITLE": "Danh mục"
                    },
                    "LOCALE_SETTINGS": {
                        "TITLE": "Ngôn ngữ"
                    }
                },
                "CATEGORIES": {
                    "TITLE": "Các danh mục trong",
                    "NEW_CATEGORY": "Tạo danh mục",
                    "TABLE": {
                        "NAME": "Tên",
                        "DESCRIPTION": "Mô tả",
                        "LOCALE": "Ngôn ngữ",
                        "ARTICLE_COUNT": "Số lượng bài",
                        "ACTION_BUTTON": {
                            "EDIT": "Sửa danh mục",
                            "DELETE": "Xoá danh mục"
                        },
                        "EMPTY_TEXT": "Không tìm thấy danh mục nào"
                    }
                },
                "EDIT_BASIC_INFO": {
                    "BUTTON_TEXT": "Cập nhật thông tin cơ bản"
                }
            },
            "ADD": {
                "CREATE_FLOW": {
                    "BASIC": {
                        "TITLE": "Thông tin trung tâm trợ giúp",
                        "BODY": "Thông tin cơ bản về cổng"
                    },
                    "CUSTOMIZATION": {
                        "TITLE": "Tùy chỉnh trung tâm trợ giúp",
                        "BODY": "Tuỳ chỉnh cổng"
                    },
                    "FINISH": {
                        "TITLE": "Tới rồi! 🎉",
                        "BODY": "Bạn đã sẵn sàng!"
                    }
                },
                "CREATE_FLOW_PAGE": {
                    "BACK_BUTTON": "Trở về",
                    "BASIC_SETTINGS_PAGE": {
                        "HEADER": "Tạo cổng",
                        "TITLE": "Thông tin trung tâm trợ giúp",
                        "CREATE_BASIC_SETTING_BUTTON": "Tạo cài đặt cơ bản cho cổng thông tin"
                    },
                    "CUSTOMIZATION_PAGE": {
                        "HEADER": "Tuỳ biến cổng",
                        "TITLE": "Tùy chỉnh trung tâm trợ giúp",
                        "UPDATE_PORTAL_BUTTON": "Cập nhật thông tin cấu hình cổng"
                    },
                    "FINISH_PAGE": {
                        "TITLE": "Tới rồi!🎉 Bạn đã sẵn sàng!",
                        "MESSAGE": "Bây giờ bạn có thể thấy cổng được tạo này trên trang tất cả các cổng của bạn.",
                        "FINISH": "Đi đến tất cả các trang cổng thông tin"
                    }
                },
                "LOGO": {
                    "LABEL": "Logo",
                    "UPLOAD_BUTTON": "Tải lên logo",
                    "HELP_TEXT": "Logo này sẽ được hiển thị trên tiêu đề cổng thông tin.",
                    "IMAGE_UPLOAD_SUCCESS": "Đã tải logo lên",
                    "IMAGE_UPLOAD_ERROR": "Đã xóa logo",
                    "IMAGE_DELETE_ERROR": "Có lỗi khi xóa logo"
                },
                "NAME": {
                    "LABEL": "Tên",
                    "PLACEHOLDER": "Tên cổng",
                    "HELP_TEXT": "Tên sẽ được sử dụng trong nội bộ cổng thông tin công khai.",
                    "ERROR": "Tên bắt buộc có"
                },
                "SLUG": {
                    "LABEL": "Đường dẫn",
                    "PLACEHOLDER": "Slug cổng cho các url",
                    "ERROR": "Phải có Slug"
                },
                "DOMAIN": {
                    "LABEL": "Tên miền tuỳ biến",
                    "PLACEHOLDER": "Tên miền tuỳ biến cổng",
                    "HELP_TEXT": "Chỉ thêm nếu bạn muốn dùng tên miền riêng cho cổng trợ giúp. Ví dụ: {exampleURL}",
                    "ERROR": "Nhập URL domain"
                },
                "HOME_PAGE_LINK": {
                    "LABEL": "Liên kết trang chủ",
                    "PLACEHOLDER": "Liên kế trang chủ cổng thông tin",
                    "HELP_TEXT": "Liên kết để quay về trang chủ từ cổng trợ giúp. Ví dụ: {exampleURL}",
                    "ERROR": "Nhập URL trang chủ"
                },
                "THEME_COLOR": {
                    "LABEL": "Màu chủ đề cổng thông tin",
                    "HELP_TEXT": "Màu này sẽ hiển thị dưới dạng màu chủ đề cho cổng thông tin."
                },
                "PAGE_TITLE": {
                    "LABEL": "Tiêu đề trang",
                    "PLACEHOLDER": "Tiêu đề trang cổng thông tin",
                    "HELP_TEXT": "Tiêu đề trang sẽ được sử dụng trong cổng công khai.",
                    "ERROR": "Phải có Tiêu đề trang"
                },
                "HEADER_TEXT": {
                    "LABEL": "Văn bản tiêu đề",
                    "PLACEHOLDER": "Văn bản tiêu đề cổng thông tin",
                    "HELP_TEXT": "Văn bản tiêu đề Cổng thông tin sẽ được sử dụng trong cổng thông tin công khai.",
                    "ERROR": "Phải có Văn bản tiêu đề cổng"
                },
                "API": {
                    "SUCCESS_MESSAGE_FOR_BASIC": "Cổng thông tin được tạo thành công.",
                    "ERROR_MESSAGE_FOR_BASIC": "Không thể tạo cổng. Thử lại.",
                    "SUCCESS_MESSAGE_FOR_UPDATE": "Cổng thông tin được cập nhật thành công.",
                    "ERROR_MESSAGE_FOR_UPDATE": "Không thể cập nhật cổng. Thử lại."
                }
            },
            "ADD_LOCALE": {
                "TITLE": "Thêm ngôn ngữ",
                "SUB_TITLE": "Việc này sẽ thêm một ngôn ngữ mới vào danh sách của bạn.",
                "PORTAL": "Cổng",
                "LOCALE": {
                    "LABEL": "Ngôn ngữ",
                    "PLACEHOLDER": "Chọn một ngôn ngữ",
                    "ERROR": "Ngôn ngữ là bắt buộc"
                },
                "BUTTONS": {
                    "CREATE": "Tạo ngôn ngữ",
                    "CANCEL": "Huỷ"
                },
                "API": {
                    "SUCCESS_MESSAGE": "Ngôn ngữ được thêm thành công",
                    "ERROR_MESSAGE": "Không thể thêm ngôn ngữ. Vui lòng thử lại."
                }
            },
            "CHANGE_DEFAULT_LOCALE": {
                "API": {
                    "SUCCESS_MESSAGE": "Ngôn ngữ mặc định được cập nhật thành công",
                    "ERROR_MESSAGE": "Không thể thay đổi ngôn ngữ mặc định. Vui lòng thử lại."
                }
            },
            "DELETE_LOCALE": {
                "API": {
                    "SUCCESS_MESSAGE": "Ngôn ngữ đã được gỡ bỏ thành công khỏi cổng thông tin",
                    "ERROR_MESSAGE": "Không thể gỡ ngôn ngữ khỏi cổng thông tin. Vui lòng thử lại."
                }
            },
            "DRAFT_LOCALE": {
                "API": {
                    "SUCCESS_MESSAGE": "Đã chuyển ngôn ngữ về bản nháp",
                    "ERROR_MESSAGE": "Không chuyển được ngôn ngữ về bản nháp. Bạn hãy thử lại."
                }
            },
            "PUBLISH_LOCALE": {
                "API": {
                    "SUCCESS_MESSAGE": "Đã xuất bản ngôn ngữ",
                    "ERROR_MESSAGE": "Không xuất bản được ngôn ngữ. Bạn hãy thử lại."
                }
            }
        },
        "TABLE": {
            "LOADING_MESSAGE": "Đang tải nội dung...",
            "404": "Không có bài viết nào phù hợp với tìm kiếm của bạn 🔍",
            "NO_ARTICLES": "Không có bài viết nào có sẵn",
            "HEADERS": {
                "TITLE": "Tiêu đề",
                "CATEGORY": "Loại",
                "READ_COUNT": "Lượt xem",
                "STATUS": "Trạng thái",
                "LAST_EDITED": "Sửa lần cuối"
            },
            "COLUMNS": {
                "BY": "bởi",
                "AUTHOR_NOT_AVAILABLE": "Không có thông tin tác giả"
            }
        },
        "EDIT_ARTICLE": {
            "LOADING": "Đang tải nội dung...",
            "TITLE_PLACEHOLDER": "Tiêu đề bài viết ở đây",
            "CONTENT_PLACEHOLDER": "Viết bài của bạn ở đây",
            "API": {
                "ERROR": "Lỗi khi lưu bài viết"
            }
        },
        "PUBLISH_ARTICLE": {
            "API": {
                "ERROR": "Lỗi khi xuất bản bài viết",
                "SUCCESS": "Bài viết xuất bản thành công"
            }
        },
        "ARCHIVE_ARTICLE": {
            "API": {
                "ERROR": "Lỗi khi lưu trữ bài viết",
                "SUCCESS": "Lưu trữ bài viết thành công"
            }
        },
        "DRAFT_ARTICLE": {
            "API": {
                "ERROR": "Có lỗi khi chuyển bài viết về nháp",
                "SUCCESS": "Đã chuyển bài viết về nháp"
            }
        },
        "DELETE_ARTICLE": {
            "MODAL": {
                "CONFIRM": {
                    "TITLE": "Xác nhận xoá",
                    "MESSAGE": "Bạn có chắc chắn xóa bài viết?",
                    "YES": "Có, Xoá",
                    "NO": "Không, Giữ"
                }
            },
            "API": {
                "SUCCESS_MESSAGE": "Đã xóa bài viết thành công",
                "ERROR_MESSAGE": "Lỗi khi xóa bài viết"
            }
        },
        "REORDER_ARTICLE": {
            "API": {
                "ERROR_MESSAGE": "Không sắp xếp lại được bài viết. Bạn hãy thử lại."
            }
        },
        "REORDER_CATEGORY": {
            "API": {
                "ERROR_MESSAGE": "Không sắp xếp lại được danh mục. Bạn hãy thử lại."
            }
        },
        "CREATE_ARTICLE": {
            "ERROR_MESSAGE": "Vui lòng thêm tiêu đề và nội dung bài viết sau đó mới có thể cập nhật cài đặt"
        },
        "SIDEBAR": {
            "SEARCH": {
                "PLACEHOLDER": "Tìm kiếm bài viết"
            }
        },
        "BREADCRUMB": {
            "ARTICLES": "Bài viết",
            "CATEGORIES": "Danh mục",
            "LOCALES": "Ngôn ngữ",
            "SETTINGS": "Cài đặt"
        },
        "CATEGORY": {
            "ADD": {
                "TITLE": "Tạo một danh mục",
                "SUB_TITLE": "Danh mục sẽ được sử dụng trong cổng thông tin công khai để phân loại các bài.",
                "PORTAL": "Cổng",
                "LOCALE": "Ngôn ngữ",
                "NAME": {
                    "LABEL": "Tên",
                    "PLACEHOLDER": "Tên danh mục",
                    "HELP_TEXT": "Tên và biểu tượng danh mục sẽ hiện trên cổng trợ giúp công khai để phân loại bài viết.",
                    "ERROR": "Tên bắt buộc có"
                },
                "SLUG": {
                    "LABEL": "Đường dẫn",
                    "PLACEHOLDER": "Danh mục slug cho url",
                    "HELP_TEXT": "yona.vn/hc/my-portal/en-US/categories/my-slug",
                    "ERROR": "Phải có Slug"
                },
                "DESCRIPTION": {
                    "LABEL": "Mô tả",
                    "PLACEHOLDER": "Đưa ra một mô tả ngắn về danh mục.",
                    "ERROR": "Mô tả bắt buộc có"
                },
                "BUTTONS": {
                    "CREATE": "Tạo danh mục",
                    "CANCEL": "Huỷ"
                },
                "API": {
                    "SUCCESS_MESSAGE": "Danh mục đã được tạo thành công",
                    "ERROR_MESSAGE": "Không thể tạo danh mục"
                }
            },
            "EDIT": {
                "TITLE": "Chỉnh sửa danh mục",
                "SUB_TITLE": "Chỉnh sửa danh mục sẽ cập nhật danh mục trong cổng thông tin công khai.",
                "PORTAL": "Cổng",
                "LOCALE": "Ngôn ngữ",
                "NAME": {
                    "LABEL": "Tên",
                    "PLACEHOLDER": "Tên danh mục",
                    "HELP_TEXT": "Tên và biểu tượng danh mục sẽ hiện trên cổng trợ giúp công khai để phân loại bài viết.",
                    "ERROR": "Tên bắt buộc có"
                },
                "SLUG": {
                    "LABEL": "Đường dẫn",
                    "PLACEHOLDER": "Danh mục slug cho url",
                    "HELP_TEXT": "yona.vn/hc/my-portal/en-US/categories/my-slug",
                    "ERROR": "Phải có Slug"
                },
                "DESCRIPTION": {
                    "LABEL": "Mô tả",
                    "PLACEHOLDER": "Đưa ra một mô tả ngắn về danh mục.",
                    "ERROR": "Mô tả bắt buộc có"
                },
                "BUTTONS": {
                    "CREATE": "Cập nhật danh mục",
                    "CANCEL": "Huỷ"
                },
                "API": {
                    "SUCCESS_MESSAGE": "Danh mục cập nhật thành công",
                    "ERROR_MESSAGE": "Không thể cập nhật danh mục"
                }
            },
            "DELETE": {
                "API": {
                    "SUCCESS_MESSAGE": "Xoá danh mục thành công",
                    "ERROR_MESSAGE": "Không thể xoá danh mục"
                }
            }
        },
        "ARTICLE_SEARCH": {
            "TITLE": "Tìm bài viết",
            "PLACEHOLDER": "Tìm bài viết",
            "NO_RESULT": "Không có bài viết nào",
            "SEARCHING": "Đang tìm kiếm...",
            "SEARCH_BUTTON": "Tìm kiếm",
            "INSERT_ARTICLE": "Chèn liên kết",
            "IFRAME_ERROR": "URL rỗng hoặc không hợp lệ. Không hiển thị được nội dung.",
            "OPEN_ARTICLE_SEARCH": "Chèn bài viết từ trung tâm trợ giúp",
            "SUCCESS_ARTICLE_INSERTED": "Đã chèn bài viết",
            "PREVIEW_LINK": "Xem trước bài viết",
            "CANCEL": "Đóng",
            "BACK": "Trở về",
            "BACK_RESULTS": "Quay lại kết quả"
        },
        "UPGRADE_PAGE": {
            "TITLE": "Trung tâm trợ giúp",
            "DESCRIPTION": "Tạo cổng tự phục vụ dễ dùng. Giúp người dùng đọc bài viết và được hỗ trợ 24/7. Hãy nâng cấp gói để bật tính năng này.",
            "SELF_HOSTED_DESCRIPTION": "Tạo cổng tự phục vụ dễ dùng. Giúp người dùng đọc bài viết và được hỗ trợ 24/7. Hãy liên hệ quản trị viên để bật tính năng này.",
            "BUTTON": {
                "LEARN_MORE": "Tìm hiểu thêm",
                "UPGRADE": "Nâng cấp"
            },
            "FEATURES": {
                "PORTALS": {
                    "TITLE": "Nhiều cổng trợ giúp",
                    "DESCRIPTION": "Tạo nhiều cổng trợ giúp cho từng sản phẩm khác nhau trên cùng một tài khoản."
                },
                "LOCALES": {
                    "TITLE": "Hỗ trợ đầy đủ đa ngôn ngữ",
                    "DESCRIPTION": "Bản địa hóa cổng trợ giúp theo ngôn ngữ của bạn. Chúng tôi hỗ trợ mọi ngôn ngữ và cho phép dịch từng bài viết."
                },
                "SEO": {
                    "TITLE": "Thiết kế thân thiện SEO",
                    "DESCRIPTION": "Tùy chỉnh thẻ meta để tăng khả năng hiện trên công cụ tìm kiếm với các trang chuẩn SEO."
                },
                "API": {
                    "TITLE": "Hỗ trợ API đầy đủ",
                    "DESCRIPTION": "Dùng cổng trợ giúp như một CMS headless, ghép với framework giao diện bên thứ ba qua API của chúng tôi."
                }
            }
        },
        "LOADING": "Đang tải...",
        "ARTICLES_PAGE": {
            "ARTICLE_CARD": {
                "CARD": {
                    "VIEWS": "{count} lượt xem | {count} lượt xem",
                    "DROPDOWN_MENU": {
                        "PUBLISH": "Phát hành",
                        "DRAFT": "Nháp",
                        "ARCHIVE": "Lưu trữ",
                        "TRANSLATE": "Dịch",
                        "DELETE": "Xoá"
                    },
                    "STATUS": {
                        "DRAFT": "Nháp",
                        "PUBLISHED": "Đã phát hành",
                        "ARCHIVED": "Đã lưu trữ"
                    },
                    "PENDING_EDITS": "Sửa đổi chưa xuất bản",
                    "PENDING_EDITS_TOOLTIP": "Bài viết đã xuất bản này còn sửa đổi chưa xuất bản",
                    "CATEGORY": {
                        "UNCATEGORISED": "Chưa phân loại"
                    }
                }
            },
            "ARTICLES_HEADER": {
                "TABS": {
                    "ALL": "Tất cả bài viết",
                    "MINE": "Của tôi",
                    "DRAFT": "Nháp",
                    "PUBLISHED": "Đã phát hành",
                    "ARCHIVED": "Đã lưu trữ"
                },
                "CATEGORY": {
                    "ALL": "Tất cả danh mục"
                },
                "LOCALE": {
                    "ALL": "Tất cả ngôn ngữ"
                },
                "SEARCH_PLACEHOLDER": "Tìm bài viết...",
                "NEW_ARTICLE": "Bài viết mới"
            },
            "EMPTY_STATE": {
                "ALL": {
                    "TITLE": "Viết một bài",
                    "SUBTITLE": "Viết một bài thật chi tiết, bắt đầu thôi!",
                    "BUTTON_LABEL": "Bài viết mới"
                },
                "MINE": {
                    "TITLE": "Bạn chưa viết bài nào ở đây",
                    "SUBTITLE": "Mọi bài viết do bạn viết sẽ hiện ở đây cho dễ tìm."
                },
                "DRAFT": {
                    "TITLE": "Chưa có bài viết nháp nào",
                    "SUBTITLE": "Bài viết nháp sẽ hiện ở đây"
                },
                "PUBLISHED": {
                    "TITLE": "Chưa có bài viết nào được xuất bản",
                    "SUBTITLE": "Bài viết đã xuất bản sẽ hiện ở đây"
                },
                "ARCHIVED": {
                    "TITLE": "Kho lưu trữ chưa có bài viết nào",
                    "SUBTITLE": "Bài viết đã lưu trữ không hiện trên cổng trợ giúp, bạn có thể dùng để đánh dấu trang cũ hoặc lỗi thời"
                },
                "CATEGORY": {
                    "TITLE": "Danh mục này chưa có bài viết nào",
                    "SUBTITLE": "Bài viết thuộc danh mục này sẽ hiện ở đây"
                },
                "SEARCH": {
                    "TITLE": "Không có bài viết nào khớp",
                    "SUBTITLE": "Chúng tôi không tìm thấy bài viết nào khớp với từ khóa. Hãy thử từ khác."
                }
            },
            "BULK_TRANSLATE": {
                "TITLE": "Dịch bài viết | Dịch {count} bài viết",
                "DESCRIPTION": "Dịch bài viết đã chọn sang ngôn ngữ khác. | Dịch các bài viết đã chọn sang ngôn ngữ khác.",
                "LOCALE_LABEL": "Ngôn ngữ đích",
                "LOCALE_PLACEHOLDER": "Chọn một ngôn ngữ",
                "CATEGORY_LABEL": "Danh mục đích",
                "CATEGORY_PLACEHOLDER": "Chọn một danh mục",
                "OPTIONAL": "(tùy chọn)",
                "CONFIRM": "Dịch",
                "SELECT_ALL": "Chọn tất cả ({count})",
                "SELECTED_COUNT": "Đã chọn {count}",
                "CLEAR_SELECTION": "Bỏ chọn",
                "TRANSLATE_BUTTON": "Dịch",
                "CONFIRM_OVERWRITE": "Ghi đè và dịch",
                "DUPLICATE_WARNING": "Bài viết này đã có bản dịch ở ngôn ngữ đã chọn. | Đã có bản dịch của {count} bài viết ở ngôn ngữ đã chọn.",
                "DUPLICATE_CONFIRM_HINT": "Bấm dịch lần nữa để ghi đè bản dịch hiện có.",
                "API": {
                    "SUCCESS_MESSAGE": "Đang dịch. Bài viết sẽ hiện dưới dạng nháp khi xong.",
                    "ERROR_MESSAGE": "Không bắt đầu được việc dịch. Bạn hãy thử lại."
                }
            },
            "BULK_ACTIONS": {
                "PUBLISH": "Phát hành",
                "DRAFT": "Nháp",
                "ARCHIVE": "Lưu trữ",
                "TRANSLATE": "Dịch",
                "MOVE_TO_CATEGORY": "Loại",
                "DELETE": "Xoá",
                "STATUS_SUCCESS": "Đã cập nhật bài viết",
                "STATUS_ERROR": "Cập nhật bài viết thất bại",
                "STATUS_SKIPPED": "Đã bỏ qua 1 bài viết còn sửa đổi chưa xuất bản — hãy mở bài đó để xuất bản hoặc bỏ sửa đổi. | Đã bỏ qua {count} bài viết còn sửa đổi chưa xuất bản — hãy mở từng bài để xuất bản hoặc bỏ sửa đổi.",
                "STATUS_SKIPPED_ALL": "Những bài viết này còn sửa đổi chưa xuất bản — hãy mở từng bài để xuất bản hoặc bỏ sửa đổi.",
                "CATEGORY_SUCCESS": "Đã chuyển bài viết",
                "CATEGORY_ERROR": "Chuyển bài viết thất bại",
                "DELETE_CONFIRM_TITLE": "Xóa bài viết | Xóa {count} bài viết",
                "DELETE_CONFIRM_DESCRIPTION": "Thao tác này sẽ xóa vĩnh viễn bài viết đã chọn. Không thể hoàn tác. | Thao tác này sẽ xóa vĩnh viễn {count} bài viết đã chọn. Không thể hoàn tác.",
                "DELETE_CONFIRM": "Xoá",
                "DELETE_SUCCESS": "Đã xóa bài viết",
                "DELETE_ERROR": "Xóa bài viết thất bại"
            }
        },
        "CATEGORY_PAGE": {
            "CATEGORY_HEADER": {
                "NEW_CATEGORY": "Tạo danh mục",
                "EDIT_CATEGORY": "Sửa danh mục",
                "SEARCH_PLACEHOLDER": "Tìm danh mục...",
                "CATEGORIES_COUNT": "{n} danh mục | {n} danh mục",
                "BREADCRUMB": {
                    "CATEGORY_LOCALE": "Danh mục ({localeCode})",
                    "ACTIVE_CATEGORY": "{categoryName} ({categoryCount} bài viết) | {categoryName} ({categoryCount} bài viết)"
                }
            },
            "CATEGORY_EMPTY_STATE": {
                "TITLE": "Không tìm thấy danh mục nào",
                "SUBTITLE": "Danh mục sẽ hiện ở đây. Bạn có thể thêm danh mục bằng nút \"Danh mục mới\"."
            },
            "SEARCH_EMPTY_STATE": {
                "TITLE": "Không có danh mục nào khớp",
                "SUBTITLE": "Chúng tôi không tìm thấy danh mục nào khớp với từ khóa. Hãy thử từ khác."
            },
            "CATEGORY_CARD": {
                "ARTICLES_COUNT": "{count} bài viết | {count} bài viết"
            },
            "CATEGORY_DIALOG": {
                "CREATE": {
                    "API": {
                        "SUCCESS_MESSAGE": "Danh mục đã được tạo thành công",
                        "ERROR_MESSAGE": "Không thể tạo danh mục"
                    }
                },
                "EDIT": {
                    "API": {
                        "SUCCESS_MESSAGE": "Danh mục cập nhật thành công",
                        "ERROR_MESSAGE": "Không thể cập nhật danh mục"
                    }
                },
                "DELETE": {
                    "API": {
                        "SUCCESS_MESSAGE": "Xoá danh mục thành công",
                        "ERROR_MESSAGE": "Không thể xoá danh mục"
                    }
                },
                "HEADER": {
                    "CREATE": "Tạo danh mục",
                    "EDIT": "Sửa danh mục",
                    "DESCRIPTION": "Chỉnh sửa danh mục sẽ cập nhật danh mục trong cổng thông tin công khai.",
                    "PORTAL": "Cổng",
                    "LOCALE": "Ngôn ngữ"
                },
                "FORM": {
                    "NAME": {
                        "LABEL": "Tên",
                        "PLACEHOLDER": "Tên danh mục",
                        "ERROR": "Tên bắt buộc có"
                    },
                    "SLUG": {
                        "LABEL": "Đường dẫn",
                        "PLACEHOLDER": "Danh mục slug cho url",
                        "ERROR": "Phải có Slug",
                        "HELP_TEXT": "yona.vn/hc/{portalSlug}/{localeCode}/categories/{categorySlug}"
                    },
                    "DESCRIPTION": {
                        "LABEL": "Mô tả",
                        "PLACEHOLDER": "Đưa ra một mô tả ngắn về danh mục.",
                        "ERROR": "Mô tả bắt buộc có"
                    }
                },
                "BUTTONS": {
                    "CREATE": "Tạo",
                    "EDIT": "Cập nhật",
                    "CANCEL": "Huỷ"
                }
            }
        },
        "LOCALES_PAGE": {
            "LOCALES_COUNT": "Chưa có ngôn ngữ nào | {n} ngôn ngữ | {n} ngôn ngữ",
            "NEW_LOCALE_BUTTON_TEXT": "Ngôn ngữ mới",
            "SEARCH_PLACEHOLDER": "Tìm ngôn ngữ...",
            "SEARCH_EMPTY_STATE": {
                "TITLE": "Không có ngôn ngữ nào khớp",
                "SUBTITLE": "Chúng tôi không tìm thấy ngôn ngữ nào khớp với từ khóa. Hãy thử từ khác."
            },
            "LOCALE_CARD": {
                "ARTICLES_COUNT": "{count} bài viết | {count} bài viết",
                "CATEGORIES_COUNT": "{count} danh mục | {count} danh mục",
                "DEFAULT": "Mặc định",
                "DRAFT": "Nháp",
                "DROPDOWN_MENU": {
                    "MAKE_DEFAULT": "Đặt làm mặc định",
                    "MOVE_TO_DRAFT": "Chuyển về nháp",
                    "PUBLISH_LOCALE": "Xuất bản ngôn ngữ",
                    "CUSTOMIZE_CONTENT": "Bản địa hóa nội dung",
                    "SELECT_POPULAR_CONTENT": "Chọn nội dung nổi bật",
                    "DELETE": "Xoá"
                }
            },
            "POPULAR_CONTENT_DIALOG": {
                "TITLE": "Nội dung nổi bật",
                "DESCRIPTION": "Chọn tối đa 3 danh mục và 6 bài viết để nổi bật trên trang chủ trung tâm trợ giúp của ngôn ngữ này. Kéo thả để sắp thứ tự khách sẽ thấy.",
                "SEARCH": "Tìm kiếm...",
                "EMPTY": "Không có kết quả khớp",
                "ADD_ANOTHER": "Thêm mục nữa...",
                "SLOTS_LEFT": "Còn {count} chỗ",
                "OVERRIDING_DEFAULTS": "Đang ghi đè mặc định cho ngôn ngữ này",
                "CONFIRM": "Lưu nội dung nổi bật",
                "CATEGORIES": {
                    "LABEL": "Danh mục nổi bật",
                    "ARTICLES_COUNT": "Chưa có bài viết | {count} bài viết | {count} bài viết"
                },
                "ARTICLES": {
                    "LABEL": "Bài viết nổi bật",
                    "IN_CATEGORY": "trong {category}",
                    "UNCATEGORIZED": "Chưa được phân loại"
                },
                "API": {
                    "SUCCESS_MESSAGE": "Đã cập nhật nội dung nổi bật",
                    "ERROR_MESSAGE": "Không cập nhật được nội dung nổi bật. Bạn hãy thử lại."
                }
            },
            "CONTENT_DIALOG": {
                "TITLE": "Bản địa hóa nội dung",
                "DESCRIPTION": "Đặt giá trị riêng cho ngôn ngữ này. Mục nào để trống sẽ lấy theo ngôn ngữ mặc định.",
                "NAME": {
                    "LABEL": "Tên"
                },
                "PAGE_TITLE": {
                    "LABEL": "Tiêu đề trang"
                },
                "HEADER_TEXT": {
                    "LABEL": "Chữ ở phần đầu trang"
                },
                "API": {
                    "SUCCESS_MESSAGE": "Đã cập nhật nội dung của ngôn ngữ",
                    "ERROR_MESSAGE": "Không cập nhật được nội dung của ngôn ngữ. Bạn hãy thử lại."
                }
            },
            "ADD_LOCALE_DIALOG": {
                "TITLE": "Thêm ngôn ngữ",
                "DESCRIPTION": "Chọn ngôn ngữ sẽ dùng để viết bài này. Ngôn ngữ đó được thêm vào danh sách bản dịch, bạn có thể thêm nữa sau.",
                "COMBOBOX": {
                    "PLACEHOLDER": "Chọn ngôn ngữ..."
                },
                "STATUS": {
                    "LABEL": "Trạng thái",
                    "OPTIONS": {
                        "LIVE": "Đã phát hành",
                        "DRAFT": "Nháp"
                    }
                },
                "API": {
                    "SUCCESS_MESSAGE": "Ngôn ngữ được thêm thành công",
                    "ERROR_MESSAGE": "Không thể thêm ngôn ngữ. Vui lòng thử lại."
                }
            }
        },
        "EDIT_ARTICLE_PAGE": {
            "HEADER": {
                "STATUS": {
                    "SAVING": "Đang lưu...",
                    "SAVED": "Đã lưu"
                },
                "PREVIEW": "Xem trước",
                "PUBLISH": "Phát hành",
                "PUBLISH_CHANGES": "Xuất bản thay đổi",
                "PUBLISH_CHANGES_SUCCESS": "Đã xuất bản thay đổi",
                "PUBLISH_CHANGES_ERROR": "Không xuất bản được thay đổi",
                "SAVE_IN_PROGRESS": "Vẫn đang lưu thay đổi mới nhất — bạn hãy thử lại sau giây lát.",
                "DISCARD_CHANGES": "Bỏ thay đổi",
                "DISCARD_CHANGES_SUCCESS": "Đã bỏ thay đổi",
                "DISCARD_CHANGES_ERROR": "Không bỏ được thay đổi",
                "PENDING_CHANGES": "Thay đổi đang chờ",
                "VIEW_CHANGES": "Xem thay đổi chưa xuất bản",
                "DRAFT": "Nháp",
                "ARCHIVE": "Lưu trữ",
                "BACK_TO_ARTICLES": "Quay lại danh sách bài viết"
            },
            "PENDING_CHANGES_POPOVER": {
                "TITLE": "Thay đổi chưa xuất bản",
                "DESCRIPTION": "Bài viết này có bản nháp chưa lên bản chính. Bạn muốn áp dụng trước khi đổi trạng thái, hay bỏ đi?",
                "APPLY": "Áp dụng thay đổi",
                "DISCARD": "Bỏ thay đổi"
            },
            "DIFF_DIALOG": {
                "TITLE": "Thay đổi chưa xuất bản",
                "DESCRIPTION": "So bản nháp của bạn với bản đang chạy.",
                "TITLE_LABEL": "Tiêu đề"
            },
            "EDIT_ARTICLE": {
                "MORE_PROPERTIES": "Thêm thuộc tính",
                "UNCATEGORIZED": "Chưa được phân loại",
                "EDITOR_PLACEHOLDER": "Viết nội dung tại đây. Gõ \"/\" để mở tùy chọn định dạng."
            },
            "ARTICLE_PROPERTIES": {
                "ARTICLE_PROPERTIES": "Thuộc tính bài viết",
                "META_DESCRIPTION": "Mô tả meta",
                "META_DESCRIPTION_PLACEHOLDER": "Thêm mô tả meta",
                "META_TITLE": "Tiêu đề meta",
                "META_TITLE_PLACEHOLDER": "Thêm tiêu đề meta",
                "META_TAGS": "Các thẻ meta",
                "META_TAGS_PLACEHOLDER": "Thêm thẻ meta"
            },
            "API": {
                "ERROR": "Lỗi khi lưu bài viết"
            }
        },
        "PORTAL_SWITCHER": {
            "NEW_PORTAL": "Cổng trợ giúp mới",
            "PORTALS": "Cổng",
            "CREATE_PORTAL": "Tạo và quản lý nhiều cổng trợ giúp",
            "ARTICLES": "bài viết",
            "DOMAIN": "miền",
            "PORTAL_NAME": "Tên cổng"
        },
        "CREATE_PORTAL_DIALOG": {
            "TITLE": "Tạo cổng trợ giúp mới",
            "DESCRIPTION": "Đặt tên cho cổng trợ giúp và tạo một đường dẫn dễ đọc. Bạn có thể đổi cả hai trong phần cài đặt sau này.",
            "CONFIRM_BUTTON_LABEL": "Tạo",
            "NAME": {
                "LABEL": "Tên",
                "PLACEHOLDER": "Hướng dẫn sử dụng | Công ty ABC",
                "MESSAGE": "Hãy chọn tên cho cổng trợ giúp của bạn.",
                "ERROR": "Tên bắt buộc có"
            },
            "SLUG": {
                "LABEL": "Đường dẫn",
                "PLACEHOLDER": "huong-dan-su-dung",
                "ERROR": "Phải có Slug",
                "FORMAT_ERROR": "Bạn hãy nhập đường dẫn hợp lệ, ví dụ: huong-dan-su-dung"
            }
        },
        "PORTAL_SETTINGS": {
            "FORM": {
                "AVATAR": {
                    "LABEL": "Logo",
                    "IMAGE_UPLOAD_ERROR": "Không tải được ảnh lên! Bạn hãy thử lại",
                    "IMAGE_UPLOAD_SUCCESS": "Đã thêm ảnh. Hãy bấm lưu thay đổi để lưu logo",
                    "IMAGE_DELETE_SUCCESS": "Đã xóa logo",
                    "IMAGE_DELETE_ERROR": "Không xóa được logo",
                    "IMAGE_UPLOAD_SIZE_ERROR": "Kích thước ảnh phải nhỏ hơn {size}MB"
                },
                "NAME": {
                    "LABEL": "Tên",
                    "PLACEHOLDER": "Tên cổng",
                    "ERROR": "Tên bắt buộc có"
                },
                "HEADER_TEXT": {
                    "LABEL": "Chữ ở phần đầu trang",
                    "PLACEHOLDER": "Văn bản tiêu đề cổng thông tin"
                },
                "PAGE_TITLE": {
                    "LABEL": "Tiêu đề trang",
                    "PLACEHOLDER": "Tiêu đề trang cổng thông tin"
                },
                "HOME_PAGE_LINK": {
                    "LABEL": "Liên kết trang chủ",
                    "PLACEHOLDER": "Liên kế trang chủ cổng thông tin",
                    "ERROR": "Hãy nhập URL hợp lệ. Liên kết trang chủ phải bắt đầu bằng \"http://\" hoặc \"https://\"."
                },
                "SLUG": {
                    "LABEL": "Đường dẫn",
                    "PLACEHOLDER": "Đường dẫn cổng trợ giúp"
                },
                "BRAND_COLOR": {
                    "LABEL": "Màu thương hiệu"
                },
                "SAVE_CHANGES": "Lưu thay đổi"
            },
            "CONFIGURATION_FORM": {
                "CUSTOM_DOMAIN": {
                    "HEADER": "Tên miền tuỳ chỉnh",
                    "LABEL": "Tên miền tuỳ chỉnh:",
                    "DESCRIPTION": "Bạn có thể đặt cổng trợ giúp trên tên miền riêng. Ví dụ website của bạn là tencuaban.com và bạn muốn cổng trợ giúp ở docs.tencuaban.com thì chỉ cần điền vào ô này.",
                    "STATUS_DESCRIPTION": "Cổng trợ giúp riêng của bạn sẽ chạy ngay khi được xác minh.",
                    "PLACEHOLDER": "Tên miền tuỳ biến cổng",
                    "EDIT_BUTTON": "Chỉnh sửa",
                    "ADD_BUTTON": "Thêm tên miền riêng",
                    "STATUS": {
                        "LIVE": "Trực tuyến",
                        "PENDING": "Đang chờ xác minh",
                        "ERROR": "Xác minh thất bại"
                    },
                    "DIALOG": {
                        "ADD_HEADER": "Thêm tên miền riêng",
                        "EDIT_HEADER": "Sửa tên miền riêng",
                        "ADD_CONFIRM_BUTTON_LABEL": "Thêm tên miền",
                        "EDIT_CONFIRM_BUTTON_LABEL": "Cập nhật tên miền",
                        "LABEL": "Tên miền tuỳ chỉnh",
                        "PLACEHOLDER": "Tên miền tuỳ biến cổng",
                        "ERROR": "Tên miền riêng là bắt buộc",
                        "FORMAT_ERROR": "Bạn hãy nhập URL tên miền hợp lệ, ví dụ docs.tencuaban.com"
                    },
                    "DNS_CONFIGURATION_DIALOG": {
                        "HEADER": "Cấu hình DNS",
                        "DESCRIPTION": "Đăng nhập vào tài khoản ở nhà cung cấp DNS của bạn và thêm bản ghi CNAME bên dưới cho tên miền con.",
                        "COPY": "Đã chép CNAME",
                        "SEND_INSTRUCTIONS": {
                            "HEADER": "Gửi hướng dẫn",
                            "DESCRIPTION": "Nếu bạn muốn nhờ người bên đội kỹ thuật làm bước này, hãy nhập email của họ bên dưới, chúng tôi sẽ gửi hướng dẫn cần thiết.",
                            "PLACEHOLDER": "Nhập email của họ",
                            "ERROR": "Hãy nhập địa chỉ email hợp lệ",
                            "SEND_BUTTON": "Gửi"
                        }
                    }
                },
                "DELETE_PORTAL": {
                    "BUTTON": "Xóa {portalName}",
                    "HEADER": "Xóa cổng thông tin",
                    "DESCRIPTION": "Xóa vĩnh viễn cổng trợ giúp này. Không thể hoàn tác",
                    "DIALOG": {
                        "HEADER": "Bạn chắc chắn muốn xóa {portalName}?",
                        "DESCRIPTION": "Đây là thao tác vĩnh viễn, không thể hoàn tác.",
                        "CONFIRM_BUTTON_LABEL": "Xoá"
                    }
                },
                "EDIT_CONFIGURATION": "Sửa cấu hình"
            },
            "LAYOUT_CONTENT": {
                "HEADER": "Giao diện",
                "DESCRIPTION": "Chọn bố cục hợp với cách khách của bạn đọc nội dung.",
                "LAYOUT": {
                    "CLASSIC": {
                        "TITLE": "Cổ điển",
                        "DESCRIPTION": "Trang chủ thân thiện có ô tìm kiếm và các chủ đề nổi bật."
                    },
                    "SIDEBAR": {
                        "TITLE": "Tài liệu",
                        "DESCRIPTION": "Điều hướng cạnh bên, mọi hướng dẫn chỉ cách một cú bấm."
                    }
                },
                "SOCIAL_LINKS": {
                    "HEADER": "Liên kết mạng xã hội",
                    "DESCRIPTION": "Thêm tên tài khoản của từng mạng, trung tâm trợ giúp sẽ tự dựng liên kết đầy đủ. Hiện ở chân trang của bố cục tài liệu.",
                    "PLACEHOLDER": "tên tài khoản",
                    "ADD": "Thêm liên kết mạng xã hội",
                    "REMOVE": "Xoá"
                },
                "SAVE": "Lưu thay đổi"
            },
            "INTEGRATIONS": {
                "HEADER": "Tích hợp",
                "DESCRIPTION": "Kết nối các công cụ mở rộng khả năng của trung tâm trợ giúp.",
                "LIVE_CHAT": {
                    "TITLE": "Chat trực tuyến với {installationName}",
                    "DESCRIPTION": "Hiện widget chat trực tuyến trên trung tâm trợ giúp để khách hỏi ngay trong lúc đọc.",
                    "PLACEHOLDER": "Chọn widget chat trực tuyến",
                    "NONE_OPTION": "Không dùng widget"
                },
                "GTM": {
                    "TITLE": "Google Tag Manager",
                    "DESCRIPTION": "Thêm thẻ đo lường và tiếp thị bằng cách kết nối container Tag Manager của bạn.",
                    "PLACEHOLDER": "GTM-XXXXXXX",
                    "HELP": "Tìm mã này trong workspace Google Tag Manager của bạn. Để trống là tắt.",
                    "INVALID": "Hãy nhập container ID hợp lệ, ví dụ GTM-XXXXXXX."
                },
                "GA4": {
                    "TITLE": "Google Analytics 4",
                    "DESCRIPTION": "Đo lưu lượng và hành vi khách trên trung tâm trợ giúp bằng Google Analytics.",
                    "PLACEHOLDER": "G-XXXXXXXXXX",
                    "HELP": "Tìm measurement ID trong mục Admin → Data streams của Google Analytics. Để trống là tắt.",
                    "INVALID": "Hãy nhập measurement ID hợp lệ, ví dụ G-XXXXXXXXXX."
                },
                "HOTJAR": {
                    "TITLE": "Hotjar",
                    "DESCRIPTION": "Hiểu cách khách dùng trung tâm trợ giúp qua bản đồ nhiệt và bản ghi phiên.",
                    "PLACEHOLDER": "1234567",
                    "HELP": "Tìm site ID trong mục Sites & organizations của Hotjar. Để trống là tắt.",
                    "INVALID": "Hãy nhập Hotjar site ID dạng số."
                },
                "PLAUSIBLE": {
                    "TITLE": "Plausible",
                    "DESCRIPTION": "Theo dõi lưu lượng trung tâm trợ giúp bằng Plausible Analytics, thân thiện quyền riêng tư.",
                    "PLACEHOLDER": "example.com",
                    "HELP": "Nhập tên miền đã cấu hình trong phần cài đặt site của Plausible. Để trống là tắt.",
                    "INVALID": "Hãy nhập tên miền hợp lệ, ví dụ example.com."
                },
                "AMPLITUDE": {
                    "TITLE": "Amplitude",
                    "DESCRIPTION": "Phân tích hành vi khách trên trung tâm trợ giúp bằng Amplitude.",
                    "PLACEHOLDER": "0123456789abcdef0123456789abcdef",
                    "HELP": "Tìm API key trong phần cài đặt dự án Amplitude. Để trống là tắt.",
                    "INVALID": "Hãy nhập Amplitude API key hợp lệ."
                },
                "CLARITY": {
                    "TITLE": "Microsoft Clarity",
                    "DESCRIPTION": "Ghi bản đồ nhiệt và bản ghi phiên bằng Microsoft Clarity.",
                    "PLACEHOLDER": "abcd1234ef",
                    "HELP": "Tìm project ID trong phần cài đặt dự án Clarity. Để trống là tắt.",
                    "INVALID": "Hãy nhập Clarity project ID hợp lệ."
                },
                "META_PIXEL": {
                    "TITLE": "Meta Pixel",
                    "DESCRIPTION": "Đo chuyển đổi quảng cáo và dựng tệp khách hàng từ lượt xem trung tâm trợ giúp bằng Meta Pixel.",
                    "PLACEHOLDER": "123456789012345",
                    "HELP": "Tìm pixel ID trong Meta Events Manager. Để trống là tắt.",
                    "INVALID": "Hãy nhập pixel ID dạng số."
                },
                "SAVE": "Lưu thay đổi"
            },
            "NAV": {
                "GENERAL": "Chung",
                "DOMAIN": "Miền",
                "APPEARANCE": "Giao diện",
                "INTEGRATIONS": "Tích hợp"
            },
            "API": {
                "CREATE_PORTAL": {
                    "SUCCESS_MESSAGE": "Cổng thông tin được tạo thành công",
                    "ERROR_MESSAGE": "Không tạo được cổng trợ giúp"
                },
                "UPDATE_PORTAL": {
                    "SUCCESS_MESSAGE": "Cổng thông tin được cập nhật thành công",
                    "ERROR_MESSAGE": "Không cập nhật được cổng trợ giúp"
                }
            }
        },
        "PDF_UPLOAD": {
            "TITLE": "Tải lên tài liệu PDF",
            "DESCRIPTION": "Tải lên tài liệu PDF để AI tự sinh câu hỏi thường gặp",
            "DRAG_DROP_TEXT": "Kéo thả tệp PDF vào đây, hoặc bấm để chọn",
            "SELECT_FILE": "Chọn tệp PDF",
            "ADDITIONAL_CONTEXT_LABEL": "Bối cảnh thêm (không bắt buộc)",
            "ADDITIONAL_CONTEXT_PLACEHOLDER": "Nhập thêm bối cảnh hoặc yêu cầu cho việc sinh câu hỏi thường gặp...",
            "UPLOADING": "Đang tải lên...",
            "UPLOAD": "Tải lên và xử lý",
            "CANCEL": "Huỷ",
            "ERROR_INVALID_TYPE": "Bạn hãy chọn một tệp PDF hợp lệ",
            "ERROR_FILE_TOO_LARGE": "Tệp phải nhỏ hơn 512MB",
            "ERROR_UPLOAD_FAILED": "Tải PDF lên thất bại. Bạn hãy thử lại."
        },
        "PDF_DOCUMENTS": {
            "TITLE": "Tài liệu PDF",
            "DESCRIPTION": "Quản lý các tài liệu PDF đã tải lên và sinh câu hỏi thường gặp từ đó",
            "UPLOAD_PDF": "Tải PDF lên",
            "UPLOAD_FIRST_PDF": "Tải lên tệp PDF đầu tiên",
            "UPLOADED_BY": "Người tải lên",
            "GENERATE_FAQS": "Sinh câu hỏi thường gặp",
            "GENERATING": "Đang sinh...",
            "CONFIRM_DELETE": "Bạn chắc chắn muốn xóa {filename}?",
            "EMPTY_STATE": {
                "TITLE": "Chưa có tài liệu PDF nào",
                "DESCRIPTION": "Tải tài liệu PDF lên để AI tự sinh câu hỏi thường gặp"
            },
            "STATUS": {
                "UPLOADED": "Sẵn sàng",
                "PROCESSING": "Đang xử lý",
                "PROCESSED": "Hoàn tất",
                "FAILED": "Thất bại"
            }
        },
        "CONTENT_GENERATION": {
            "TITLE": "Sinh nội dung",
            "DESCRIPTION": "Tải tài liệu PDF lên để AI tự sinh nội dung câu hỏi thường gặp",
            "UPLOAD_TITLE": "Tải lên tài liệu PDF",
            "DRAG_DROP": "Kéo thả tệp PDF vào đây, hoặc bấm để chọn",
            "SELECT_FILE": "Chọn tệp PDF",
            "UPLOADING": "Đang xử lý tài liệu...",
            "UPLOAD_SUCCESS": "Đã xử lý xong tài liệu!",
            "UPLOAD_ERROR": "Tải tài liệu lên thất bại. Bạn hãy thử lại.",
            "INVALID_FILE_TYPE": "Bạn hãy chọn một tệp PDF hợp lệ",
            "FILE_TOO_LARGE": "Tệp phải nhỏ hơn 512MB",
            "GENERATED_CONTENT": "Nội dung câu hỏi thường gặp đã sinh",
            "PUBLISH_SELECTED": "Xuất bản mục đã chọn",
            "PUBLISHING": "Đang xuất bản...",
            "FROM_DOCUMENT": "Từ tài liệu",
            "NO_CONTENT": "Chưa có nội dung nào được sinh. Hãy tải lên một tài liệu PDF để bắt đầu.",
            "LOADING": "Đang tải nội dung đã sinh..."
        }
    },
    "INBOX": {
        "LIST": {
            "TITLE": "Thông báo",
            "DISPLAY_DROPDOWN": "Hiển thị",
            "LOADING": "Tải thông báo",
            "404": "Không có thông báo nào đang hoạt động trong nhóm này.",
            "NO_NOTIFICATIONS": "Không có thông báo",
            "NOTE": "Thông báo từ tất cả các hộp thư đã đăng ký",
            "NO_MESSAGES_AVAILABLE": "Ối! Không thể tải tin nhắn",
            "SNOOZED_UNTIL": "Đã tạm ẩn cho đến khi",
            "SNOOZED_UNTIL_TOMORROW": "Tạm dừng đến ngày mai",
            "SNOOZED_UNTIL_NEXT_WEEK": "Tạm dừng đến tuần sau"
        },
        "ACTION_HEADER": {
            "SNOOZE": "Tạm dừng đến ngày mai",
            "DELETE": "Tạm dừng đến tuần sau",
            "BACK": "Trở về"
        },
        "TYPES": {
            "CONVERSATION_MENTION": "Bạn đã được nhắc đến trong một hội thoại",
            "CONVERSATION_CREATION": "Có hội thoại mới",
            "CONVERSATION_ASSIGNMENT": "Một hội thoại được giao cho bạn",
            "ASSIGNED_CONVERSATION_NEW_MESSAGE": "Có tin nhắn mới trong hội thoại bạn phụ trách",
            "PARTICIPATING_CONVERSATION_NEW_MESSAGE": "Có tin nhắn mới trong hội thoại bạn tham gia",
            "SLA_MISSED_FIRST_RESPONSE": "Hội thoại trễ SLA phản hồi đầu tiên",
            "SLA_MISSED_NEXT_RESPONSE": "Hội thoại trễ SLA phản hồi kế tiếp",
            "SLA_MISSED_RESOLUTION": "Hội thoại trễ SLA xử lý xong"
        },
        "TYPES_NEXT": {
            "CONVERSATION_MENTION": "Được nhắc tên",
            "CONVERSATION_ASSIGNMENT": "Giao cho bạn",
            "CONVERSATION_CREATION": "Hội thoại mới",
            "SLA_MISSED_FIRST_RESPONSE": "Trễ SLA",
            "SLA_MISSED_NEXT_RESPONSE": "Trễ SLA",
            "SLA_MISSED_RESOLUTION": "Trễ SLA",
            "PARTICIPATING_CONVERSATION_NEW_MESSAGE": "Tin nhắn mới",
            "ASSIGNED_CONVERSATION_NEW_MESSAGE": "Tin nhắn mới",
            "SNOOZED_UNTIL": "Tạm ẩn {time}",
            "SNOOZED_ENDS": "Đã hết thời gian tạm ẩn"
        },
        "NO_CONTENT": "Không có nội dung",
        "MENU_ITEM": {
            "MARK_AS_READ": "Đánh dấu đã đọc",
            "MARK_AS_UNREAD": "Đánh dấu là chưa đọc",
            "SNOOZE": "Báo lại",
            "DELETE": "Xoá",
            "MARK_ALL_READ": "Đánh dấu tất cả đã đọc",
            "DELETE_ALL": "Xóa tất cả",
            "DELETE_ALL_READ": "Xóa hết mục đã đọc"
        },
        "DISPLAY_MENU": {
            "SORT": "Sắp xếp",
            "DISPLAY": "Hiển thị :",
            "SORT_OPTIONS": {
                "NEWEST": "Mới nhất",
                "OLDEST": "Cũ nhất",
                "PRIORITY": "Mức độ ưu tiên"
            },
            "DISPLAY_OPTIONS": {
                "SNOOZED": "Tạm dừng",
                "READ": "Đọc",
                "LABELS": "Nhãn",
                "CONVERSATION_ID": "ID hội thoại"
            }
        },
        "ALERTS": {
            "MARK_AS_READ": "Đã đánh dấu thông báo là đã đọc",
            "MARK_AS_UNREAD": "Đã đánh dấu thông báo là chưa đọc",
            "SNOOZE": "Đã tạm ẩn thông báo",
            "DELETE": "Đã xóa thông báo",
            "MARK_ALL_READ": "Đã đánh dấu tất cả thông báo là đã đọc",
            "DELETE_ALL": "Đã xóa tất cả thông báo",
            "DELETE_ALL_READ": "Đã xóa mọi thông báo đã đọc"
        },
        "BELL": {
            "OPEN_LABEL": "Thông báo, {count} chưa đọc",
            "EMPTY": "Chưa có thông báo nào",
            "VIEW_ALL": "Xem tất cả thông báo",
            "TAB_UNREAD": "Chưa đọc",
            "TAB_ALL": "Tất cả",
            "EMPTY_UNREAD": "Đã đọc hết thông báo"
        }
    },
    "INBOX_MGMT": {
        "HEADER": "Hộp thư",
        "DESCRIPTION": "Kênh là cách khách hàng chọn để liên lạc với bạn. Hộp thư là nơi bạn xử lý mọi trao đổi của một kênh, có thể gồm tin nhắn từ nhiều nguồn như email, chat trực tuyến và mạng xã hội.",
        "LEARN_MORE": "Tìm hiểu thêm về hộp thư",
        "COUNT": "{n} hộp thư | {n} hộp thư",
        "SEARCH_PLACEHOLDER": "Tìm hộp thư...",
        "NO_RESULTS": "Không tìm thấy hộp thư nào khớp",
        "RECONNECTION_REQUIRED": "Hộp thư của bạn đã mất kết nối. Bạn sẽ không nhận được tin nhắn mới cho tới khi cấp quyền lại.",
        "CLICK_TO_RECONNECT": "Bấm vào đây để kết nối lại.",
        "WHATSAPP_REGISTRATION_INCOMPLETE": "Đăng ký WhatsApp Business của bạn chưa hoàn tất. Hãy kiểm tra trạng thái tên hiển thị trong Meta Business Manager rồi kết nối lại.",
        "COMPLETE_REGISTRATION": "Hoàn tất đăng ký",
        "LIST": {
            "404": "Không có hộp thư nào được đính kèm với tài khoản này."
        },
        "CREATE_FLOW": {
            "CHANNEL": {
                "TITLE": "Chọn kênh",
                "BODY": "Chọn nhà cung cấp bạn muốn tích hợp với {installationName}."
            },
            "INBOX": {
                "TITLE": "Tạo Hộp thư",
                "BODY": "Xác thực tài khoản của bạn và tạo hộp thư."
            },
            "AGENT": {
                "TITLE": "Thêm nhân viên",
                "BODY": "Thêm nhân viên vào hộp thư đã tạo."
            },
            "FINISH": {
                "TITLE": "Xong rồi!",
                "BODY": "Bạn đã sẵn sàng để đi!"
            }
        },
        "ADD": {
            "CHANNEL_NAME": {
                "LABEL": "Tên hộp thư",
                "PLACEHOLDER": "Nhập tên kênh của bạn (ví dụ: WebA)",
                "ERROR": "Vui lòng nhập tên kênh hợp lệ"
            },
            "WEBSITE_NAME": {
                "LABEL": "Tên hiện trên widget",
                "PLACEHOLDER": "Ví dụ: Shop Hoa Mai"
            },
            "FB": {
                "CONNECT_YOUR_FACEBOOK_PAGE": "Kết nối Fanpage Facebook",
                "CONTINUE_WITH_FACEBOOK": "Tiếp tục với Facebook",
                "HELP": "{installationName} chỉ truy cập tin nhắn của Trang bạn chọn, không bao giờ đọc tin nhắn cá nhân của bạn.",
                "CHOOSE_PAGE": "Chọn trang",
                "CHOOSE_PLACEHOLDER": "Chọn một trang từ danh sách",
                "INBOX_NAME": "Tên hộp thư",
                "ADD_NAME": "Thêm tên cho hộp thư của bạn",
                "PICK_NAME": "Đặt tên cho hộp thư của bạn",
                "PICK_A_VALUE": "Chọn một giá trị",
                "CREATE_INBOX": "Tạo Hộp thư",
                "RESTRICTED_WARNING": "Tạm thời chưa tạo được hộp thư Facebook do sự cố ở tầng API phía Meta, không phải lỗi của {installationName}. Chúng tôi đang phối hợp chặt với Meta để xử lý sớm nhất.",
                "STATUS_LINK": "Xem cập nhật tình trạng"
            },
            "INSTAGRAM": {
                "CONTINUE_WITH_INSTAGRAM": "Tiếp tục với Instagram",
                "CONNECT_YOUR_INSTAGRAM_PROFILE": "Kết nối trang Instagram của bạn",
                "HELP": "Để thêm trang Instagram làm kênh, bạn cần xác thực trang Instagram bằng cách bấm \"Tiếp tục với Instagram\" ",
                "ERROR_MESSAGE": "Có lỗi khi kết nối Instagram, bạn hãy thử lại",
                "ERROR_AUTH": "Có lỗi khi kết nối Instagram, bạn hãy thử lại",
                "NEW_INBOX_SUGGESTION": "Tài khoản Instagram này trước đây thuộc một hộp thư khác và vừa được chuyển sang đây. Mọi tin nhắn mới sẽ hiện ở đây. Hộp thư cũ sẽ không gửi hay nhận tin cho tài khoản này nữa.",
                "DUPLICATE_INBOX_BANNER": "Tài khoản Instagram này đã chuyển sang hộp thư kênh Instagram mới. Bạn không thể gửi/nhận tin nhắn Instagram từ hộp thư này nữa.",
                "RESTRICTED_WARNING": "Tạm thời chưa tạo được hộp thư Instagram do sự cố ở tầng API phía Meta, không phải lỗi của {installationName}. Chúng tôi đang phối hợp chặt với Meta để xử lý sớm nhất.",
                "SETTINGS_RESTRICTED_WARNING": "Nhắn tin Instagram đang bị ảnh hưởng bởi sự cố ở tầng API phía Meta, không phải lỗi của {installationName}. Một số tin nhắn hoặc thao tác có thể chậm hoặc không dùng được. Chúng tôi đang phối hợp chặt với Meta để xử lý sớm nhất.",
                "STATUS_LINK": "Xem cập nhật tình trạng"
            },
            "TIKTOK": {
                "CONTINUE_WITH_TIKTOK": "Tiếp tục với TikTok",
                "CONNECT_YOUR_TIKTOK_PROFILE": "Kết nối trang TikTok của bạn",
                "HELP": "Để thêm trang TikTok làm kênh, bạn cần xác thực trang TikTok bằng cách bấm \"Tiếp tục với TikTok\" ",
                "ERROR_MESSAGE": "Có lỗi khi kết nối TikTok, bạn hãy thử lại",
                "ERROR_AUTH": "Có lỗi khi kết nối TikTok, bạn hãy thử lại",
                "NORTH_AMERICA_WARNING": "Kết nối TikTok cho tài khoản khu vực Bắc Mỹ tạm thời chưa dùng được, chúng tôi đang chờ phản hồi từ đội ngũ TikTok."
            },
            "TWITTER": {
                "HELP": "Để thêm hồ sơ Twitter của bạn làm kênh, bạn cần xác thực Hồ sơ Twitter của mình bằng cách nhấp vào 'Đăng nhập bằng Twitter",
                "ERROR_MESSAGE": "Đã xảy ra lỗi khi kết nối đến Twitter, vui lòng thử lại",
                "TWEETS": {
                    "ENABLE": "Tạo hội thoại từ các dòng Tweet được nhắn đến"
                }
            },
            "WEBSITE_CHANNEL": {
                "TITLE": "Kênh trang web",
                "DESC": "Gắn widget chat lên website để khách nhắn tin với bạn ngay trên trang.",
                "LOADING_MESSAGE": "Tạo kênh hỗ trợ trang web",
                "CHANNEL_AVATAR": {
                    "LABEL": "Hình đại diện kênh"
                },
                "CHANNEL_WEBHOOK_URL": {
                    "LABEL": "URL webhook",
                    "PLACEHOLDER": "Bạn hãy nhập URL webhook",
                    "ERROR": "Vui lòng nhập một URL hợp lệ"
                },
                "CHANNEL_WEBHOOK_SECRET": {
                    "LABEL": "Khóa bí mật webhook",
                    "COPY": "Chép khóa bí mật",
                    "COPY_SUCCESS": "Đã chép khóa bí mật",
                    "TOGGLE": "Ẩn/hiện khóa bí mật",
                    "RESET_SUCCESS": "Đã tạo lại khóa bí mật webhook",
                    "RESET_ERROR": "Không tạo lại được khóa bí mật webhook. Bạn hãy thử lại"
                },
                "CHANNEL_DOMAIN": {
                    "LABEL": "Domain trang web",
                    "PLACEHOLDER": "Nhập tên miền trang web của bạn (ví dụ: acme.com)"
                },
                "CHANNEL_WELCOME_TITLE": {
                    "LABEL": "Tiêu đề chào mừng",
                    "PLACEHOLDER": "Chào bạn!",
                    "HELP_TEXT": "Dòng chữ lớn khách thấy trên widget khi chưa nhắn tin nào."
                },
                "CHANNEL_WELCOME_TAGLINE": {
                    "LABEL": "Dòng giới thiệu chào mừng",
                    "PLACEHOLDER": "Bạn cần gì cứ nhắn cho chúng tôi nhé.",
                    "HELP_TEXT": "Hiện ngay dưới tiêu đề chào mừng, dạng văn bản thường."
                },
                "CHANNEL_GREETING_MESSAGE": {
                    "LABEL": "Tin nhắn chào tự động",
                    "PLACEHOLDER": "Chào bạn! Chúng tôi đã nhận tin nhắn và sẽ trả lời sớm."
                },
                "CHANNEL_GREETING_TOGGLE": {
                    "LABEL": "Bật tin nhắn chào tự động",
                    "HELP_TEXT": "Tự động gửi tin nhắn chào khi khách nhắn tin đầu tiên.",
                    "ENABLED": "Bật",
                    "DISABLED": "Không bật"
                },
                "REPLY_TIME": {
                    "TITLE": "Thời gian phản hồi",
                    "IN_A_FEW_MINUTES": "Trong vài phút",
                    "IN_A_FEW_HOURS": "Trong vài giờ",
                    "IN_A_DAY": "Trong một ngày",
                    "HELP_TEXT": "Hiện ở dòng trạng thái đầu widget, cho khách biết thường bao lâu thì được trả lời."
                },
                "WIDGET_COLOR": {
                    "LABEL": "Màu widget",
                    "PLACEHOLDER": "Màu chủ đạo của widget"
                },
                "SUBMIT_BUTTON": "Tạo hộp thư",
                "API": {
                    "ERROR_MESSAGE": "Chúng tôi không thể tạo kênh trang web, vui lòng thử lại"
                }
            },
            "TWILIO": {
                "TITLE": "Kênh Twilio SMS/WhatsApp",
                "DESC": "Tích hợp Twilio và bắt đầu hỗ trợ khách hàng của bạn qua SMS hoặc WhatsApp.",
                "ACCOUNT_SID": {
                    "LABEL": "Tài khoản SID",
                    "PLACEHOLDER": "Vui lòng nhập SID tài khoản Twilio của bạn",
                    "ERROR": "Trường này là bắt buộc"
                },
                "API_KEY": {
                    "USE_API_KEY": "Xác thực bằng API Key",
                    "LABEL": "API Key SID",
                    "PLACEHOLDER": "Bạn hãy nhập API Key SID",
                    "ERROR": "Trường này là bắt buộc"
                },
                "API_KEY_SECRET": {
                    "LABEL": "API Key Secret",
                    "PLACEHOLDER": "Bạn hãy nhập API Key Secret",
                    "ERROR": "Trường này là bắt buộc"
                },
                "MESSAGING_SERVICE_SID": {
                    "LABEL": "Dịch vụ nhắn tin SID",
                    "PLACEHOLDER": "Vui lòng nhập SID của dịch vụ nhắn tin Twilio của bạn",
                    "ERROR": "Trường này là bắt buộc",
                    "USE_MESSAGING_SERVICE": "Sử dụng dịch vụ nhắn tin Twilio"
                },
                "CHANNEL_TYPE": {
                    "LABEL": "Loại kênh",
                    "ERROR": "Vui lòng chọn loại kênh của bạn"
                },
                "AUTH_TOKEN": {
                    "LABEL": "Token xác thực",
                    "PLACEHOLDER": "Vui lòng nhập Twilio Auth Token",
                    "ERROR": "Trường này là bắt buộc"
                },
                "CHANNEL_NAME": {
                    "LABEL": "Tên hộp thư",
                    "PLACEHOLDER": "Vui lòng điền tên hộp thư",
                    "ERROR": "Trường này là bắt buộc"
                },
                "PHONE_NUMBER": {
                    "LABEL": "Số điện thoại",
                    "PLACEHOLDER": "Vui lòng nhập số điện thoại mà tin nhắn sẽ được gửi.",
                    "ERROR": "Vui lòng cung cấp số điện thoại hợp lệ bắt đầu bằng dấu `+` và không chứa bất kỳ dấu cách nào."
                },
                "API_CALLBACK": {
                    "TITLE": "URL gọi lại",
                    "SUBTITLE": "Bạn phải định cấu hình URL gọi lại tin nhắn trong Twilio với URL được đề cập ở đây."
                },
                "SUBMIT_BUTTON": "Tạo kênh Twilio",
                "API": {
                    "ERROR_MESSAGE": "Chúng tôi không thể xác thực thông tin đăng nhập Twilio, vui lòng thử lại"
                }
            },
            "SMS": {
                "TITLE": "Kênh SMS",
                "DESC": "Bắt đầu hỗ trợ khách hàng thông qua SMS.",
                "PROVIDERS": {
                    "LABEL": "Nhân viên API",
                    "TWILIO": "Twilio",
                    "BANDWIDTH": "Bandwidth"
                },
                "API": {
                    "ERROR_MESSAGE": "Chúng tôi không thể lưu kênh SMS"
                },
                "BANDWIDTH": {
                    "ACCOUNT_ID": {
                        "LABEL": "ID Tài khoản",
                        "PLACEHOLDER": "Vui lòng nhập ID Tài khoản Bandwidth",
                        "ERROR": "Trường này là bắt buộc"
                    },
                    "API_KEY": {
                        "LABEL": "Khóa API",
                        "PLACEHOLDER": "Bạn hãy nhập API Key của Bandwidth",
                        "ERROR": "Trường này là bắt buộc"
                    },
                    "API_SECRET": {
                        "LABEL": "Bí mật API",
                        "PLACEHOLDER": "Bạn hãy nhập API Secret của Bandwidth",
                        "ERROR": "Trường này là bắt buộc"
                    },
                    "APPLICATION_ID": {
                        "LABEL": "ID ứng dụng",
                        "PLACEHOLDER": "Vui lòng nhập ID Ứng dụng Bandwidth",
                        "ERROR": "Trường này là bắt buộc"
                    },
                    "INBOX_NAME": {
                        "LABEL": "Tên hộp thư",
                        "PLACEHOLDER": "Vui lòng điền tên kênh",
                        "ERROR": "Trường này là bắt buộc"
                    },
                    "PHONE_NUMBER": {
                        "LABEL": "Số Điện Thoại",
                        "PLACEHOLDER": "Vui lòng nhập số điện thoại mà tin nhắn sẽ được gửi.",
                        "ERROR": "Vui lòng cung cấp số điện thoại hợp lệ bắt đầu bằng dấu `+` và không chứa bất kỳ dấu cách nào."
                    },
                    "SUBMIT_BUTTON": "Tạo kênh Bandwidth",
                    "API": {
                        "ERROR_MESSAGE": "Chúng tôi không thể xác thực chứng chỉ Bandwidth, vui lòng thử lại"
                    },
                    "API_CALLBACK": {
                        "TITLE": "URL gọi lại",
                        "SUBTITLE": "Bạn phải cấu hình tin nhắn URL gọi lại trong Bandwith với URL đã được đề cập ở đây."
                    }
                }
            },
            "WHATSAPP": {
                "TITLE": "Kênh WhatsApp",
                "DESC": "Bắt đầu hỗ trợ khách hàng thông qua WhatsApp.",
                "PROVIDERS": {
                    "LABEL": "Nhân viên API",
                    "WHATSAPP_EMBEDDED": "WhatsApp Business",
                    "TWILIO": "Twilio",
                    "WHATSAPP_CLOUD": "Đám mây WhatsApp",
                    "WHATSAPP_CLOUD_DESC": "Cài đặt nhanh qua Meta",
                    "WHATSAPP_CLOUD_MANUAL_SETUP_DESC": "Cài đặt thủ công bằng thông tin Cloud API",
                    "TWILIO_DESC": "Kết nối qua thông tin Twilio",
                    "360_DIALOG": "360Dialog"
                },
                "SELECT_PROVIDER": {
                    "TITLE": "Chọn nhà cung cấp API",
                    "DESCRIPTION": "Chọn nhà cung cấp WhatsApp của bạn. Bạn có thể kết nối thẳng qua Meta mà không cần cấu hình gì, hoặc kết nối qua Twilio bằng thông tin tài khoản Twilio.",
                    "RESTRICTION_DESCRIPTION": "Chọn nhà cung cấp WhatsApp của bạn. Bạn có thể kết nối WhatsApp Cloud thủ công bằng thông tin Cloud API, hoặc kết nối qua Twilio bằng thông tin tài khoản Twilio."
                },
                "INBOX_NAME": {
                    "LABEL": "Tên hộp thư",
                    "PLACEHOLDER": "Vui lòng điền tên kênh",
                    "ERROR": "Trường này là bắt buộc"
                },
                "PHONE_NUMBER": {
                    "LABEL": "Số Điện Thoại",
                    "PLACEHOLDER": "Vui lòng nhập số điện thoại mà tin nhắn sẽ được gửi.",
                    "ERROR": "Vui lòng cung cấp số điện thoại hợp lệ bắt đầu bằng dấu `+` và không chứa bất kỳ dấu cách nào."
                },
                "PHONE_NUMBER_ID": {
                    "LABEL": "ID số điện thoại",
                    "PLACEHOLDER": "Vui lòng nhập ID số điện thoại lấy được từ trang tổng quan nhà phát triển Facebook.",
                    "ERROR": "Vui lòng điền giá trị hợp lệ."
                },
                "BUSINESS_ACCOUNT_ID": {
                    "LABEL": "ID tài khoản doanh nghiệp",
                    "PLACEHOLDER": "Vui lòng nhập ID tài khoản doanh nghiệp có được từ trang tổng quan dành cho nhà phát triển Facebook.",
                    "ERROR": "Vui lòng điền giá trị hợp lệ."
                },
                "WEBHOOK_VERIFY_TOKEN": {
                    "LABEL": "Token xác thực Webhook",
                    "PLACEHOLDER": "Nhập mã xác minh (verify token) bạn muốn cấu hình cho webhook của Facebook.",
                    "ERROR": "Vui lòng điền giá trị hợp lệ."
                },
                "API_KEY": {
                    "LABEL": "Khóa API",
                    "SUBTITLE": "Cấu hình Khóa API WhatsApp.",
                    "PLACEHOLDER": "Khóa API",
                    "ERROR": "Vui lòng điền giá trị hợp lệ."
                },
                "API_CALLBACK": {
                    "TITLE": "URL gọi lại",
                    "SUBTITLE": "Bạn phải định cấu hình URL webhook và mã xác minh trong cổng Nhà phát triển của Facebook với các giá trị được hiển thị bên dưới.",
                    "WEBHOOK_URL": "URL webhook",
                    "WEBHOOK_VERIFICATION_TOKEN": "Mã xác minh Webhook"
                },
                "SUBMIT_BUTTON": "Tạo kênh WhatsApp",
                "EMBEDDED_SIGNUP": {
                    "TITLE": "Cài đặt nhanh với Meta",
                    "DESC": "Dùng cài đặt nhanh với Meta để kết nối số mới hoặc số sẵn có trong ứng dụng WhatsApp Business. Bạn sẽ được chuyển sang Meta để đăng nhập tài khoản WhatsApp Business. Có quyền quản trị sẽ giúp quá trình cài đặt trôi chảy hơn.",
                    "BENEFITS": {
                        "TITLE": "Lợi ích của Embedded Signup:",
                        "EASY_SETUP": "Không phải cấu hình thủ công",
                        "SECURE_AUTH": "Xác thực an toàn theo chuẩn OAuth",
                        "AUTO_CONFIG": "Tự động cấu hình webhook và số điện thoại"
                    },
                    "LEARN_MORE": {
                        "TEXT": "Xem thêm về cài đặt nhanh, giá và giới hạn tại {link}.",
                        "LINK_TEXT": "liên kết này"
                    },
                    "SUBMIT_BUTTON": "Kết nối với WhatsApp Business",
                    "AUTH_PROCESSING": "Đang xác thực với Meta",
                    "WAITING_FOR_BUSINESS_INFO": "Hãy hoàn tất phần thiết lập doanh nghiệp trong cửa sổ Meta...",
                    "PROCESSING": "Đang thiết lập tài khoản WhatsApp Business của bạn",
                    "ENABLING_CALLING": "Đang bật tính năng gọi WhatsApp cho số của bạn…",
                    "LOADING_SDK": "Đang tải Facebook SDK...",
                    "CANCELLED": "Đã hủy đăng ký WhatsApp",
                    "SUCCESS_TITLE": "Đã kết nối tài khoản WhatsApp Business!",
                    "WAITING_FOR_AUTH": "Đang chờ xác thực...",
                    "INVALID_BUSINESS_DATA": "Dữ liệu doanh nghiệp nhận từ Facebook không hợp lệ. Bạn hãy thử lại.",
                    "SIGNUP_ERROR": "Có lỗi trong lúc đăng ký",
                    "AUTH_NOT_COMPLETED": "Chưa xác thực xong. Bạn hãy bắt đầu lại.",
                    "SUCCESS_FALLBACK": "Đã cấu hình xong tài khoản WhatsApp Business",
                    "MANUAL_FALLBACK": "Nếu số của bạn đã kết nối WhatsApp Business Platform (API), hoặc bạn là nhà cung cấp kỹ thuật đang tự kết nối số của mình, hãy dùng luồng {link}",
                    "MANUAL_LINK_TEXT": "cài đặt thủ công",
                    "ACCESS_REQUEST": {
                        "TITLE": "Cài đặt nhanh với Meta",
                        "DESCRIPTION": "Kết nối số mới hoặc số sẵn có trong ứng dụng WhatsApp Business mà không cần cấu hình thủ công. Để xin dùng tùy chọn này, hãy cho đội ngũ của chúng tôi biết doanh nghiệp bạn làm gì, bạn sẽ dùng WhatsApp thế nào và tài khoản {installationName} nào cần được mở.",
                        "FOOTNOTE": "Chúng tôi sẽ xem xét yêu cầu và báo lại xem có bật được tùy chọn này không. Bạn cũng có thể tiếp tục cài đặt thủ công bên dưới.",
                        "BUTTON": "Gửi yêu cầu"
                    },
                    "RESTRICTED_WARNING": "Tạm thời chưa dùng được WhatsApp Embedded Signup do sự cố ở tầng API phía Meta, không phải lỗi của {installationName}. Bạn có thể cài đặt thủ công cho các số Cloud API đủ điều kiện. Chúng tôi đang phối hợp chặt với Meta để xử lý sớm nhất.",
                    "STATUS_LINK": "Xem cập nhật tình trạng",
                    "CALLING_ENABLE_FAILED": "Hộp thư WhatsApp của bạn đã sẵn sàng, nhưng chưa bật được cuộc gọi thoại — số này chưa đăng ký WhatsApp Business Calling API. Hãy liên hệ Meta hoặc nhà cung cấp giải pháp WhatsApp Business để đăng ký, rồi bật cuộc gọi trong phần cài đặt Cuộc gọi của hộp thư."
                },
                "API": {
                    "ERROR_MESSAGE": "Chúng tôi không thể lưu kênh WhatsApp",
                    "MANUAL_RESTRICTION_WARNING": "Tạm thời chưa dùng được WhatsApp Embedded Signup do sự cố ở tầng API phía Meta, không phải lỗi của {installationName}. Cài đặt thủ công chỉ chạy với số đã kết nối WhatsApp Cloud API. Luồng này chưa hỗ trợ số đang dùng chung với ứng dụng WhatsApp Business. Chúng tôi đang phối hợp chặt với Meta để xử lý sớm nhất. Cảm ơn bạn đã kiên nhẫn.",
                    "STATUS_LINK": "Xem cập nhật tình trạng"
                }
            },
            "VOICE": {
                "TITLE": "Kênh thoại",
                "DESC": "Kết nối Twilio Voice để bắt đầu hỗ trợ khách hàng qua điện thoại.",
                "PHONE_NUMBER": {
                    "LABEL": "Số điện thoại",
                    "PLACEHOLDER": "Nhập số điện thoại của bạn (ví dụ: +84912345678)",
                    "ERROR": "Bạn hãy nhập số điện thoại hợp lệ theo chuẩn E.164 (ví dụ: +84912345678)"
                },
                "TWILIO": {
                    "ACCOUNT_SID": {
                        "LABEL": "Tài khoản SID",
                        "PLACEHOLDER": "Nhập Twilio Account SID của bạn",
                        "REQUIRED": "Account SID là bắt buộc"
                    },
                    "AUTH_TOKEN": {
                        "LABEL": "Token xác thực",
                        "PLACEHOLDER": "Nhập Twilio Auth Token của bạn",
                        "REQUIRED": "Auth Token là bắt buộc"
                    },
                    "API_KEY_SID": {
                        "LABEL": "API Key SID",
                        "PLACEHOLDER": "Nhập Twilio API Key SID của bạn",
                        "REQUIRED": "API Key SID là bắt buộc"
                    },
                    "API_KEY_SECRET": {
                        "LABEL": "API Key Secret",
                        "PLACEHOLDER": "Nhập Twilio API Key Secret của bạn",
                        "REQUIRED": "API Key Secret là bắt buộc"
                    }
                },
                "CONFIGURATION": {
                    "TWILIO_VOICE_URL_TITLE": "URL Twilio Voice",
                    "TWILIO_VOICE_URL_SUBTITLE": "Đặt URL này làm Voice URL cho số điện thoại Twilio và TwiML App của bạn.",
                    "TWILIO_STATUS_URL_TITLE": "URL Status Callback của Twilio",
                    "TWILIO_STATUS_URL_SUBTITLE": "Đặt URL này làm Status Callback URL cho số điện thoại Twilio của bạn."
                },
                "SUBMIT_BUTTON": "Tạo kênh thoại",
                "API": {
                    "ERROR_MESSAGE": "Chưa tạo được kênh thoại"
                }
            },
            "API_CHANNEL": {
                "TITLE": "Kênh API",
                "DESC": "Tích hợp với kênh API và bắt đầu hỗ trợ khách hàng của bạn.",
                "CHANNEL_NAME": {
                    "LABEL": "Tên Kênh",
                    "PLACEHOLDER": "Vui lòng nhập tên kênh",
                    "ERROR": "Trường này là bắt buộc"
                },
                "WEBHOOK_URL": {
                    "LABEL": "URL webhook",
                    "SUBTITLE": "Cấu hình URL bạn muốn nhận callback khi có sự kiện.",
                    "PLACEHOLDER": "URL webhook"
                },
                "SUBMIT_BUTTON": "Tạo kênh API",
                "API": {
                    "ERROR_MESSAGE": "Chúng tôi không thể lưu kênh api"
                }
            },
            "EMAIL_CHANNEL": {
                "TITLE": "Kênh Email",
                "DESC": "Kết nối hộp thư email của bạn.",
                "CHANNEL_NAME": {
                    "LABEL": "Tên kênh",
                    "PLACEHOLDER": "Vui lòng nhập tên kênh",
                    "ERROR": "Trường này là bắt buộc"
                },
                "EMAIL": {
                    "LABEL": "Email",
                    "SUBTITLE": "Điền địa chỉ email mà khách hàng gửi yêu cầu hỗ trợ tới.",
                    "PLACEHOLDER": "Email"
                },
                "SUBMIT_BUTTON": "Tạo kênh Email",
                "API": {
                    "ERROR_MESSAGE": "Chúng tôi không thể lưu kênh email"
                },
                "FINISH_MESSAGE": "Bắt đầu chuyển tiếp email của bạn tới địa chỉ email sau.",
                "FINISH_MESSAGE_NO_FORWARDING": "Đã tạo xong hộp thư email! Bạn cần cấu hình thông tin SMTP và IMAP để gửi và nhận thư. Thiếu các thiết lập này thì hệ thống không xử lý được thư nào.",
                "FORWARDING_ADDRESS_LABEL": "Chuyển tiếp thư tới địa chỉ này:",
                "CONFIGURE_SMTP_IMAP_LINK": "Click vào đây",
                "CONFIGURE_SMTP_IMAP_TEXT": " để cấu hình IMAP và SMTP"
            },
            "LINE_CHANNEL": {
                "TITLE": "Kênh LINE",
                "DESC": "Tích hợp với kênh LINE và bắt đầu hỗ trợ khách hàng của bạn.",
                "CHANNEL_NAME": {
                    "LABEL": "Tên Kênh",
                    "PLACEHOLDER": "Vui lòng nhập tên kênh",
                    "ERROR": "Trường này là bắt buộc"
                },
                "LINE_CHANNEL_ID": {
                    "LABEL": "ID Kênh LINE",
                    "PLACEHOLDER": "ID Kênh LINE"
                },
                "LINE_CHANNEL_SECRET": {
                    "LABEL": "Bí mật Kênh LINE",
                    "PLACEHOLDER": "Bí mật Kênh LINE"
                },
                "LINE_CHANNEL_TOKEN": {
                    "LABEL": "Token Kênh LINE",
                    "PLACEHOLDER": "Token Kênh LINE"
                },
                "SUBMIT_BUTTON": "Tạo Kênh LINE",
                "API": {
                    "ERROR_MESSAGE": "Chúng tôi không thể lưu kênh LINE"
                },
                "API_CALLBACK": {
                    "TITLE": "URL gọi lại",
                    "SUBTITLE": "Bạn phải cấu hình webhook URL trong ứng dụng LINE với URL được nhắc đến ở đây."
                }
            },
            "ZALO_CHANNEL": {
                "TITLE": "Tài khoản Zalo cá nhân",
                "DESC": "Kết nối một tài khoản Zalo cá nhân. Đăng nhập một lần bằng mã QR, mọi hội thoại sẽ đổ về hộp thư này.",
                "CHANNEL_NAME": {
                    "LABEL": "Tên hộp thư",
                    "PLACEHOLDER": "Nhập tên hộp thư (ví dụ: Zalo cửa hàng)",
                    "ERROR": "Bạn hãy nhập tên hộp thư hợp lệ"
                },
                "SUBMIT_BUTTON": "Tạo kênh Zalo",
                "API": {
                    "ERROR_MESSAGE": "Chưa tạo được kênh Zalo, bạn hãy thử lại"
                },
                "QR": {
                    "TITLE": "Đăng nhập bằng mã QR",
                    "DESC": "Mở Zalo trên điện thoại, vào phần quét mã QR rồi quét mã bên dưới.",
                    "STARTING": "Đang mở phiên đăng nhập…",
                    "WAITING": "Đang tạo mã QR…",
                    "SCANNED": "Đã quét mã QR. Đang hoàn tất kết nối…",
                    "CONFIRMING": "Đang hoàn tất kết nối…",
                    "REFRESHING": "Mã QR đã hết hạn. Đang tạo mã mới…",
                    "EXPIRES_IN": "Mã còn hiệu lực {seconds} giây",
                    "BOUND_ACCOUNT": "Hộp thư này đang gắn tài khoản: {name}",
                    "CONNECTED": "Đã kết nối. Đang chuyển trang…",
                    "RETRY": "Hiện mã QR mới",
                    "BRIDGE_DOWN": "Kết nối Zalo đang tạm gián đoạn. Vui lòng thử lại sau ít phút, nếu vẫn lỗi hãy liên hệ hỗ trợ.",
                    "EXPIRED": "Mã QR đã hết hạn trước khi được quét.",
                    "MISMATCH": "Mã QR này thuộc về một tài khoản Zalo khác. Hãy quét đúng tài khoản đang kết nối với hộp thư này."
                }
            },
            "TELEGRAM_CHANNEL": {
                "TITLE": "Kênh Telegram",
                "DESC": "Tích hợp với kênh Telegram và bắt đầu hỗ trợ khách hàng của bạn.",
                "BOT_TOKEN": {
                    "LABEL": "Token Bot",
                    "SUBTITLE": "Cấu hình token bot mà bạn đã nhận được từ Telegram BotFather.",
                    "PLACEHOLDER": "Token Bot"
                },
                "SUBMIT_BUTTON": "Tạo Kênh Telegram",
                "API": {
                    "ERROR_MESSAGE": "Chúng tôi không thể lưu kênh telegram"
                }
            },
            "AUTH": {
                "TITLE": "Chọn kênh",
                "DESC": "{installationName} hỗ trợ widget chat trên website, Facebook Messenger, hồ sơ Twitter, WhatsApp, Email, v. v., dưới dạng các kênh. Nếu bạn muốn xây dựng một kênh tùy chỉnh, bạn có thể tạo kênh này bằng cách sử dụng kênh API. Để bắt đầu, hãy chọn một trong các kênh bên dưới.",
                "TITLE_NEXT": "Hoàn tất thiết lập",
                "TITLE_FINISH": "Xong rồi!",
                "CHANNEL": {
                    "WEBSITE": {
                        "TITLE": "Website",
                        "DESCRIPTION": "Tạo widget chat trực tuyến"
                    },
                    "FACEBOOK": {
                        "TITLE": "Facebook",
                        "DESCRIPTION": "Kết nối trang Facebook của bạn"
                    },
                    "WHATSAPP": {
                        "TITLE": "WhatsApp",
                        "DESCRIPTION": "Hỗ trợ khách hàng trên WhatsApp"
                    },
                    "WHATSAPP_CALL": {
                        "TITLE": "Cuộc gọi WhatsApp",
                        "DESCRIPTION": "Nhận cuộc gọi thoại trên số WhatsApp của bạn"
                    },
                    "EMAIL": {
                        "TITLE": "Email",
                        "DESCRIPTION": "Kết nối Gmail hoặc Google Workspace bằng tài khoản Google"
                    },
                    "SMS": {
                        "TITLE": "SMS",
                        "DESCRIPTION": "Kết nối kênh SMS qua Twilio hoặc Bandwidth"
                    },
                    "API": {
                        "TITLE": "API",
                        "DESCRIPTION": "Tạo kênh riêng bằng API của chúng tôi"
                    },
                    "TELEGRAM": {
                        "TITLE": "Telegram",
                        "DESCRIPTION": "Cấu hình kênh Telegram bằng Bot token"
                    },
                    "LINE": {
                        "TITLE": "Line",
                        "DESCRIPTION": "Kết nối kênh Line của bạn"
                    },
                    "INSTAGRAM": {
                        "TITLE": "Instagram",
                        "DESCRIPTION": "Kết nối tài khoản Instagram của bạn"
                    },
                    "TIKTOK": {
                        "TITLE": "TikTok",
                        "DESCRIPTION": "Kết nối tài khoản TikTok của bạn"
                    },
                    "VOICE": {
                        "TITLE": "Thoại",
                        "DESCRIPTION": "Kết nối với Twilio Voice"
                    },
                    "ZALO": {
                        "TITLE": "Zalo",
                        "DESCRIPTION": "Kết nối tài khoản Zalo cá nhân bằng mã QR"
                    }
                }
            },
            "AGENTS": {
                "TITLE": "Nhân viên",
                "DESC": "Tại đây bạn có thể thêm nhân viên để quản lý hộp thư mới tạo của mình. Chỉ những nhân viên được chọn này mới có quyền truy cập vào hộp thư của bạn. Các nhân viên không thuộc hộp thư này sẽ không thể xem hoặc trả lời thư trong hộp thư này khi họ đăng nhập. <br> <b>PS:</b> Với tư cách là quản trị viên, nếu bạn cần quyền truy cập vào tất cả các hộp thư, bạn nên thêm mình làm nhân viên cho tất cả các hộp thư mà bạn tạo.",
                "VALIDATION_ERROR": "Hãy thêm ít nhất một nhân viên vào hộp thư mới",
                "PICK_AGENTS": "Chọn nhân viên cho hộp thư"
            },
            "DETAILS": {
                "TITLE": "Chi tiết Hộp thư",
                "DESC": "Từ menu thả xuống bên dưới, chọn Trang Facebook bạn muốn kết nối với {installationName}. Bạn cũng có thể đặt tên tùy chỉnh cho hộp thư của mình để nhận dạng tốt hơn."
            },
            "FINISH": {
                "TITLE": "Đúng rồi!",
                "DESC": "Bạn đã tích hợp thành công Trang Facebook của mình với {installationName}. Lần tới khi khách hàng nhắn tin cho Trang của bạn, hội thoại sẽ tự động xuất hiện trong hộp thư của bạn.<br>Chúng tôi cũng đang cung cấp cho bạn tập lệnh widget mà bạn có thể dễ dàng thêm vào trang web của mình. Khi điều này xuất hiện trên trang web của bạn, khách hàng có thể nhắn tin cho bạn ngay từ trang web của bạn mà không cần sự trợ giúp của bất kỳ công cụ bên ngoài nào và hội thoại sẽ xuất hiện ngay tại đây, trên {installationName}.<br>Cool, huh? Well :)"
            },
            "EMAIL_PROVIDER": {
                "TITLE": "Chọn nhà cung cấp email",
                "DESCRIPTION": "Chọn nhà cung cấp email trong danh sách bên dưới. Nếu không thấy nhà cung cấp của bạn, hãy chọn mục nhà cung cấp khác rồi điền thông tin IMAP và SMTP."
            },
            "MICROSOFT": {
                "TITLE": "Email Microsoft",
                "DESCRIPTION": "Bấm nút Đăng nhập bằng Microsoft để bắt đầu. Bạn sẽ được chuyển tới trang đăng nhập email. Sau khi đồng ý các quyền được hỏi, bạn sẽ quay lại bước tạo hộp thư.",
                "EMAIL_PLACEHOLDER": "Nhập địa chỉ email",
                "SIGN_IN": "Đăng nhập bằng Microsoft",
                "ERROR_MESSAGE": "Có lỗi khi kết nối Microsoft, bạn hãy thử lại"
            },
            "GOOGLE": {
                "TITLE": "Email Google",
                "DESCRIPTION": "Bấm nút Đăng nhập bằng Google để bắt đầu. Bạn sẽ được chuyển tới trang đăng nhập email. Sau khi đồng ý các quyền được hỏi, bạn sẽ quay lại bước tạo hộp thư.",
                "SIGN_IN": "Đăng nhập bằng Google",
                "EMAIL_PLACEHOLDER": "Nhập địa chỉ email",
                "ERROR_MESSAGE": "Có lỗi khi kết nối Google, bạn hãy thử lại"
            }
        },
        "DETAILS": {
            "LOADING_FB": "Xác thực bạn bằng Facebook...",
            "ERROR_FB_LOADING": "Lỗi khi tải Facebook SDK. Hãy tắt các tiện ích chặn quảng cáo rồi thử lại bằng trình duyệt khác.",
            "ERROR_FB_AUTH": "Đã xảy ra sự cố, Vui lòng làm mới trang...",
            "ERROR_FB_UNAUTHORIZED": "Bạn không có quyền làm việc này. ",
            "ERROR_FB_UNAUTHORIZED_HELP": "Hãy chắc chắn bạn có toàn quyền với trang Facebook đó. Xem thêm về các vai trò của Facebook <a href=\" https://www.facebook.com/help/187316341316631\">tại đây</a>.",
            "ERROR_CHANNEL_CREATION": "Chưa tạo được hộp thư. Bạn hãy thử lại.",
            "CREATING_CHANNEL": "Tạo Hộp thư của bạn...",
            "TITLE": "Cấu hình chi tiết hộp thư",
            "DESC": ""
        },
        "AGENTS": {
            "BUTTON_TEXT": "Thêm nhân viên",
            "ADD_AGENTS": "Đang thêm nhân viên vào hộp thư của bạn..."
        },
        "FINISH": {
            "TITLE": "Hộp thư của bạn đã sẵn sàng!",
            "MESSAGE": "Giờ đây, bạn có thể tương tác với khách hàng thông qua Kênh mới của mình. Chúc vui vẻ ủng hộ",
            "BUTTON_TEXT": "Đưa tôi tới đó",
            "MORE_SETTINGS": "Nhiều tuỳ chọn hơn",
            "WEBSITE_SUCCESS": "Bạn đã hoàn thành việc tạo kênh trang web thành công. Sao chép mã được hiển thị bên dưới và dán vào trang web của bạn. Lần tới khi khách hàng sử dụng hội thoại trực tiếp, hội thoại sẽ tự động xuất hiện trong hộp thư của bạn.",
            "WHATSAPP_QR_INSTRUCTION": "Quét mã QR bên trên để thử nhanh hộp thư WhatsApp của bạn",
            "MESSENGER_QR_INSTRUCTION": "Quét mã QR bên trên để thử nhanh hộp thư Facebook Messenger của bạn",
            "TELEGRAM_QR_INSTRUCTION": "Quét mã QR bên trên để thử nhanh hộp thư Telegram của bạn"
        },
        "ZALO_SESSION": {
            "LOST": "Phiên Zalo của hộp thư này đã kết thúc. Bạn sẽ không nhận hay gửi được tin nhắn cho tới khi đăng nhập lại.",
            "RECONNECT": "Quét lại mã QR",
            "WAITING": "Hộp thư này đang chờ quét mã QR Zalo.",
            "CONNECT": "Quét mã QR",
            "CONNECTED_AS": "Đang kết nối với {name}",
            "DISCONNECTED": "Hộp thư này đã ngắt kết nối Zalo. Quét mã QR để gắn lại một tài khoản.",
            "ACCOUNT_TITLE": "Tài khoản Zalo đang kết nối",
            "ACCOUNT_UNKNOWN": "Chưa gắn tài khoản Zalo nào",
            "CONNECTED_SINCE": "Kết nối từ {time}",
            "DISCONNECT": "Ngắt kết nối Zalo",
            "DISCONNECT_CONFIRM": "Ngắt kết nối tài khoản Zalo này? Hộp thư sẽ ngừng nhận tin cho tới khi bạn quét lại mã QR.",
            "DISCONNECT_DONE": "Đã ngắt kết nối tài khoản Zalo.",
            "DISCONNECT_BRIDGE_DOWN": "Đã ngắt trong Yona, nhưng kết nối Zalo chưa phản hồi — phiên bên Zalo có thể còn sống thêm ít phút.",
            "SWITCH_ACCOUNT": "Gắn tài khoản khác",
            "STATE": {
                "CONNECTED": "Đang kết nối",
                "SESSION_LOST": "Mất phiên",
                "QR_WAITING": "Đang chờ quét mã QR",
                "DISCONNECTED": "Đã ngắt kết nối"
            },
            "BRIDGE": {
                "LABEL": "Kết nối Zalo",
                "OK": "Bình thường",
                "DEGRADED": "Có lỗi ({count} lượt)",
                "HALF_OPEN": "Đang thử lại",
                "OPEN": "Tạm dừng sau {count} lỗi, thử lại lúc {time}"
            },
            "ERRORS": {
                "BRIDGE_UNREACHABLE": "Kết nối Zalo đang tạm gián đoạn. Vui lòng thử lại sau ít phút, nếu vẫn lỗi hãy liên hệ hỗ trợ.",
                "BRIDGE_REJECTED": "Kết nối Zalo chưa xử lý được yêu cầu. Vui lòng thử lại, nếu vẫn lỗi hãy liên hệ hỗ trợ.",
                "NO_QR_SESSION": "Chưa có phiên quét mã QR nào đang mở. Hãy mở phiên mới.",
                "ACCOUNT_MISMATCH": "Mã QR vừa quét thuộc tài khoản Zalo khác. Hộp thư này đang gắn tài khoản {name}.",
                "ACCOUNT_IN_USE": "Tài khoản Zalo đó đã gắn vào hộp thư \"{inbox}\". Một tài khoản chỉ phục vụ được một hộp thư.",
                "SESSION_CAP_REACHED": "Máy chủ Zalo đang phục vụ tối đa {max} tài khoản cùng lúc. Vui lòng thử lại sau ít phút."
            }
        },
        "REAUTH": "Ủy quyền lại",
        "VIEW": "Xem",
        "EDIT": {
            "API": {
                "SUCCESS_MESSAGE": "Đã cập nhật cài đặt hộp thư thành công",
                "AUTO_ASSIGNMENT_SUCCESS_MESSAGE": "Đã lưu thiết lập tự động phân công",
                "ERROR_MESSAGE": "Chúng tôi không thể cập nhật cài đặt hộp thư. Vui lòng thử lại sau."
            },
            "EMAIL_COLLECT_BOX": {
                "ENABLED": "Bật",
                "DISABLED": "Không bật"
            },
            "ENABLE_CSAT": {
                "ENABLED": "Bật",
                "DISABLED": "Không bật"
            },
            "SENDER_NAME_SECTION": {
                "TITLE": "Tên người gửi",
                "SUB_TEXT": "Chọn tên hiện với khách hàng khi họ nhận thư từ nhân viên của bạn.",
                "FOR_EG": "For eg:",
                "FRIENDLY": {
                    "TITLE": "Thân thiện",
                    "FROM": "từ",
                    "SUBTITLE": "Thêm tên nhân viên đã trả lời vào tên người gửi cho thân thiện hơn."
                },
                "PROFESSIONAL": {
                    "TITLE": "Chuyên nghiệp",
                    "SUBTITLE": "Chỉ dùng tên doanh nghiệp đã cấu hình làm tên người gửi trong phần đầu thư."
                },
                "BUSINESS_NAME": {
                    "BUTTON_TEXT": "Đặt tên doanh nghiệp của bạn",
                    "PLACEHOLDER": "Nhập tên doanh nghiệp của bạn",
                    "SAVE_BUTTON_TEXT": "Lưu"
                }
            },
            "ALLOW_MESSAGES_AFTER_RESOLVED": {
                "ENABLED": "Bật",
                "DISABLED": "Không bật"
            },
            "ENABLE_CONTINUITY_VIA_EMAIL": {
                "ENABLED": "Bật",
                "DISABLED": "Không bật"
            },
            "LOCK_TO_SINGLE_CONVERSATION": {
                "ENABLED": "Mở lại hội thoại cũ",
                "DISABLED": "Tạo hội thoại mới",
                "ENABLED_DESCRIPTION": "Khi liên hệ nhắn lại, hội thoại trước đó sẽ được mở lại.",
                "DISABLED_DESCRIPTION": "Mỗi lần hội thoại trước đã kết thúc, hệ thống sẽ tạo hội thoại mới."
            },
            "ENABLE_HMAC": {
                "LABEL": "Bật"
            }
        },
        "DELETE": {
            "BUTTON_TEXT": "Xoá",
            "AVATAR_DELETE_BUTTON_TEXT": "Xoá hình đại diện",
            "CONFIRM": {
                "TITLE": "Xác nhận xoá",
                "MESSAGE": "Bạn có muốn xoá? ",
                "PLACE_HOLDER": "Vui lòng điền {inboxName} để xác nhận",
                "YES": "Có, Xoá ",
                "NO": "Không, Giữ "
            },
            "API": {
                "SUCCESS_MESSAGE": "Hộp thư đã được xóa thành công",
                "ERROR_MESSAGE": "Không thể xóa hộp thư. Vui lòng thử lại sau.",
                "AVATAR_SUCCESS_MESSAGE": "Hình đại diện của hộp thư đã được xoá thành công",
                "AVATAR_ERROR_MESSAGE": "Không thể xoá hình đại diện của hộp thư. Vui lòng thử lại sau."
            }
        },
        "TABS": {
            "SETTINGS": "Cài đặt",
            "COLLABORATORS": "Cộng tác viên",
            "CONFIGURATION": "Cấu hình",
            "CAMPAIGN": "Chiến dịch",
            "PRE_CHAT_FORM": "Biểu mẫu trước khi trò chuyện",
            "BUSINESS_HOURS": "Giờ làm việc",
            "WIDGET_BUILDER": "Trình tạo widget",
            "BOT_CONFIGURATION": "Cấu hình Bot",
            "ACCOUNT_HEALTH": "Sức khỏe tài khoản",
            "CSAT": "CSAT",
            "VOICE": "Thoại",
            "CALLS": "Cuộc gọi"
        },
        "VOICE_CONFIGURATION": {
            "ENABLE_VOICE": {
                "LABEL": "Bật cuộc gọi thoại",
                "DESCRIPTION": "Bật cuộc gọi thoại cho hộp thư này. Nhân viên sẽ gọi đi và nhận cuộc gọi được."
            },
            "CREDENTIALS": {
                "DESCRIPTION": "Cuộc gọi thoại cần thông tin Twilio API Key. Thông tin này dùng để sinh token cho kết nối thoại của nhân viên."
            },
            "INBOUND": {
                "LABEL": "Cho phép cuộc gọi đến",
                "DESCRIPTION": "Cho khách gọi vào số này. Khi tắt, cuộc gọi đến bị từ chối tự động — nhân viên không được báo và không tạo hội thoại. Nhân viên vẫn gọi đi được."
            }
        },
        "WHATSAPP_CALLING": {
            "ENABLE": {
                "LABEL": "Bật cuộc gọi WhatsApp",
                "DESCRIPTION": "Cho phép nhân viên nhận và gọi WhatsApp Cloud trên hộp thư này. Khách có thể gọi thẳng vào số doanh nghiệp này từ WhatsApp."
            },
            "ENABLE_FAILED": "Chưa bật được cuộc gọi thoại cho số này — số chưa đăng ký WhatsApp Business Calling API. Hãy liên hệ Meta hoặc nhà cung cấp giải pháp WhatsApp Business để đăng ký rồi thử lại.",
            "PHONE_NUMBER": {
                "LABEL": "Số điện thoại doanh nghiệp",
                "HELP_TEXT": "Số WhatsApp mà khách sẽ gọi tới."
            },
            "HOW_IT_WORKS": {
                "LABEL": "Cách hoạt động",
                "DESCRIPTION": "Cuộc gọi đi thẳng giữa trình duyệt của nhân viên và Meta — không cần thêm thông tin xác thực nào. Hãy chắc chắn trình duyệt của nhân viên đã cho phép trang này dùng micro."
            },
            "PERMISSION_REQUEST_BODY": {
                "LABEL": "Tin nhắn xin phép gọi",
                "HELP_TEXT": "Hiện với liên hệ khi họ chưa đồng ý nhận cuộc gọi. Để trống để dùng nội dung mặc định.",
                "PLACEHOLDER": "Chúng tôi muốn gọi cho bạn về hội thoại này."
            }
        },
        "CHANNEL_PREFERENCES": "Tùy chọn kênh",
        "WIDGET_FEATURES": "Tính năng của widget",
        "ACCOUNT_HEALTH": {
            "TITLE": "Quản lý tài khoản WhatsApp của bạn",
            "DESCRIPTION": "Xem tình trạng số WhatsApp, sức chứa gửi tin và thông tin doanh nghiệp Meta đã liên kết.",
            "GO_TO_SETTINGS": "Mở Meta Business Manager",
            "NO_DATA": "Chưa có dữ liệu tình trạng",
            "ERRORS": {
                "AUTHORIZATION": {
                    "EMBEDDED_TITLE": "Cần làm mới kết nối WhatsApp",
                    "EMBEDDED_DESCRIPTION": "Meta không xác thực được kết nối của hộp thư này. Hãy vào phần Cấu hình để thiết lập lại bằng Embedded Signup.",
                    "MANUAL_TITLE": "Access token WhatsApp cần được xem lại",
                    "MANUAL_DESCRIPTION": "Meta không xác thực được access token của hộp thư này. Hãy vào phần Cấu hình để kiểm tra hoặc thay token."
                },
                "GENERIC_TITLE": "Chưa lấy được dữ liệu tình trạng WhatsApp",
                "GENERIC_DESCRIPTION": "Meta không trả về thông tin tình trạng hiện tại. Hãy xem lỗi bên dưới và thử lại sau.",
                "GO_TO_CONFIGURATION": "Mở phần Cấu hình"
            },
            "SECTIONS": {
                "BUSINESS_PROFILE": "Hồ sơ doanh nghiệp",
                "PHONE_NUMBER": "Số điện thoại",
                "HEALTH_AND_CAPACITY": "Tình trạng và sức chứa",
                "BUSINESS_ACCOUNT": "Tài khoản doanh nghiệp"
            },
            "FIELDS": {
                "PROFILE_DESCRIPTION": {
                    "LABEL": "Mô tả",
                    "TOOLTIP": "Mô tả hiện với khách trong hồ sơ doanh nghiệp WhatsApp"
                },
                "PROFILE_ADDRESS": {
                    "LABEL": "Địa chỉ",
                    "TOOLTIP": "Địa chỉ doanh nghiệp hiện trong hồ sơ doanh nghiệp WhatsApp"
                },
                "PROFILE_EMAIL": {
                    "LABEL": "Email",
                    "TOOLTIP": "Email liên hệ hiện trong hồ sơ doanh nghiệp WhatsApp"
                },
                "PROFILE_WEBSITES": {
                    "LABEL": "Website",
                    "TOOLTIP": "Các liên kết website hiện trong hồ sơ doanh nghiệp WhatsApp"
                },
                "DISPLAY_PHONE_NUMBER": {
                    "LABEL": "Số điện thoại hiển thị",
                    "TOOLTIP": "Số điện thoại hiện với khách hàng"
                },
                "VERIFIED_NAME": {
                    "LABEL": "Tên hiển thị trên WhatsApp",
                    "TOOLTIP": "Tên hiển thị gắn với số điện thoại này trên WhatsApp"
                },
                "PHONE_NUMBER_ID": {
                    "LABEL": "ID số điện thoại",
                    "TOOLTIP": "Mã định danh của Meta cho số WhatsApp này"
                },
                "COEXISTENCE": {
                    "LABEL": "Dùng chung",
                    "TOOLTIP": "Số này kết nối cả ứng dụng WhatsApp Business lẫn Cloud API"
                },
                "DISPLAY_NAME_STATUS": {
                    "LABEL": "Trạng thái tên hiển thị",
                    "TOOLTIP": "Review status of the WhatsApp display name",
                    "DESCRIPTIONS": {
                        "APPROVED": "Tên hiển thị đã được duyệt và có thể xuất hiện ở đầu hội thoại WhatsApp. Nếu người nhận đã lưu tên khác cho số này thì tên đó hiện thay.",
                        "AVAILABLE_WITHOUT_REVIEW": "Tên hiển thị đã lưu vào hồ sơ WhatsApp, nhưng người nhận có thể vẫn thấy số điện thoại cho tới khi Meta xét duyệt. Meta chỉ bắt đầu xét duyệt sau khi doanh nghiệp của bạn đạt hạn mức gửi tin cao hơn.",
                        "PENDING_REVIEW": "Meta đang xét duyệt tên hiển thị. Bạn không cần làm gì trừ khi Meta hỏi thêm thông tin.",
                        "REJECTED": "Meta không duyệt tên hiển thị. Hãy xem lại hướng dẫn đặt tên rồi đổi tên hoặc khiếu nại với Meta.",
                        "DECLINED": "Meta không duyệt tên hiển thị. Hãy xem lại hướng dẫn đặt tên rồi đổi tên hoặc khiếu nại với Meta.",
                        "EXPIRED": "Chứng chỉ của số điện thoại đã hết hạn nên số này không đăng ký dùng API được.",
                        "UNKNOWN": "Meta không trả về trạng thái xét duyệt tên hiển thị."
                    }
                },
                "LAST_ONBOARDED_TIME": {
                    "LABEL": "Lần kết nối gần nhất",
                    "TOOLTIP": "Lần gần nhất Meta kết nối số điện thoại này"
                },
                "PHONE_NUMBER_STATUS": {
                    "LABEL": "Trạng thái số điện thoại",
                    "TOOLTIP": "Trạng thái kết nối hiện tại của số điện thoại này trên WhatsApp"
                },
                "QUALITY_RATING": {
                    "LABEL": "Điểm chất lượng",
                    "TOOLTIP": "Điểm chất lượng Meta chấm cho số này dựa trên tín hiệu nhắn tin gần đây"
                },
                "MESSAGING_LIMIT_TIER": {
                    "LABEL": "Messaging limit tier",
                    "TOOLTIP": "Number of customers this phone number can initiate conversations with in 24 hours",
                    "DESCRIPTION": "Hạn mức này dùng chung cho mọi số điện thoại WhatsApp trong danh mục doanh nghiệp."
                },
                "ACCOUNT_MODE": {
                    "LABEL": "Chế độ tài khoản",
                    "TOOLTIP": "Chế độ hoạt động hiện tại của số WhatsApp này"
                },
                "CODE_VERIFICATION_STATUS": {
                    "LABEL": "Xác minh mã",
                    "TOOLTIP": "Trạng thái mã xác minh Meta báo cho số điện thoại này"
                },
                "THROUGHPUT_LEVEL": {
                    "LABEL": "Thông lượng",
                    "TOOLTIP": "Mức thông lượng gửi tin gán cho số điện thoại này"
                },
                "BUSINESS_ACCOUNT_NAME": {
                    "LABEL": "Tên tài khoản WhatsApp Business",
                    "TOOLTIP": "Tên tài khoản WhatsApp Business liên kết với số điện thoại này"
                },
                "BUSINESS_ACCOUNT_ID": {
                    "LABEL": "ID tài khoản WhatsApp Business",
                    "TOOLTIP": "Mã định danh của Meta cho tài khoản WhatsApp Business đã liên kết"
                },
                "BUSINESS_PORTFOLIO_NAME": {
                    "LABEL": "Tên danh mục doanh nghiệp",
                    "TOOLTIP": "Tên danh mục doanh nghiệp Meta đang sở hữu tài khoản WhatsApp Business"
                },
                "BUSINESS_PORTFOLIO_ID": {
                    "LABEL": "ID danh mục doanh nghiệp",
                    "TOOLTIP": "Mã định danh của Meta cho danh mục doanh nghiệp sở hữu tài khoản WhatsApp Business"
                }
            },
            "VALUES": {
                "NOT_AVAILABLE": "Không có",
                "TIERS": {
                    "TIER_250": "250 khách mỗi 24 giờ",
                    "TIER_1000": "1K khách mỗi 24 giờ",
                    "TIER_1K": "1K khách mỗi 24 giờ",
                    "TIER_2K": "2K khách mỗi 24 giờ",
                    "TIER_10K": "10K khách mỗi 24 giờ",
                    "TIER_100K": "100K khách mỗi 24 giờ",
                    "TIER_UNLIMITED": "Không giới hạn khách mỗi 24 giờ",
                    "UNKNOWN": "Chưa có điểm đánh giá"
                },
                "STATUSES": {
                    "APPROVED": "Đã duyệt",
                    "CONNECTED": "Đã kết nối",
                    "VERIFIED": "Đã xác minh",
                    "STANDARD": "Chuẩn",
                    "ACTIVE": "Đang hoạt động",
                    "EXPIRED": "Đã hết hạn",
                    "FLAGGED": "Bị gắn cờ",
                    "RESTRICTED": "Bị hạn chế",
                    "BANNED": "Bị cấm",
                    "DISCONNECTED": "Mất kết nối",
                    "UNKNOWN": "Không có",
                    "PENDING_REVIEW": "Pending Review",
                    "AVAILABLE_WITHOUT_REVIEW": "Available Without Review",
                    "REJECTED": "Rejected",
                    "DECLINED": "Declined",
                    "NON_EXISTS": "Không tồn tại"
                },
                "MODES": {
                    "SANDBOX": "Sandbox",
                    "LIVE": "Trực tuyến"
                }
            },
            "BUSINESS_PROFILE": {
                "PREVIEW_LABEL": "Hồ sơ doanh nghiệp WhatsApp"
            },
            "WEBHOOK": {
                "TITLE": "Cấu hình webhook",
                "DESCRIPTION": "Tài khoản WhatsApp Business của bạn cần URL webhook để nhận tin nhắn từ khách hàng",
                "ACTION_REQUIRED": "Chưa cấu hình webhook",
                "REGISTER_BUTTON": "Đăng ký webhook",
                "REGISTER_SUCCESS": "Đã đăng ký webhook",
                "REGISTER_ERROR": "Đăng ký webhook thất bại. Bạn hãy thử lại.",
                "CONFIGURED_SUCCESS": "Đã cấu hình webhook",
                "URL_MISMATCH": "URL webhook không khớp",
                "CONFIGURED_URL": "URL đang cấu hình",
                "EXPECTED_URL": "URL cần có",
                "COPY_URL": "Chép URL webhook",
                "COPY_SUCCESS": "Đã chép URL webhook"
            }
        },
        "SETTINGS": "Cài đặt",
        "FEATURES": {
            "LABEL": "Tính năng",
            "DISPLAY_FILE_PICKER": "Cho khách gửi tệp trên widget",
            "DISPLAY_EMOJI_PICKER": "Cho khách chọn biểu tượng cảm xúc trên widget",
            "ALLOW_END_CONVERSATION": "Cho khách tự kết thúc hội thoại trên widget",
            "USE_INBOX_AVATAR_FOR_BOT": "Dùng tên và ảnh đại diện của hộp thư cho bot"
        },
        "SETTINGS_POPUP": {
            "MESSENGER_HEADING": "Tập lệnh Messenger",
            "MESSENGER_SUB_HEAD": "Đặt nút này bên trong thẻ body của bạn",
            "EMBED_SCRIPT": {
                "TITLE": "Đoạn mã nhúng",
                "DESCRIPTION": "Dán đoạn mã này ngay trước thẻ </body> của website.",
                "CUSTOMIZE_LINK": "Tuỳ chỉnh giao diện widget",
                "HINT_IN_BUILDER": "Lấy mã nhúng ở tab Cấu hình."
            },
            "ALLOWED_DOMAINS": {
                "TITLE": "Tên miền được phép",
                "DESCRIPTION": "Giới hạn những website được nhúng widget của bạn. Vì an toàn, chỉ thêm tên miền bạn sở hữu và tin tưởng. Thêm một hoặc nhiều tên miền, cách nhau bằng dấu phẩy. Để trống là cho phép mọi tên miền (không nên dùng khi chạy thật).",
                "PLACEHOLDER": "example.com, www.example.com, app.example.com"
            },
            "ALLOW_MOBILE_WEBVIEW": {
                "LABEL": "Bật widget trong ứng dụng di động",
                "SUBTITLE": "Đánh dấu nếu bạn nhúng widget trong ứng dụng iOS hoặc Android. Ứng dụng di động không gửi thông tin tên miền nên sẽ bị chặn bởi giới hạn tên miền nếu không bật mục này."
            },
            "IDENTITY_VALIDATION": {
                "TITLE": "Xác minh danh tính",
                "DESCRIPTION": "Website của bạn sinh token an toàn cho khách đã đăng nhập để widget nhận đúng khách đó. Cách này ngăn người lạ giả danh khách khác trên widget.",
                "SECRET_KEY": "Khóa bí mật",
                "REQUIRE_LABEL": "Bắt buộc xác minh danh tính cho mọi hội thoại",
                "REQUIRE_DESCRIPTION": "Khi bật, khách phải có token danh tính hợp lệ mới bắt đầu hội thoại được. Yêu cầu không có token hợp lệ sẽ bị từ chối."
            },
            "INBOX_AGENTS": "Nhân viên",
            "INBOX_AGENTS_SUB_TEXT": "Thêm hoặc bớt nhân viên của hộp thư này",
            "AGENT_ASSIGNMENT": "Phân công hội thoại",
            "AGENT_ASSIGNMENT_SUB_TEXT": "Cập nhật phân công hội thoại",
            "ENABLE_EMAIL_COLLECT_BOX": "Hỏi email của khách",
            "ENABLE_EMAIL_COLLECT_BOX_SUB_TEXT": "Khi khách nhắn tin đầu tiên mà chưa có email, widget tự gửi một tin nhắn xin email kèm ô nhập.",
            "AUTO_ASSIGNMENT": "Bật tự động phân công",
            "SENDER_NAME_SECTION": "Hiện tên nhân viên trong email",
            "SENDER_NAME_SECTION_TEXT": "Bật/tắt hiện tên nhân viên trong email; nếu tắt sẽ hiện tên doanh nghiệp",
            "ENABLE_CONTINUITY_VIA_EMAIL": "Bật tiếp tục hội thoại qua email",
            "ENABLE_CONTINUITY_VIA_EMAIL_SUB_TEXT": "Khách đã rời widget thì trả lời của bạn được gửi tới email của khách, nếu khách đã để lại email.",
            "ENABLE_CONTINUITY_VIA_EMAIL_DISABLED_TEXT": "Tính năng này thuộc gói trả phí. Hãy nâng cấp để bật nối tiếp hội thoại qua email.",
            "LOCK_TO_SINGLE_CONVERSATION": "Điều hướng hội thoại",
            "LOCK_TO_SINGLE_CONVERSATION_SUB_TEXT": "Cấu hình cách tạo hội thoại cho liên hệ đã có",
            "INBOX_UPDATE_TITLE": "Cài đặt Hộp thư",
            "INBOX_UPDATE_SUB_TEXT": "Cập nhật cài đặt hộp thư của bạn",
            "AUTO_ASSIGNMENT_SUB_TEXT": "Tự động giao hội thoại mới cho nhân viên của hộp thư này.",
            "HMAC_VERIFICATION": "Xác minh danh tính khách",
            "HMAC_DESCRIPTION": "Dùng khóa này để sinh token bí mật xác minh danh tính khách.",
            "HMAC_LINK_TO_DOCS": "Bạn có thể đọc thêm tại đây.",
            "HMAC_MANDATORY_VERIFICATION": "Bắt buộc xác minh danh tính khách",
            "HMAC_MANDATORY_DESCRIPTION": "Nếu bật, những yêu cầu không xác minh được sẽ bị từ chối.",
            "INBOX_IDENTIFIER": "Định danh hộp thư",
            "INBOX_IDENTIFIER_SUB_TEXT": "Ứng dụng của bạn dùng token này khi gọi API của hộp thư.",
            "FORWARD_EMAIL_TITLE": "Địa chỉ chuyển tiếp thư",
            "FORWARD_EMAIL_SUB_TEXT": "Chuyển tiếp thư của bạn tới địa chỉ dưới đây để thư vào hộp thư này.",
            "FORWARD_EMAIL_NOT_CONFIGURED": "Bản cài đặt này đang tắt tính năng chuyển tiếp thư vào hộp thư. Quản trị viên phải bật lên thì bạn mới dùng được. Hãy liên hệ họ để tiếp tục.",
            "ALLOW_MESSAGES_AFTER_RESOLVED": "Cho khách nhắn tiếp sau khi hội thoại đã giải quyết",
            "ALLOW_MESSAGES_AFTER_RESOLVED_SUB_TEXT": "Tắt thì khi hội thoại đã giải quyết, widget thay ô nhập tin bằng nút bắt đầu hội thoại mới.",
            "WHATSAPP_SECTION_SUBHEADER": "Khóa API này được sử dụng để tích hợp với các API WhatsApp.",
            "WHATSAPP_SECTION_UPDATE_SUBHEADER": "Nhập API key mới dùng cho kết nối với API của WhatsApp.",
            "WHATSAPP_SECTION_TITLE": "Khóa API",
            "WHATSAPP_SECTION_UPDATE_TITLE": "Cập nhật API Key",
            "WHATSAPP_SECTION_UPDATE_PLACEHOLDER": "Nhập API Key mới tại đây",
            "WHATSAPP_SECTION_UPDATE_BUTTON": "Cập nhật",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_ADD_TITLE": "Thêm Business Management Token",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_REPLACE_TITLE": "Thay Business Management Token",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_CONFIGURED": "Đã cấu hình business management token",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_UPDATE_SUBHEADER": "Cung cấp một token có quyền truy cập tài khoản WhatsApp Business này khi {installationName} không lấy được mẫu tin nhắn. {installationName} chỉ dùng token này để đồng bộ mẫu tin.",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_UPDATE_PLACEHOLDER": "Nhập business management token",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_ADD_BUTTON": "Thêm",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_REPLACE_BUTTON": "Thay",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_UPDATE_SUCCESS": "Đã cập nhật business management token của WhatsApp.",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_UPDATE_ERROR": "Không cập nhật được business management token. Hãy kiểm tra quyền WhatsApp Business Management và quyền truy cập tài khoản rồi thử lại.",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_GUIDE_LINK": "Xem cách tạo business management token của WhatsApp",
            "WHATSAPP_EMBEDDED_SIGNUP_TITLE": "WhatsApp Embedded Signup",
            "WHATSAPP_EMBEDDED_SIGNUP_SUBHEADER": "Hộp thư này kết nối qua WhatsApp embedded signup.",
            "WHATSAPP_EMBEDDED_SIGNUP_DESCRIPTION": "Bạn có thể cấu hình lại hộp thư này để cập nhật thiết lập WhatsApp Business.",
            "WHATSAPP_RECONFIGURE_BUTTON": "Cấu hình lại",
            "WHATSAPP_MANUAL_TRANSFER_TITLE": "Chuyển sang cài đặt thủ công",
            "WHATSAPP_MANUAL_TRANSFER_SUBHEADER": "Hộp thư này kết nối qua WhatsApp embedded signup, cách đó không còn được hỗ trợ. Hãy nhập thông tin WhatsApp Cloud API từ ứng dụng Meta của chính bạn để chuyển hộp thư sang cài đặt thủ công. Trước khi chuyển, hãy cấu hình webhook trong ứng dụng Meta bằng mã xác minh ở trên.",
            "WHATSAPP_MANUAL_TRANSFER_PHONE_NUMBER_ID_LABEL": "Phone Number ID",
            "WHATSAPP_MANUAL_TRANSFER_BUSINESS_ACCOUNT_ID_LABEL": "ID tài khoản doanh nghiệp",
            "WHATSAPP_MANUAL_TRANSFER_API_KEY_LABEL": "Khóa API",
            "WHATSAPP_MANUAL_TRANSFER_API_KEY_PLACEHOLDER": "Nhập access token vĩnh viễn từ ứng dụng Meta của bạn",
            "WHATSAPP_MANUAL_TRANSFER_BUTTON": "Chuyển sang cài đặt thủ công",
            "WHATSAPP_MANUAL_TRANSFER_SUCCESS": "Đã chuyển hộp thư sang cài đặt thủ công.",
            "WHATSAPP_MANUAL_TRANSFER_ERROR": "Không chuyển được sang cài đặt thủ công. Hãy kiểm tra lại thông tin rồi thử lại.",
            "WHATSAPP_CONNECT_TITLE": "Kết nối WhatsApp Business",
            "WHATSAPP_CONNECT_SUBHEADER": "Nâng cấp lên WhatsApp embedded signup để quản lý dễ hơn.",
            "WHATSAPP_CONNECT_DESCRIPTION": "Kết nối hộp thư này với WhatsApp Business để có thêm tính năng và quản lý dễ hơn.",
            "WHATSAPP_CONNECT_BUTTON": "Kết nối",
            "WHATSAPP_CONNECT_SUCCESS": "Đã kết nối WhatsApp Business!",
            "WHATSAPP_CONNECT_ERROR": "Kết nối WhatsApp Business thất bại. Bạn hãy thử lại.",
            "WHATSAPP_RECONFIGURE_SUCCESS": "Đã cấu hình lại WhatsApp Business!",
            "WHATSAPP_RECONFIGURE_ERROR": "Cấu hình lại WhatsApp Business thất bại. Bạn hãy thử lại.",
            "WHATSAPP_APP_ID_MISSING": "Chưa cấu hình WhatsApp App ID. Hãy liên hệ quản trị viên.",
            "WHATSAPP_CONFIG_ID_MISSING": "Chưa cấu hình WhatsApp Configuration ID. Hãy liên hệ quản trị viên.",
            "WHATSAPP_LOGIN_CANCELLED": "Đã hủy đăng nhập WhatsApp. Bạn hãy thử lại.",
            "WHATSAPP_WEBHOOK_TITLE": "Mã xác minh Webhook",
            "WHATSAPP_WEBHOOK_SUBHEADER": "Token này dùng để xác minh điểm nhận webhook là thật.",
            "WHATSAPP_TEMPLATES_SYNC_TITLE": "Đồng bộ mẫu tin",
            "WHATSAPP_TEMPLATES_SYNC_SUBHEADER": "Đồng bộ thủ công mẫu tin nhắn từ WhatsApp để cập nhật danh sách mẫu bạn dùng được.",
            "WHATSAPP_TEMPLATES_SYNC_BUTTON": "Đồng bộ mẫu tin",
            "WHATSAPP_TEMPLATES_SYNC_SUCCESS": "Đã bắt đầu đồng bộ mẫu tin. Có thể mất vài phút để cập nhật.",
            "WHATSAPP_MANUAL_MIGRATION": {
                "BANNER": {
                    "TITLE": "Nên chuyển sang cài đặt thủ công",
                    "DESCRIPTION": "Hộp thư này kết nối qua ứng dụng Meta dùng chung cho embedded signup, vốn đang chịu ảnh hưởng từ các hạn chế mới của Meta. Để tránh gặp lại sự cố tương tự, bạn nên kết nối lại bằng ứng dụng Meta của chính mình.",
                    "START": "Bắt đầu chuyển thủ công",
                    "GUIDE": "Xem hướng dẫn"
                },
                "DIALOG": {
                    "EYEBROW": "Chuyển WhatsApp sang thủ công",
                    "TITLE": "Kết nối lại hộp thư WhatsApp",
                    "CLOSE": "Đóng",
                    "ACTION_REQUIRED_TITLE": "Kết nối lại bằng ứng dụng Meta của bạn",
                    "ACTION_REQUIRED_DESCRIPTION": "Hộp thư kết nối qua ứng dụng Meta của chính bạn không bị ảnh hưởng bởi các hạn chế trên ứng dụng embedded signup dùng chung. Luồng hướng dẫn này cập nhật kết nối WhatsApp API mà không tạo hộp thư mới.",
                    "GUIDE_LINK": "Mở hướng dẫn cài đặt thủ công",
                    "PRESERVED_TITLE": "Được giữ nguyên",
                    "PRESERVED_DESCRIPTION": "Hội thoại, liên hệ, cộng tác viên, điều hướng, giờ làm việc và thiết lập hộp thư.",
                    "UPDATED_TITLE": "Được cập nhật",
                    "UPDATED_DESCRIPTION": "WABA ID, phone number ID, access token và cấu hình webhook.",
                    "WABA_ID": "WABA ID",
                    "WABA_PLACEHOLDER": "Nhập WABA ID",
                    "WABA_HELP": "Tài khoản WhatsApp Business đang sở hữu số điện thoại này.",
                    "PHONE_NUMBER_ID": "Phone Number ID",
                    "PHONE_NUMBER_PLACEHOLDER": "Nhập Phone Number ID",
                    "PHONE_NUMBER_HELP": "ID riêng của Meta cho số WhatsApp gắn với hộp thư này.",
                    "DISPLAY_PHONE_NUMBER": "Số điện thoại hiển thị",
                    "DISPLAY_PHONE_NUMBER_PLACEHOLDER": "Nhập số điện thoại hiển thị",
                    "DISPLAY_PHONE_NUMBER_HELP": "Số WhatsApp mà khách nhìn thấy. Không đổi được trong lúc chuyển đổi.",
                    "ACCESS_TOKEN": "Access token vĩnh viễn hoặc token system user",
                    "ACCESS_TOKEN_PLACEHOLDER": "Dán access token",
                    "TOKEN_HELP_PREFIX": "Token phải có quyền",
                    "TOKEN_HELP_MIDDLE": "Thêm",
                    "TOKEN_HELP_SUFFIX": "để đồng bộ và quản lý mẫu tin.",
                    "MESSAGING_PERMISSION": "whatsapp_business_messaging.",
                    "MANAGEMENT_PERMISSION": "whatsapp_business_management",
                    "REVIEW_TITLE": "Xem lại trước khi kết nối",
                    "INBOX": "Hộp thư",
                    "PHONE_NUMBER": "Số điện thoại",
                    "NOT_ENTERED": "Chưa nhập",
                    "VERIFY_NOTICE": "{installationName} sẽ xác minh những thông tin này với Meta trước khi áp dụng thay đổi. Nếu xác minh thất bại, cấu hình hiện tại giữ nguyên.",
                    "BACK": "Trở về",
                    "OAUTH_DENIED": "Chưa kết nối được: bạn đã huỷ hoặc nhà cung cấp từ chối cấp quyền. Hãy thử lại.",
                    "OAUTH_TOKEN": "Nhà cung cấp chưa trả quyền truy cập hộp thư. Hãy thử lại và đồng ý mọi quyền được hỏi.",
                    "OAUTH_MISMATCH": "Bạn vừa đăng nhập một hộp thư khác. Hãy kết nối lại bằng đúng địa chỉ email của hộp thư này.",
                    "CANCEL": "Huỷ",
                    "CONTINUE": "Tiếp tục",
                    "REVIEW_MIGRATION": "Xem lại phần chuyển đổi",
                    "RECONNECT": "Kết nối lại hộp thư WhatsApp"
                },
                "STEPS": {
                    "BEFORE_YOU_START": {
                        "TITLE": "Trước khi bắt đầu",
                        "DESCRIPTION": "Thao tác này kết nối lại thông tin WhatsApp API của hộp thư. Hội thoại, cộng tác viên, điều hướng, giờ làm việc, CSAT và thiết lập bot đều được giữ nguyên."
                    },
                    "BUSINESS_DETAILS": {
                        "TITLE": "Thông tin doanh nghiệp",
                        "DESCRIPTION": "Nhập các tài nguyên WhatsApp từ tài khoản Meta Business của khách hàng."
                    },
                    "ACCESS_TOKEN": {
                        "TITLE": "Access token",
                        "DESCRIPTION": "Dán access token vĩnh viễn hoặc token system user có quyền WhatsApp."
                    },
                    "REVIEW_MIGRATION": {
                        "TITLE": "Xem lại phần chuyển đổi",
                        "DESCRIPTION": "Xác nhận thông tin kết nối trước khi kết nối lại hộp thư này. {installationName} sẽ xác minh token, WABA và số điện thoại với Meta trước khi áp dụng thay đổi."
                    }
                }
            },
            "WHATSAPP_CALLING_ENABLED": {
                "LABEL": "Bật cuộc gọi thoại",
                "DESCRIPTION": "Cho phép nhân viên gọi và nhận cuộc gọi thoại WhatsApp trên hộp thư này. Chỉ dùng được với kênh WhatsApp Cloud kết nối bằng embedded signup và đã được Meta cấp quyền gọi."
            }
        },
        "HELP_CENTER": {
            "LABEL": "Trung tâm trợ giúp",
            "PLACEHOLDER": "Chọn trung tâm trợ giúp",
            "SELECT_PLACEHOLDER": "Chọn trung tâm trợ giúp",
            "NONE": "Không có",
            "REMOVE": "Bỏ trung tâm trợ giúp",
            "SUB_TEXT": "Gắn một trung tâm trợ giúp vào hộp thư"
        },
        "AUTO_ASSIGNMENT": {
            "MAX_ASSIGNMENT_LIMIT": "Giới hạn tự động phân công tối đa",
            "MAX_ASSIGNMENT_LIMIT_RANGE_ERROR": "Xin nhập vào một số lớn hơn 0",
            "MAX_ASSIGNMENT_LIMIT_SUB_TEXT": "Giới hạn số hội thoại tối đa từ hộp thư này mà có thể được tự động phân công cho một hỗ trợ viên"
        },
        "ASSIGNMENT": {
            "TITLE": "Phân công hội thoại",
            "DESCRIPTION": "Tự động giao hội thoại đến cho nhân viên đang rảnh theo chính sách phân công",
            "ENABLE_AUTO_ASSIGNMENT": "Bật tự động phân công hội thoại",
            "DEFAULT_RULES_TITLE": "Quy tắc phân công mặc định",
            "DEFAULT_RULES_DESCRIPTION": "Đang dùng cách phân công mặc định cho mọi hội thoại",
            "DEFAULT_RULE_1": "Hội thoại tạo sớm nhất được ưu tiên",
            "DEFAULT_RULE_2": "Chia lần lượt cho từng nhân viên",
            "CUSTOMIZE_WITH_POLICY": "Tùy chỉnh bằng chính sách phân công",
            "USING_POLICY": "Hộp thư này đang dùng chính sách phân công riêng",
            "CUSTOMIZE_POLICY": "Tùy chỉnh bằng chính sách phân công",
            "DELETE_POLICY": "Xóa chính sách",
            "POLICY_LABEL": "Chính sách phân công",
            "ASSIGNMENT_ORDER_LABEL": "Thứ tự phân công",
            "ASSIGNMENT_METHOD_LABEL": "Cách phân công",
            "POLICY_STATUS": {
                "ACTIVE": "Đang bật",
                "INACTIVE": "Đang tắt"
            },
            "PRIORITY": {
                "EARLIEST_CREATED": "Tạo sớm nhất",
                "LONGEST_WAITING": "Chờ lâu nhất"
            },
            "METHOD": {
                "ROUND_ROBIN": "Chia lần lượt",
                "BALANCED": "Phân công cân bằng"
            },
            "UPGRADE_PROMPT": "Chính sách phân công riêng có ở gói Business",
            "UPGRADE_TO_BUSINESS": "Nâng cấp lên Business",
            "DEFAULT_POLICY_LINKED": "Đang gắn chính sách mặc định",
            "DEFAULT_POLICY_DESCRIPTION": "Gắn một chính sách phân công riêng để tùy chỉnh cách giao hội thoại cho nhân viên trong hộp thư này.",
            "LINK_EXISTING_POLICY": "Gắn chính sách có sẵn",
            "CREATE_NEW_POLICY": "Tạo chính sách mới",
            "NO_POLICIES": "Chưa có chính sách phân công nào",
            "VIEW_ALL_POLICIES": "Xem tất cả chính sách",
            "CURRENT_BEHAVIOR": "Đang dùng cách phân công mặc định:",
            "LINK_SUCCESS": "Đã gắn chính sách phân công",
            "LINK_ERROR": "Gắn chính sách phân công thất bại"
        },
        "ASSIGNMENT_POLICY": {
            "DELETE_CONFIRM_TITLE": "Xóa chính sách phân công?",
            "DELETE_CONFIRM_MESSAGE": "Bạn chắc chắn muốn gỡ chính sách phân công này khỏi hộp thư? Hộp thư sẽ quay lại quy tắc phân công mặc định.",
            "CANCEL": "Huỷ",
            "CONFIRM_DELETE": "Xoá",
            "DELETE_SUCCESS": "Đã xóa chính sách phân công thành công",
            "DELETE_ERROR": "Gỡ chính sách phân công thất bại"
        },
        "FACEBOOK_REAUTHORIZE": {
            "TITLE": "Ủy quyền lại",
            "SUBTITLE": "Kết nối Facebook của bạn đã hết hạn, vui lòng kết nối lại trang Facebook của bạn để tiếp tục dịch vụ",
            "MESSAGE_SUCCESS": "Kết nối lại thành công",
            "MESSAGE_ERROR": "Đã có lỗi, vui lòng thử lại"
        },
        "PRE_CHAT_FORM": {
            "DESCRIPTION": "Hỏi tên, email hoặc số điện thoại của khách trước khi khách bắt đầu chat trên widget.",
            "SET_FIELDS": "Các ô khách điền trước khi chat",
            "SET_FIELDS_HEADER": {
                "FIELDS": "Ô cần điền",
                "LABEL": "Nhãn",
                "PLACE_HOLDER": "Chữ gợi ý trong ô",
                "KEY": "Khóa",
                "TYPE": "Kiểu",
                "REQUIRED": "Bắt buộc"
            },
            "ENABLE": {
                "LABEL": "Bật biểu mẫu trước khi trò chuyện",
                "OPTIONS": {
                    "ENABLED": "Có",
                    "DISABLED": "Không"
                }
            },
            "PRE_CHAT_MESSAGE": {
                "LABEL": "Lời nhắn kèm biểu mẫu",
                "PLACEHOLDER": "Lời nhắn khách thấy phía trên biểu mẫu trên widget",
                "DEFAULT": "Bạn để lại vài thông tin để chúng tôi hỗ trợ nhanh hơn nhé."
            },
            "NO_FIELD_ENABLED_WARNING": "Biểu mẫu đang bật nhưng chưa có ô nào được bật, nên khách chỉ thấy ô tin nhắn. Hãy bật ít nhất một ô bên dưới.",
            "REQUIRE_EMAIL": {
                "LABEL": "Khách truy cập nên cung cấp tên và địa chỉ email của họ trước khi bắt đầu trò chuyện"
            }
        },
        "CSAT": {
            "TITLE": "Bật chỉ số đo lường sự hài lòng khách hàng",
            "SUBTITLE": "Khi hội thoại được giải quyết, khách nhận một khảo sát ngắn và chấm theo 3 mức: {poor}, {okay}, {great}. Kết quả vào báo cáo CSAT để bạn theo dõi mức hài lòng theo thời gian.",
            "MESSAGE": {
                "LABEL": "Tin nhắn",
                "PLACEHOLDER": "Nhập lời nhắn hiện kèm khảo sát cho khách"
            },
            "BUTTON_TEXT": {
                "LABEL": "Chữ trên nút",
                "PLACEHOLDER": "Đánh giá giúp chúng tôi nhé"
            },
            "LANGUAGE": {
                "LABEL": "Ngôn ngữ",
                "PLACEHOLDER": "Chọn ngôn ngữ của mẫu tin"
            },
            "MESSAGE_PREVIEW": {
                "LABEL": "Xem trước tin nhắn",
                "TOOLTIP": "Nội dung có thể hơi khác khi hiển thị trên nền tảng WhatsApp."
            },
            "TEMPLATE_STATUS": {
                "APPROVED": "WhatsApp đã duyệt",
                "PENDING": "Đang chờ WhatsApp duyệt",
                "REJECTED": "Meta đã từ chối mẫu tin",
                "DEFAULT": "Cần WhatsApp duyệt",
                "NOT_FOUND": "Mẫu tin này không tồn tại trên nền tảng Meta."
            },
            "TEMPLATE_CREATION": {
                "SUCCESS_MESSAGE": "Đã tạo mẫu tin WhatsApp và gửi đi chờ duyệt",
                "ERROR_MESSAGE": "Tạo mẫu tin WhatsApp thất bại"
            },
            "TEMPLATE_UPDATE_DIALOG": {
                "TITLE": "Sửa nội dung khảo sát",
                "DESCRIPTION": "Chúng tôi sẽ xóa mẫu tin cũ và tạo mẫu mới, rồi gửi lại cho WhatsApp duyệt",
                "CONFIRM": "Tạo mẫu tin mới",
                "CANCEL": "Trở về"
            },
            "UTILITY_ANALYZER": {
                "ACTION": "Kiểm tra mức phù hợp Utility",
                "HELPER_NOTE": "Hãy kiểm tra nội dung này trước khi gửi để tăng khả năng được xếp nhóm Utility. Hệ thống tạo một mẫu tin CSAT riêng có nút bấm để ghi nhận đánh giá và gửi đi dưới nhóm Utility; Meta vẫn có thể xếp lại thành Marketing tùy nội dung.",
                "RESULT_LABEL": "Dự đoán nhóm của Meta",
                "GUIDANCE_NOTE": "Đây chỉ là gợi ý tham khảo, không bảo đảm Meta sẽ duyệt.",
                "SUGGESTION_LABEL": "Gợi ý viết lại an toàn cho nhóm Utility",
                "APPLY": "Dùng bản viết lại này",
                "ERROR_MESSAGE": "Không phân tích được nội dung. Bạn hãy thử lại.",
                "CLASSIFICATION": {
                    "LIKELY_UTILITY": "Nhiều khả năng là Utility",
                    "LIKELY_MARKETING": "Nhiều khả năng là Marketing",
                    "UNCLEAR": "Cần làm rõ thêm"
                }
            },
            "SURVEY_RULE": {
                "LABEL": "Quy tắc khảo sát",
                "DESCRIPTION_PREFIX": "Gửi khảo sát nếu hội thoại",
                "DESCRIPTION_SUFFIX": "bất kỳ nhãn nào",
                "OPERATOR": {
                    "CONTAINS": "chứa",
                    "DOES_NOT_CONTAINS": "không bao gồm"
                },
                "SELECT_PLACEHOLDER": "chọn nhãn"
            },
            "NOTE": "Lưu ý: mỗi hội thoại chỉ nhận khảo sát CSAT một lần",
            "WHATSAPP_NOTE": "Lưu ý: khi bạn lưu, hệ thống tạo một mẫu tin CSAT riêng trong WhatsApp (dùng để ghi nhận đánh giá và phản hồi trong báo cáo) rồi gửi đi chờ duyệt dưới nhóm Utility. Meta vẫn có thể xếp thành Marketing tùy nội dung. Sau khi được duyệt, khảo sát chỉ gửi một lần cho mỗi hội thoại theo quy tắc khảo sát.",
            "API": {
                "SUCCESS_MESSAGE": "Đã cập nhật thiết lập CSAT",
                "ERROR_MESSAGE": "Chúng tôi chưa cập nhật được thiết lập CSAT. Bạn hãy thử lại sau."
            }
        },
        "BUSINESS_HOURS": {
            "TITLE": "Giờ làm việc",
            "SUBTITLE": "Đặt khung giờ phục vụ khách của hộp thư này",
            "WEEKLY_TITLE": "Lịch làm việc trong tuần",
            "TIMEZONE_LABEL": "Múi giờ",
            "TOGGLE_AVAILABILITY": "Bật giờ làm việc cho hộp thư này",
            "UNAVAILABLE_MESSAGE_LABEL": "Tin nhắn tự động khi khách nhắn ngoài giờ làm việc",
            "UNAVAILABLE_MESSAGE_PLACEHOLDER": "Nhập nội dung tin nhắn tự động...",
            "TOGGLE_HELP": "Khách nhắn tới ngoài khung giờ làm việc sẽ nhận tin nhắn ngoài giờ bên dưới. Widget trên website cũng báo cho khách biết đang ngoài giờ.",
            "DAY": {
                "DAY": "Ngày",
                "AVAILABILITY": "Giờ làm việc",
                "HOURS": "Tổng giờ",
                "ENABLE": "Làm việc ngày này",
                "UNAVAILABLE": "Nghỉ",
                "VALIDATION_ERROR": "Giờ bắt đầu phải trước giờ kết thúc.",
                "CHOOSE": "Chọn",
                "FROM": "Giờ bắt đầu {day}",
                "TO": "Giờ kết thúc {day}"
            },
            "ALL_DAY": "Cả ngày",
            "TOTAL": {
                "HOURS": "{hours} giờ",
                "HOURS_MINUTES": "{hours} giờ {minutes} phút",
                "MINUTES": "{minutes} phút"
            }
        },
        "IMAP": {
            "TITLE": "IMAP",
            "SUBTITLE": "Đặt chi tiết IMAP",
            "NOTE_TEXT": "Để bật chế độ SMTP, xin hãy cấu hình IMAP.",
            "UPDATE": "Cập nhật chi tiết IMAP",
            "TOGGLE_AVAILABILITY": "Kích hoạt cấu hình IMAP cho hộp thư này",
            "TOGGLE_HELP": "Bật IMAP để thư khách gửi vào hộp mail của bạn về hộp thư này.",
            "EDIT": {
                "SUCCESS_MESSAGE": "Tuỳ chỉnh IMAP được cập nhật thành công",
                "ERROR_MESSAGE": "Không thể cập nhật tuỳ chỉnh IMAP"
            },
            "ADDRESS": {
                "LABEL": "Địa chỉ",
                "PLACE_HOLDER": "Địa chỉ (Ví dụ: imap.gmail.com)"
            },
            "PORT": {
                "LABEL": "Cổng",
                "PLACE_HOLDER": "Cổng"
            },
            "LOGIN": {
                "LABEL": "Đăng nhập",
                "PLACE_HOLDER": "Đăng nhập"
            },
            "PASSWORD": {
                "LABEL": "Mật khẩu",
                "PLACE_HOLDER": "Mật khẩu"
            },
            "ENABLE_SSL": "Kích hoạt SSL",
            "AUTH_MECHANISM": "Xác minh"
        },
        "MICROSOFT": {
            "TITLE": "Microsoft",
            "SUBTITLE": "Cấp quyền lại cho tài khoản MICROSOFT của bạn"
        },
        "SMTP": {
            "TITLE": "SMTP",
            "SUBTITLE": "Đặt chi tiết SMTP",
            "UPDATE": "Cập nhật tuỳ chỉnh SMTP",
            "TOGGLE_AVAILABILITY": "Kích hoạt cấu hình SMTP cho hộp thư này",
            "TOGGLE_HELP": "Bật SMTP để thư trả lời khách được gửi bằng hộp mail của bạn.",
            "EDIT": {
                "SUCCESS_MESSAGE": "Tuỳ chỉnh SMTP được cập nhật thành công",
                "ERROR_MESSAGE": "Không thể cập nhật tuỳ chỉnh SMTP"
            },
            "ADDRESS": {
                "LABEL": "Địa chỉ",
                "PLACE_HOLDER": "Địa chỉ (Ví dụ: smtp.gmail.com)"
            },
            "PORT": {
                "LABEL": "Cổng",
                "PLACE_HOLDER": "Cổng"
            },
            "LOGIN": {
                "LABEL": "Đăng nhập",
                "PLACE_HOLDER": "Đăng nhập"
            },
            "PASSWORD": {
                "LABEL": "Mật khẩu",
                "PLACE_HOLDER": "Mật khẩu"
            },
            "DOMAIN": {
                "LABEL": "Miền",
                "PLACE_HOLDER": "Miền"
            },
            "ENCRYPTION": "Mã hóa",
            "SSL_TLS": "SSL/TLS",
            "START_TLS": "STARTTLS",
            "OPEN_SSL_VERIFY_MODE": "Chế độ xác minh chứng chỉ SSL",
            "AUTH_MECHANISM": "Xác minh"
        },
        "NOTE": "Ghi chú: ",
        "WIDGET_BUILDER": {
            "OPEN_BUILDER": {
                "LABEL": "Widget chat",
                "HELP_TEXT": "Launcher, màu sắc, trang chủ, kênh khác, lời mời chủ động, trợ lý AI, mã nhúng — chỉnh hết ở một chỗ.",
                "BUTTON": "Tùy chỉnh widget"
            }
        },
        "EMAIL_PROVIDERS": {
            "MICROSOFT": {
                "TITLE": "Microsoft",
                "DESCRIPTION": "Kết nối với Microsoft"
            },
            "GOOGLE": {
                "TITLE": "Google",
                "DESCRIPTION": "Kết nối với Google"
            },
            "OTHER_PROVIDERS": {
                "TITLE": "Nhân viên khác",
                "DESCRIPTION": "Kết nối với nhà cung cấp khác"
            }
        },
        "CHANNELS": {
            "MESSENGER": "Messenger",
            "WEB_WIDGET": "Website",
            "TWITTER_PROFILE": "Twitter",
            "TWILIO_SMS": "Twilio SMS",
            "WHATSAPP": "WhatsApp",
            "SMS": "SMS",
            "EMAIL": "Email",
            "TELEGRAM": "Telegram",
            "LINE": "Line",
            "API": "Kênh API",
            "INSTAGRAM": "Instagram",
            "TIKTOK": "TikTok",
            "ZALO": "Zalo",
            "VOICE": "Thoại"
        },
        "CONNECTION_CHECK": {
            "SYNC_INTERRUPTED": "Đồng bộ email đang gián đoạn do lỗi kết nối. Yona sẽ tự thử lại; bạn chưa cần kết nối lại tài khoản.",
            "AUTH_FAILED": "Máy chủ {protocol} {host} từ chối đăng nhập. Kiểm tra lại tài khoản và mật khẩu.",
            "CONNECTION_FAILED": "Không kết nối được tới máy chủ {protocol} {host}:{port}. Kiểm tra địa chỉ máy chủ, cổng và tuỳ chọn SSL.",
            "GMAIL_APP_PASSWORD": "Gmail không nhận mật khẩu đăng nhập Google: hãy bật Xác minh 2 bước rồi tạo Mật khẩu ứng dụng (App Password) tại {url} và dán vào ô mật khẩu.",
            "OUTLOOK_APP_PASSWORD": "Outlook/Microsoft 365 có thể đã tắt đăng nhập bằng mật khẩu: hãy dùng Mật khẩu ứng dụng (App Password) hoặc kết nối bằng tài khoản Microsoft.",
            "BANNER_DEFAULT": "Hộp thư này đã mất kết nối với nhà cung cấp. Bạn sẽ không nhận tin mới cho tới khi kết nối lại.",
            "FIX_SETTINGS": "Sửa cấu hình kết nối",
            "RECONNECT": "Kết nối lại",
            "BADGE": "Mất kết nối",
            "TELEGRAM_INVALID_TOKEN": "Telegram không nhận token này. Hãy sao chép lại đúng toàn bộ token BotFather gửi (dạng 123456789:AA…).",
            "TELEGRAM_UNREACHABLE": "Chưa kết nối được tới Telegram để kiểm token. Vui lòng thử lại sau ít phút.",
            "LINE_INVALID_TOKEN": "LINE không nhận Channel access token này. Hãy phát hành (Issue) lại token ở tab Messaging API rồi dán lại.",
            "LINE_UNREACHABLE": "Chưa kết nối được tới LINE để kiểm token. Vui lòng thử lại sau ít phút.",
            "LINE_CHANNEL_MISMATCH": "Token này thuộc một kênh LINE khác với ID kênh đã nhập."
        },
        "CONNECT_GUIDE": {
            "STEP": "Bước {n}",
            "CHECKING": "Đang kiểm tra kết nối…",
            "REQUIRED": "Trường này là bắt buộc",
            "TELEGRAM": {
                "TITLE": "Kết nối bot Telegram",
                "DESC": "Hai bước, mất khoảng một phút. Khách nhắn cho bot sẽ vào hộp thư này.",
                "STEP_1_TITLE": "Tạo bot với BotFather",
                "STEP_1_DESC": "Mở @BotFather trên Telegram, gửi lệnh /newbot, đặt tên hiển thị rồi đặt username cho bot (phải kết thúc bằng \"bot\").",
                "OPEN_BOTFATHER": "Mở BotFather",
                "STEP_2_TITLE": "Dán token của bot",
                "STEP_2_DESC": "BotFather gửi lại một token dạng 123456789:AA… Sao chép và dán vào ô bên dưới. Yona kiểm token ngay khi bạn bấm kết nối.",
                "TOKEN_LABEL": "Token của bot",
                "TOKEN_PLACEHOLDER": "123456789:AA…",
                "SUBMIT": "Kết nối Telegram"
            },
            "LINE": {
                "TITLE": "Kết nối LINE Official Account",
                "DESC": "Làm theo các bước dưới đây trong LINE Developers Console. Bạn chỉ cần chép hai mã.",
                "STEP_1_TITLE": "Mở kênh Messaging API",
                "STEP_1_DESC": "Đăng nhập LINE Developers Console, chọn Provider rồi chọn kênh Messaging API của LINE Official Account (chưa có thì bấm Create a new channel, chọn Messaging API).",
                "OPEN_CONSOLE": "Mở LINE Developers Console",
                "STEP_2_TITLE": "Chép Channel secret",
                "STEP_2_DESC": "Ở tab Basic settings, kéo xuống mục Channel secret, bấm Copy rồi dán vào ô bên dưới.",
                "STEP_3_TITLE": "Chép Channel access token",
                "STEP_3_DESC": "Ở tab Messaging API, kéo xuống cuối trang, mục Channel access token (long-lived): bấm Issue nếu chưa có, rồi Copy và dán vào ô bên dưới.",
                "STEP_4_TITLE": "Bật webhook",
                "STEP_4_DESC": "Sau khi kết nối, Yona hiện URL webhook. Dán URL đó vào ô Webhook URL ở tab Messaging API, bấm Verify và bật Use webhook. Nên tắt Auto-reply messages trong LINE Official Account Manager để khách không nhận trả lời tự động trùng.",
                "SECRET_LABEL": "Channel secret",
                "TOKEN_LABEL": "Channel access token",
                "SUBMIT": "Kết nối LINE"
            },
            "EMAIL": {
                "CHOOSE_TITLE": "Bạn dùng hộp thư nào?",
                "CHOOSE_DESC": "Đăng nhập bằng tài khoản Google để nối Gmail hoặc Google Workspace, không cần mật khẩu. Các nhà cung cấp khác sắp ra mắt.",
                "GOOGLE": {
                    "TITLE": "Đăng nhập Google",
                    "DESCRIPTION": "Kết nối Gmail/Google Workspace bằng tài khoản Google, không cần mật khẩu"
                },
                "MICROSOFT": {
                    "TITLE": "Đăng nhập Microsoft",
                    "DESCRIPTION": "Kết nối Outlook/Microsoft 365 bằng tài khoản Microsoft, không cần mật khẩu"
                },
                "GMAIL": {
                    "TITLE": "Gmail",
                    "DESCRIPTION": "Gmail hoặc Google Workspace, dùng Mật khẩu ứng dụng"
                },
                "OUTLOOK": {
                    "TITLE": "Outlook",
                    "DESCRIPTION": "Outlook, Hotmail hoặc Microsoft 365, dùng Mật khẩu ứng dụng"
                },
                "OTHER": {
                    "TITLE": "Khác",
                    "DESCRIPTION": "Nhà cung cấp khác: tự điền máy chủ IMAP/SMTP"
                },
                "FORM_TITLE": "Kết nối hộp thư {provider}",
                "FORM_DESC_PRESET": "Yona đã điền sẵn máy chủ thư của {provider}. Bạn chỉ cần nhập địa chỉ email và Mật khẩu ứng dụng.",
                "FORM_DESC_OTHER": "Điền thông số máy chủ thư do nhà cung cấp email của bạn cung cấp.",
                "CHANNEL_NAME": "Tên hộp thư",
                "CHANNEL_NAME_PLACEHOLDER": "Ví dụ: Hỗ trợ khách hàng",
                "EMAIL": "Địa chỉ email",
                "EMAIL_PLACEHOLDER": "ban@congty.vn",
                "EMAIL_INVALID": "Địa chỉ email chưa đúng",
                "APP_PASSWORD": "Mật khẩu ứng dụng (App Password)",
                "APP_PASSWORD_HELP_GMAIL": "Google không cho dùng mật khẩu đăng nhập thường. Bật Xác minh 2 bước cho tài khoản rồi tạo một Mật khẩu ứng dụng 16 ký tự và dán vào đây.",
                "APP_PASSWORD_HELP_OUTLOOK": "Bật Xác minh 2 bước cho tài khoản Microsoft rồi tạo một Mật khẩu ứng dụng và dán vào đây. Tài khoản công ty có thể cần quản trị viên cho phép.",
                "CREATE_APP_PASSWORD": "Tạo Mật khẩu ứng dụng",
                "USE_MAIL_SERVER": "Nhận và gửi thư qua máy chủ thư của tôi (IMAP/SMTP)",
                "USE_MAIL_SERVER_HELP": "Bỏ chọn nếu bạn chỉ muốn chuyển tiếp thư về Yona.",
                "IMAP_TITLE": "Nhận thư (IMAP)",
                "SMTP_TITLE": "Gửi thư (SMTP)",
                "HOST": "Máy chủ",
                "PORT": "Cổng",
                "LOGIN": "Tên đăng nhập",
                "PASSWORD": "Mật khẩu",
                "IMAP_SSL": "Dùng SSL",
                "SMTP_SSL": "Dùng SSL/TLS (cổng 465)",
                "SUBMIT": "Kết nối hộp thư",
                "BACK": "Chọn nhà cung cấp khác"
            }
        }
    },
    "INBOX_REPORTS": {
        "HEADER": "Tổng quan hộp thư",
        "DESCRIPTION": "Xem nhanh hiệu suất hộp thư với các chỉ số chính như số hội thoại, thời gian phản hồi, thời gian xử lý và số ca đã xong — tất cả trong một chỗ. Bấm vào tên hộp thư để xem chi tiết.",
        "LOADING_CHART": "Đang tải các biểu đồ dữ liệu...",
        "NO_ENOUGH_DATA": "Chúng tôi không nhận được đủ điểm dữ liệu để tạo báo cáo, Vui lòng thử lại sau.",
        "DOWNLOAD_INBOX_REPORTS": "Tải xuống báo cáo hộp thư",
        "FILTER_DROPDOWN_LABEL": "Chọn hộp thư",
        "ALL_INBOXES": "Tất cả hộp thư",
        "SEARCH_INBOX": "Tìm hộp thư",
        "FILTERS": {
            "INPUT_PLACEHOLDER": {
                "INBOXES": "Tìm hộp thư"
            }
        },
        "METRICS": {
            "CONVERSATIONS": {
                "NAME": "Các hội thoại",
                "DESC": "( Tổng cộng )"
            },
            "INCOMING_MESSAGES": {
                "NAME": "Tin nhắn nhận được",
                "DESC": "( Tổng cộng )"
            },
            "OUTGOING_MESSAGES": {
                "NAME": "Tin nhắn gửi đi",
                "DESC": "( Tổng cộng )"
            },
            "FIRST_RESPONSE_TIME": {
                "NAME": "Thời gian phản hồi đầu tiên",
                "DESC": "( Trung bình )",
                "INFO_TEXT": "Tổng số hội thoại được sử dụng để tính toán:",
                "TOOLTIP_TEXT": "Thời gian phản hồi đầu tiên là {metricValue} (dựa trên {conversationCount} hội thoại)"
            },
            "RESOLUTION_TIME": {
                "NAME": "Thời gian giải quyết",
                "DESC": "( Trung bình )",
                "INFO_TEXT": "Tổng số hội thoại được sử dụng để tính toán:",
                "TOOLTIP_TEXT": "Thời gian giải quyết là {metricValue} (dựa trên {conversationCount} hội thoại)"
            },
            "RESOLUTION_COUNT": {
                "NAME": "Số lượng giải quyết",
                "DESC": "( Tổng cộng )"
            }
        },
        "CUSTOM_DATE_RANGE": {
            "CONFIRM": "Áp dụng",
            "PLACEHOLDER": "Chọn phạm vi ngày"
        }
    },
    "INTEGRATION_APPS": {
        "FETCHING": "Đang lấy Tích hợp",
        "NO_HOOK_CONFIGURED": "Không có tích hợp {integrationId} được cấu hình đối với tài khoản này.",
        "HEADER": "Ứng dụng",
        "COUNT": "{n} kết nối | {n} kết nối",
        "SEARCH_PLACEHOLDER": "Tìm kiếm...",
        "NO_RESULTS": "Không tìm thấy kết quả nào khớp",
        "STATUS": {
            "ENABLED": "Bật",
            "DISABLED": "Không bật"
        },
        "CONFIGURE": "Cấu hình",
        "ADD_BUTTON": "Thêm một hook mới",
        "DELETE": {
            "TITLE": {
                "INBOX": "Xác nhận xoá",
                "ACCOUNT": "Ngắt kết nối"
            },
            "MESSAGE": {
                "INBOX": "Bạn có chắc muốn xoá?",
                "ACCOUNT": "Bạn có chắc muốn ngắt kết nối?"
            },
            "CONFIRM_BUTTON_TEXT": {
                "INBOX": "Có, Xoá",
                "ACCOUNT": "Có, ngắt kết nối"
            },
            "CANCEL_BUTTON_TEXT": "Huỷ",
            "API": {
                "SUCCESS_MESSAGE": "Hook đã được xoá thành công",
                "ERROR_MESSAGE": "Không kết nối được máy chủ. Bạn hãy thử lại sau."
            }
        },
        "LIST": {
            "FETCHING": "Đang lấy hook tích hợp",
            "INBOX": "Hộp thư",
            "ACTIONS": "Hành động",
            "DELETE": {
                "BUTTON_TEXT": "Xoá"
            }
        },
        "ADD": {
            "FORM": {
                "INBOX": {
                    "LABEL": "Chọn hộp thư",
                    "PLACEHOLDER": "Chọn hộp thư"
                },
                "SUBMIT": "Tạo",
                "VALIDATING_OPENAI": "Đang xác thực với OpenAI...",
                "CANCEL": "Huỷ"
            },
            "API": {
                "SUCCESS_MESSAGE": "Hook tích hợp đã được thêm thành công",
                "ERROR_MESSAGE": "Không kết nối được máy chủ. Bạn hãy thử lại sau."
            }
        },
        "CONNECT": {
            "BUTTON_TEXT": "Kết nối"
        },
        "DISCONNECT": {
            "BUTTON_TEXT": "Ngắt kết nối"
        },
        "SIDEBAR_DESCRIPTION": {
            "DIALOGFLOW": "Dialogflow là nền tảng xử lý ngôn ngữ tự nhiên để xây giao diện hội thoại. Nối Dialogflow với {installationName} để bot trả lời trước rồi chuyển cho nhân viên khi cần. Cách này giúp sàng lọc khách tiềm năng và giảm tải cho nhân viên nhờ tự trả lời câu hỏi thường gặp. Để thêm Dialogflow, hãy tạo Service Account trong Google Console rồi cung cấp thông tin xác thực. Xem tài liệu để biết chi tiết"
        },
        "dashboard_apps": {
            "name": "Ứng dụng bảng điều khiển",
            "description": "Dashboard Apps cho phép bạn tạo và nhúng ứng dụng hiển thị thông tin người dùng, đơn hàng hay lịch sử thanh toán, giúp nhân viên hỗ trợ nắm rõ bối cảnh hơn."
        },
        "dyte": {
            "name": "Dyte",
            "short_description": "Gọi video/thoại với khách hàng ngay trong {installationName}.",
            "description": "Cloudflare RealtimeKit cho phép nhân viên gọi video/thoại với khách hàng ngay trong {installationName}.",
            "meeting_name": "{agent_name} đã bắt đầu một cuộc họp"
        },
        "slack": {
            "name": "Slack",
            "short_description": "Nhận thông báo và trả lời hội thoại ngay trong Slack.",
            "description": "Nối {installationName} với Slack để cả đội cùng nắm thông tin. Kết nối này cho phép bạn nhận thông báo hội thoại mới và trả lời ngay trong giao diện Slack."
        },
        "webhooks": {
            "name": "Webhook",
            "description": "Sự kiện webhook báo tức thời mọi hoạt động trong tài khoản {installationName} của bạn. Bạn đăng ký những sự kiện mình cần, {installationName} sẽ gửi HTTP callback kèm nội dung cập nhật."
        },
        "dialogflow": {
            "name": "Dialogflow",
            "short_description": "Dựng chatbot trả lời các câu hỏi đầu tiên trước khi chuyển cho nhân viên.",
            "description": "Dựng chatbot bằng Dialogflow rồi gắn vào hộp thư của bạn. Bot có thể trả lời những câu hỏi đầu tiên trước khi chuyển hội thoại cho nhân viên chăm sóc khách hàng."
        },
        "google_translate": {
            "name": "Google Translate",
            "short_description": "Tự động dịch tin nhắn của khách cho nhân viên.",
            "description": "Nối Google Translate để nhân viên dễ dàng dịch tin nhắn của khách. Kết nối này tự nhận diện ngôn ngữ và chuyển sang ngôn ngữ ưa dùng của nhân viên hoặc quản trị viên."
        },
        "openai": {
            "name": "OpenAI",
            "short_description": "Gợi ý câu trả lời, tóm tắt và trau chuốt tin nhắn bằng AI.",
            "description": "Tận dụng sức mạnh mô hình ngôn ngữ lớn của OpenAI với các tính năng như gợi ý câu trả lời, tóm tắt, viết lại tin nhắn, kiểm tra chính tả và phân loại nhãn."
        },
        "linear": {
            "name": "Linear",
            "short_description": "Tạo và gắn issue Linear ngay từ hội thoại.",
            "description": "Tạo issue trong Linear ngay từ cửa sổ hội thoại. Hoặc gắn issue Linear có sẵn để theo dõi công việc gọn gàng và hiệu quả hơn."
        },
        "notion": {
            "name": "Notion",
            "short_description": "Nối cơ sở dữ liệu, tài liệu và trang thẳng vào Captain.",
            "description": "Kết nối workspace Notion để Captain đọc được nội dung trong cơ sở dữ liệu, tài liệu và trang của bạn, từ đó trả lời khách sát bối cảnh hơn."
        },
        "shopify": {
            "name": "Shopify",
            "short_description": "Xem thông tin đơn hàng và khách hàng từ cửa hàng Shopify của bạn.",
            "description": "Kết nối cửa hàng Shopify để xem thông tin đơn hàng, khách hàng và sản phẩm ngay trong hội thoại, giúp đội hỗ trợ trả lời nhanh và sát bối cảnh hơn."
        },
        "leadsquared": {
            "name": "LeadSquared",
            "short_description": "Đồng bộ liên hệ và hội thoại với CRM LeadSquared.",
            "description": "Đồng bộ liên hệ và hội thoại với CRM LeadSquared. Kết nối này tự tạo lead trong LeadSquared khi có liên hệ mới và ghi lại hoạt động hội thoại để đội bán hàng nắm đầy đủ bối cảnh."
        }
    },
    "INTEGRATION_SETTINGS": {
        "SHOPIFY": {
            "HEADER": "Shopify",
            "DELETE": {
                "TITLE": "Xóa kết nối Shopify",
                "MESSAGE": "Bạn chắc chắn muốn xóa kết nối Shopify?"
            },
            "STORE_URL": {
                "TITLE": "Kết nối cửa hàng Shopify",
                "LABEL": "URL cửa hàng",
                "PLACEHOLDER": "cua-hang-cua-ban.myshopify.com",
                "HELP": "Nhập URL myshopify.com của cửa hàng Shopify",
                "CANCEL": "Huỷ",
                "SUBMIT": "Kết nối cửa hàng"
            },
            "ERROR": "Có lỗi khi kết nối Shopify. Bạn hãy thử lại hoặc liên hệ hỗ trợ nếu vẫn không được."
        },
        "HEADER": "Tích hợp",
        "DESCRIPTION": "{installationName} kết nối với nhiều công cụ và dịch vụ để đội của bạn làm việc hiệu quả hơn. Xem danh sách bên dưới để cấu hình ứng dụng bạn thích.",
        "LEARN_MORE": "Tìm hiểu thêm về kết nối",
        "LOADING": "Đang tải danh sách kết nối",
        "SEARCH_PLACEHOLDER": "Tìm kết nối...",
        "NO_RESULTS": "Không tìm thấy kết nối nào khớp",
        "CAPTAIN": {
            "DISABLED": "Tài khoản của bạn chưa bật Captain.",
            "CLICK_HERE_TO_CONFIGURE": "Bấm vào đây để cấu hình",
            "LOADING_CONSOLE": "Đang tải Captain Console...",
            "FAILED_TO_LOAD_CONSOLE": "Không tải được Captain Console. Hãy tải lại trang và thử lại."
        },
        "WEBHOOK": {
            "SUBSCRIBED_EVENTS": "Những sự kiện được theo dõi",
            "LEARN_MORE": "Tìm hiểu thêm về webhook",
            "PAYWALL": {
                "TITLE": "Webhook có ở các gói trả phí",
                "AVAILABLE_ON": "Dùng webhook để nhận sự kiện tức thời từ tài khoản {installationName} của bạn.",
                "UPGRADE_PROMPT": "Hãy nâng cấp lên gói Startups, Business hoặc Enterprise để dùng webhook.",
                "UPGRADE_NOW": "Nâng cấp ngay",
                "CANCEL_ANYTIME": "Bạn có thể đổi hoặc hủy gói bất cứ lúc nào."
            },
            "SECRET": {
                "LABEL": "Khóa bí mật",
                "COPY": "Chép khóa bí mật",
                "COPY_SUCCESS": "Đã chép khóa bí mật",
                "TOGGLE": "Ẩn/hiện khóa bí mật",
                "CREATED_DESC": "Đã tạo webhook. Dùng khóa bí mật bên dưới để xác minh chữ ký webhook. Hãy chép ngay — bạn cũng có thể xem lại trong biểu mẫu sửa webhook.",
                "DONE": "Xong"
            },
            "COUNT": "{n} webhook | {n} webhook",
            "SEARCH_PLACEHOLDER": "Tìm webhook...",
            "NO_RESULTS": "Không tìm thấy webhook nào khớp",
            "FORM": {
                "CANCEL": "Huỷ",
                "DESC": "Webhook events cung cấp cho bạn thông tin thời gian thực về những gì đang xảy ra trong tài khoản {installationName} của bạn. Vui lòng nhập một URL hợp lệ để định cấu hình một cuộc gọi lại.",
                "SUBSCRIPTIONS": {
                    "LABEL": "Các sự kiện",
                    "EVENTS": {
                        "CONVERSATION_CREATED": "Hội thoại đã được tạo",
                        "CONVERSATION_STATUS_CHANGED": "Trạng thái hội thoại đã thay đổi",
                        "CONVERSATION_UPDATED": "Hội thoại đã được cập nhật",
                        "MESSAGE_CREATED": "Tin nhắn đã được tạo",
                        "MESSAGE_UPDATED": "Tin nhắn đã được cập nhật",
                        "WEBWIDGET_TRIGGERED": "Tiện ích trò chuyện trực tuyến do người dùng mở",
                        "CONTACT_CREATED": "Tạo liên hệ",
                        "CONTACT_UPDATED": "Cập nhật liên hệ",
                        "CONVERSATION_TYPING_ON": "Bắt đầu gõ trong hội thoại",
                        "CONVERSATION_TYPING_OFF": "Ngừng gõ trong hội thoại",
                        "INBOX_UPDATED": "Cập nhật hộp thư"
                    }
                },
                "NAME": {
                    "LABEL": "Tên webhook",
                    "PLACEHOLDER": "Nhập tên của webhook"
                },
                "END_POINT": {
                    "LABEL": "URL webhook",
                    "PLACEHOLDER": "Ví dụ: {webhookExampleURL}",
                    "ERROR": "Vui lòng nhập một URL hợp lệ"
                },
                "EDIT_SUBMIT": "Cập nhật webhook",
                "ADD_SUBMIT": "Tạo webhook"
            },
            "TITLE": "Webhook",
            "CONFIGURE": "Cấu hình",
            "HEADER": "Cài đặt Webhook",
            "HEADER_BTN_TXT": "Thêm mới webhook",
            "LOADING": "Đang tải về các webhooks",
            "SEARCH_404": "Không có kết quả nào được tìm thấy",
            "SIDEBAR_TXT": "<p><b>Webhooks</b> </p> <p>Webhook là các lệnh gọi lại HTTP có thể được xác định cho mọi tài khoản. Chúng được kích hoạt bởi các sự kiện như tạo tin nhắn trong {installationName}. Bạn có thể tạo nhiều webhook cho tài khoản này. <br /><br /> Để tạo một <b>webhook</b>, click vào <b>Tạo mới</b>. Bạn cũng có thể xóa bất kỳ webhook hiện có nào bằng cách nhấp vào nút Xóa.</p>",
            "LIST": {
                "404": "Không có webhook nào được định cấu hình cho tài khoản này.",
                "TITLE": "Quản lý webhooks",
                "TABLE_HEADER": {
                    "WEBHOOK_ENDPOINT": "Điểm nhận webhook",
                    "ACTIONS": "Hành động"
                }
            },
            "EDIT": {
                "BUTTON_TEXT": "Chỉnh sửa",
                "TITLE": "Sửa webhook",
                "API": {
                    "SUCCESS_MESSAGE": "Đã cập nhật cấu hình Webhook thành công",
                    "ERROR_MESSAGE": "Không kết nối được máy chủ. Bạn hãy thử lại sau."
                }
            },
            "ADD": {
                "CANCEL": "Xoá",
                "TITLE": "Thêm mới webhook",
                "API": {
                    "SUCCESS_MESSAGE": "Đã thêm Webhook thành công",
                    "ERROR_MESSAGE": "Không kết nối được máy chủ. Bạn hãy thử lại sau."
                }
            },
            "DELETE": {
                "BUTTON_TEXT": "Xoá",
                "API": {
                    "SUCCESS_MESSAGE": "Webhook đã được xoá thành công",
                    "ERROR_MESSAGE": "Không kết nối được máy chủ. Bạn hãy thử lại sau."
                },
                "CONFIRM": {
                    "TITLE": "Xác Nhận Xoá",
                    "MESSAGE": "Bạn có chắc chắn muốn xóa webhook không? ({webhookURL})",
                    "YES": "Có, Xoá ",
                    "NO": "Không, Giữ"
                }
            }
        },
        "SLACK": {
            "HEADER": "Slack",
            "DELETE": "Xoá",
            "DELETE_CONFIRMATION": {
                "TITLE": "Xóa kết nối",
                "MESSAGE": "Bạn chắc chắn muốn xóa kết nối này? Làm vậy sẽ mất quyền xem hội thoại trong workspace Slack của bạn."
            },
            "HELP_TEXT": {
                "TITLE": "Dùng tích hợp Slack",
                "BODY": "Với kết nối này, mọi hội thoại đến sẽ được đồng bộ sang kênh ***{selectedChannelName}*** trong workspace Slack của bạn. Bạn có thể xử lý toàn bộ hội thoại khách hàng ngay trong kênh đó và không bỏ sót tin nào.\n\nCác tính năng chính của kết nối này:\n\n**Trả lời hội thoại ngay trong Slack:** để trả lời một hội thoại trong kênh Slack ***{selectedChannelName}***, chỉ cần gõ nội dung và gửi dưới dạng thread. {installationName} sẽ gửi nội dung đó tới khách hàng. Đơn giản vậy thôi!\n\n **Tạo ghi chú riêng:** nếu muốn tạo ghi chú riêng thay vì trả lời, hãy bắt đầu tin nhắn bằng ***`note:`***. Nội dung sẽ được giữ riêng và khách không nhìn thấy.\n\n**Gắn với hồ sơ nhân viên:** nếu người trả lời trên Slack có hồ sơ nhân viên trong {installationName} dùng cùng email, câu trả lời sẽ tự gắn với hồ sơ đó. Nhờ vậy bạn dễ theo dõi ai đã nói gì và lúc nào. Ngược lại, nếu người trả lời không có hồ sơ nhân viên tương ứng, khách sẽ thấy câu trả lời đến từ hồ sơ bot.",
                "SELECTED": "đã chọn"
            },
            "SELECT_CHANNEL": {
                "OPTION_LABEL": "Chọn một kênh",
                "UPDATE": "Cập nhật",
                "BUTTON_TEXT": "Kết nối kênh",
                "DESCRIPTION": "Workspace Slack của bạn đã liên kết với {installationName}. Tuy nhiên kết nối đang tắt. Để bật kết nối và gắn một kênh với {installationName}, hãy bấm nút bên dưới.\n\n**Lưu ý:** nếu bạn định kết nối một kênh riêng tư, hãy thêm ứng dụng {installationName} vào kênh Slack đó trước khi làm bước này.",
                "ATTENTION_REQUIRED": "Cần bạn xử lý",
                "EXPIRED": "Kết nối Slack của bạn đã hết hạn. Để tiếp tục nhận tin nhắn trên Slack, hãy xóa kết nối rồi kết nối lại workspace."
            },
            "UPDATE_ERROR": "Có lỗi khi cập nhật kết nối, bạn hãy thử lại",
            "UPDATE_SUCCESS": "Đã kết nối kênh",
            "FAILED_TO_FETCH_CHANNELS": "Có lỗi khi lấy danh sách kênh từ Slack, bạn hãy thử lại"
        },
        "DYTE": {
            "CLICK_HERE_TO_JOIN": "Bấm vào đây để tham gia",
            "LEAVE_THE_ROOM": "Rời phòng",
            "START_VIDEO_CALL_HELP_TEXT": "Bắt đầu cuộc gọi video mới với khách hàng",
            "JOIN_ERROR": "Có lỗi khi tham gia cuộc gọi, bạn hãy thử lại",
            "CREATE_ERROR": "Có lỗi khi tạo liên kết cuộc họp, bạn hãy thử lại"
        },
        "OPEN_AI": {
            "AI_ASSIST": "Trợ lý AI",
            "WITH_AI": " {option} bằng AI ",
            "OPTIONS": {
                "REPLY_SUGGESTION": "Gợi ý câu trả lời",
                "SUMMARIZE": "Tóm tắt",
                "REPHRASE": "Viết hay hơn",
                "FIX_SPELLING_GRAMMAR": "Sửa chính tả và ngữ pháp",
                "SHORTEN": "Rút ngắn",
                "EXPAND": "Viết dài hơn",
                "MAKE_FRIENDLY": "Đổi giọng văn sang thân thiện",
                "MAKE_FORMAL": "Dùng giọng văn trang trọng",
                "SIMPLIFY": "Viết đơn giản hơn",
                "CONFIDENT": "Dùng giọng văn tự tin",
                "PROFESSIONAL": "Dùng giọng văn chuyên nghiệp",
                "CASUAL": "Dùng giọng văn thân mật",
                "STRAIGHTFORWARD": "Dùng giọng văn thẳng thắn"
            },
            "REPLY_OPTIONS": {
                "IMPROVE_REPLY": "Cải thiện câu trả lời",
                "IMPROVE_REPLY_SELECTION": "Cải thiện phần đang chọn",
                "CHANGE_TONE": {
                    "TITLE": "Đổi giọng văn",
                    "OPTIONS": {
                        "PROFESSIONAL": "Chuyên nghiệp",
                        "CASUAL": "Thân mật",
                        "STRAIGHTFORWARD": "Thẳng thắn",
                        "CONFIDENT": "Tự tin",
                        "FRIENDLY": "Thân thiện"
                    }
                },
                "GRAMMAR": "Sửa ngữ pháp và chính tả",
                "SUGGESTION": "Gợi ý câu trả lời",
                "SUMMARIZE": "Tóm tắt hội thoại",
                "ASK_COPILOT": "Hỏi Copilot"
            },
            "ASSISTANCE_MODAL": {
                "DRAFT_TITLE": "Nội dung nháp",
                "GENERATED_TITLE": "Nội dung đã sinh",
                "AI_WRITING": "AI đang viết",
                "BUTTONS": {
                    "APPLY": "Dùng gợi ý này",
                    "CANCEL": "Huỷ"
                }
            },
            "CTA_MODAL": {
                "TITLE": "Kết nối với OpenAI",
                "DESC": "Mang tính năng AI nâng cao vào bảng điều khiển của bạn bằng các mô hình GPT của OpenAI. Để bắt đầu, hãy nhập API key từ tài khoản OpenAI.",
                "KEY_PLACEHOLDER": "Nhập API key OpenAI của bạn",
                "BUTTONS": {
                    "NEED_HELP": "Cần hỗ trợ?",
                    "DISMISS": "Bỏ qua",
                    "FINISH": "Hoàn tất thiết lập"
                },
                "DISMISS_MESSAGE": "Bạn có thể thiết lập kết nối OpenAI lúc khác, bất cứ khi nào bạn muốn.",
                "SUCCESS_MESSAGE": "Đã thiết lập xong kết nối OpenAI"
            },
            "TITLE": "Cải thiện bằng AI",
            "SUMMARY_TITLE": "Tóm tắt bằng AI",
            "REPLY_TITLE": "Gợi ý câu trả lời bằng AI",
            "SUBTITLE": "AI sẽ dựa trên bản nháp hiện tại của bạn để tạo câu trả lời hay hơn.",
            "TONE": {
                "TITLE": "Giọng văn",
                "OPTIONS": {
                    "PROFESSIONAL": "Chuyên nghiệp",
                    "FRIENDLY": "Thân thiện"
                }
            },
            "BUTTONS": {
                "GENERATE": "Tạo nội dung",
                "GENERATING": "Đang tạo...",
                "CANCEL": "Huỷ"
            },
            "GENERATE_ERROR": "There was an error processing the content, please try again"
        },
        "DELETE": {
            "BUTTON_TEXT": "Xoá",
            "API": {
                "SUCCESS_MESSAGE": "Tích hợp đã được xóa thành công"
            }
        },
        "CONNECT": {
            "BUTTON_TEXT": "Kết nối"
        },
        "DASHBOARD_APPS": {
            "TITLE": "Ứng dụng bảng điều khiển",
            "HEADER_BTN_TXT": "Thêm mới một Ứng dụng bảng điều khiển",
            "SIDEBAR_TXT": "<p> <b> Ứng dụng trên bảng điều khiển</b> </p> <p>Ứng dụng bảng điều khiển cho phép nhúng ứng dụng vào bảng điều khiển {installationName} để cung cấp ngữ cảnh cho các nhân viên hỗ trợ khách hàng. Tính năng này cho phép bạn tạo ứng dụng một cách độc lập và nhúng ứng dụng đó vào bên trong trang điều khiển để cung cấp thông tin người dùng, đơn đặt hàng hoặc lịch sử thanh toán trước đó của họ. </p> <p> Khi bạn nhúng ứng dụng của mình vào {installationName}, ứng dụng của bạn sẽ lấy bối cảnh của hội thoại và liên hệ dưới dạng sự kiện cửa sổ. Triển khai trình nghe cho sự kiện thông báo trên trang của bạn để nhận ngữ cảnh. </p> <p> Để thêm ứng dụng trang điều khiển mới, hãy nhấp vào nút 'Thêm ứng dụng bảng điều khiển mới'. </p>",
            "DESCRIPTION": "Ứng dụng bảng điều khiển cho phép các tổ chức nhúng một ứng dụng bên trong trang điều khiển để cung cấp ngữ cảnh cho các nhân viên hỗ trợ khách hàng. Tính năng này cho phép bạn tạo ứng dụng một cách độc lập và nhúng ứng dụng đó để cung cấp thông tin người dùng, đơn đặt hàng hoặc lịch sử thanh toán trước đó của họ.",
            "LEARN_MORE": "Tìm hiểu thêm về Dashboard Apps",
            "COUNT": "{n} dashboard app | {n} dashboard app",
            "SEARCH_PLACEHOLDER": "Tìm dashboard app...",
            "NO_RESULTS": "Không tìm thấy dashboard app nào khớp",
            "LIST": {
                "404": "Chưa có ứng dụng trang điều khiển nào được định cấu hình trên tài khoản này",
                "LOADING": "Đang tìm nạp ứng dụng bảng điều khiển...",
                "TABLE_HEADER": {
                    "NAME": "Tên",
                    "ENDPOINT": "Điểm cuối",
                    "ACTIONS": "Hành động"
                },
                "EDIT_TOOLTIP": "Sửa app",
                "DELETE_TOOLTIP": "Xoá app"
            },
            "FORM": {
                "TITLE_LABEL": "Tên",
                "TITLE_PLACEHOLDER": "Nhập tên cho ứng dụng bảng điều khiển",
                "TITLE_ERROR": "Cần có tên cho ứng dụng bảng điều khiển",
                "URL_LABEL": "Điểm cuối",
                "URL_PLACEHOLDER": "Nhập URL endpoint nơi ứng dụng của bạn được lưu trữ",
                "URL_ERROR": "Cần một URL hợp lệ"
            },
            "CREATE": {
                "HEADER": "Thêm mới một Ứng dụng bảng điều khiển",
                "FORM_SUBMIT": "Gửi",
                "FORM_CANCEL": "Huỷ",
                "API_SUCCESS": "Ứng dụng trang điều khiển được định cấu hình thành công",
                "API_ERROR": "Chúng tôi không thể tạo ứng dụng. Vui lòng thử lại sau"
            },
            "UPDATE": {
                "HEADER": "Sửa app bảng điều khiển",
                "FORM_SUBMIT": "Cập nhật",
                "FORM_CANCEL": "Huỷ",
                "API_SUCCESS": "Đã cập nhật ứng dụng trang điều khiển thành công",
                "API_ERROR": "Chúng tôi không thể cập nhật ứng dụng. Vui lòng thử lại sau"
            },
            "DELETE": {
                "CONFIRM_YES": "Có, xóa nó",
                "CONFIRM_NO": "Không, giữ nó",
                "TITLE": "Xác nhận xoá",
                "MESSAGE": "Bạn có chắc chắn xóa ứng dụng - {appName}?",
                "API_SUCCESS": "Đã xóa ứng dụng trang điều khiển thành công",
                "API_ERROR": "Chúng tôi không thể xóa ứng dụng. Vui lòng thử lại sau"
            }
        },
        "LINEAR": {
            "HEADER": "Linear",
            "ADD_OR_LINK_BUTTON": "Tạo/gắn issue Linear",
            "LOADING": "Đang tải issue Linear...",
            "LOADING_ERROR": "Có lỗi khi tải issue Linear, bạn hãy thử lại",
            "CREATE": "Tạo",
            "LINK": {
                "SEARCH": "Tìm issue",
                "SELECT": "Chọn issue",
                "TITLE": "Liên kết",
                "EMPTY_LIST": "Không có issue Linear nào",
                "LOADING": "Đang tải",
                "ERROR": "Có lỗi khi tải issue Linear, bạn hãy thử lại",
                "LINK_SUCCESS": "Đã gắn issue",
                "LINK_ERROR": "Có lỗi khi gắn issue, bạn hãy thử lại",
                "LINK_TITLE": "Hội thoại (#{conversationId}) với {name}"
            },
            "ADD_OR_LINK": {
                "TITLE": "Tạo/gắn issue Linear",
                "DESCRIPTION": "Tạo issue Linear từ hội thoại, hoặc gắn issue có sẵn để theo dõi liền mạch.",
                "FORM": {
                    "TITLE": {
                        "LABEL": "Tiêu đề",
                        "PLACEHOLDER": "Nhập tiêu đề",
                        "REQUIRED_ERROR": "Tiêu đề bắt buộc có"
                    },
                    "DESCRIPTION": {
                        "LABEL": "Mô tả",
                        "PLACEHOLDER": "Nhập mô tả"
                    },
                    "TEAM": {
                        "LABEL": "Nhóm",
                        "PLACEHOLDER": "Chọn nhóm",
                        "SEARCH": "Tìm nhóm",
                        "REQUIRED_ERROR": "Nhóm là bắt buộc"
                    },
                    "ASSIGNEE": {
                        "LABEL": "Người phụ trách",
                        "PLACEHOLDER": "Chọn người phụ trách",
                        "SEARCH": "Tìm người phụ trách"
                    },
                    "PRIORITY": {
                        "LABEL": "Mức độ ưu tiên",
                        "PLACEHOLDER": "Chọc mức ưu tiên",
                        "SEARCH": "Tìm mức ưu tiên"
                    },
                    "LABEL": {
                        "LABEL": "Nhãn",
                        "PLACEHOLDER": "Chọn nhãn",
                        "SEARCH": "Tìm nhãn"
                    },
                    "STATUS": {
                        "LABEL": "Trạng thái",
                        "PLACEHOLDER": "Chọn trạng thái",
                        "SEARCH": "Tìm trạng thái"
                    },
                    "PROJECT": {
                        "LABEL": "Dự án",
                        "PLACEHOLDER": "Chọn dự án",
                        "SEARCH": "Tìm dự án"
                    }
                },
                "CREATE": "Tạo",
                "CANCEL": "Huỷ",
                "CREATE_SUCCESS": "Đã tạo issue",
                "CREATE_ERROR": "Có lỗi khi tạo issue, bạn hãy thử lại",
                "LOADING_TEAM_ERROR": "Có lỗi khi tải danh sách nhóm, bạn hãy thử lại",
                "LOADING_TEAM_ENTITIES_ERROR": "Có lỗi khi tải dữ liệu của nhóm, bạn hãy thử lại"
            },
            "ISSUE": {
                "STATUS": "Trạng thái",
                "PRIORITY": "Mức độ ưu tiên",
                "ASSIGNEE": "Người phụ trách",
                "LABELS": "Nhãn",
                "CREATED_AT": "Tạo lúc {createdAt}"
            },
            "UNLINK": {
                "TITLE": "Bỏ gắn",
                "SUCCESS": "Đã bỏ gắn issue",
                "ERROR": "Có lỗi khi bỏ gắn issue, bạn hãy thử lại"
            },
            "NO_LINKED_ISSUES": "Không có issue nào được gắn",
            "DELETE": {
                "TITLE": "Bạn chắc chắn muốn xóa kết nối này?",
                "MESSAGE": "Bạn chắc chắn muốn xóa kết nối này?",
                "CONFIRM": "Có, xoá",
                "CANCEL": "Huỷ"
            },
            "CTA": {
                "TITLE": "Kết nối với Linear",
                "AGENT_DESCRIPTION": "Chưa kết nối workspace Linear. Hãy nhờ quản trị viên kết nối workspace để dùng tính năng này.",
                "DESCRIPTION": "Chưa kết nối workspace Linear. Bấm nút bên dưới để kết nối workspace và dùng tính năng này.",
                "BUTTON_TEXT": "Kết nối workspace Linear"
            }
        },
        "NOTION": {
            "HEADER": "Notion",
            "DELETE": {
                "TITLE": "Bạn chắc chắn muốn xóa kết nối Notion?",
                "MESSAGE": "Xóa kết nối này sẽ gỡ quyền truy cập workspace Notion của bạn và dừng mọi tính năng liên quan.",
                "CONFIRM": "Có, xoá",
                "CANCEL": "Huỷ"
            }
        }
    },
    "INVITE_LINKS": {
        "API": {
            "ERROR_MESSAGE": "Không kết nối được máy chủ. Bạn hãy thử lại sau."
        },
        "PAGE": {
            "TITLE": "Lời mời tham gia {account}",
            "ROLE_BADGE": "Vai trò: {role}",
            "JOIN": {
                "BUTTON": "Tham gia ngay",
                "LOGGED_IN_AS": "Bạn đang đăng nhập với {email}."
            },
            "SIGNUP": {
                "TITLE": "Tạo tài khoản để tham gia {account}",
                "NAME": {
                    "LABEL": "Tên của bạn",
                    "PLACEHOLDER": "Nhập tên hiển thị"
                },
                "EMAIL": {
                    "LABEL": "Email",
                    "PLACEHOLDER": "Nhập địa chỉ email",
                    "ERROR": "Bạn hãy nhập địa chỉ email hợp lệ."
                },
                "PASSWORD": {
                    "LABEL": "Mật khẩu",
                    "PLACEHOLDER": "Đặt mật khẩu đăng nhập"
                },
                "SUBMIT": "Tạo tài khoản và tham gia"
            },
            "LOGIN_LINK": "Đã có tài khoản? Đăng nhập trước rồi mở lại đường dẫn này để tham gia.",
            "BACK_HOME": "Về trang chủ",
            "ERRORS": {
                "NOT_FOUND": {
                    "TITLE": "Không tìm thấy lời mời",
                    "DESC": "Đường dẫn mời này không tồn tại. Bạn hãy xin người quản trị gửi lại."
                },
                "REVOKED": {
                    "TITLE": "Lời mời đã bị thu hồi",
                    "DESC": "Người quản trị đã thu hồi đường dẫn này. Bạn hãy xin một đường dẫn mới."
                },
                "EXPIRED": {
                    "TITLE": "Lời mời đã hết hạn",
                    "DESC": "Đường dẫn mời này đã hết hạn sử dụng. Bạn hãy xin người quản trị gửi lại."
                },
                "EXHAUSTED": {
                    "TITLE": "Lời mời đã hết lượt dùng",
                    "DESC": "Đường dẫn mời này đã dùng hết số lượt cho phép. Bạn hãy xin một đường dẫn mới."
                }
            }
        },
        "MANAGE": {
            "BUTTON": "Mời qua link",
            "TITLE": "Mời qua đường dẫn",
            "DESC": "Tạo đường dẫn để gửi tay qua Zalo. Người nhận tự tạo tài khoản hoặc tham gia một chạm nếu đã có tài khoản.",
            "CLOSE": "Đóng",
            "FORM": {
                "ROLE": {
                    "LABEL": "Vai trò"
                },
                "EXPIRES": {
                    "LABEL": "Hạn dùng",
                    "OPTIONS": {
                        "DAY_1": "1 ngày",
                        "DAY_7": "7 ngày",
                        "DAY_30": "30 ngày"
                    }
                },
                "MAX_USES": {
                    "LABEL": "Giới hạn số lượt dùng",
                    "PLACEHOLDER": "Để trống = không giới hạn tới khi hết hạn"
                },
                "SUBMIT": "Tạo đường dẫn"
            },
            "CREATED": {
                "TITLE": "Đã tạo đường dẫn mời",
                "HINT": "Đường dẫn này chỉ hiện đầy đủ một lần. Bạn hãy sao chép hoặc gửi ngay.",
                "COPY": "Sao chép",
                "COPIED": "Đã sao chép",
                "SHARE": "Chia sẻ"
            },
            "LIST": {
                "EMPTY": "Chưa có đường dẫn mời nào.",
                "ROLE_LABEL": "Vai trò {role}",
                "STATUS": {
                    "ACTIVE": "Đang hoạt động",
                    "REVOKED": "Đã thu hồi",
                    "EXPIRED": "Đã hết hạn",
                    "EXHAUSTED": "Đã hết lượt"
                },
                "USES_UNLIMITED": "{used} lượt đã dùng (không giới hạn)",
                "USES_LIMITED": "{used}/{max} lượt đã dùng",
                "EXPIRES_AT": "Hết hạn {date}",
                "CREATED_BY": "Tạo bởi {name}",
                "REVOKE": {
                    "BUTTON": "Thu hồi",
                    "CONFIRM": {
                        "TITLE": "Thu hồi đường dẫn mời",
                        "MESSAGE": "Đường dẫn này sẽ không dùng để tham gia được nữa. Bạn có chắc muốn thu hồi?",
                        "YES": "Thu hồi",
                        "NO": "Không, giữ lại"
                    }
                }
            },
            "API": {
                "CREATE_SUCCESS": "Đã tạo đường dẫn mời",
                "REVOKE_SUCCESS": "Đã thu hồi đường dẫn mời"
            }
        }
    },
    "KEYBOARD_SHORTCUTS": {
        "TOGGLE_MODAL": "Xem tất cả phím tắt",
        "TITLE": {
            "OPEN_CONVERSATION": "Mở hội thoại",
            "RESOLVE_AND_NEXT": "Giải quyết và đi đến cái tiếp theo",
            "NAVIGATE_DROPDOWN": "Điều hướng các mục thả xuống",
            "RESOLVE_CONVERSATION": "Giải quyết hội thoại",
            "GO_TO_CONVERSATION_DASHBOARD": "Đi tới Trang tổng quan hội thoại",
            "ADD_ATTACHMENT": "Thêm đính kèm",
            "GO_TO_CONTACTS_DASHBOARD": "Đi tới Trang tổng quan liên hệ",
            "TOGGLE_SIDEBAR": "Chuyển đổi thanh bên",
            "GO_TO_REPORTS_SIDEBAR": "Đi đến thanh bên Báo cáo",
            "MOVE_TO_NEXT_TAB": "Di chuyển đến tab tiếp theo trong danh sách hội thoại",
            "GO_TO_SETTINGS": "Đi đến Cài đặt",
            "SWITCH_TO_PRIVATE_NOTE": "Chuyển sang Ghi chú Riêng tư",
            "SWITCH_TO_REPLY": "Chuyển sang phản hồi",
            "TOGGLE_SNOOZE_DROPDOWN": "Chuyển đổi thả xuống tạm dừng"
        }
    },
    "LABEL": {
        "TAG_BUTTON": "tag"
    },
    "LABEL_MGMT": {
        "HEADER": "Nhãn",
        "HEADER_BTN_TXT": "Thêm nhãn",
        "LOADING": "Tải về các nhãn",
        "DESCRIPTION": "Nhãn giúp bạn phân loại và sắp xếp mức ưu tiên cho hội thoại và khách tiềm năng. Bạn có thể gắn nhãn cho hội thoại hoặc liên hệ từ khung bên cạnh.",
        "LEARN_MORE": "Tìm hiểu thêm về nhãn",
        "COUNT": "{n} nhãn | {n} nhãn",
        "SEARCH_PLACEHOLDER": "Tìm nhãn...",
        "NO_RESULTS": "Không tìm thấy nhãn nào khớp",
        "SEARCH_404": "Không có kết quả nào phù hợp",
        "LIST": {
            "404": "Không có nhãn nào có sẵn trong tài khoản này.",
            "TITLE": "Quản lý nhãn",
            "DESC": "Nhãn cho phép bạn nhóm các hội thoại lại với nhau.",
            "TABLE_HEADER": {
                "NAME": "Tên",
                "DESCRIPTION": "Mô tả",
                "COLOR": "Màu sắc",
                "ACTION": "Hành động"
            }
        },
        "FORM": {
            "NAME": {
                "LABEL": "Tên nhãn",
                "PLACEHOLDER": "Tên nhãn",
                "REQUIRED_ERROR": "Tên nhãn là bắt buộc",
                "MINIMUM_LENGTH_ERROR": "Bắt buộc độ dài tối thiểu là 2",
                "VALID_ERROR": "Chỉ cho phép Chữ cái, Chữ số, Dấu gạch ngang và Dấu gạch dưới"
            },
            "DESCRIPTION": {
                "LABEL": "Mô tả",
                "PLACEHOLDER": "Mô tả cho nhãn"
            },
            "COLOR": {
                "LABEL": "Màu sắc"
            },
            "SHOW_ON_SIDEBAR": {
                "LABEL": "Hiển thị nhãn trên sidebar"
            },
            "EDIT": "Chỉnh sửa",
            "CREATE": "Tạo",
            "DELETE": "Xoá",
            "CANCEL": "Huỷ"
        },
        "ADD": {
            "TITLE": "Thêm nhãn",
            "DESC": "Nhãn cho phép bạn nhóm các hội thoại lại với nhau.",
            "API": {
                "SUCCESS_MESSAGE": "Thêm nhãn thành công",
                "ERROR_MESSAGE": "Đã có lỗi, vui lòng thử lại"
            }
        },
        "EDIT": {
            "TITLE": "Chỉnh sửa nhãn",
            "API": {
                "SUCCESS_MESSAGE": "Nhãn được cập nhật thành công",
                "ERROR_MESSAGE": "Đã có lỗi, vui lòng thử lại"
            }
        },
        "DELETE": {
            "BUTTON_TEXT": "Xoá",
            "API": {
                "SUCCESS_MESSAGE": "Nhãn đã được xoá thành công",
                "ERROR_MESSAGE": "Đã có lỗi, vui lòng thử lại"
            },
            "CONFIRM": {
                "TITLE": "Xác Nhận Xoá",
                "MESSAGE": "Bạn có chắc muốn xoá? ",
                "YES": "Có, xoá ",
                "NO": "Không, giữ "
            }
        }
    },
    "LABEL_REPORTS": {
        "HEADER": "Tổng quan nhãn",
        "DESCRIPTION": "Theo dõi hiệu quả của từng nhãn qua các chỉ số chính như số hội thoại, thời gian phản hồi, thời gian xử lý và số ca đã xong. Bấm vào tên nhãn để xem chi tiết.",
        "LOADING_CHART": "Đang tải các biểu đồ dữ liệu...",
        "NO_ENOUGH_DATA": "Chúng tôi không nhận được đủ điểm dữ liệu để tạo báo cáo, Vui lòng thử lại sau.",
        "DOWNLOAD_LABEL_REPORTS": "Tải xuống báo cáo nhãn",
        "FILTER_DROPDOWN_LABEL": "Chọn Nhãn",
        "FILTERS": {
            "INPUT_PLACEHOLDER": {
                "LABELS": "Tìm nhãn"
            }
        },
        "METRICS": {
            "CONVERSATIONS": {
                "NAME": "Các hội thoại",
                "DESC": "( Tổng cộng )"
            },
            "INCOMING_MESSAGES": {
                "NAME": "Tin nhắn nhận được",
                "DESC": "( Tổng cộng )"
            },
            "OUTGOING_MESSAGES": {
                "NAME": "Tin nhắn gửi đi",
                "DESC": "( Tổng cộng )"
            },
            "FIRST_RESPONSE_TIME": {
                "NAME": "Thời gian phản hồi đầu tiên",
                "DESC": "( Trung bình )",
                "INFO_TEXT": "Tổng số hội thoại được sử dụng để tính toán:",
                "TOOLTIP_TEXT": "Thời gian phản hồi đầu tiên là {metricValue} (dựa trên {conversationCount} hội thoại)"
            },
            "RESOLUTION_TIME": {
                "NAME": "Thời gian giải quyết",
                "DESC": "( Trung bình )",
                "INFO_TEXT": "Tổng số hội thoại được sử dụng để tính toán:",
                "TOOLTIP_TEXT": "Thời gian giải quyết là {metricValue} (dựa trên {conversationCount} hội thoại)"
            },
            "RESOLUTION_COUNT": {
                "NAME": "Số lượng giải quyết",
                "DESC": "( Tổng cộng )"
            }
        },
        "CUSTOM_DATE_RANGE": {
            "CONFIRM": "Áp dụng",
            "PLACEHOLDER": "Chọn phạm vi ngày"
        }
    },
    "LANDING": {
        "meta": {
            "title": "Yona · CRM hội thoại cho SME Việt",
            "description": "Gom tin nhắn khách từ Zalo cá nhân, website và email về một hộp thư. Biến hội thoại thành hồ sơ khách hàng, tự động gắn nhãn và phân công theo quy tắc."
        },
        "nav": {
            "features": "Tính năng",
            "pricing": "Bảng giá",
            "login": "Đăng nhập",
            "register": "Dùng thử",
            "dashboard": "Vào Dashboard",
            "back_to_home": "Về trang chủ",
            "language": "Ngôn ngữ",
            "menu": "Menu",
            "menu_close": "Đóng menu",
            "demo": "Đặt lịch demo",
            "zalo": "Zalo cá nhân"
        },
        "cta": {
            "primary": "Dùng thử miễn phí",
            "secondary": "Xem hộp thư",
            "learn": "Tìm hiểu thêm"
        },
        "hero": {
            "title_lead": "Gom mọi tin nhắn khách",
            "title_focus": "về một hộp thư",
            "title_tail": "và chốt đơn nhanh hơn",
            "subtitle": "Yona là CRM lấy hội thoại làm cửa vào. Khách nhắn ở Zalo, website hay email đều về cùng một nơi, và tự thành hồ sơ khách hàng.",
            "cta_primary": "Dùng thử miễn phí",
            "cta_secondary": "Đăng nhập",
            "fine": "Miễn phí khi đang hoàn thiện. Không cần thẻ tín dụng.",
            "cta_dashboard": "Vào Dashboard"
        },
        "showcase": {
            "title_lead": "Hai mặt,",
            "title_focus": "một luồng dữ liệu",
            "tabs": {
                "inbox": "Hộp thư hội thoại",
                "records": "Hồ sơ khách hàng"
            }
        },
        "channels": {
            "eyebrow": "Khách nhắn ở đâu, Yona nhận ở đó",
            "coming_soon": "Sắp có: :channels.",
            "note": "Thêm kênh là thêm driver, không phải xây lại hệ thống."
        },
        "features": {
            "inbox": {
                "eyebrow": "Hộp thư hội thoại",
                "title_a": "Một hộp thư cho cả đội,",
                "title_b": "mọi kênh đổ về",
                "body": "Zalo, website và email cùng vào một danh sách. Cả đội nhìn chung một hội thoại theo thời gian thực, nên không ai trả lời trùng và không tin nào rơi.",
                "cards": {
                    "collision": {
                        "title": "Không ai trả lời trùng",
                        "body": "Đồng nghiệp đang gõ trả lời là bạn thấy ngay. Giao hội thoại cho đúng người và nhắc nhau bằng ghi chú riêng, khách không đọc được."
                    },
                    "history": {
                        "title": "Lịch sử nằm cạnh tin nhắn",
                        "body": "Nhãn, ghi chú, người phụ trách và mọi lần trao đổi trước đó ở cùng một màn hình. Không phải mở thêm ứng dụng nào."
                    },
                    "mobile": {
                        "title": "Trả lời được từ điện thoại",
                        "body": "Giao diện gọn lại vừa màn hình nhỏ, giữ nguyên thao tác. Đang đi đường vẫn chốt được đơn."
                    }
                }
            },
            "zalo": {
                "eyebrow": "Zalo cá nhân",
                "title_a": "Kênh mà nhiều CRM",
                "title_b": "bỏ trống",
                "body": "Phần lớn SME Việt bán hàng bằng Zalo cá nhân chứ không phải Official Account. Yona kết nối thẳng vào Zalo cá nhân, và tin nhắn đi vào cùng hộp thư với mọi kênh còn lại.",
                "cards": {
                    "qr": {
                        "title": "Kết nối bằng quét QR",
                        "body": "Mở Yona, quét mã, xong. Không chờ duyệt Official Account, không cần giấy phép doanh nghiệp."
                    },
                    "reply": {
                        "title": "Trả lời từ Yona, khách nhận trên Zalo",
                        "body": "Tin bạn gửi trong hộp thư đi ra từ chính tài khoản Zalo bạn đang bán hàng. Thu hồi và thả cảm xúc cũng đi hai chiều."
                    },
                    "key": {
                        "title": "Số điện thoại là khóa",
                        "body": "Cùng một số trên Zalo và website sẽ gộp thành một hồ sơ, không tách ra thành hai khách."
                    }
                }
            },
            "crm": {
                "eyebrow": "Hồ sơ khách hàng",
                "title_a": "Hội thoại tự trở thành",
                "title_b": "hồ sơ khách hàng",
                "body": "Ai nhắn tới cũng có hồ sơ, kèm lịch sử mọi lần trao đổi và kênh khách đã dùng. Nhãn, ghi chú và thuộc tính riêng của bạn nằm cùng một chỗ.",
                "cards": {
                    "draft": {
                        "title": "Người lạ chưa vào danh sách",
                        "body": "Người nhắn tới mà chưa có số điện thoại hay email là liên hệ nháp. Có số hoặc email rồi mới vào danh sách liên hệ, nên danh sách không bị thổi phồng."
                    },
                    "source": {
                        "title": "Luôn biết khách từ đâu",
                        "body": "Mỗi hội thoại ghi rõ kênh nó đến. Báo cáo theo từng kênh cho thấy kênh nào đông khách, để biết nên đổ công vào đâu."
                    },
                    "attributes": {
                        "title": "Trường thông tin của riêng bạn",
                        "body": "Thêm thuộc tính tùy biến như size, ngày sinh hay mã đơn, rồi lọc danh sách liên hệ theo đúng các trường đó. Nhập và xuất CSV khi cần."
                    }
                }
            }
        },
        "flow": {
            "eyebrow": "Vòng đời hội thoại",
            "title": "Từ tin nhắn đầu tới lúc xong việc",
            "subtitle": "Hội thoại đi hết vòng đời trong một hệ thống, không phải chép tay sang chỗ khác.",
            "steps": {
                "capture": {
                    "title": "Nhận",
                    "description": "Khách nhắn. Hệ thống tạo hồ sơ và ghi rõ hội thoại đến từ kênh nào."
                },
                "assign": {
                    "title": "Giao",
                    "description": "Quy tắc tự động gắn nhãn và giao hội thoại cho đúng người hoặc đúng nhóm, theo điều kiện bạn đặt."
                },
                "reply": {
                    "title": "Trả lời",
                    "description": "Câu trả lời mẫu và macro lo phần câu hỏi lặp lại. Cần người khác vào thì nhắc tên họ trong ghi chú riêng."
                },
                "resolve": {
                    "title": "Xong",
                    "description": "Đánh dấu đã xử lý, mời khách chấm điểm hài lòng, và xem báo cáo đội trả lời nhanh tới đâu."
                }
            }
        },
        "rules": {
            "eyebrow": "Làm cho thị trường Việt",
            "title": "Bốn thứ chúng tôi không thỏa hiệp",
            "items": {
                "dedupe": {
                    "title": "Một người, một hồ sơ",
                    "description": "Cùng số điện thoại thì gộp làm một, dù đến từ Zalo hôm nay và website tháng sau."
                },
                "draft": {
                    "title": "Người lạ chưa vào danh sách",
                    "description": "Ai nhắn cũng có hồ sơ, nhưng chưa có số điện thoại hay email thì chỉ là liên hệ nháp, chưa vào danh sách liên hệ. Số liệu vì thế không bị thổi phồng."
                },
                "source": {
                    "title": "Luôn biết khách từ đâu",
                    "description": "Mỗi hội thoại ghi rõ kênh nó đến. Biết kênh nào đông khách thì mới biết nên đổ công vào đâu."
                },
                "inbound": {
                    "title": "Không để rơi tin khách",
                    "description": "Không có hạn mức sử dụng nào chặn tin đến hay hội thoại mới. Dùng nhiều đến đâu, khách nhắn vẫn vào hộp thư."
                }
            }
        },
        "pricing": {
            "title": "Hiện tại dùng không giới hạn",
            "subtitle": "Yona đang trong giai đoạn hoàn thiện. Chưa có gói thu phí nào, nên không có tính năng nào bị khóa sau gói trả tiền.",
            "plan": "Bản đang hoàn thiện",
            "price": "0đ",
            "unit": "mỗi tháng",
            "points": {
                "unlimited": "Không giới hạn hội thoại, kênh hay thành viên",
                "no_card": "Không cần thẻ tín dụng",
                "notice": "Khi có gói thu phí, chúng tôi báo trước"
            },
            "cta": "Bắt đầu ngay",
            "fine": "Không có hạn mức nào đang áp. Danh sách liên hệ xuất được ra tệp CSV bất cứ lúc nào, dữ liệu là của bạn."
        },
        "closing": {
            "title": "Thử với tin nhắn của bạn",
            "cta_primary": "Dùng thử miễn phí",
            "cta_secondary": "Đăng nhập"
        },
        "footer": {
            "tagline": "CRM hội thoại và tự động hóa cho SME Việt.",
            "copyright": "© :year Yona. Đã đăng ký bản quyền.",
            "product": "Sản phẩm",
            "account": "Tài khoản",
            "language": "Ngôn ngữ",
            "note": "Sản phẩm của người Việt, làm cho thị trường Việt."
        },
        "demo": {
            "meta": {
                "title": "Đặt lịch demo Yona · 15 phút, kết nối Zalo ngay trong buổi gọi",
                "description": "Để lại tên và số điện thoại, chúng tôi gọi lại trong giờ làm việc. Buổi gọi 15 phút, kết nối Zalo của bạn ngay tại chỗ."
            },
            "eyebrow": "Đặt lịch demo",
            "title": "Để lại số, chúng tôi gọi lại",
            "lead": "Một buổi 15 phút. Chúng tôi kết nối Zalo của bạn ngay trong buổi gọi, không cần cài gì trước.",
            "promise": {
                "connect": "Quét QR kết nối Zalo cá nhân ngay trong buổi gọi, bạn xem tin nhắn thật chạy về hộp thư.",
                "fit": "Nói thẳng chỗ nào Yona làm được, chỗ nào chưa. Chưa có thì chúng tôi nói là chưa có.",
                "callback": "Gọi lại trong giờ làm việc, từ 8h tới 18h các ngày trong tuần."
            },
            "form": {
                "legend": "Thông tin liên hệ",
                "name_label": "Tên bạn",
                "name_placeholder": "Ví dụ: Trần Thu Hà",
                "phone_label": "Số điện thoại",
                "phone_placeholder": "0912 345 678",
                "phone_hint": "Số này cũng là số Zalo thì tốt nhất, chúng tôi nhắn trước khi gọi.",
                "phone_invalid": "Số điện thoại chưa đúng. Nhập dạng 0912345678 hoặc +84912345678.",
                "note_label": "Bạn đang bán gì, đang gặp vướng ở đâu (không bắt buộc)",
                "note_placeholder": "Ví dụ: shop mỹ phẩm, ba bạn cùng trả lời một số Zalo, hay bị trùng khách.",
                "honeypot_label": "Website",
                "submit": "Gửi và chờ gọi lại",
                "required_note": "Dấu * là ô bắt buộc.",
                "privacy": "Chúng tôi dùng số của bạn để liên hệ về Yona, không bán cho ai và không thêm vào danh sách quảng cáo.",
                "failed": "Gửi không thành công. Bạn thử lại, hoặc nhắn Zalo và gọi hotline bên dưới, cách nào cũng tới đúng người."
            },
            "alt": {
                "title": "Muốn nhắn ngay thay vì chờ gọi lại",
                "hotline": "Gọi hotline",
                "zalo": "Nhắn Zalo",
                "note": "Bạn cũng có thể bấm bong bóng chat ở góc phải, đó chính là Yona đang chạy thật."
            },
            "thanks": {
                "meta": {
                    "title": "Đã nhận yêu cầu đặt lịch demo · Yona",
                    "description": "Chúng tôi đã nhận thông tin của bạn và sẽ gọi lại trong giờ làm việc."
                },
                "eyebrow": "Đã nhận",
                "title": "Đã nhận. Chúng tôi gọi lại trong giờ làm việc.",
                "lead": "Yêu cầu của bạn đã nằm trong hộp thư của chúng tôi, cùng chỗ với tin nhắn khách hàng. Không cần gửi lại.",
                "next": {
                    "when": "Trong giờ làm việc, từ 8h tới 18h các ngày trong tuần.",
                    "how": "Chúng tôi nhắn Zalo trước rồi mới gọi, để bạn biết ai đang gọi.",
                    "prepare": "Bạn chuẩn bị điện thoại có Zalo đang đăng nhập là đủ."
                },
                "cta_home": "Về trang chủ",
                "cta_zalo": "Xem Yona làm gì với Zalo cá nhân"
            }
        },
        "zalo_page": {
            "meta": {
                "title": "Quản lý khách Zalo cá nhân · Yona",
                "description": "Gom tin nhắn Zalo cá nhân của cả nhóm về một hộp thư dùng chung. Quét QR một lần, khách thành hồ sơ, số điện thoại là khoá chống trùng."
            },
            "hero": {
                "eyebrow": "Zalo cá nhân",
                "title_a": "Bán bằng Zalo cá nhân,",
                "title_b": "quản như một hộp thư",
                "lead": "Quét QR một lần. Tin nhắn khách từ Zalo cá nhân đổ về hộp thư dùng chung, ai trả lời cũng thấy, và mỗi khách tự thành một hồ sơ.",
                "cta_primary": "Đặt lịch demo",
                "cta_secondary": "Xem các kênh khác"
            },
            "problem": {
                "eyebrow": "Vấn đề",
                "title": "Zalo cá nhân bán tốt, nhưng không quản được",
                "items": {
                    "mixed": {
                        "title": "Tin khách lẫn tin riêng",
                        "description": "Đơn hàng nằm giữa tin gia đình và nhóm bạn. Tìm lại một cuộc trao đổi ba ngày trước là dò tay."
                    },
                    "shared": {
                        "title": "Nhiều người, một máy",
                        "description": "Cả nhóm dùng chung một điện thoại để trả lời. Ai đang cầm máy thì người khác phải chờ."
                    },
                    "blind": {
                        "title": "Không ai biết ai đã trả lời",
                        "description": "Hai người trả lời cùng một khách hai kiểu, hoặc không ai trả lời vì tưởng người kia đã làm."
                    },
                    "lost": {
                        "title": "Khách rơi không dấu vết",
                        "description": "Người hỏi giá rồi im. Không có chỗ nào ghi lại để hôm sau nhắn lại, nên khách đó coi như mất."
                    }
                }
            },
            "solution": {
                "eyebrow": "Cách Yona giải",
                "title_a": "Một lần quét QR,",
                "title_b": "cả nhóm dùng chung một hộp thư",
                "body": "Yona nối vào đúng tài khoản Zalo bạn đang bán, không đổi số, không bắt khách thêm bạn mới. Tin nhắn vào ra vẫn ở Zalo, chỉ thêm một bản trong hộp thư để cả nhóm cùng thấy.",
                "cards": {
                    "qr": {
                        "title": "Quét QR một lần",
                        "body": "Đăng nhập bằng mã QR như khi mở Zalo trên máy tính. Không cần đăng ký gì với Zalo."
                    },
                    "shared": {
                        "title": "Hộp thư dùng chung",
                        "body": "Mỗi người một tài khoản Yona, cùng nhìn một hàng hội thoại, thấy rõ ai đang trả lời ai."
                    },
                    "draft": {
                        "title": "Người lạ là liên hệ nháp",
                        "body": "Người mới nhắn mà chưa có số điện thoại hay email thì chưa vào danh sách liên hệ. Có số, lấy từ hồ sơ Zalo hoặc do bạn nhập, là vào danh sách."
                    },
                    "dedupe": {
                        "title": "Số điện thoại chống trùng",
                        "body": "Cùng một người nhắn ở Zalo và website vẫn gộp về một hồ sơ, vì khoá là số điện thoại."
                    }
                }
            },
            "caps": {
                "eyebrow": "Làm được thật",
                "title": "Những gì Yona làm được trên Zalo cá nhân",
                "note": "Danh sách này là năng lực đang chạy trong sản phẩm, không phải kế hoạch.",
                "items": {
                    "recall": {
                        "title": "Thu hồi hai chiều",
                        "description": "Bạn thu hồi tin trong Yona thì tin trên Zalo cũng mất, và ngược lại."
                    },
                    "reaction": {
                        "title": "Thả cảm xúc",
                        "description": "Cảm xúc khách thả hiện trong hộp thư, và bạn thả lại được từ Yona."
                    },
                    "group": {
                        "title": "Tin nhóm hiện tên người gửi",
                        "description": "Nhóm nhiều người vẫn biết câu nào của ai, không phải đoán theo lượt."
                    },
                    "rich": {
                        "title": "Vị trí, danh thiếp, thẻ ngân hàng",
                        "description": "Những thứ khách gửi kèm đều hiện đúng dạng, không thành một dòng chữ trống."
                    }
                }
            },
            "risk": {
                "eyebrow": "Nói trước",
                "title": "Zalo cá nhân không có API chính thức",
                "body": "Chúng tôi nói thẳng để bạn quyết định với đủ thông tin, thay vì tự phát hiện sau khi đã chuyển việc sang.",
                "points": {
                    "unofficial": "Kết nối đi qua đường không chính thức. Zalo có thể đổi cách hoạt động bất cứ lúc nào và kết nối sẽ gián đoạn.",
                    "ban": "Tài khoản Zalo có thể bị hạn chế hoặc khóa. Rủi ro này có thật và không ai loại bỏ được nó.",
                    "keep": "Tin nhắn đã về Yona thì nằm lại trong hộp thư và hồ sơ khách, kể cả khi kết nối dừng.",
                    "oa": "Cần một kênh chính thức và ổn định lâu dài thì Zalo OA là đường đúng. Yona hiện chưa kết nối Zalo OA."
                }
            },
            "closing": {
                "title": "Xem thử với tin nhắn Zalo của bạn",
                "lead": "Một buổi 15 phút. Chúng tôi quét QR ngay trong buổi gọi để bạn thấy tin thật chạy về.",
                "cta_primary": "Đặt lịch demo",
                "cta_secondary": "Về trang chủ"
            }
        }
    },
    "LEGAL": {
        "nav": {
            "heading": "Pháp lý",
            "terms": "Điều khoản sử dụng",
            "privacy": "Chính sách riêng tư"
        },
        "eyebrow": "Pháp lý",
        "updated": "Cập nhật lần cuối: :date",
        "related": "Đọc cùng",
        "terms": {
            "meta": {
                "title": "Điều khoản sử dụng · Yona",
                "description": "Điều khoản khi dùng Yona: phạm vi dịch vụ trong giai đoạn chưa thu phí, rủi ro của kênh Zalo cá nhân, dữ liệu của bạn và quyền truy cập của đội Yona."
            },
            "title": "Điều khoản sử dụng",
            "updated_on": "24/09/2026",
            "lead": "Điều khoản này áp dụng khi bạn tạo tài khoản và dùng Yona. Chúng tôi viết ngắn và nói thẳng những giới hạn đang có, để bạn quyết định với đủ thông tin.",
            "sections": {
                "service": {
                    "heading": "1. Yona là gì",
                    "body": {
                        "what": "Yona là phần mềm chạy trên web. Yona gom tin nhắn khách hàng từ nhiều kênh chat về một hộp thư dùng chung cho cả nhóm, và lưu người nhắn thành hồ sơ liên hệ.",
                        "channels": "Kênh dùng được là những kênh bấm chọn được khi tạo hộp thư mới, như Zalo cá nhân, khung chat trên website và email. Kênh chưa bấm chọn được hoặc còn ghi \"Sắp có\" thì chưa dùng được, và điều khoản này không hứa kênh đó."
                    }
                },
                "account": {
                    "heading": "2. Tài khoản và thành viên",
                    "points": {
                        "owner": "Người tạo tài khoản là quản trị viên, có quyền mời thành viên, phân vai trò và kết nối kênh.",
                        "password": "Bạn giữ mật khẩu của mình và chịu trách nhiệm với thao tác thực hiện dưới tài khoản đó. Nên bật xác thực hai lớp trong phần Hồ sơ.",
                        "members": "Quản trị viên chịu trách nhiệm với những người mình mời vào tài khoản."
                    }
                },
                "free_phase": {
                    "heading": "3. Giai đoạn chưa thu phí",
                    "body": {
                        "now": "Yona đang trong giai đoạn hoàn thiện. Hiện chưa có gói thu phí nào: không giới hạn số hội thoại, số kênh hay số thành viên, và không cần thẻ thanh toán."
                    },
                    "points": {
                        "no_payment": "Yona chưa có chức năng thanh toán, nên không lưu thông tin thẻ hay tài khoản ngân hàng nào của bạn.",
                        "notice": "Khi có gói thu phí, chúng tôi báo trước cho quản trị viên của từng tài khoản.",
                        "changes": "Trong giai đoạn này tính năng có thể thay đổi, và dịch vụ có thể tạm gián đoạn trong lúc cập nhật."
                    }
                },
                "zalo": {
                    "heading": "4. Kênh Zalo cá nhân và rủi ro đi kèm",
                    "body": {
                        "how": "Zalo không có API chính thức cho tài khoản cá nhân. Yona kết nối bằng cách đăng nhập tài khoản Zalo của bạn qua mã QR, dùng một thư viện mã nguồn mở không chính thức (zca-js)."
                    },
                    "points": {
                        "unofficial": "Zalo có thể đổi cách hoạt động bất cứ lúc nào. Khi đó kết nối gián đoạn cho tới khi Yona cập nhật theo.",
                        "ban": "Tài khoản Zalo có thể bị hạn chế hoặc khoá. Rủi ro này có thật, và cả bạn lẫn Yona đều không loại bỏ được nó.",
                        "tos": "Dùng công cụ không chính thức có thể trái với điều khoản sử dụng của Zalo. Bạn tự quyết định có kết nối tài khoản nào hay không.",
                        "session": "Phiên đăng nhập Zalo được lưu trên máy chủ của Yona để giữ kết nối. Cách lưu được nói rõ trong Chính sách riêng tư.",
                        "keep": "Tin nhắn đã về Yona vẫn nằm trong hộp thư và hồ sơ khách, kể cả khi kết nối dừng.",
                        "oa": "Cần một kênh chính thức và ổn định lâu dài thì Zalo OA là đường đúng. Yona hiện chưa kết nối Zalo OA."
                    }
                },
                "acceptable_use": {
                    "heading": "5. Cách dùng được phép",
                    "body": {
                        "intro": "Bạn dùng Yona để trò chuyện với khách của chính mình. Bạn không được:"
                    },
                    "points": {
                        "spam": "gửi tin rác hoặc quảng cáo tới người chưa đồng ý nhận, hay dùng Yona trái quy định pháp luật về quảng cáo và chống tin nhắn rác;",
                        "personal_data": "thu thập hoặc dùng dữ liệu cá nhân của khách trái với pháp luật Việt Nam về bảo vệ dữ liệu cá nhân;",
                        "unlawful": "phát tán nội dung vi phạm pháp luật, nội dung lừa đảo hoặc mã độc qua tin nhắn và tệp đính kèm;",
                        "abuse": "tìm cách truy cập dữ liệu của tài khoản khác, hay làm quá tải hệ thống."
                    },
                    "note": "Bạn cũng phải tuân thủ điều khoản của từng nền tảng mình kết nối, như Zalo hay nhà cung cấp email."
                },
                "data": {
                    "heading": "6. Dữ liệu của bạn",
                    "points": {
                        "ownership": "Tin nhắn, hồ sơ liên hệ và tệp bạn đưa vào Yona là của bạn. Yona xử lý chúng để vận hành dịch vụ cho bạn, theo Chính sách riêng tư.",
                        "export": "Bạn tự xuất danh sách liên hệ và các báo cáo ra tệp CSV ngay trong ứng dụng, bất cứ lúc nào.",
                        "not_yet": "Hiện chưa có chức năng tự xuất toàn bộ hội thoại hay tự xoá tài khoản. Cần một trong hai việc này thì nhắn cho chúng tôi theo mục Liên hệ."
                    }
                },
                "yona_access": {
                    "heading": "7. Quyền truy cập của đội Yona",
                    "body": {
                        "what": "Đội vận hành Yona có tài khoản quản trị hệ thống. Tài khoản này xem được danh sách tài khoản và người dùng, và có chức năng đăng nhập dưới danh nghĩa một người dùng để hỗ trợ hoặc xử lý sự cố. Khi dùng chức năng đó, người của Yona thấy đúng những gì người dùng ấy thấy, gồm cả hội thoại.",
                        "when": "Chúng tôi chỉ dùng quyền này khi cần hỗ trợ bạn hoặc xử lý sự cố."
                    }
                },
                "termination": {
                    "heading": "8. Tạm ngừng và chấm dứt",
                    "points": {
                        "by_you": "Bạn ngừng dùng Yona lúc nào cũng được: ngắt kết nối kênh, xoá hộp thư, xoá liên hệ ngay trong ứng dụng, và nhắn cho chúng tôi nếu muốn xoá cả tài khoản.",
                        "by_yona": "Yona có thể tạm khoá tài khoản dùng trái mục 5, và báo cho quản trị viên của tài khoản đó."
                    }
                },
                "liability": {
                    "heading": "9. Giới hạn trách nhiệm",
                    "points": {
                        "as_is": "Trong giai đoạn hoàn thiện, Yona được cung cấp theo hiện trạng. Chúng tôi cố giữ dịch vụ ổn định nhưng chưa cam kết mức thời gian hoạt động.",
                        "platforms": "Yona không chịu trách nhiệm khi Zalo hay nền tảng bên thứ ba khác hạn chế, khoá tài khoản của bạn, hoặc thay đổi cách hoạt động.",
                        "law": "Điều khoản này được hiểu và áp dụng theo pháp luật Việt Nam."
                    }
                },
                "changes": {
                    "heading": "10. Thay đổi điều khoản",
                    "body": {
                        "how": "Khi điều khoản thay đổi, chúng tôi cập nhật ngày ở đầu trang này. Thay đổi nào ảnh hưởng tới quyền của bạn thì chúng tôi báo trước cho quản trị viên các tài khoản."
                    }
                },
                "contact": {
                    "heading": "11. Liên hệ",
                    "body": {
                        "how": "Nhắn cho chúng tôi qua khung chat ở góc dưới các trang của yona.vn, hoặc để lại số điện thoại ở trang Đặt lịch demo. Cả hai đều vào thẳng hộp thư của đội Yona."
                    }
                }
            }
        },
        "privacy": {
            "meta": {
                "title": "Chính sách riêng tư · Yona",
                "description": "Yona lưu dữ liệu gì, dùng để làm gì, ai xem được, bên thứ ba nào tham gia xử lý và bạn có quyền gì với dữ liệu của mình."
            },
            "title": "Chính sách riêng tư",
            "updated_on": "11/10/2026",
            "lead": "Chính sách này nói Yona lưu dữ liệu gì, dùng để làm gì, ai xem được và bạn có quyền gì. Mỗi điều ở đây mô tả đúng cách phần mềm đang hoạt động hôm nay, kể cả những chỗ còn hạn chế.",
            "sections": {
                "roles": {
                    "heading": "1. Hai vai trò của Yona",
                    "points": {
                        "account": "Với dữ liệu tài khoản của bạn và của thành viên trong nhóm, như tên, email và mật khẩu, Yona quyết định cách xử lý và chịu trách nhiệm trực tiếp.",
                        "customers": "Với dữ liệu khách hàng bạn đưa vào Yona, như tin nhắn, hồ sơ liên hệ và tệp đính kèm, doanh nghiệp của bạn quyết định mục đích sử dụng. Yona xử lý thay cho bạn, chỉ để vận hành dịch vụ."
                    },
                    "note": "Nếu bạn là khách của một doanh nghiệp đang dùng Yona, hãy liên hệ doanh nghiệp đó trước. Chúng tôi hỗ trợ họ đáp ứng yêu cầu của bạn."
                },
                "collected": {
                    "heading": "2. Dữ liệu Yona lưu",
                    "points": {
                        "account": "Tài khoản và thành viên: tên, email, ảnh đại diện, ngôn ngữ, mật khẩu (chỉ lưu dạng băm, không đọc ngược lại được), và mã xác thực hai lớp nếu bạn bật (lưu mã hoá).",
                        "sessions": "Phiên đăng nhập: địa chỉ IP và thông tin trình duyệt của từng phiên, để bạn xem và đăng xuất phiên từ xa trong phần Hồ sơ.",
                        "conversations": "Hội thoại: nội dung tin nhắn hai chiều, tệp đính kèm như ảnh, video, ghi âm, tài liệu, cùng ghi chú nội bộ, nhãn và người được giao.",
                        "contacts": "Hồ sơ liên hệ: tên, số điện thoại, email, ảnh đại diện, thuộc tính tuỳ biến và ghi chú do nhóm bạn nhập hoặc do kênh gửi về.",
                        "widget": "Khách nhắn qua khung chat trên website: loại và ngôn ngữ trình duyệt, cùng trang khách đang xem khi bắt đầu trò chuyện.",
                        "channels": "Thông tin kết nối kênh: phiên đăng nhập Zalo cá nhân (xem mục 5), mật khẩu hộp thư của kênh email, mã truy cập Google của hộp Gmail (xem mục 6) và mã truy cập các kênh khác. Mật khẩu email và mã truy cập được lưu mã hoá, trừ khoá API của kênh WhatsApp và SMS hiện còn lưu chưa mã hoá.",
                        "public": "Trang công khai của Yona: tên, số điện thoại và ghi chú bạn gửi ở trang Đặt lịch demo, và tin bạn nhắn qua khung chat trên yona.vn."
                    }
                },
                "purposes": {
                    "heading": "3. Yona dùng dữ liệu để làm gì",
                    "points": {
                        "messaging": "Nhận và gửi tin nhắn qua các kênh bạn kết nối, hiển thị hộp thư và hồ sơ khách cho nhóm của bạn.",
                        "security": "Đăng nhập và giữ an toàn tài khoản.",
                        "email": "Gửi email hệ thống: xác nhận đăng ký, đặt lại mật khẩu và các thông báo bạn đã bật.",
                        "support": "Hỗ trợ khi bạn yêu cầu và xử lý sự cố.",
                        "demo": "Gọi lại khi bạn đặt lịch demo.",
                        "analytics": "Đếm lượt xem trang ở dạng tổng hợp bằng Plausible, công cụ thống kê không dùng cookie."
                    }
                },
                "access": {
                    "heading": "4. Ai xem được dữ liệu",
                    "points": {
                        "members": "Thành viên trong tài khoản của bạn, theo vai trò và hộp thư được phân.",
                        "isolation": "Dữ liệu của mỗi doanh nghiệp tách riêng theo tài khoản. Thành viên của tài khoản này không xem được dữ liệu của tài khoản khác.",
                        "yona": "Đội vận hành Yona: có quyền quản trị hệ thống và chức năng đăng nhập dưới danh nghĩa một người dùng để hỗ trợ hoặc xử lý sự cố. Khi đó họ thấy đúng những gì người dùng ấy thấy.",
                        "files": "Tệp đính kèm mở được qua đường dẫn chứa chuỗi ngẫu nhiên, không cần đăng nhập. Ai có đường dẫn thì mở được tệp, nên đừng chia sẻ đường dẫn tệp ra ngoài nhóm."
                    }
                },
                "zalo_session": {
                    "heading": "5. Phiên đăng nhập Zalo cá nhân",
                    "points": {
                        "stored": "Khi bạn quét QR, Yona lưu phiên đăng nhập Zalo (cookie của phiên) thành một tệp trên máy chủ để giữ kết nối. Ai có tệp này là dùng được tài khoản Zalo đó.",
                        "protection": "Tệp chỉ tiến trình dịch vụ Zalo của Yona đọc được (quyền 0600 trong thư mục 0700). Tệp hiện chưa được mã hoá khi lưu trên đĩa.",
                        "removal": "Khi bạn ngắt kết nối Zalo trong cài đặt hộp thư, tệp phiên bị xoá.",
                        "transport": "Tin nhắn Zalo đi qua thư viện mã nguồn mở không chính thức zca-js tới máy chủ của Zalo."
                    }
                },
                "google_data": {
                    "heading": "6. Dữ liệu từ tài khoản Google (Gmail)",
                    "body": {
                        "intro": "Khi bạn chọn Đăng nhập Google để kết nối hộp thư Gmail hoặc Google Workspace, Yona xin quyền truy cập Gmail (phạm vi https://mail.google.com/) cùng địa chỉ email của tài khoản đó. Mục này nói rõ Yona làm gì với dữ liệu Google."
                    },
                    "points": {
                        "accessed": "Dữ liệu Yona truy cập: thư trong hộp thư đến (người gửi, người nhận, tiêu đề, nội dung, tệp đính kèm) và địa chỉ email của tài khoản Google bạn kết nối. Yona đọc thư qua IMAP và gửi thư qua SMTP của Gmail bằng mã truy cập do Google cấp.",
                        "use": "Mục đích duy nhất: đưa thư của khách vào hộp thư chung của nhóm bạn trên Yona, và gửi thư trả lời hoặc thư mới do nhóm bạn soạn từ chính địa chỉ của bạn. Yona không xoá và không di chuyển thư trong Gmail; khi Yona tải thư về, Gmail đánh dấu thư đó là đã đọc.",
                        "notifications": "Để thư mới hiện gần như ngay lập tức, Yona đăng ký nhận thông báo \"có thư mới\" của Gmail qua Google Cloud Pub/Sub. Thông báo chỉ chứa địa chỉ email và một mã thứ tự, không chứa nội dung thư.",
                        "storage": "Mã truy cập và mã làm mới của Google được lưu mã hoá. Thư đã đồng bộ được lưu trên máy chủ của Yona như mọi hội thoại khác (mục 2).",
                        "sharing": "Yona không bán dữ liệu Gmail, không dùng để quảng cáo và không chuyển cho bên thứ ba, trừ khi bạn tự bật một công cụ nhận dữ liệu hội thoại (webhook, agent bot, tích hợp ở mục 7), khi cần để vận hành tính năng bạn đang dùng, hoặc khi pháp luật yêu cầu.",
                        "ai": "Yona không dùng dữ liệu Gmail để huấn luyện hay cải thiện mô hình trí tuệ nhân tạo hoặc máy học dùng chung.",
                        "people": "Đội vận hành Yona không đọc thư Gmail của bạn, trừ khi bạn yêu cầu hỗ trợ cho một việc cụ thể, khi cần điều tra sự cố bảo mật hoặc lạm dụng, hoặc khi pháp luật yêu cầu.",
                        "disconnect": "Ngắt kết nối: xoá hộp thư Gmail trong phần cài đặt Hộp thư thì Yona xoá mã truy cập, dừng nhận thông báo từ Gmail và xoá các hội thoại của hộp thư đó cùng tệp đính kèm. Bạn cũng thu hồi quyền của Yona bất cứ lúc nào tại https://myaccount.google.com/permissions.",
                        "limited_use": "Yona sử dụng và chuyển giao thông tin nhận được từ Google API theo đúng Chính sách dữ liệu người dùng của Google API Services (https://developers.google.com/terms/api-services-user-data-policy), bao gồm các yêu cầu về Giới hạn sử dụng (Limited Use)."
                    }
                },
                "third_parties": {
                    "heading": "7. Bên thứ ba tham gia xử lý",
                    "points": {
                        "zalo": "Zalo: nhận và gửi tin nhắn của kênh Zalo cá nhân.",
                        "other_channels": "Nền tảng nhắn tin khác bạn kết nối, như Telegram, LINE, WhatsApp hay nhà cung cấp SMS: nhận và gửi tin nhắn của kênh đó.",
                        "cloudflare": "Cloudflare: mọi truy cập tới yona.vn đi qua mạng phân phối của Cloudflare. Máy chủ của Cloudflare có thể đặt ngoài Việt Nam.",
                        "mail": "Nhà cung cấp dịch vụ gửi email: chuyển email hệ thống tới hộp thư của bạn.",
                        "your_mailbox": "Máy chủ email của chính bạn: khi bạn kết nối kênh email, Yona đọc và gửi thư qua IMAP/SMTP bằng tài khoản bạn cung cấp.",
                        "google": "Google: hộp Gmail kết nối bằng Đăng nhập Google được đọc và gửi qua máy chủ Gmail, thông báo thư mới đi qua Google Cloud Pub/Sub (xem mục 6).",
                        "plausible": "Plausible: đếm lượt xem trang, không dùng cookie.",
                        "push": "Dịch vụ thông báo đẩy của trình duyệt: chỉ khi bạn bật thông báo đẩy, nội dung thông báo đi qua dịch vụ đẩy của trình duyệt bạn đang dùng.",
                        "your_tools": "Công cụ bạn tự nối vào: webhook, agent bot và các tích hợp bạn bật nhận dữ liệu hội thoại theo đúng cấu hình của bạn. Bạn chịu trách nhiệm với nơi nhận đó."
                    }
                },
                "retention": {
                    "heading": "8. Lưu trữ và xoá",
                    "points": {
                        "kept": "Tin nhắn, hồ sơ liên hệ và tệp được giữ cho tới khi bạn xoá chúng hoặc yêu cầu xoá tài khoản. Hiện Yona chưa tự xoá hội thoại theo thời hạn.",
                        "notifications": "Thông báo trong ứng dụng cũ hơn một tháng được tự động dọn.",
                        "self_service": "Bạn tự xoá liên hệ, tin nhắn và hộp thư ngay trong ứng dụng.",
                        "account": "Chưa có nút tự xoá tài khoản. Nhắn cho chúng tôi theo mục Liên hệ, đội vận hành sẽ xoá tài khoản cùng dữ liệu đi kèm từ trang quản trị hệ thống."
                    }
                },
                "security": {
                    "heading": "9. Bảo mật",
                    "points": {
                        "https": "Kết nối tới Yona dùng HTTPS.",
                        "passwords": "Mật khẩu lưu dạng băm. Bạn bật được xác thực hai lớp.",
                        "secrets": "Mật khẩu hộp thư email, mã truy cập Google và mã truy cập kênh lưu mã hoá, trừ khoá API của kênh WhatsApp và SMS (hiện chưa mã hoá).",
                        "zalo": "Phiên Zalo lưu dạng tệp chưa mã hoá, chỉ giới hạn quyền đọc (xem mục 5).",
                        "incident": "Không hệ thống nào an toàn tuyệt đối. Nếu phát hiện sự cố làm lộ dữ liệu, chúng tôi báo cho quản trị viên các tài khoản bị ảnh hưởng."
                    }
                },
                "rights": {
                    "heading": "10. Quyền của bạn",
                    "body": {
                        "intro": "Theo pháp luật Việt Nam về bảo vệ dữ liệu cá nhân, bạn có quyền:"
                    },
                    "points": {
                        "know": "được biết dữ liệu nào đang được xử lý và vì sao, chính là nội dung trang này;",
                        "access": "xem và sửa thông tin của mình trong phần Hồ sơ;",
                        "portability": "lấy dữ liệu ra: xuất danh sách liên hệ ra CSV ngay trong ứng dụng, dữ liệu khác thì yêu cầu qua mục Liên hệ;",
                        "delete": "yêu cầu xoá dữ liệu, hạn chế hoặc phản đối việc xử lý;",
                        "withdraw": "rút lại sự đồng ý bằng cách ngừng dùng và yêu cầu xoá tài khoản;",
                        "complain": "khiếu nại với chúng tôi hoặc với cơ quan nhà nước có thẩm quyền."
                    },
                    "note": "Chúng tôi trả lời yêu cầu qua đúng kênh bạn đã gửi."
                },
                "cookies": {
                    "heading": "11. Cookie",
                    "points": {
                        "session": "Cookie phiên đăng nhập và cookie chống giả mạo yêu cầu: bắt buộc để đăng nhập.",
                        "locale": "Cookie ngôn ngữ: nhớ ngôn ngữ bạn đã chọn.",
                        "widget": "Khung chat trên yona.vn lưu mã cuộc trò chuyện trong trình duyệt, để lần sau bạn quay lại vẫn thấy tin cũ.",
                        "no_ads": "Yona không dùng cookie quảng cáo hay cookie theo dõi."
                    }
                },
                "changes": {
                    "heading": "12. Thay đổi chính sách",
                    "body": {
                        "how": "Khi chính sách thay đổi, chúng tôi cập nhật ngày ở đầu trang này. Thay đổi nào ảnh hưởng tới quyền của bạn thì chúng tôi báo trước cho quản trị viên các tài khoản."
                    }
                },
                "contact": {
                    "heading": "13. Liên hệ",
                    "body": {
                        "how": "Nhắn cho chúng tôi qua khung chat ở góc dưới các trang của yona.vn, hoặc để lại số điện thoại ở trang Đặt lịch demo. Cả hai đều vào thẳng hộp thư của đội Yona."
                    }
                }
            }
        }
    },
    "LOGIN": {
        "TITLE": "Đăng nhập {installationName}",
        "EMAIL": {
            "LABEL": "Email",
            "PLACEHOLDER": "example{'@'}companyname.com",
            "ERROR": "Vui lòng nhập một địa chỉ email hợp lệ"
        },
        "PASSWORD": {
            "LABEL": "Mật khẩu",
            "PLACEHOLDER": "Mật khẩu"
        },
        "API": {
            "SUCCESS_MESSAGE": "Đăng nhập thành công",
            "ERROR_MESSAGE": "Không kết nối được máy chủ. Bạn hãy thử lại.",
            "UNAUTH": "Tên đăng nhập hoặc mật khẩu không đúng. Bạn hãy thử lại."
        },
        "OAUTH": {
            "GOOGLE_LOGIN": "Đăng nhập bằng Google",
            "GOOGLE_CONTINUE": "Tiếp tục với Google",
            "BUSINESS_ACCOUNTS_ONLY": "Bạn hãy dùng email công ty để đăng nhập",
            "NO_ACCOUNT_FOUND": "Chúng tôi không tìm thấy tài khoản nào cho địa chỉ email của bạn."
        },
        "FORGOT_PASSWORD": "Quên mật khẩu?",
        "CREATE_NEW_ACCOUNT": "Tạo mới tài khoản",
        "SUBMIT": "Đăng nhập",
        "SAML": {
            "LABEL": "Đăng nhập bằng SSO",
            "TITLE": "Bắt đầu đăng nhập một lần (SSO)",
            "SUBTITLE": "Nhập email công việc để vào tổ chức của bạn",
            "BACK_TO_LOGIN": "Đăng nhập bằng mật khẩu",
            "WORK_EMAIL": {
                "LABEL": "Email công việc",
                "PLACEHOLDER": "Nhập email công việc của bạn"
            },
            "SUBMIT": "Tiếp tục với SSO",
            "API": {
                "ERROR_MESSAGE": "Xác thực SSO thất bại. Bạn hãy kiểm tra lại thông tin rồi thử lại."
            }
        }
    },
    "MACROS": {
        "HEADER": "Macro",
        "DESCRIPTION": "Macro là một chuỗi hành động đã lưu sẵn giúp nhân viên chăm sóc khách hàng làm việc nhanh hơn. Nhân viên có thể đặt sẵn các hành động như gắn nhãn cho hội thoại, gửi bản ghi hội thoại qua email, cập nhật thuộc tính tùy chỉnh… rồi chạy tất cả chỉ bằng một cú bấm.",
        "LEARN_MORE": "Tìm hiểu thêm về macro",
        "COUNT": "{n} macro | {n} macro",
        "HEADER_BTN_TXT": "Thêm macro mới",
        "HEADER_BTN_TXT_SAVE": "Lưu macro",
        "LOADING": "Đang tải danh sách macro",
        "SEARCH_PLACEHOLDER": "Tìm macro...",
        "NO_RESULTS": "Không tìm thấy macro nào khớp",
        "ERROR": "Có lỗi xảy ra. Bạn hãy thử lại",
        "ORDER_INFO": "Macro sẽ chạy theo thứ tự hành động của bạn. Bạn có thể sắp xếp lại chúng bằng cách kéo chúng bằng tay cầm bên cạnh mỗi nút.",
        "ADD": {
            "FORM": {
                "NAME": {
                    "LABEL": "Tên Macro",
                    "PLACEHOLDER": "Nhập tên cho macro của bạn",
                    "ERROR": "Cần có tên để tạo macro"
                },
                "ACTIONS": {
                    "LABEL": "Hành động"
                }
            },
            "API": {
                "SUCCESS_MESSAGE": "Đã thêm macro thành công",
                "ERROR_MESSAGE": "Không thể tạo macro, vui lòng thử lại sau"
            }
        },
        "LIST": {
            "TABLE_HEADER": {
                "NAME": "Tên",
                "CREATED BY": "Tạo bởi",
                "LAST_UPDATED_BY": "Cập nhật lần cuối bởi",
                "VISIBILITY": "Hiển thị",
                "ACTIONS": "Hành động"
            },
            "404": "Không tìm thấy macro"
        },
        "DELETE": {
            "TOOLTIP": "Xóa Macro",
            "CONFIRM": {
                "MESSAGE": "Bạn có muốn xoá? ",
                "YES": "Có, Xoá",
                "NO": "Không"
            },
            "API": {
                "SUCCESS_MESSAGE": "Xóa Macro thành công",
                "ERROR_MESSAGE": "Đã xảy ra lỗi khi xóa macro. Vui lòng thử lại sau"
            }
        },
        "VIEW": {
            "TOOLTIP": "Xem macro"
        },
        "EDIT": {
            "TOOLTIP": "Sửa Macro",
            "API": {
                "SUCCESS_MESSAGE": "Đã cập nhật macro thành công",
                "ERROR_MESSAGE": "Không thể cập nhật Macro, vui lòng thử lại sau"
            }
        },
        "EDITOR": {
            "START_FLOW": "Bắt đầu quy trình",
            "END_FLOW": "Kết thúc quy trình",
            "LOADING": "Đang tìm nạp macro",
            "ADD_BTN_TOOLTIP": "Thêm hành động mới",
            "DELETE_BTN_TOOLTIP": "Xóa hành động",
            "VISIBILITY": {
                "LABEL": "Hiển thị Macro",
                "GLOBAL": {
                    "LABEL": "Công khai",
                    "DESCRIPTION": "Macro này có sẵn công khai cho tất cả các tác nhân trong tài khoản này.",
                    "CREATE_DISABLED_DESCRIPTION": "Chỉ quản trị viên mới tạo được macro dùng chung.",
                    "EDIT_DISABLED_DESCRIPTION": "Chỉ quản trị viên mới sửa được macro dùng chung."
                },
                "PERSONAL": {
                    "LABEL": "Riêng tư",
                    "DESCRIPTION": "Macro này sẽ là riêng tư đối với bạn và không có sẵn đối với những người khác."
                }
            }
        },
        "EXECUTE": {
            "BUTTON_TOOLTIP": "Thực thi",
            "PREVIEW": "Xem trước Macro",
            "EXECUTED_SUCCESSFULLY": "Macro được thực thi thành công",
            "EXECUTED_WITHOUT_RESOLVING": "Đã chạy macro. Hội thoại chưa được đánh dấu xử lý xong vì còn thiếu thuộc tính bắt buộc."
        },
        "ERRORS": {
            "ATTRIBUTE_KEY_REQUIRED": "Khóa thuộc tính là bắt buộc",
            "FILTER_OPERATOR_REQUIRED": "Toán tử lọc là bắt buộc",
            "VALUE_REQUIRED": "Giá trị bắt buộc có",
            "VALUE_MUST_BE_BETWEEN_1_AND_998": "Giá trị phải nằm trong khoảng 1 đến 998",
            "ACTION_PARAMETERS_REQUIRED": "Tham số của hành động là bắt buộc",
            "ATLEAST_ONE_CONDITION_REQUIRED": "Cần ít nhất một điều kiện",
            "ATLEAST_ONE_ACTION_REQUIRED": "Cần ít nhất một hành động"
        },
        "ACTIONS": {
            "ASSIGN_TEAM": "Giao cho một nhóm",
            "ASSIGN_AGENT": "Giao cho một nhân viên",
            "ADD_LABEL": "Gắn một nhãn",
            "REMOVE_LABEL": "Gỡ một nhãn",
            "REMOVE_ASSIGNED_AGENT": "Bỏ nhân viên đang phụ trách",
            "REMOVE_ASSIGNED_TEAM": "Bỏ nhóm đang phụ trách",
            "SEND_EMAIL_TRANSCRIPT": "Gửi bản ghi hội thoại qua email",
            "MUTE_CONVERSATION": "Tắt tiếng hội thoại",
            "SNOOZE_CONVERSATION": "Tạm dừng hội thoại",
            "RESOLVE_CONVERSATION": "Giải quyết hội thoại",
            "CHANGE_STATUS": "Đổi trạng thái",
            "SEND_ATTACHMENT": "Gửi tệp đính kèm",
            "SEND_MESSAGE": "Gửi một tin nhắn",
            "SEND_CANNED_CARD": "Gửi thẻ từ câu trả lời mẫu",
            "CHANGE_PRIORITY": "Đổi mức ưu tiên",
            "ADD_PRIVATE_NOTE": "Thêm một ghi chú riêng",
            "SEND_WEBHOOK_EVENT": "Gửi sự kiện webhook"
        },
        "PRIORITY_TYPES": {
            "NONE": "Không có",
            "LOW": "Thấp",
            "MEDIUM": "Trung bình",
            "HIGH": "Cao",
            "URGENT": "Cấp bách"
        }
    },
    "MERGE_CONTACTS": {
        "TITLE": "Hợp nhất các liên hệ",
        "DESCRIPTION": "Hợp nhất các liên hệ để kết hợp hai hồ sơ thành một, bao gồm tất cả các thuộc tính và hội thoại. Trong trường hợp xung đột, các thuộc tính của liên hệ Chính sẽ được ưu tiên.",
        "PRIMARY": {
            "TITLE": "Liên hệ chính",
            "HELP_LABEL": "Sẽ được xoá"
        },
        "PARENT": {
            "TITLE": "Liên hệ cần gộp",
            "PLACEHOLDER": "Tìm kiếm liên hệ",
            "HELP_LABEL": "Được giữ"
        },
        "SUMMARY": {
            "TITLE": "Tóm tắt",
            "DELETE_WARNING": "Liên hệ của <strong>{primaryContactName}</strong> sẽ bị xoá.",
            "ATTRIBUTE_WARNING": "Chi tiết liên hệ của <strong>{primaryContactName}</strong> sẽ được sao chép đến <strong>{parentContactName}</strong>."
        },
        "SEARCH": {
            "ERROR_MESSAGE": "Có lỗi xảy ra. Bạn hãy thử lại sau."
        },
        "FORM": {
            "SUBMIT": " Hợp nhất các liên hệ",
            "CANCEL": "Huỷ",
            "CHILD_CONTACT": {
                "ERROR": "Chọn một liên hệ con để gộp"
            },
            "SUCCESS_MESSAGE": "Liên hệ được gộp thành công",
            "ERROR_MESSAGE": "Không thể hợp nhất liên lạc, thử lại!"
        },
        "DROPDOWN_ITEM": {
            "ID": "(ID: {identifier})"
        }
    },
    "MESSAGING": {
        "errors": {
            "not_allowed": "Loại tin :type không gửi được theo chiều này.",
            "not_answerable": "Tin :type không nhận câu trả lời.",
            "unknown_choice": "Lựa chọn không có trong tin.",
            "already_submitted": "Tin này đã được trả lời.",
            "duplicate_choice": "Các lựa chọn phải khác nhau.",
            "duplicate_item": "Mã thẻ bị trùng.",
            "invalid_action": "Nút không hợp lệ.",
            "invalid_url": "Đường dẫn phải bắt đầu bằng http:// hoặc https://.",
            "invalid_phone": "Số điện thoại không hợp lệ.",
            "invalid_price": "Giá không hợp lệ.",
            "variants_without_order": "Thẻ có biến thể phải có nút Đặt mua.",
            "unknown_item": "Không tìm thấy sản phẩm để đặt.",
            "invalid_selection": "Lựa chọn :name không hợp lệ hoặc đã hết.",
            "quantity_exceeded": "Số lượng vượt quá mức cho phép.",
            "field_required": "Cần điền :field.",
            "field_invalid": ":field không hợp lệ.",
            "empty_submission": "Chưa có thông tin nào được gửi.",
            "payload_too_large": "Dữ liệu kèm trang quá lớn.",
            "unknown_payment_account": "Không tìm thấy tài khoản nhận tiền.",
            "payment_account_not_allowed": "Bạn không được gửi thẻ chuyển khoản bằng tài khoản này.",
            "duplicate_payment_account": "Ngân hàng và số tài khoản này đã được thêm."
        },
        "settings": {
            "invalid_channel": "Kênh khác không hợp lệ: kiểm tra loại kênh và đường dẫn hoặc số điện thoại.",
            "invalid_alert_tone": "Âm báo không có trong danh sách."
        },
        "preview": {
            "deleted": "Tin nhắn đã thu hồi",
            "image": "Đã gửi một ảnh",
            "file": "Đã gửi một tệp",
            "sticker": "Sticker"
        },
        "delivery": {
            "numbered_prompt": "Nhắn số tương ứng để chọn:"
        },
        "cards": {
            "preview_many": ":title và :count sản phẩm khác",
            "compare_at": "giá cũ :price, -:percent%"
        },
        "order_status": {
            "preview": "Đơn #:ref · :status",
            "eta": "Dự kiến nhận :date",
            "total": "Tổng :amount",
            "tracking": "Theo dõi: :url",
            "statuses": {
                "placed": "Đã đặt",
                "confirmed": "Đã xác nhận",
                "shipped": "Đã gửi",
                "delivering": "Đang giao",
                "delivered": "Đã nhận",
                "cancelled": "Đã huỷ"
            }
        },
        "order_request": {
            "preview": "Yêu cầu đặt hàng: :title",
            "line": "Yêu cầu đặt hàng: :title:selection × :quantity",
            "note": "Ghi chú: :note"
        },
        "bank_transfer": {
            "preview": "Chuyển khoản qua :bank",
            "bank_line": "Ngân hàng :bank, số TK :account",
            "holder": "Chủ TK :name",
            "amount": "Số tiền :amount",
            "memo": "Nội dung: :memo"
        },
        "kit": {
            "item_position": "Sản phẩm {current} trên {total}",
            "previous_item": "Sản phẩm trước",
            "next_item": "Sản phẩm sau",
            "copied": "Đã chép",
            "copy": "Chép {label}",
            "submit_field": "Gửi {field}",
            "submit": "Gửi",
            "selected": "Khách đã chọn: {value}",
            "form_received": "Đã nhận thông tin",
            "form_open": "Điền thông tin",
            "order_request": "Yêu cầu đặt hàng",
            "note": "Ghi chú: {note}",
            "order_ref": "Đơn #{ref}",
            "eta": "Dự kiến nhận {date}",
            "fee_included": "Đã gồm phí giao",
            "total": "Tổng",
            "track_order": "Theo dõi đơn",
            "help_article": "Trợ giúp",
            "more": "+{count}",
            "read_only": "Khách bấm được trong widget",
            "check_field": "Kiểm tra lại {field}",
            "send_failed": "Chưa gửi được, thử lại nhé",
            "steps": {
                "placed": "Đã đặt",
                "shipped": "Đã gửi",
                "delivering": "Đang giao",
                "delivered": "Đã nhận"
            },
            "bank_transfer_title": "Chuyển khoản ngân hàng",
            "show_qr": "Hiện mã QR để quét",
            "bank_transfer_qr_alt": "Mã QR chuyển khoản",
            "bank": "Ngân hàng",
            "account_number": "Số tài khoản",
            "account_holder": "Chủ tài khoản",
            "transfer_amount": "Số tiền",
            "transfer_memo": "Nội dung",
            "paid": "Đã nhận tiền"
        }
    },
    "MFA_SETTINGS": {
        "TITLE": "Xác thực hai lớp",
        "SUBTITLE": "Bảo vệ tài khoản khỏi truy cập trái phép bằng xác thực TOTP. Cách này thêm một lớp an toàn cho tài khoản của bạn.",
        "DESCRIPTION": "Thêm một lớp bảo vệ cho tài khoản bằng mã dùng một lần theo thời gian (TOTP)",
        "STATUS_TITLE": "Trạng thái xác thực",
        "STATUS_DESCRIPTION": "Quản lý thiết lập xác thực hai lớp và mã dự phòng của bạn",
        "ENABLED": "Bật",
        "DISABLED": "Không bật",
        "STATUS_ENABLED": "Xác thực hai lớp đang bật",
        "STATUS_ENABLED_DESC": "Tài khoản của bạn đã có thêm một lớp bảo vệ",
        "ENABLE_BUTTON": "Bật xác thực hai lớp",
        "ENHANCE_SECURITY": "Tăng cường bảo mật tài khoản",
        "ENHANCE_SECURITY_DESC": "Xác thực hai lớp thêm một lớp bảo vệ: ngoài mật khẩu, bạn còn phải nhập mã xác minh từ ứng dụng xác thực.",
        "SETUP": {
            "STEP_NUMBER_1": "1",
            "STEP_NUMBER_2": "2",
            "STEP1_TITLE": "Quét mã QR bằng ứng dụng xác thực của bạn",
            "STEP1_DESCRIPTION": "Dùng Google Authenticator, Authy hoặc bất kỳ ứng dụng nào hỗ trợ TOTP",
            "LOADING_QR": "Đang tải...",
            "MANUAL_ENTRY": "Không quét được? Nhập mã thủ công",
            "SECRET_KEY": "Khóa bí mật",
            "COPY": "Sao chép",
            "ENTER_CODE": "Nhập mã 6 số từ ứng dụng xác thực của bạn",
            "ENTER_CODE_PLACEHOLDER": "000000",
            "VERIFY_BUTTON": "Xác minh và tiếp tục",
            "CANCEL": "Huỷ",
            "ERROR_STARTING": "Chưa bật MFA. Bạn hãy liên hệ quản trị viên.",
            "INVALID_CODE": "Mã xác minh không đúng",
            "SECRET_COPIED": "Đã chép khóa bí mật",
            "SUCCESS": "Đã bật xác thực hai lớp"
        },
        "BACKUP": {
            "TITLE": "Lưu lại mã dự phòng của bạn",
            "DESCRIPTION": "Hãy cất những mã này ở nơi an toàn. Mỗi mã dùng được một lần khi bạn mất quyền truy cập ứng dụng xác thực",
            "IMPORTANT": "Quan trọng:",
            "IMPORTANT_NOTE": " Hãy lưu những mã này ở nơi an toàn. Bạn sẽ không xem lại được nữa.",
            "DOWNLOAD": "Tải xuống",
            "COPY_ALL": "Chép tất cả",
            "CONFIRM": "Tôi đã lưu mã dự phòng ở nơi an toàn và hiểu rằng sẽ không xem lại được nữa",
            "COMPLETE_SETUP": "Hoàn tất thiết lập",
            "CODES_COPIED": "Đã chép mã dự phòng"
        },
        "MANAGEMENT": {
            "BACKUP_CODES": "Mã dự phòng",
            "BACKUP_CODES_DESC": "Tạo mã mới nếu bạn đã dùng hết hoặc làm mất mã cũ",
            "REGENERATE": "Tạo lại mã dự phòng",
            "DISABLE_MFA": "Tắt xác thực hai lớp",
            "DISABLE_MFA_DESC": "Gỡ xác thực hai lớp khỏi tài khoản của bạn",
            "DISABLE_BUTTON": "Tắt xác thực hai lớp"
        },
        "LOW_BACKUP_CODES": {
            "MESSAGE": "Bạn còn {n} mã dự phòng. Hãy tạo mã mới để không bị khóa tài khoản nếu mất quyền truy cập ứng dụng xác thực. | Bạn còn {n} mã dự phòng. Hãy tạo mã mới để không bị khóa tài khoản nếu mất quyền truy cập ứng dụng xác thực.",
            "NONE_LEFT": "Bạn đã hết mã dự phòng. Hãy tạo mã mới ngay để không bị khóa tài khoản nếu mất quyền truy cập ứng dụng xác thực.",
            "ACTION": "Tạo mã"
        },
        "DISABLE": {
            "TITLE": "Tắt xác thực hai lớp",
            "DESCRIPTION": "You'll need to enter your password and a verification code to disable two-factor authentication.",
            "PASSWORD": "Mật khẩu",
            "OTP_CODE": "Mã xác minh",
            "OTP_CODE_PLACEHOLDER": "000000",
            "BACKUP_CODE": "Mã dự phòng",
            "BACKUP_CODE_PLACEHOLDER": "Nhập một trong các mã dự phòng của bạn",
            "USE_BACKUP_CODE": "Mất quyền truy cập ứng dụng xác thực? Hãy dùng mã dự phòng",
            "USE_OTP_CODE": "Dùng mã xác minh từ ứng dụng xác thực của bạn",
            "CONFIRM": "Tắt xác thực hai lớp",
            "CANCEL": "Huỷ",
            "SUCCESS": "Đã tắt xác thực hai lớp",
            "ERROR": "Không tắt được MFA. Bạn hãy kiểm tra lại thông tin đăng nhập."
        },
        "REGENERATE": {
            "TITLE": "Tạo lại mã dự phòng",
            "DESCRIPTION": "Thao tác này sẽ vô hiệu các mã dự phòng hiện có và tạo mã mới. Nhập mã xác minh để tiếp tục.",
            "OTP_CODE": "Mã xác minh",
            "OTP_CODE_PLACEHOLDER": "000000",
            "CONFIRM": "Tạo mã mới",
            "CANCEL": "Huỷ",
            "NEW_CODES_TITLE": "Đã tạo mã dự phòng mới",
            "NEW_CODES_DESC": "Các mã dự phòng cũ đã bị vô hiệu. Hãy lưu những mã mới này ở nơi an toàn.",
            "CODES_IMPORTANT": "Quan trọng:",
            "CODES_IMPORTANT_NOTE": " Mỗi mã chỉ dùng được một lần. Hãy lưu lại trước khi đóng cửa sổ này.",
            "DOWNLOAD_CODES": "Tải mã về",
            "COPY_ALL_CODES": "Chép tất cả mã",
            "CODES_SAVED": "Tôi đã lưu mã",
            "SUCCESS": "Đã tạo mã dự phòng mới",
            "ERROR": "Không tạo lại được mã dự phòng"
        }
    },
    "MFA_VERIFICATION": {
        "TITLE": "Xác thực hai lớp",
        "DESCRIPTION": "Nhập mã xác minh để tiếp tục",
        "AUTHENTICATOR_APP": "Ứng dụng xác thực",
        "BACKUP_CODE": "Mã dự phòng",
        "ENTER_OTP_CODE": "Nhập mã 6 số từ ứng dụng xác thực của bạn",
        "ENTER_BACKUP_CODE": "Nhập một trong các mã dự phòng của bạn",
        "BACKUP_CODE_PLACEHOLDER": "000000",
        "VERIFY_BUTTON": "Xác minh",
        "TRY_ANOTHER_METHOD": "Thử cách xác minh khác",
        "CANCEL_LOGIN": "Hủy và quay lại đăng nhập",
        "HELP_TEXT": "Bạn gặp khó khi đăng nhập?",
        "LEARN_MORE": "Tìm hiểu thêm về xác thực hai lớp",
        "HELP_MODAL": {
            "TITLE": "Trợ giúp về xác thực hai lớp",
            "AUTHENTICATOR_TITLE": "Dùng ứng dụng xác thực",
            "AUTHENTICATOR_DESC": "Mở ứng dụng xác thực (Google Authenticator, Authy…) và nhập mã 6 số hiện ra cho tài khoản của bạn.",
            "BACKUP_TITLE": "Dùng mã dự phòng",
            "BACKUP_DESC": "Nếu không mở được ứng dụng xác thực, bạn có thể dùng một trong các mã dự phòng đã lưu khi thiết lập xác thực hai lớp. Mỗi mã chỉ dùng được một lần.",
            "CONTACT_TITLE": "Cần trợ giúp thêm?",
            "CONTACT_DESC_CLOUD": "Nếu bạn mất cả ứng dụng xác thực lẫn mã dự phòng, hãy liên hệ bộ phận hỗ trợ của {installationName}.",
            "CONTACT_DESC_SELF_HOSTED": "Nếu bạn mất cả ứng dụng xác thực lẫn mã dự phòng, hãy liên hệ quản trị viên của bạn."
        },
        "VERIFICATION_FAILED": "Xác minh thất bại. Bạn hãy thử lại."
    },
    "MOBILE_TAB_BAR": {
        "LABEL": "Điều hướng chính",
        "MORE": "Thêm",
        "CLOSE_MENU": "Đóng",
        "UNREAD": "{count} hội thoại chưa đọc"
    },
    "NETWORK": {
        "NOTIFICATION": {
            "OFFLINE": "Không trực tuyến",
            "RECONNECTING": "Đang kết nối lại...",
            "RECONNECT_SUCCESS": "Đã kết nối lại"
        },
        "BUTTON": {
            "REFRESH": "Làm mới"
        }
    },
    "NEW_CONVERSATION": {
        "BUTTON_LABEL": "Bắt đầu hội thoại",
        "TITLE": "Tạo mới hội thoại",
        "DESC": "Bắt đầu một hội thoại mới bằng cách thêm tin nhắn.",
        "NO_INBOX": "Không tìm thấy kênh để bắt đầu hội thoại với liên hệ này.",
        "FORM": {
            "TO": {
                "LABEL": "Đến"
            },
            "INBOX": {
                "LABEL": "Qua hộp thư",
                "PLACEHOLDER": "Chọn hộp thư nguồn",
                "ERROR": "Chọn kênh"
            },
            "SUBJECT": {
                "LABEL": "Chủ đề",
                "PLACEHOLDER": "Chủ đề",
                "ERROR": "Chủ đề không được rỗng"
            },
            "MESSAGE": {
                "LABEL": "Tin nhắn",
                "PLACEHOLDER": "Viết tin nhắn ở đây",
                "ERROR": "Tin nhắn không được rỗng"
            },
            "ATTACHMENTS": {
                "SELECT": "Chọn File",
                "HELP_TEXT": "Kéo thả file đính kèm tại đây"
            },
            "SUBMIT": "Gửi tin nhắn",
            "CANCEL": "Huỷ",
            "SUCCESS_MESSAGE": "Tin nhắn đã được gửi!",
            "GO_TO_CONVERSATION": "Xem",
            "ERROR_MESSAGE": "Không thể gửi! xin thử lại"
        }
    },
    "NOTIFICATIONS": {
        "notification_title": {
            "conversation_creation": "Một hội thoại (#{display_id}) vừa được tạo trong {inbox_name}",
            "conversation_assignment": "Một hội thoại (#{display_id}) vừa được giao cho bạn",
            "assigned_conversation_new_message": "Có tin nhắn mới trong hội thoại (#{display_id})",
            "conversation_mention": "Bạn được nhắc tên trong hội thoại (#{display_id})",
            "sla_missed_first_response": "Hội thoại (#{display_id}) đã trễ SLA phản hồi đầu tiên",
            "sla_missed_next_response": "Hội thoại (#{display_id}) đã trễ SLA phản hồi kế tiếp",
            "sla_missed_resolution": "Hội thoại (#{display_id}) đã trễ SLA xử lý xong"
        },
        "attachment": "Tệp đính kèm",
        "no_content": "Không có nội dung",
        "email": {
            "conversation_creation": "{agent_name}, một hội thoại mới [ID - {display_id}] vừa được tạo trong {inbox_name}.",
            "conversation_assignment": "{agent_name}, một hội thoại mới [ID - {display_id}] vừa được giao cho bạn.",
            "conversation_mention": "{agent_name}, bạn được nhắc tên trong hội thoại [ID - {display_id}]",
            "assigned_conversation_new_message": "{agent_name}, có tin nhắn mới trong hội thoại bạn phụ trách [ID - {display_id}].",
            "participating_conversation_new_message": "{agent_name}, có tin nhắn mới trong hội thoại bạn tham gia [ID - {display_id}]."
        },
        "account": {
            "greeting": "Xin chào,",
            "contact_export_complete": {
                "subject": "Tệp xuất danh sách liên hệ đã sẵn sàng",
                "body": "Tệp xuất danh sách liên hệ của bạn đã sẵn sàng.",
                "action": "Tải tệp xuất về"
            },
            "contact_import_complete": {
                "subject": "Đã nhập xong danh sách liên hệ",
                "body": "Danh sách liên hệ của bạn đã được nhập xong. Mở trang Liên hệ để xem các liên hệ vừa nhập.",
                "imported": "Số dòng đã nhập: {count}",
                "failed": "Số dòng lỗi: {count}",
                "action_view_contacts": "Xem liên hệ vừa nhập",
                "action_view_failed": "Xem các dòng lỗi"
            },
            "contact_import_failed": {
                "subject": "Nhập danh sách liên hệ thất bại",
                "body": "Không nhập được danh sách liên hệ. Tệp CSV bạn tải lên có thể không hợp lệ, vui lòng kiểm tra lại tệp và đảm bảo đúng định dạng yêu cầu."
            }
        }
    },
    "ONBOARDING": {
        "TITLE": "Xin chào 👋, Chào mừng đến với {installationName}!",
        "DESCRIPTION": "Cảm ơn bạn đã đăng ký {installationName}. Hãy bắt đầu bằng việc kết nối kênh chat đầu tiên, rồi mời đồng đội và chuẩn bị sẵn câu trả lời mẫu, nhãn để trả lời khách nhanh hơn.",
        "GREETING_MORNING": "👋 Chào buổi sáng, {name}. Chào mừng bạn đến với {installationName}.",
        "GREETING_AFTERNOON": "👋 Chào buổi chiều, {name}. Chào mừng bạn đến với {installationName}.",
        "GREETING_EVENING": "👋 Chào buổi tối, {name}. Chào mừng bạn đến với {installationName}.",
        "READ_LATEST_UPDATES": "Đọc cập nhật mới nhất của chúng tôi",
        "ALL_CONVERSATION": {
            "TITLE": "Tất cả hội thoại của bạn ở cùng một chỗ",
            "DESCRIPTION": "Tin nhắn khách gửi qua Zalo, website, email… đổ về chung một hộp thư. Bạn lọc được hội thoại theo kênh, nhãn và trạng thái.",
            "NEW_LINK": "Kết nối Zalo, website hoặc email"
        },
        "TEAM_MEMBERS": {
            "TITLE": "Mời các thành viên trong nhóm của bạn",
            "DESCRIPTION": "Thêm đồng đội bằng địa chỉ email vào danh sách nhân viên để cùng trả lời khách. Mỗi người đăng nhập bằng tài khoản riêng.",
            "NEW_LINK": "Mời đồng đội"
        },
        "LABELS": {
            "TITLE": "Tổ chức hội thoại theo nhãn",
            "DESCRIPTION": "Nhãn giúp phân loại hội thoại dễ hơn. Tạo sẵn vài nhãn như #hoi-gia, #da-chot-don, #doi-tra để gắn vào hội thoại khi trả lời khách.",
            "NEW_LINK": "Tạo nhãn"
        },
        "CANNED_RESPONSES": {
            "TITLE": "Tạo câu trả lời mẫu",
            "DESCRIPTION": "Những đoạn trả lời soạn sẵn giúp bạn phản hồi hội thoại thật nhanh. Nhân viên gõ ký tự \"/\" rồi mã tắt để chèn câu trả lời.",
            "NEW_LINK": "Tạo câu trả lời mẫu"
        }
    },
    "ONBOARDING_INBOX_SETUP": {
        "GREETING": "Cùng thiết lập vài thứ nào",
        "SUBTITLE": "Việc này giúp bạn bắt nhịp nhanh hơn trong không gian làm việc",
        "CONTINUE": "Tiếp tục",
        "SKIP": "Bỏ qua",
        "ERROR": "Đã xảy ra lỗi. Vui lòng thử lại.",
        "WHATSAPP_CONNECTED": "Đã kết nối WhatsApp",
        "FACEBOOK_CONNECTED": "Đã kết nối Facebook",
        "META_RESTRICTION": {
            "MESSAGE": "Tạm thời chưa thiết lập được hộp thư Facebook, Instagram và WhatsApp do sự cố ở tầng API phía Meta, không phải lỗi của {installationName}. Chúng tôi đang phối hợp chặt với Meta để xử lý sớm nhất.",
            "STATUS_LINK": "Xem cập nhật tình trạng"
        },
        "CREATED_FOR_YOU": {
            "TITLE": "Chúng tôi đã tạo sẵn cho bạn",
            "LIVE_CHAT": "Widget chat trực tuyến",
            "LIVE_CHAT_DESCRIPTION": "Khung nhắn tin ngay trên website của bạn",
            "LIVE_CHAT_STATUS": "Sắp xong…",
            "LIVE_CHAT_READY": "Sẵn sàng",
            "HELP_CENTER": "Trung tâm trợ giúp",
            "HELP_CENTER_DESCRIPTION": "Bách khoa toàn thư của riêng bạn",
            "HELP_CENTER_GENERATING": "Đang tạo trung tâm trợ giúp…",
            "HELP_CENTER_ANALYZING_WEBSITE": "Đang phân tích website của bạn…",
            "HELP_CENTER_SETTING_UP_CATEGORIES": "Đang dựng danh mục…",
            "HELP_CENTER_CURATING_ARTICLES": "Đang chọn lọc bài viết…",
            "HELP_CENTER_ARTICLES": "Đã tạo {count} bài viết | Đã tạo {count} bài viết",
            "HELP_CENTER_CATEGORIES": "{count} danh mục | {count} danh mục",
            "HELP_CENTER_SUMMARY": "Đã tạo {count} bài viết trong {categories} | Đã tạo {count} bài viết trong {categories}"
        },
        "CHANNELS": {
            "TITLE": "Kết nối mọi kênh hội thoại của bạn",
            "HEADER": "Chúng tôi tìm thấy vài kênh bạn có thể kết nối",
            "CONNECT": "Kết nối",
            "CONNECTED": "Đã kết nối",
            "MORE_CHANNELS_NOTE": "Bạn có thể thiết lập kênh {email} và {voice} sau, ngay trong ứng dụng",
            "MORE_CHANNELS_EMAIL": "Email",
            "MORE_CHANNELS_VOICE": "Thoại",
            "VIEW_ALL": "Xem tất cả",
            "GMAIL": "Gmail",
            "OUTLOOK": "Outlook",
            "OTHER_EMAIL": "Nhà cung cấp email khác"
        },
        "CHANNELS_DIALOG": {
            "TITLE": "Kết nối mọi kênh chỉ trong nháy mắt",
            "SUBTITLE": "Quản lý tất cả từ một bảng điều khiển. Bạn cũng có thể tạo và sửa hộp thư sau, ngay trong ứng dụng.",
            "NOTE": "SMS, API, Thoại và các nhà cung cấp email khác có thể thiết lập sau từ bảng điều khiển.",
            "CONNECT_TITLE": "Kết nối tài khoản {name} của bạn",
            "CONNECT_SUBTITLE": "Điền nhanh vài thông tin này",
            "CONNECT": "Kết nối",
            "BACK": "Trở về",
            "SETUP_LATER": "Thiết lập sau trong ứng dụng",
            "FACEBOOK_SUBTITLE": "Cấp quyền truy cập và chọn một Trang để kết nối.",
            "FACEBOOK_LAUNCH": "Tiếp tục với Facebook",
            "FACEBOOK_SELECT_PAGE": "Chọn một Trang để kết nối",
            "FACEBOOK_LOADING": "Đang tải các Trang Facebook của bạn…",
            "FACEBOOK_NO_PAGES": "Không có Trang nào để kết nối. Mọi Trang của bạn đã được kết nối rồi.",
            "FACEBOOK_ERROR": "Không kết nối được Facebook. Bạn hãy thử lại."
        }
    },
    "ONBOARDING_NEXT": {
        "GREETING": "Chào {name}!",
        "SUBTITLE": "Bạn hãy xem lại các thông tin sau",
        "YOUR_DETAILS": "Thông tin của bạn",
        "COMPANY_DETAILS": "Thông tin công ty",
        "FIELDS": {
            "EMAIL": "Email",
            "BUSINESS_NAME": "Tên doanh nghiệp",
            "YOUR_ROLE": "Vai trò của bạn",
            "WEBSITE": "Website",
            "LANGUAGE": "Ngôn ngữ",
            "TIMEZONE": "Múi giờ",
            "COMPANY_SIZE": "Quy mô công ty",
            "INDUSTRY": "Ngành",
            "REFERRAL_SOURCE": "Bạn biết chúng tôi từ đâu?"
        },
        "PLACEHOLDERS": {
            "ENTER_BUSINESS_NAME": "vd: Shop Hoa Linen",
            "SELECT_ROLE": "Chọn vai trò của bạn",
            "ENTER_WEBSITE": "vd: shopcuaban.vn",
            "SELECT_LANGUAGE": "Chọn ngôn ngữ",
            "SELECT_TIMEZONE": "Chọn múi giờ",
            "SELECT_COMPANY_SIZE": "Chọn quy mô công ty",
            "SELECT_INDUSTRY": "Chọn ngành",
            "SELECT_REFERRAL_SOURCE": "Chọn nguồn"
        },
        "OPTIONAL": "Không bắt buộc",
        "OPTIONS": {
            "USER_ROLE": {
                "OWNER": "Chủ shop / chủ doanh nghiệp",
                "SALES_MANAGER": "Quản lý bán hàng",
                "CUSTOMER_SUPPORT": "Nhân viên tư vấn / CSKH",
                "MARKETING": "Marketing",
                "OTHER": "Khác"
            },
            "INDUSTRY": {
                "FASHION": "Thời trang",
                "BEAUTY": "Mỹ phẩm & làm đẹp",
                "MOTHER_BABY": "Mẹ & bé",
                "FOOD_BEVERAGE": "Thực phẩm & đồ uống",
                "ELECTRONICS": "Điện tử & phụ kiện",
                "HOME_LIVING": "Nội thất & gia dụng",
                "EDUCATION": "Giáo dục & khoá học",
                "TRAVEL_SERVICES": "Du lịch & dịch vụ",
                "REAL_ESTATE": "Bất động sản",
                "WHOLESALE": "Bán sỉ / nhà phân phối",
                "OTHER": "Khác"
            },
            "REFERRAL_SOURCE": {
                "ZALO": "Zalo",
                "FACEBOOK": "Facebook",
                "TIKTOK": "TikTok",
                "GOOGLE": "Google",
                "FRIEND": "Bạn bè / đối tác giới thiệu",
                "YOUTUBE": "YouTube",
                "OTHER": "Khác"
            }
        },
        "EMAIL_VERIFIED": "Đã xác minh email",
        "SETTING_UP": "Đang thiết lập tài khoản của bạn...",
        "CONTINUE": "Tiếp tục",
        "SAVING": "Đang lưu...",
        "VALIDATION_ERROR": "Bạn hãy điền đủ các trường bắt buộc",
        "SUCCESS": "Đã lưu thông tin",
        "ERROR": "Không lưu được thông tin. Bạn hãy thử lại."
    },
    "OVERVIEW_REPORTS": {
        "HEADER": "Tổng quan",
        "LIVE": "Trực tuyến",
        "HEATMAP_ARIA_LABEL": "{metric} theo ngày và giờ",
        "ACCOUNT_CONVERSATIONS": {
            "HEADER": "Hội thoại đang mở",
            "LOADING_MESSAGE": "Đang tải số liệu hội thoại...",
            "OPEN": "Mở",
            "UNATTENDED": "Không giám sát",
            "UNASSIGNED": "Chưa được phân công",
            "PENDING": "Chờ giải quyết"
        },
        "CONVERSATION_HEATMAP": {
            "HEADER": "Lưu lượng hội thoại",
            "NO_CONVERSATIONS": "Không có hội thoại",
            "CONVERSATION": "{count} hội thoại",
            "CONVERSATIONS": "{count} hội thoại",
            "DOWNLOAD_REPORT": "Tải báo cáo"
        },
        "RESOLUTION_HEATMAP": {
            "HEADER": "Số ca đã xử lý xong",
            "NO_CONVERSATIONS": "Không có hội thoại",
            "CONVERSATION": "{count} hội thoại",
            "CONVERSATIONS": "{count} hội thoại",
            "DOWNLOAD_REPORT": "Tải báo cáo"
        },
        "AGENT_CONVERSATIONS": {
            "HEADER": "Hội thoại của các nhân viên",
            "LOADING_MESSAGE": "Đang tải chỉ số nhân viên...",
            "NO_AGENTS": "Không có hội thoại nào của các nhân viên",
            "TABLE_HEADER": {
                "AGENT": "Nhân viên",
                "OPEN": "Mở",
                "UNATTENDED": "Không giám sát",
                "STATUS": "Trạng thái"
            }
        },
        "TEAM_CONVERSATIONS": {
            "ALL_TEAMS": "Tất cả nhóm",
            "HEADER": "Hội thoại theo nhóm",
            "LOADING_MESSAGE": "Đang tải số liệu của nhóm...",
            "NO_TEAMS": "Chưa có dữ liệu",
            "TABLE_HEADER": {
                "TEAM": "Nhóm",
                "OPEN": "Mở",
                "UNATTENDED": "Không giám sát",
                "STATUS": "Trạng thái"
            }
        },
        "AGENT_STATUS": {
            "HEADER": "Trạng thái nhân viên",
            "ONLINE": "Trực tuyến",
            "BUSY": "Bận",
            "OFFLINE": "Không trực tuyến"
        }
    },
    "PAGINATION_FOOTER": {
        "SHOWING": "Hiển thị {startItem}–{endItem} trong tổng số {totalItems} mục",
        "CURRENT_PAGE_INFO": "Trang {currentPage}/{totalPages}"
    },
    "PAYMENT_ACCOUNTS": {
        "HEADER": "Chuyển khoản",
        "DESCRIPTION": "Tài khoản ngân hàng nhận tiền khi gửi thẻ chuyển khoản trong hội thoại. Khách chuyển thẳng vào tài khoản của bạn, Yona không giữ tiền.",
        "LOADING": "Đang tải tài khoản",
        "LIST": {
            "TITLE": "Tài khoản nhận tiền",
            "EMPTY": "Chưa có tài khoản nhận tiền nào.",
            "ADD": "Thêm tài khoản",
            "DEFAULT_BADGE": "Mặc định"
        },
        "FORM": {
            "EDIT": "Sửa",
            "DELETE": "Xoá",
            "SAVE": "Lưu thay đổi",
            "CREATE": "Thêm tài khoản",
            "CANCEL": "Huỷ",
            "BANK": {
                "LABEL": "Ngân hàng",
                "PLACEHOLDER": "Chọn ngân hàng",
                "SEARCH_PLACEHOLDER": "Tìm ngân hàng...",
                "EMPTY": "Không tìm thấy ngân hàng"
            },
            "ACCOUNT_NUMBER": {
                "LABEL": "Số tài khoản",
                "PLACEHOLDER": "Chỉ nhập số",
                "INVALID": "Số tài khoản chỉ gồm 4-30 chữ số."
            },
            "ACCOUNT_NAME": {
                "LABEL": "Chủ tài khoản",
                "PLACEHOLDER": "HKD GOM MOC",
                "HINT": "Viết hoa không dấu, đúng như trên ngân hàng để khách kiểm tra."
            },
            "MEMO_TEMPLATE": {
                "LABEL": "Nội dung chuyển khoản",
                "HINT": "Khách thấy nội dung này trong app ngân hàng (tối đa 25 ký tự, không dấu). Thêm {ma_hoi_thoai} nếu muốn kèm mã hội thoại để đối soát."
            },
            "IS_DEFAULT": {
                "LABEL": "Đặt làm tài khoản mặc định"
            },
            "ALLOW_ALL_AGENTS": {
                "LABEL": "Cho mọi nhân viên gửi thẻ chuyển khoản trong hội thoại"
            }
        },
        "ADD": {
            "TITLE": "Thêm tài khoản",
            "SUCCESS": "Đã thêm tài khoản",
            "ERROR": "Đã có lỗi, vui lòng thử lại"
        },
        "EDIT": {
            "TITLE": "Sửa tài khoản",
            "SUCCESS": "Đã lưu thay đổi",
            "ERROR": "Đã có lỗi, vui lòng thử lại"
        },
        "DELETE": {
            "SUCCESS": "Đã xoá tài khoản",
            "ERROR": "Đã có lỗi, vui lòng thử lại",
            "CONFIRM": {
                "TITLE": "Xoá tài khoản?",
                "MESSAGE": "Nhân viên sẽ không gửi thẻ chuyển khoản bằng tài khoản này được nữa:",
                "YES": "Có, xoá",
                "NO": "Không, giữ lại"
            }
        },
        "PREVIEW": {
            "TITLE": "Khách sẽ thấy",
            "EMPTY": "Lưu tài khoản để xem mã QR.",
            "QR_ALT": "Mã QR chuyển khoản",
            "BANK": "Ngân hàng",
            "ACCOUNT_NUMBER": "Số tài khoản",
            "NOTE": "Mã QR theo chuẩn VietQR, quét được bằng mọi ứng dụng ngân hàng."
        }
    },
    "PHONE_INPUT": {
        "SEARCH_PLACEHOLDER": "Tìm quốc gia",
        "ERROR": "Số điện thoại chỉ gồm chữ số, có thể bắt đầu bằng +",
        "DIAL_CODE_ERROR": "Bạn hãy chọn mã quốc gia trong danh sách"
    },
    "PROFILE_SETTINGS": {
        "LINK": "Cài đặt hồ sơ",
        "TITLE": "Cài đặt hồ sơ",
        "BTN_TEXT": "Cập nhật hồ sơ",
        "DELETE_AVATAR": "Xoá hình đại diện",
        "AVATAR_DELETE_SUCCESS": "Ảnh đại diện đã được xoá thành công",
        "AVATAR_DELETE_FAILED": "Đã xảy ra lỗi khi xoá ảnh đại diện, vui lòng thử lại",
        "UPDATE_SUCCESS": "Hồ sơ của bạn đã được cập nhật thành công",
        "PASSWORD_UPDATE_SUCCESS": "Mật khẩu của bạn đã được thay đổi thành công",
        "AFTER_EMAIL_CHANGED": "Hồ sơ của bạn đã được cập nhật thành công, vui lòng đăng nhập lại khi thông tin đăng nhập của bạn được thay đổi",
        "FORM": {
            "PICTURE": "Ảnh hồ sơ",
            "AVATAR": "Hình ảnh hồ sơ cá nhân",
            "ERROR": "Vui lòng sửa lỗi biểu mẫu",
            "REMOVE_IMAGE": "Xoá",
            "UPLOAD_IMAGE": "Tải lên hình ảnh",
            "UPDATE_IMAGE": "Cập nhật hình ảnh",
            "PROFILE_SECTION": {
                "TITLE": "Hồ sơ cá nhân",
                "NOTE": "Địa chỉ email của bạn là danh tính của bạn và được sử dụng để đăng nhập."
            },
            "SEND_MESSAGE": {
                "TITLE": "Phím nóng để gửi tin nhắn",
                "NOTE": "Bạn có thể chọn một phím nóng (Enter hoặc Cmd/Ctrl+Enter) dựa trên sở thích viết của bạn.",
                "UPDATE_SUCCESS": "Cài đặt của bạn đã được cập nhật thành công",
                "CARD": {
                    "ENTER_KEY": {
                        "HEADING": "Enter (↵)",
                        "CONTENT": "Gửi tin nhắn bằng cách nhấn phím Enter thay vì nhấp vào nút gửi."
                    },
                    "CMD_ENTER_KEY": {
                        "HEADING": "Cmd/Ctrl + Enter (⌘ + ↵)",
                        "CONTENT": "Gửi tin nhắn bằng cách nhấn phím Cmd/Ctrl + enter thay vì nhấp vào nút gửi."
                    }
                }
            },
            "INTERFACE_SECTION": {
                "TITLE": "Giao diện",
                "NOTE": "Tùy chỉnh giao diện bảng điều khiển {installationName} của bạn.",
                "FONT_SIZE": {
                    "TITLE": "Cỡ chữ",
                    "NOTE": "Chỉnh cỡ chữ trên toàn bảng điều khiển theo ý bạn.",
                    "UPDATE_SUCCESS": "Đã cập nhật thiết lập cỡ chữ",
                    "UPDATE_ERROR": "Có lỗi khi cập nhật thiết lập cỡ chữ, bạn hãy thử lại",
                    "OPTIONS": {
                        "SMALLER": "Nhỏ hơn",
                        "SMALL": "Nhỏ",
                        "DEFAULT": "Mặc định",
                        "LARGE": "Lớn",
                        "LARGER": "Lớn hơn",
                        "EXTRA_LARGE": "Rất lớn"
                    }
                },
                "COLOR_SCHEME": {
                    "TITLE": "Chế độ màu",
                    "NOTE": "Sáng hoặc tối. Chỉ áp cho màn quản trị, không đổi widget hay trang công khai.",
                    "UPDATE_ERROR": "Có lỗi khi cập nhật chế độ màu, bạn hãy thử lại",
                    "OPTIONS": {
                        "LIGHT": "Sáng",
                        "DARK": "Tối"
                    }
                },
                "LANGUAGE": {
                    "TITLE": "Ngôn ngữ ưa dùng",
                    "NOTE": "Chọn ngôn ngữ bạn muốn dùng.",
                    "UPDATE_SUCCESS": "Đã cập nhật thiết lập ngôn ngữ",
                    "UPDATE_ERROR": "Có lỗi khi cập nhật thiết lập ngôn ngữ, bạn hãy thử lại",
                    "USE_ACCOUNT_DEFAULT": "Dùng mặc định của tài khoản"
                }
            },
            "MESSAGE_SIGNATURE_SECTION": {
                "TITLE": "Chữ ký tin nhắn cá nhân",
                "NOTE": "Tạo chữ ký riêng hiện ở cuối mỗi tin nhắn bạn gửi từ bất kỳ hộp thư nào. Bạn cũng có thể chèn ảnh vào chữ ký; ảnh hoạt động với hộp thư chat trực tuyến, email và API.",
                "BTN_TEXT": "Lưu chữ ký tin nhắn",
                "API_ERROR": "Không thể lưu chữ ký! Thử lại",
                "API_SUCCESS": "Chữ ký được lưu thành công",
                "IMAGE_UPLOAD_ERROR": "Không tải được ảnh lên! Bạn hãy thử lại",
                "IMAGE_UPLOAD_SUCCESS": "Đã thêm ảnh. Hãy bấm lưu để lưu chữ ký",
                "IMAGE_UPLOAD_SIZE_ERROR": "Kích thước ảnh phải nhỏ hơn {size}MB",
                "INLINE_IMAGE_WARNING": "Ảnh dán trực tiếp đã bị gỡ. Hãy dùng nút tải ảnh để thêm ảnh vào chữ ký."
            },
            "MESSAGE_SIGNATURE": {
                "LABEL": "Chữ ký tin nhắn",
                "ERROR": "Chữ ký tin nhắn không được rỗng",
                "PLACEHOLDER": "Thêm chữ ký tin nhắn cá nhân của bạn ở đây."
            },
            "PASSWORD_SECTION": {
                "TITLE": "Mật khẩu",
                "NOTE": "Cập nhật mật khẩu của bạn sẽ đặt lại thông tin đăng nhập của bạn trên nhiều thiết bị.",
                "BTN_TEXT": "Thay đổi mật khẩu"
            },
            "SECURITY_SECTION": {
                "TITLE": "Bảo mật",
                "NOTE": "Quản lý các tính năng bảo mật bổ sung cho tài khoản của bạn.",
                "MFA_BUTTON": "Quản lý xác thực hai lớp"
            },
            "SESSIONS_SECTION": {
                "TITLE": "Phiên đang hoạt động",
                "NOTE": "Đây là những thiết bị đang đăng nhập vào tài khoản của bạn.",
                "CURRENT": "Phiên hiện tại",
                "REVOKE": "Thu hồi",
                "REVOKE_SUCCESS": "Đã thu hồi phiên",
                "REVOKE_ERROR": "Không thu hồi được phiên. Bạn hãy thử lại.",
                "FETCH_ERROR": "Không tải được danh sách phiên. Bạn hãy thử lại.",
                "LAST_ACTIVE": "Hoạt động lần cuối",
                "UNKNOWN_DEVICE": "Thiết bị lạ"
            },
            "ACCESS_TOKEN": {
                "TITLE": "Token truy cập",
                "NOTE": "Có thể sử dụng Token này nếu bạn đang xây dựng tích hợp dựa trên API",
                "PAID_PLAN_NOTE": "Access token API có ở các gói trả phí.",
                "COPY": "Sao chép",
                "RESET": "Tạo lại",
                "CONFIRM_RESET": "Bạn chắc chắn chứ?",
                "CONFIRM_HINT": "Bấm lần nữa để xác nhận",
                "RESET_SUCCESS": "Đã tạo lại access token",
                "RESET_ERROR": "Không tạo lại được access token. Bạn hãy thử lại"
            },
            "AUDIO_NOTIFICATIONS_SECTION": {
                "TITLE": "Cảnh báo âm thanh",
                "NOTE": "Bật cảnh báo âm thanh trên bảng điều khiển khi có tin nhắn và hội thoại mới.",
                "PLAY": "Phát thử âm thanh",
                "ALERT_TYPES": {
                    "NONE": "Không có",
                    "MINE": "Được giao cho tôi",
                    "ALL": "Tất cả",
                    "ASSIGNED": "Hội thoại tôi phụ trách",
                    "UNASSIGNED": "Hội thoại chưa ai nhận",
                    "NOTME": "Hội thoại đang mở của người khác"
                },
                "ALERT_COMBINATIONS": {
                    "NONE": "Bạn chưa chọn mục nào nên sẽ không nhận cảnh báo âm thanh.",
                    "ASSIGNED": "Bạn sẽ nhận cảnh báo cho hội thoại được giao cho mình.",
                    "UNASSIGNED": "Bạn sẽ nhận cảnh báo cho mọi hội thoại chưa ai nhận.",
                    "NOTME": "Bạn sẽ nhận cảnh báo cho hội thoại giao cho người khác.",
                    "ASSIGNED+UNASSIGNED": "Bạn sẽ nhận cảnh báo cho hội thoại của mình và những hội thoại chưa ai xử lý.",
                    "ASSIGNED+NOTME": "Bạn sẽ nhận cảnh báo cho hội thoại của mình và của người khác, nhưng không nhận cho hội thoại chưa ai nhận.",
                    "NOTME+UNASSIGNED": "Bạn sẽ nhận cảnh báo cho hội thoại chưa ai xử lý và hội thoại của người khác.",
                    "ASSIGNED+NOTME+UNASSIGNED": "Bạn sẽ nhận cảnh báo cho mọi hội thoại."
                },
                "ALERT_TYPE": {
                    "TITLE": "Sự kiện cảnh báo cho hội thoại",
                    "NONE": "Không có",
                    "ASSIGNED": "Hội thoại được phân công",
                    "ALL_CONVERSATIONS": "Tất cả hội thoại"
                },
                "DEFAULT_TONE": {
                    "TITLE": "Âm báo:"
                },
                "CONDITIONS": {
                    "TITLE": "Điều kiện cảnh báo:",
                    "CONDITION_ONE": "Chỉ gửi cảnh báo âm thanh nếu cửa sổ trình duyệt không hoạt động",
                    "CONDITION_TWO": "Gửi thông báo cứ sau 30 giây cho đến khi tất cả các hội thoại được chỉ định được đọc"
                },
                "SOUND_PERMISSION_ERROR": "Trình duyệt của bạn đang chặn tự động phát âm thanh. Để nghe cảnh báo tự động, hãy cho phép phát âm thanh trong cài đặt trình duyệt hoặc thao tác một lần trên trang.",
                "READ_MORE": "Xem thêm"
            },
            "EMAIL_NOTIFICATIONS_SECTION": {
                "TITLE": "Thông báo qua email",
                "NOTE": "Cập nhật tùy chọn thông báo qua email của bạn tại đây",
                "CONVERSATION_ASSIGNMENT": "Gửi thông báo qua email khi hội thoại được chỉ định cho tôi",
                "CONVERSATION_CREATION": "Gửi thông báo qua email khi hội thoại mới được tạo",
                "CONVERSATION_MENTION": "Gửi thông báo email khi bạn được nhắc đến trong 1 hội thoại",
                "ASSIGNED_CONVERSATION_NEW_MESSAGE": "Gửi thông báo email khi có một tin nhắn mới được tạo trong hội thoại được phân công",
                "PARTICIPATING_CONVERSATION_NEW_MESSAGE": "Gửi email khi có tin nhắn mới trong hội thoại bạn tham gia",
                "SLA_MISSED_FIRST_RESPONSE": "Gửi email khi một hội thoại trễ SLA phản hồi đầu tiên",
                "SLA_MISSED_NEXT_RESPONSE": "Gửi email khi một hội thoại trễ SLA phản hồi kế tiếp",
                "SLA_MISSED_RESOLUTION": "Gửi email khi một hội thoại trễ SLA xử lý xong"
            },
            "NOTIFICATIONS": {
                "TITLE": "Tùy chọn thông báo",
                "TYPE_TITLE": "Loại thông báo",
                "EMAIL": "Email",
                "PUSH": "Thông báo đẩy",
                "TYPES": {
                    "CONVERSATION_CREATED": "Có hội thoại mới",
                    "CONVERSATION_ASSIGNED": "Một hội thoại được giao cho bạn",
                    "CONVERSATION_MENTION": "Bạn được nhắc tên trong một hội thoại",
                    "ASSIGNED_CONVERSATION_NEW_MESSAGE": "Có tin nhắn mới trong hội thoại bạn phụ trách",
                    "PARTICIPATING_CONVERSATION_NEW_MESSAGE": "Có tin nhắn mới trong hội thoại bạn tham gia",
                    "SLA_MISSED_FIRST_RESPONSE": "Một hội thoại trễ SLA phản hồi đầu tiên",
                    "SLA_MISSED_NEXT_RESPONSE": "Một hội thoại trễ SLA phản hồi kế tiếp",
                    "SLA_MISSED_RESOLUTION": "Một hội thoại trễ SLA xử lý xong"
                },
                "BROWSER_PERMISSION": "Hãy cho phép trình duyệt hiện thông báo đẩy để bạn nhận được chúng",
                "PUSH_ENABLE_FAILED": "Không bật được thông báo đẩy trên trình duyệt này. Vui lòng thử lại sau.",
                "PUSH_SERVICE_BLOCKED_BRAVE": "Brave đang tắt dịch vụ nhận thông báo đẩy. Mở brave://settings/privacy, bật mục \"Use Google services for push messaging\", khởi động lại Brave rồi bật lại công tắc này.",
                "PUSH_SERVICE_UNAVAILABLE": "Trình duyệt này không có dịch vụ nhận thông báo đẩy. Hãy bật thông báo trên Chrome, Edge, Cốc Cốc hoặc Firefox.",
                "PUSH_PERMISSION_DENIED": "Trình duyệt đang chặn thông báo của trang này. Hãy cho phép thông báo trong cài đặt trang của trình duyệt rồi bật lại.",
                "PUSH_PERMISSION_REVOKED_BANNER": "Trình duyệt này đã tắt quyền hiện thông báo của Yona nên bạn không còn nhận thông báo đẩy ở đây.",
                "PUSH_PERMISSION_REVOKED_ENABLE": "Bật lại",
                "PUSH_PERMISSION_REVOKED_TURN_OFF": "Tắt thông báo đẩy",
                "SOUND": {
                    "TITLE": "Âm báo khi khách nhắn tới",
                    "NOTE": "Kêu một tiếng khi có tin mới lúc bạn đang mở Yona trên trình duyệt.",
                    "SCOPE": "Kêu với",
                    "SCOPE_ALL": "Mọi tin nhắn mới",
                    "SCOPE_ASSIGNED": "Chỉ hội thoại giao cho tôi",
                    "ONLY_WHEN_HIDDEN": "Chỉ kêu khi tôi không mở tab Yona",
                    "ONLY_WHEN_HIDDEN_NOTE": "Đang xem Yona thì không kêu. Mở nhiều tab cùng lúc thì chỉ một tab kêu."
                }
            },
            "API": {
                "UPDATE_SUCCESS": "Tùy chọn thông báo của bạn đã được cập nhật thành công",
                "UPDATE_ERROR": "Đã xảy ra lỗi khi cập nhật tùy chọn, vui lòng thử lại"
            },
            "PUSH_NOTIFICATIONS_SECTION": {
                "TITLE": "Thông báo đẩy",
                "NOTE": "Cập nhật tùy chọn thông báo của bạn tại đây",
                "CONVERSATION_ASSIGNMENT": "Gửi thông báo khi hội thoại được chỉ định cho tôi",
                "CONVERSATION_CREATION": "Gửi thông báo khi hội thoại mới được tạo",
                "CONVERSATION_MENTION": "Gửi thông báo đẩy khi bạn được nhắc đến trong 1 hội thoại",
                "ASSIGNED_CONVERSATION_NEW_MESSAGE": "Gửi thông báo đẩy khi có một tin nhắn mới được tạo trong hội thoại được phân công",
                "PARTICIPATING_CONVERSATION_NEW_MESSAGE": "Gửi thông báo đẩy khi có tin nhắn mới trong hội thoại bạn tham gia",
                "HAS_ENABLED_PUSH": "Bạn đã bật tính năng thông báo cho trình duyệt này.",
                "REQUEST_PUSH": "Bật thông báo",
                "SLA_MISSED_FIRST_RESPONSE": "Gửi thông báo đẩy khi một hội thoại trễ SLA phản hồi đầu tiên",
                "SLA_MISSED_NEXT_RESPONSE": "Gửi thông báo đẩy khi một hội thoại trễ SLA phản hồi kế tiếp",
                "SLA_MISSED_RESOLUTION": "Gửi thông báo đẩy khi một hội thoại trễ SLA xử lý xong"
            },
            "PROFILE_IMAGE": {
                "LABEL": "Hình ảnh hồ sơ cá nhân"
            },
            "NAME": {
                "LABEL": "Tên đầy đủ của bạn",
                "ERROR": "Vui lòng nhập tên đầy đủ hợp lệ",
                "PLACEHOLDER": "Vui lòng nhập tên đầy đủ của bạn"
            },
            "DISPLAY_NAME": {
                "LABEL": "Tên hiển thị",
                "ERROR": "Vui lòng nhập tên hiển thị hợp lệ",
                "PLACEHOLDER": "Vui lòng nhập tên hiển thị, tên này sẽ được hiển thị trong các hội thoại"
            },
            "AVAILABILITY": {
                "LABEL": "Khả dụng",
                "STATUS": {
                    "ONLINE": "Trực tuyến",
                    "BUSY": "Bận",
                    "OFFLINE": "Không trực tuyến"
                },
                "SET_AVAILABILITY_SUCCESS": "Tính khả dụng đã được thiết lập thành công",
                "SET_AVAILABILITY_ERROR": "Không thể đặt, vui lòng thử lại",
                "IMPERSONATING_ERROR": "Không đổi được trạng thái trực khi đang đăng nhập thay người dùng khác"
            },
            "EMAIL": {
                "LABEL": "Địa chỉ email của bạn",
                "ERROR": "Vui lòng nhập một địa chỉ email hợp lệ",
                "PLACEHOLDER": "Vui lòng nhập địa chỉ email của bạn, địa chỉ này sẽ được hiển thị trong các hội thoại"
            },
            "CURRENT_PASSWORD": {
                "LABEL": "Mật khẩu hiện tại",
                "ERROR": "Vui lòng nhập mật khẩu hiện tại",
                "PLACEHOLDER": "Vui lòng nhập mật khẩu hiện tại"
            },
            "PASSWORD": {
                "LABEL": "Mật khẩu mới",
                "ERROR": "Vui lòng nhập mật khẩu có độ dài từ 6 trở lên",
                "PLACEHOLDER": "Vui lòng nhập mật khẩu mới"
            },
            "PASSWORD_CONFIRMATION": {
                "LABEL": "Xác nhận mật khẩu mới",
                "ERROR": "Xác nhận mật khẩu phải khớp với mật khẩu",
                "PLACEHOLDER": "Vui lòng nhập lại mật khẩu mới"
            }
        }
    },
    "PUBLIC_PORTAL": {
        "search": {
            "search_placeholder": "Tìm bài viết theo tiêu đề hoặc nội dung...",
            "empty_placeholder": "Không tìm thấy kết quả.",
            "loading_placeholder": "Đang tìm kiếm...",
            "results_title": "Các kết quả tìm kiếm",
            "results": "Các kết quả tìm kiếm",
            "results_for": "Search Results for '{query}'",
            "no_results": "No results found for '{query}'",
            "found_results": "Tìm thấy 1 kết quả|Tìm thấy :count kết quả",
            "submit": "Tìm kiếm"
        },
        "toc_header": "Trên trang này",
        "sidebar": {
            "help_center": "Trung tâm trợ giúp",
            "categories": "Danh mục",
            "language": "Ngôn ngữ",
            "theme": "Giao diện",
            "open_sidebar": "Mở thanh bên",
            "close_sidebar": "Đóng thanh bên",
            "browse": "Xem nội dung",
            "back_to_category": "Back to {name}",
            "browse_by_topic": "Xem theo chủ đề",
            "browse_by_topic_subtitle": "Tìm hướng dẫn, bài chỉ dẫn và câu trả lời được sắp theo danh mục.",
            "popular_articles": "Bài viết nổi bật",
            "popular_articles_subtitle": "Nội dung nhiều người đang đọc.",
            "recommended": "Bài viết gợi ý",
            "recommended_subtitle": "Những bài viết được chọn lọc để bạn bắt đầu.",
            "popular_label": "Chủ đề nổi bật:",
            "recommended_label": "Chủ đề gợi ý:",
            "authors_others": "{names} and {count} others",
            "primary_nav": "Chính"
        },
        "hero": {
            "sub_title": "Tìm trong bài viết hoặc xem danh mục dưới đây."
        },
        "common": {
            "home": "Trang Chủ",
            "last_updated_on": "Cập nhật lần cuối: {last_updated_on}",
            "view_all_articles": "Xem tất cả",
            "article": "bài viết",
            "articles": "bài viết",
            "author": "tác giả",
            "authors": "tác giả",
            "other": "người khác",
            "others": "người khác",
            "by": "By",
            "no_articles": "Không tìm thấy bài viết",
            "previous": "Trước",
            "next": "Tiếp"
        },
        "article_actions": {
            "label": "Mở bằng",
            "view_markdown": "Xem dạng Markdown",
            "open_in_chatgpt": "Mở trong ChatGPT",
            "open_in_claude": "Mở trong Claude",
            "llm_prompt": "Read the following article and help me understand it: {url}"
        },
        "footer": {
            "made_with": "Tạo bởi"
        },
        "header": {
            "go_to_homepage": "Website",
            "visit_website": "Vào website",
            "language": "Ngôn ngữ",
            "featured_articles": "Bài viết nổi bật",
            "recommended": "Bài viết gợi ý",
            "uncategorized": "Chưa được phân loại"
        },
        "404": {
            "title": "Không tìm thấy trang",
            "description": "Chúng tôi không tìm thấy trang bạn đang tìm.",
            "back_to_home": "Về trang chủ"
        },
        "not_active": {
            "title": "Trung tâm trợ giúp chưa mở",
            "description": "Bạn hãy liên hệ quản trị viên của trang để biết thêm thông tin.",
            "action": "Nếu bạn là quản trị viên, hãy nâng cấp gói để mở lại quyền truy cập."
        }
    },
    "REGISTER": {
        "TRY_WOOT": "Tạo tài khoản",
        "GET_STARTED": "Bắt đầu với {installationName}",
        "TITLE": "Đăng kí",
        "TESTIMONIAL_HEADER": "Tất cả chỉ cần một bước để tiến về phía trước",
        "TESTIMONIAL_CONTENT": "Bạn chỉ còn một bước nữa là có thể thu hút khách hàng của mình, giữ chân họ và tìm kiếm những khách hàng mới.",
        "TERMS_ACCEPT": "Khi tạo tài khoản, bạn đồng ý với <a href=\"{termsURL}\">Điều khoản</a> và <a href=\"{privacyURL}\">Chính sách riêng tư</a> của chúng tôi",
        "OAUTH": {
            "GOOGLE_SIGNUP": "Đăng ký bằng Google"
        },
        "COMPANY_NAME": {
            "LABEL": "Tên công ty",
            "PLACEHOLDER": "Nhập tên công ty của bạn. Ví dụ: Công ty Hoa Sen",
            "ERROR": "Tên công ty quá ngắn."
        },
        "FULL_NAME": {
            "LABEL": "Tên đầy đủ",
            "PLACEHOLDER": "Nhập họ tên của bạn. Ví dụ: Nguyễn Văn An",
            "ERROR": "Tên đầy đủ quá ngắn."
        },
        "EMAIL": {
            "LABEL": "Email công việc",
            "PLACEHOLDER": "Nhập email công việc của bạn. Ví dụ: an{'@'}congty{'.'}vn",
            "ERROR": "Vui lòng nhập địa chỉ email công việc hợp lệ."
        },
        "PASSWORD": {
            "LABEL": "Mật khẩu",
            "PLACEHOLDER": "Mật khẩu",
            "ERROR": "Mật khẩu quá ngắn.",
            "IS_INVALID_PASSWORD": "Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt.",
            "REQUIREMENTS_LENGTH": "Dài ít nhất 6 ký tự",
            "REQUIREMENTS_UPPERCASE": "Có ít nhất một chữ hoa",
            "REQUIREMENTS_LOWERCASE": "Có ít nhất một chữ thường",
            "REQUIREMENTS_NUMBER": "Có ít nhất một chữ số",
            "REQUIREMENTS_SPECIAL": "Có ít nhất một ký tự đặc biệt"
        },
        "CONFIRM_PASSWORD": {
            "LABEL": "Xác nhận mật khẩu",
            "PLACEHOLDER": "Xác nhận mật khẩu",
            "ERROR": "Mật khẩu không khớp."
        },
        "API": {
            "SUCCESS_MESSAGE": "Đăng ký thành công",
            "ERROR_MESSAGE": "Không kết nối được máy chủ. Bạn hãy thử lại."
        },
        "SUBMIT": "Tạo tài khoản",
        "HAVE_AN_ACCOUNT": "Đã có tài khoản?",
        "VERIFY_EMAIL": {
            "TITLE": "Kiểm tra hộp thư của bạn",
            "DESCRIPTION": "Chúng tôi đã gửi liên kết xác minh tới {email}. Hãy bấm vào liên kết để xác minh email và bắt đầu.",
            "RESEND": "Gửi lại email xác minh",
            "RESEND_SUCCESS": "Đã gửi email xác minh. Bạn hãy kiểm tra hộp thư.",
            "RESEND_ERROR": "Không gửi được email xác minh. Bạn hãy thử lại."
        }
    },
    "REPORT": {
        "HEADER": "Các hội thoại",
        "LOADING_CHART": "Đang tải các biểu đồ dữ liệu...",
        "NO_ENOUGH_DATA": "Chúng tôi không nhận được đủ điểm dữ liệu để tạo báo cáo, Vui lòng thử lại sau.",
        "DOWNLOAD_CONVERSATION_REPORTS": "Tải báo cáo hội thoại",
        "DATA_FETCHING_FAILED": "Không tải được dữ liệu, bạn hãy thử lại sau.",
        "SUMMARY_FETCHING_FAILED": "Không tải được phần tóm tắt, bạn hãy thử lại sau.",
        "METRICS": {
            "CONVERSATIONS": {
                "NAME": "Các hội thoại",
                "DESC": "( Tổng cộng )"
            },
            "INCOMING_MESSAGES": {
                "NAME": "Tin nhắn nhận được",
                "DESC": "( Tổng cộng )"
            },
            "OUTGOING_MESSAGES": {
                "NAME": "Tin nhắn gửi đi",
                "DESC": "( Tổng cộng )"
            },
            "FIRST_RESPONSE_TIME": {
                "NAME": "Thời gian phản hồi đầu tiên",
                "DESC": "( Trung bình )",
                "INFO_TEXT": "Tổng số hội thoại được sử dụng để tính toán:",
                "TOOLTIP_DESCRIPTION": "Dựa trên {count} hội thoại | Dựa trên {count} hội thoại",
                "TOOLTIP_TEXT": "Thời gian phản hồi đầu tiên là {metricValue} (dựa trên {conversationCount} hội thoại)"
            },
            "RESOLUTION_TIME": {
                "NAME": "Thời gian giải quyết",
                "DESC": "( Trung bình )",
                "INFO_TEXT": "Tổng số hội thoại được sử dụng để tính toán:",
                "TOOLTIP_DESCRIPTION": "Dựa trên {count} hội thoại | Dựa trên {count} hội thoại",
                "TOOLTIP_TEXT": "Thời gian giải quyết là {metricValue} (dựa trên {conversationCount} hội thoại)"
            },
            "RESOLUTION_COUNT": {
                "NAME": "Số lượng giải quyết",
                "DESC": "( Tổng cộng )"
            },
            "BOT_RESOLUTION_COUNT": {
                "NAME": "Số lượng giải quyết",
                "DESC": "( Tổng cộng )"
            },
            "BOT_HANDOFF_COUNT": {
                "NAME": "Số lần chuyển giao",
                "DESC": "( Tổng cộng )"
            },
            "REPLY_TIME": {
                "NAME": "Thời gian khách chờ",
                "TOOLTIP_LABEL": "Thời gian khách chờ",
                "TOOLTIP_DESCRIPTION": "Dựa trên {count} lượt trả lời | Dựa trên {count} lượt trả lời",
                "TOOLTIP_TEXT": "Thời gian chờ là {metricValue} (dựa trên {conversationCount} lượt trả lời)",
                "DESC": ""
            }
        },
        "DATE_RANGE_OPTIONS": {
            "LAST_7_DAYS": "7 ngày cuối",
            "LAST_14_DAYS": "14 ngày cuối",
            "LAST_30_DAYS": "30 ngày cuối",
            "THIS_MONTH": "Tháng này",
            "LAST_MONTH": "Tháng trước",
            "LAST_3_MONTHS": "3 tháng vừa qua",
            "LAST_6_MONTHS": "6 tháng vừa qua",
            "LAST_YEAR": "Năm ngoái",
            "CUSTOM_DATE_RANGE": "Phạm vi ngày tùy chỉnh"
        },
        "CUSTOM_DATE_RANGE": {
            "CONFIRM": "Áp dụng",
            "PLACEHOLDER": "Chọn phạm vi ngày"
        },
        "GROUP_BY_FILTER_DROPDOWN_LABEL": "Nhóm theo",
        "DURATION_FILTER_LABEL": "Thời lượng",
        "GROUPING_OPTIONS": {
            "DAY": "Ngày",
            "WEEK": "Tuần",
            "MONTH": "Tháng",
            "YEAR": "Năm"
        },
        "BUSINESS_HOURS": "Giờ làm việc",
        "FILTER_ACTIONS": {
            "CLEAR_FILTER": "Xóa bộ lọc",
            "EMPTY_LIST": "Không tìm thấy kết quả"
        },
        "DRILLDOWN": {
            "TITLE": "Chi tiết {metric}",
            "RESULT_COUNT_CONVERSATION": "{count} hội thoại | {count} hội thoại",
            "RESULT_COUNT_MESSAGE": "{count} tin nhắn | {count} tin nhắn",
            "EMPTY": "Không có bản ghi nào cho cột này.",
            "ERROR": "Không tải được bản ghi. Bạn hãy thử lại.",
            "ADMIN_ONLY": "Chỉ quản trị viên mới xem được chi tiết bản ghi trong báo cáo.",
            "LOAD_MORE": "Tải thêm",
            "PREVIOUS_BUCKET": "Cột trước",
            "NEXT_BUCKET": "Cột sau",
            "UNKNOWN_CONTACT": "Liên hệ không rõ",
            "UNKNOWN_INBOX": "Hộp thư không rõ",
            "UNASSIGNED_AGENT": "Chưa được phân công",
            "NO_MESSAGE_CONTENT": "Không có nội dung tin nhắn",
            "MESSAGE_CREATED_AT": "Tin nhắn tạo lúc {time}",
            "EVENT_OCCURRED_AT": "Sự kiện xảy ra lúc {time}",
            "INCOMING_MESSAGE": "Tin nhắn đến",
            "OUTGOING_MESSAGE": "Tin nhắn đi"
        },
        "PAGINATION": {
            "RESULTS": "Hiển thị {start} đến {end} trong {total} kết quả",
            "PER_PAGE_TEMPLATE": "{size} / trang"
        }
    },
    "REPORTS": {
        "period": "Thời gian báo cáo từ {since} đến {until}",
        "utc_warning": "Báo cáo đã được tạo với múi giờ UTC",
        "agent_csv": {
            "agent_name": "Tên nhân viên",
            "conversations_count": "Hội thoại được giao",
            "avg_first_response_time": "Thời gian phản hồi đầu tiên trung bình",
            "avg_resolution_time": "Thời gian xử lý trung bình",
            "resolution_count": "Số lượng giải quyết",
            "avg_customer_waiting_time": "Thời gian khách chờ trung bình"
        },
        "inbox_csv": {
            "inbox_name": "Tên kênh",
            "inbox_type": "Kiểu kênh",
            "conversations_count": "Số hội thoại",
            "avg_first_response_time": "Thời gian phản hồi đầu tiên trung bình",
            "avg_resolution_time": "Thời gian xử lý trung bình"
        },
        "label_csv": {
            "label_title": "Nhãn",
            "conversations_count": "Số hội thoại",
            "avg_first_response_time": "Thời gian phản hồi đầu tiên trung bình",
            "avg_resolution_time": "Thời gian xử lý trung bình",
            "avg_reply_time": "Thời gian trả lời trung bình",
            "resolution_count": "Số lượng giải quyết"
        },
        "team_csv": {
            "team_name": "Tên nhóm",
            "conversations_count": "Số hội thoại",
            "avg_first_response_time": "Thời gian phản hồi đầu tiên trung bình",
            "avg_resolution_time": "Thời gian xử lý trung bình",
            "resolution_count": "Số lượng giải quyết",
            "avg_customer_waiting_time": "Thời gian khách chờ trung bình"
        },
        "conversation_csv": {
            "conversations_count": "Các hội thoại",
            "incoming_messages_count": "Tin nhắn nhận được",
            "outgoing_messages_count": "Tin nhắn gửi đi",
            "avg_first_response_time": "Thời gian phản hồi đầu tiên trung bình",
            "avg_resolution_time": "Thời gian xử lý trung bình",
            "resolution_count": "Số ca đã xử lý xong",
            "avg_customer_waiting_time": "Thời gian khách chờ trung bình"
        },
        "conversation_traffic_csv": {
            "timezone": "Múi giờ"
        },
        "default_group_by": "ngày",
        "csat": {
            "headers": {
                "contact_name": "Tên liên hệ",
                "contact_email_address": "Địa chỉ email của liên hệ",
                "contact_phone_number": "Số điện thoại của liên hệ",
                "link_to_the_conversation": "Liên kế tới hội thoại",
                "agent_name": "Tên nhà cung cấp",
                "rating": "Đánh giá",
                "feedback": "Bình luận phản hồi",
                "recorded_at": "Ngày nghi"
            }
        }
    },
    "RESET_PASSWORD": {
        "TITLE": "Đặt lại mật khẩu",
        "DESCRIPTION": "Nhập địa chỉ email bạn dùng để đăng nhập {installationName}, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.",
        "GO_BACK_TO_LOGIN": "Nếu bạn muốn quay lại trang đăng nhập,",
        "EMAIL": {
            "LABEL": "Thư điện tử",
            "PLACEHOLDER": "Vui lòng nhập email.",
            "ERROR": "Vui lòng nhập email hợp lệ."
        },
        "API": {
            "SUCCESS_MESSAGE": "Liên kết đặt lại mật khẩu đã được gửi đến email của bạn.",
            "ERROR_MESSAGE": "Không kết nối được máy chủ. Bạn hãy thử lại."
        },
        "SUBMIT": "Gửi"
    },
    "SEARCH": {
        "TABS": {
            "ALL": "Tất cả kết quả",
            "CONTACTS": "Danh bạ",
            "CONVERSATIONS": "Các hội thoại",
            "MESSAGES": "Tin nhắn",
            "FILES": "Tệp",
            "ARTICLES": "Bài viết"
        },
        "SECTION": {
            "CONTACTS": "Danh bạ",
            "CONVERSATIONS": "Các hội thoại",
            "MESSAGES": "Tin nhắn",
            "FILES": "Tệp",
            "ARTICLES": "Bài viết"
        },
        "VIEW_MORE": "Xem thêm",
        "LOAD_MORE": "Tải thêm",
        "SEARCHING_DATA": "Đang tìm kiếm",
        "LOADING_DATA": "Đang tải",
        "EMPTY_STATE": "Không tìm thấy {item} nào cho từ khóa \"{query}\"",
        "EMPTY_STATE_FULL": "Không tìm thấy kết quả nào cho từ khóa \"{query}\"",
        "PLACEHOLDER_KEYBINDING": "/để chuyển vào ô tìm kiếm",
        "INPUT_PLACEHOLDER": "Gõ từ 3 ký tự trở lên để tìm",
        "RECENT_SEARCHES": "Tìm kiếm gần đây",
        "CLEAR_ALL": "Xóa tất cả",
        "MOST_RECENT": "Gần đây nhất",
        "EMPTY_STATE_DEFAULT": "Tìm theo tên khách, tên nhóm, số điện thoại, mã hội thoại, nội dung tin nhắn hoặc tên tệp. Gõ có dấu hay không dấu đều được.",
        "BOT_LABEL": "Bot",
        "READ_MORE": "Xem thêm",
        "READ_LESS": "Thu gọn",
        "WROTE": "đã viết:",
        "FROM": "Từ",
        "EMAIL": "Email",
        "EMAIL_SUBJECT": "Chủ đề",
        "PRIVATE": "Ghi chú riêng",
        "MATCHED_MEMBER": "Thành viên",
        "OPEN_FILE": "Mở tệp",
        "UNTITLED_FILE": "Tệp không tên",
        "TRANSCRIPT": "Bản ghi hội thoại",
        "CREATED_AT": "tạo {time}",
        "UPDATED_AT": "cập nhật {time}",
        "SORT_BY": {
            "RELEVANCE": "Độ liên quan"
        },
        "DATE_RANGE": {
            "LAST_7_DAYS": "7 ngày cuối",
            "LAST_30_DAYS": "30 ngày cuối",
            "LAST_60_DAYS": "60 ngày cuối",
            "LAST_90_DAYS": "90 ngày cuối",
            "CUSTOM_RANGE": "Khoảng tùy chọn:",
            "CREATED_BETWEEN": "Tạo trong khoảng",
            "AND": "and",
            "APPLY": "Áp dụng",
            "BEFORE_DATE": "Trước {date}",
            "AFTER_DATE": "Sau {date}",
            "TIME_RANGE": "Lọc theo thời gian",
            "CLEAR_FILTER": "Xóa bộ lọc"
        },
        "FILTERS": {
            "FILTER_MESSAGE": "Lọc tin nhắn theo:",
            "FROM": "Người gửi",
            "IN": "Hộp thư",
            "AGENTS": "Nhân viên",
            "CONTACTS": "Liên hệ",
            "INBOXES": "Hộp thư",
            "NO_AGENTS": "Không tìm thấy nhà cung cấp",
            "NO_CONTACTS": "Hãy tìm kiếm để thấy kết quả",
            "NO_INBOXES": "Không tìm thấy hộp thư nào"
        }
    },
    "SECURITY_SETTINGS": {
        "TITLE": "Bảo mật",
        "DESCRIPTION": "Quản lý thiết lập bảo mật cho tài khoản của bạn.",
        "LINK_TEXT": "Tìm hiểu thêm về SAML SSO",
        "SAML_DISABLED_MESSAGE": "SAML SSO đang tắt. Bạn hãy liên hệ quản trị viên để bật tính năng này.",
        "SAML": {
            "TITLE": "SAML SSO",
            "NOTE": "Cấu hình đăng nhập một lần bằng SAML cho tài khoản của bạn. Người dùng sẽ xác thực qua nhà cung cấp danh tính thay vì dùng email/mật khẩu.",
            "ACS_URL": {
                "LABEL": "ACS URL",
                "TOOLTIP": "Assertion Consumer Service URL — cấu hình URL này trong IdP làm đích nhận phản hồi SAML"
            },
            "SSO_URL": {
                "LABEL": "SSO URL",
                "HELP": "URL nhận yêu cầu xác thực SAML",
                "PLACEHOLDER": "https://your-idp.com/saml/sso"
            },
            "CERTIFICATE": {
                "LABEL": "Chứng chỉ ký dạng PEM",
                "HELP": "Chứng chỉ công khai của nhà cung cấp danh tính, dùng để xác minh phản hồi SAML",
                "PLACEHOLDER": "-----BEGIN CERTIFICATE-----\nMIIC..."
            },
            "FINGERPRINT": {
                "LABEL": "Vân tay chứng chỉ",
                "TOOLTIP": "Vân tay SHA-1 của chứng chỉ — dùng để đối chiếu chứng chỉ trong cấu hình IdP của bạn"
            },
            "COPY_SUCCESS": "Đã chép",
            "SP_ENTITY_ID": {
                "LABEL": "SP Entity ID",
                "HELP": "Mã định danh riêng của ứng dụng này với vai trò nhà cung cấp dịch vụ (tự sinh).",
                "TOOLTIP": "Mã định danh riêng của {installationName} với vai trò nhà cung cấp dịch vụ — cấu hình giá trị này trong IdP của bạn"
            },
            "IDP_ENTITY_ID": {
                "LABEL": "Entity ID của nhà cung cấp danh tính",
                "HELP": "Mã định danh riêng của nhà cung cấp danh tính (thường có trong cấu hình IdP)",
                "PLACEHOLDER": "https://your-idp.com/saml"
            },
            "UPDATE_BUTTON": "Cập nhật thiết lập SAML",
            "API": {
                "SUCCESS": "Đã cập nhật thiết lập SAML",
                "ERROR": "Cập nhật thiết lập SAML thất bại",
                "ERROR_LOADING": "Không tải được thiết lập SAML",
                "DISABLED": "Đã tắt thiết lập SAML"
            },
            "VALIDATION": {
                "REQUIRED_FIELDS": "SSO URL, Entity ID của nhà cung cấp danh tính và Chứng chỉ là các trường bắt buộc",
                "SSO_URL_ERROR": "Bạn hãy nhập SSO URL hợp lệ",
                "CERTIFICATE_ERROR": "Chứng chỉ là bắt buộc",
                "IDP_ENTITY_ID_ERROR": "Entity ID của nhà cung cấp danh tính là bắt buộc"
            },
            "ENTERPRISE_PAYWALL": {
                "AVAILABLE_ON": "Tính năng SAML SSO chỉ có ở gói Enterprise.",
                "UPGRADE_PROMPT": "Hãy nâng cấp lên gói Enterprise để dùng đăng nhập một lần bằng SAML và các tính năng bảo mật nâng cao khác.",
                "ASK_ADMIN": "Bạn hãy liên hệ quản trị viên để nâng cấp."
            },
            "PAYWALL": {
                "TITLE": "Nâng cấp để bật SAML SSO",
                "AVAILABLE_ON": "Tính năng SAML SSO chỉ có ở gói Enterprise.",
                "UPGRADE_PROMPT": "Hãy nâng cấp gói để dùng đăng nhập một lần bằng SAML và các tính năng nâng cao khác.",
                "UPGRADE_NOW": "Nâng cấp ngay",
                "CANCEL_ANYTIME": "Bạn có thể đổi hoặc hủy gói bất cứ lúc nào"
            },
            "ATTRIBUTE_MAPPING": {
                "TITLE": "Thiết lập thuộc tính SAML",
                "DESCRIPTION": "Bạn cần cấu hình các ánh xạ thuộc tính sau trong nhà cung cấp danh tính"
            },
            "INFO_SECTION": {
                "TITLE": "Thông tin nhà cung cấp dịch vụ",
                "TOOLTIP": "Chép những giá trị này và cấu hình trong nhà cung cấp danh tính để thiết lập kết nối SAML"
            }
        }
    },
    "SESSION_LIMIT": {
        "TITLE": "Đã chạm giới hạn phiên đăng nhập",
        "DESCRIPTION": "Bạn đã chạm giới hạn số phiên đăng nhập cùng lúc. Hãy kết thúc một phiên trước khi đăng nhập.",
        "END": "End",
        "END_ALL": "Kết thúc mọi phiên",
        "LOG_IN": "Log in",
        "CANCEL": "Quay lại đăng nhập",
        "UNKNOWN_DEVICE": "Thiết bị lạ",
        "STARTED": "Bắt đầu"
    },
    "SET_NEW_PASSWORD": {
        "TITLE": "Đặt mật khẩu mới",
        "PASSWORD": {
            "LABEL": "Mật khẩu",
            "PLACEHOLDER": "Mật khẩu",
            "ERROR": "Mật khẩu quá ngắn."
        },
        "CONFIRM_PASSWORD": {
            "LABEL": "Xác nhận mật khẩu",
            "PLACEHOLDER": "Xác nhận mật khẩu",
            "ERROR": "Mật khẩu không khớp."
        },
        "API": {
            "SUCCESS_MESSAGE": "Đổi mật khẩu thành công.",
            "ERROR_MESSAGE": "Không kết nối được máy chủ. Bạn hãy thử lại."
        },
        "CAPTCHA": {
            "ERROR": "Đã hết hạn xác minh. Vui lòng giải mã captcha một lần nữa."
        },
        "SUBMIT": "Gửi"
    },
    "SETTINGS": {
        "INBOXES": {
            "NEW_INBOX": "Thêm hộp thư"
        }
    },
    "SETTINGS_DRAFT": {
        "UNSAVED": "Có thay đổi chưa lưu",
        "CANCEL": "Huỷ",
        "SAVE": "Lưu thay đổi",
        "CONFIRM_LEAVE": "Rời trang sẽ mất các thay đổi chưa lưu. Vẫn muốn rời trang?"
    },
    "SIDEBAR": {
        "NO_ITEMS": "Không có mục nào",
        "GLOBAL_SEARCH": "Tìm kiếm",
        "GLOBAL_SEARCH_HINT": "Tìm hội thoại, tin nhắn, liên hệ, tệp trong toàn hệ thống",
        "CURRENTLY_VIEWING_ACCOUNT": "Hiện đang xem:",
        "SWITCH": "Chuyển",
        "INBOX_VIEW": "Khung nhìn hộp thư",
        "COMPACT_INBOX": "Hộp thư",
        "COMPACT_CONTACTS": "Khách hàng",
        "CONVERSATIONS": "Hội thoại",
        "INBOX": "Hộp thư của tôi",
        "ALL_CONVERSATIONS": "Tất cả hội thoại",
        "MENTIONED_CONVERSATIONS": "Nhắn đến",
        "PARTICIPATING_CONVERSATIONS": "Đang tham gia",
        "UNATTENDED_CONVERSATIONS": "Không giám sát",
        "REPORTS": "Báo cáo",
        "SETTINGS": "Cài đặt",
        "CONTACTS": "Liên hệ",
        "ACTIVE": "Đang hoạt động",
        "COMPANIES": "Công ty",
        "ALL_COMPANIES": "Tất cả công ty",
        "CAPTAIN": "Captain",
        "CALLS": "Cuộc gọi",
        "CAPTAIN_ASSISTANTS": "Trợ lý",
        "CAPTAIN_OVERVIEW": "Tổng quan",
        "CAPTAIN_DOCUMENTS": "Tài liệu",
        "CAPTAIN_RESPONSES": "Câu hỏi thường gặp",
        "CAPTAIN_TOOLS": "Công cụ",
        "CAPTAIN_SCENARIOS": "Kịch bản",
        "CAPTAIN_PLAYGROUND": "Khu thử nghiệm",
        "CAPTAIN_INBOXES": "Hộp thư",
        "CAPTAIN_SETTINGS": "Cài đặt",
        "HOME": "Trang Chủ",
        "AGENTS": "Nhân viên",
        "AGENT_BOTS": "Bot",
        "AUDIT_LOGS": "Nhật ký kiểm toán",
        "INBOXES": "Hộp thư",
        "WHATSAPP_TEMPLATES": "Mẫu tin",
        "NOTIFICATIONS": "Thông báo",
        "CANNED_RESPONSES": "Câu trả lời mẫu",
        "INTEGRATIONS": "Tích hợp",
        "DATA": "Dữ liệu",
        "PROFILE_SETTINGS": "Cài đặt hồ sơ",
        "ACCOUNT_SETTINGS": "Cài đặt tài khoản",
        "APPLICATIONS": "Ứng dụng",
        "LABELS": "Nhãn",
        "WIDGET_UPDATES": "Bài cập nhật trên widget",
        "PAYMENT_ACCOUNTS": "Chuyển khoản",
        "CUSTOM_ATTRIBUTES": "Thuộc tính tùy chỉnh",
        "AUTOMATION": "Tự động hóa",
        "MACROS": "Macro",
        "TEAMS": "Nhóm",
        "BILLING": "Phí",
        "CUSTOM_VIEWS_FOLDER": "Thư mục",
        "CUSTOM_VIEWS_SEGMENTS": "Phân khúc",
        "ALL_CONTACTS": "Tất cả liên lạc",
        "TAGGED_WITH": "Được gắn thẻ với",
        "NEW_LABEL": "Nhãn mới",
        "NEW_TEAM": "Nhóm mới",
        "NEW_INBOX": "Kênh mới",
        "REPORTS_CONVERSATION": "Các hội thoại",
        "CSAT": "CSAT",
        "LIVE_CHAT": "Chat trực tuyến",
        "SMS": "SMS",
        "WHATSAPP": "WhatsApp",
        "CAMPAIGNS": "Chiến dịch",
        "ONGOING": "Đang diễn ra",
        "ONE_OFF": "Một lần",
        "REPORTS_SLA": "SLA",
        "REPORTS_BOT": "Bot",
        "REPORTS_AGENT": "Nhân viên",
        "REPORTS_LABEL": "Nhãn",
        "REPORTS_INBOX": "Kênh",
        "REPORTS_TEAM": "Nhóm",
        "AGENT_ASSIGNMENT": "Phân công nhân viên",
        "SET_AVAILABILITY_TITLE": "Đặt chính mình như",
        "SET_YOUR_AVAILABILITY": "Đặt tính khả dụng của bạn",
        "SLA": "SLA",
        "CUSTOM_ROLES": "Vai trò tùy chỉnh",
        "BETA": "Beta",
        "REPORTS_OVERVIEW": "Tổng quan",
        "REAUTHORIZE": "Kết nối hộp thư của bạn đã hết hạn, hãy kết nối lại\n để tiếp tục nhận và gửi tin nhắn",
        "HELP_CENTER": {
            "TITLE": "Trung tâm trợ giúp",
            "ARTICLES": "Bài viết",
            "CATEGORIES": "Danh mục",
            "LOCALES": "Ngôn ngữ",
            "SETTINGS": "Cài đặt"
        },
        "CHANNELS": "Kênh",
        "SET_AUTO_OFFLINE": {
            "TEXT": "Tự động đánh dấu ngoại tuyến",
            "INFO_TEXT": "Hãy để hệ thống tự động đánh dấu bạn ngoại tuyến khi bạn không sử dụng ứng dụng hoặc trang tổng quan.",
            "INFO_SHORT": "Tự động chuyển sang ngoại tuyến khi bạn không dùng ứng dụng."
        },
        "SORT_TOOLTIP": "Sắp xếp",
        "SORT_BY": "Sắp bởi",
        "SORT_GROUPS": {
            "CREATED": "Sắp xếp theo ngày tạo",
            "ALPHABETICAL": "Sắp xếp theo bảng chữ cái",
            "UNREAD_COUNT": "Sắp xếp theo số tin chưa đọc"
        },
        "SORT_OPTIONS": {
            "CREATED_DESC": "Mới nhất trước",
            "CREATED_ASC": "Cũ nhất trước",
            "ALPHABETICAL_ASC": "Tăng dần (A - Z)",
            "ALPHABETICAL_DESC": "Giảm dần (Z - A)",
            "UNREAD_COUNT_DESC": "Nhiều nhất trước",
            "UNREAD_COUNT_ASC": "Ít nhất trước"
        },
        "DOCS": "Đọc tài liệu",
        "SECURITY": "Bảo mật",
        "CAPTAIN_AI": "Captain",
        "CONVERSATION_WORKFLOW": "Luồng hội thoại"
    },
    "SIDEBAR_ITEMS": {
        "CHANGE_AVAILABILITY_STATUS": "Đổi",
        "CHANGE_ACCOUNTS": "Đổi tài khoản",
        "SWITCH_ACCOUNT": "Đổi tài khoản",
        "CONTACT_SUPPORT": "Liên hệ hỗ trợ",
        "SELECTOR_SUBTITLE": "Chọn một tài khoản từ danh sách sau",
        "PROFILE_SETTINGS": "Thiết lập hồ sơ",
        "YEAR_IN_REVIEW": "Nhìn lại một năm",
        "KEYBOARD_SHORTCUTS": "Phím tắt",
        "LANGUAGE": "Ngôn ngữ",
        "LANGUAGE_ACCOUNT_DEFAULT": "Theo tài khoản",
        "APPEARANCE": "Giao diện",
        "SUPER_ADMIN_CONSOLE": "Console quản trị",
        "DOCS": "Đọc tài liệu",
        "CHANGELOG": "Nhật ký thay đổi",
        "LOGOUT": "Đăng xuất"
    },
    "SLACK_UNFURL": {
        "fields": {
            "name": "Tên",
            "email": "Email",
            "phone_number": "Điện thoại",
            "company_name": "Công ty",
            "inbox_name": "Hộp thư",
            "inbox_type": "Loại hộp thư"
        },
        "button": "Mở hội thoại"
    },
    "SLASH_COMMANDS": {
        "HEADING_1": "Tiêu đề 1",
        "HEADING_2": "Tiêu đề 2",
        "HEADING_3": "Tiêu đề 3",
        "BOLD": "In đậm",
        "ITALIC": "In nghiêng",
        "STRIKETHROUGH": "Gạch ngang",
        "CODE": "Mã",
        "BULLET_LIST": "Danh sách gạch đầu dòng",
        "ORDERED_LIST": "Danh sách đánh số",
        "TABLE": "Bảng",
        "IMAGE": "Ảnh",
        "VIDEO": "Video",
        "DIVIDER": "Đường kẻ ngang"
    },
    "STICKER_LIBRARY": {
        "MENU": "Kho sticker",
        "SUPER_ADMIN_HEADER": "Kho sticker chung",
        "SUPER_ADMIN_DESCRIPTION": "Bộ đã xuất bản hiện với mọi tài khoản.",
        "PAGE_HEADER": "Kho sticker",
        "PAGE_DESCRIPTION": "Bộ đã xuất bản hiện trong hộp thư và widget của tài khoản này.",
        "PLATFORM_DESCRIPTION": "Kho chung của Yona: bộ đã xuất bản hiện với mọi tài khoản.",
        "PAGE_INFO": "Kênh ngoài như Zalo nhận ảnh PNG tĩnh. Ảnh lớn tự thu nhỏ, GIF giữ chuyển động trong Yona.",
        "INFO_LABEL": "Giải thích",
        "TABS": {
            "ACCOUNT": "Kho riêng",
            "PLATFORM": "Kho nền tảng"
        },
        "LOADING": "Đang tải kho sticker…",
        "LOAD_ERROR": "Không tải được kho sticker",
        "REFRESH_FAILED": "Không làm mới được",
        "RETRY": "Thử lại",
        "DISMISS": "Đóng",
        "CLOSE": "Đóng",
        "BACK": "Quay lại",
        "CANCEL": "Huỷ",
        "SAVE": "Lưu",
        "SAVED": "Đã lưu",
        "UNDO": "Hoàn tác",
        "ACTION_ERROR": "Không thực hiện được, bạn thử lại nhé.",
        "EMPTY_TITLE": "Chưa có bộ sticker nào",
        "CREATE_FIRST": "Tạo bộ đầu tiên",
        "PACKS_HEADING": "Bộ sticker ({count})",
        "NEW_PACK": "Bộ mới",
        "NEW_PACK_PLACEHOLDER": "Tên bộ mới",
        "CREATE": "Tạo",
        "DUPLICATE_PACK_NAME": "Đã có bộ tên này",
        "PACK_NAME_LABEL": "Tên bộ",
        "STICKERS_COUNT": "{count} sticker",
        "PUBLISHED": "Đã xuất bản",
        "DRAFT": "Nháp",
        "PUBLISH": "Xuất bản",
        "PUBLISH_NEEDS_STICKER": "Thêm ít nhất 1 sticker để xuất bản",
        "PUBLISHED_TOAST": "Đã xuất bản «{name}» · hiện trong hộp thư và widget",
        "UNPUBLISHED_TOAST": "Đã chuyển về nháp",
        "PACK_MENU": "Tuỳ chọn bộ",
        "RENAME": "Đổi tên",
        "RENAMED": "Đã đổi tên",
        "SORT": "Sắp xếp",
        "SORT_DONE": "Xong",
        "SORT_HINT": "Nhấn giữ một ô rồi kéo để đổi chỗ.",
        "FAILED_FIRST": "Đưa sticker lỗi lên đầu",
        "DELETE_PACK": "Xoá bộ",
        "DELETE_PACK_CONFIRM": "Xoá bộ «{name}» cùng {count} sticker? Không hoàn tác được.",
        "PACK_DELETED": "Đã xoá bộ «{name}»",
        "MOVE_TO_ACCOUNT": {
            "MENU": "Chuyển sang kho riêng",
            "TITLE": "Chuyển bộ sang kho riêng?",
            "MESSAGE": "Bộ «{name}» sẽ chỉ còn trong kho riêng của tài khoản này, các tài khoản khác không còn thấy bộ. Tin đã gửi vẫn giữ ảnh sticker.",
            "DONE": "Đã chuyển «{name}» sang kho riêng"
        },
        "MOVE_TO_PLATFORM": {
            "MENU": "Chuyển lên kho nền tảng",
            "TITLE": "Chuyển bộ lên kho nền tảng?",
            "MESSAGE": "Bộ «{name}» sẽ rời kho riêng của tài khoản này. Nếu bộ đang xuất bản, mọi tài khoản sẽ thấy bộ. Tin đã gửi vẫn giữ ảnh sticker.",
            "DONE": "Đã chuyển «{name}» lên kho nền tảng"
        },
        "OPEN_MOVED_PACK": "Mở",
        "PACK_SUMMARY": "{count}/{max} sticker · PNG, JPG, WebP, GIF · sticker {size}×{size}",
        "UPLOAD_INFO": "Ảnh lớn tự thu nhỏ trước khi gửi, riêng ảnh động tối đa {limit}. Kênh ngoài như Zalo nhận ảnh PNG tĩnh.",
        "ADD_STICKER": "Thêm sticker",
        "ADD_SHORT": "Thêm",
        "DROP_HERE": "Thả để thêm vào bộ «{name}»",
        "EMPTY_PACK_DROP": "Kéo ảnh vào đây hoặc dán từ clipboard",
        "EMPTY_PACK_MOBILE": "Chọn ảnh để tạo sticker",
        "EMPTY_PACK_FORMATS": "PNG, JPG, WebP, GIF · sticker {size}×{size}",
        "CHOOSE_IMAGES": "Chọn ảnh",
        "UPLOAD_FAILED": "Không lưu được sticker này, bạn thử lại nhé.",
        "FILES_REJECTED": "Bỏ qua {count} tệp: {details}.",
        "REJECTED_FILE": "{filename} ({reason})",
        "REJECT_REASON": {
            "TYPE": "không phải ảnh PNG, JPG, WebP, GIF",
            "ANIMATED_TOO_LARGE": "ảnh động quá nặng",
            "UNREADABLE": "không đọc được ảnh"
        },
        "STICKERS_ADDED": "Đã thêm {count} sticker",
        "STICKERS_SKIPPED": "Bỏ qua {count}",
        "STICKERS_EXISTING": "{count} ảnh đã có",
        "STICKERS_FAILED": "{count} ảnh lỗi",
        "DISCARD_QUEUE_TITLE": "Bỏ {count} ảnh chưa lưu?",
        "DISCARD_QUEUE_MESSAGE": "Các sticker đã lưu vẫn giữ.",
        "KEEP_EDITING_IMAGES": "Tiếp tục chỉnh",
        "DISCARD": "Bỏ",
        "EDITOR": {
            "TITLE": "Thêm sticker",
            "TITLE_WITH_POSITION": "Thêm sticker · Ảnh {index}/{total}",
            "REEDIT_TITLE": "Chỉnh lại ảnh sticker",
            "CLOSE": "Đóng trình chỉnh",
            "LOADING": "Đang mở ảnh…",
            "LOAD_FAILED": "Không đọc được ảnh này. Bạn bỏ qua rồi chọn ảnh khác nhé.",
            "PROCESS_FAILED": "Không xử lý được ảnh này.",
            "ANIMATION_UNAVAILABLE": "Trình duyệt này chưa xem trước được ảnh động: đang hiện khung đầu, sticker vẫn giữ chuyển động.",
            "STAGE": "Ảnh đang chỉnh",
            "CROP_FRAME": "Khung vùng lấy. Phím mũi tên để di chuyển, phím + và - để đổi cỡ.",
            "TOOLS": "Công cụ",
            "TOOL_FRAMING": "Vùng lấy",
            "TOOL_WAND": "Đũa thần",
            "TOOL_BRUSH": "Cọ",
            "FRAMING": "Cách lấy vùng",
            "FRAMING_SUBJECT": "Ôm chủ thể",
            "FRAMING_FIT": "Vừa khung",
            "FRAMING_CUSTOM": "Tuỳ chỉnh",
            "HINT_SUBJECT": "Sticker tự căn giữa phần được giữ lại.",
            "HINT_FIT": "Cả ảnh nằm trong ô vuông, phần thiếu là lề trong suốt.",
            "HINT_CUSTOM": "Kéo khung hoặc góc khung. Khung là đúng sticker, được kéo ra ngoài ảnh.",
            "HINT_WAND": "Chạm vào một vùng màu để xoá hoặc giữ cả vùng đó.",
            "HINT_BRUSH": "Tô lên chỗ cần xoá hoặc khôi phục.",
            "WAND_MODE": "Chế độ đũa thần",
            "WAND_REMOVE": "Xoá",
            "WAND_KEEP": "Giữ",
            "BRUSH_MODE": "Chế độ cọ",
            "BRUSH_REMOVE": "Xoá",
            "BRUSH_KEEP": "Khôi phục",
            "BRUSH_SIZE": "Cỡ cọ",
            "BRUSH_SIZE_VALUE": "{size}%",
            "DECREASE": "Giảm {label}",
            "INCREASE": "Tăng {label}",
            "REMOVE_BACKGROUND": "Xoá nền",
            "WHITE_STROKE": "Viền trắng",
            "STROKE_WIDTH": "Độ dày",
            "STROKE_HINT": "Xoá nền để viền ôm sát chủ thể.",
            "TOLERANCE": "Dung sai",
            "TOLERANCE_HINT": "Tăng để xoá cả những màu gần giống nền. Nền nhiều chi tiết thì chỉnh thêm bằng đũa thần và cọ.",
            "UNDO": "Hoàn tác",
            "REDO": "Làm lại",
            "USE_ORIGINAL": "Dùng ảnh gốc",
            "EDIT_LIMIT": "Đã chạm giới hạn chỉnh cho một sticker. Hoàn tác bớt để chỉnh tiếp.",
            "PREVIEW": "Xem trước",
            "PREVIEW_ZOOMED": "Phóng to",
            "PREVIEW_ACTUAL": "Cỡ thật {size}×{size}",
            "PLAY": "Chạy ảnh động",
            "PAUSE": "Dừng ảnh động",
            "FRAME_OF": "Khung {index}/{total}",
            "EMPTY_RESULT": "Không còn gì sau khi xoá nền",
            "SETTINGS": "Cài đặt sticker",
            "TAB_IMAGE": "Chỉnh ảnh",
            "TAB_DETAILS": "Đặt tên",
            "SKIP": "Bỏ qua ảnh này",
            "CANCEL": "Huỷ",
            "SAVE": "Lưu sticker",
            "SAVE_AND_NEXT": "Lưu và tiếp ({index}/{total})",
            "SAVE_ALL": "Lưu tất cả ({count} ảnh còn lại)",
            "BULK_PROGRESS": "Đang lưu {done}/{total} ảnh…",
            "SAVING": "Đang lưu…",
            "WAITING_FOR_SERVER": "Đang chờ máy chủ… {seconds}s",
            "IMAGE_TOO_LARGE": "Ảnh quá lớn, thu nhỏ rồi vẫn vượt giới hạn tải lên. Bạn cắt nhỏ ảnh hoặc chọn ảnh khác nhé.",
            "EXISTING": "Ảnh này đã có trong bộ (ô {slot}).",
            "EXISTING_LABELLED": "Ảnh này đã có trong bộ (ô {slot}, nhãn «{label}»).",
            "UPDATE_EXISTING": "Cập nhật nhãn và từ khoá cho sticker cũ",
            "SKIP_EXISTING": "Bỏ qua",
            "QUEUE": "Hàng chờ ảnh",
            "QUEUE_STATUS": {
                "PENDING": "chờ chỉnh",
                "SAVING": "đang lưu",
                "SAVED": "đã lưu",
                "EXISTING": "đã có trong bộ",
                "SKIPPED": "đã bỏ qua",
                "FAILED": "lưu lỗi"
            },
            "REJECTED_STRIP": "{valid}/{total} ảnh hợp lệ · bỏ qua {files}",
            "SUMMARY_ADDED": "Đã thêm {count}",
            "SUMMARY_SKIPPED": "Bỏ qua {count}",
            "SUMMARY_REJECTED": "{count} tệp không hợp lệ",
            "SUMMARY_EXISTING": "{count} ảnh đã có",
            "SUMMARY_FAILED": "{count} ảnh lỗi",
            "SUMMARY_FAILED_LIST": "Ảnh lưu lỗi",
            "SUMMARY_FAILED_ITEM": "{name}: {error}",
            "DONE": "Xong"
        },
        "GRID_LABEL": "Sticker trong bộ «{name}»",
        "STICKER_OPTION": "{label} · {count} từ khoá",
        "STICKER_UNNAMED": "Sticker {index}",
        "NO_KEYWORDS_DOT": "Chưa có từ khoá, khách khó tìm thấy",
        "ANIMATED_BADGE": "GIF",
        "STATUS": {
            "processing": "Đang xử lý",
            "ready": "Sẵn sàng",
            "failed": "Lỗi"
        },
        "POLL_EXHAUSTED": "Chưa xong · Thử lại",
        "STICKER_MENU": "Tuỳ chọn sticker",
        "EDIT_STICKER": "Sửa nhãn và từ khoá",
        "REEDIT": "Chỉnh lại ảnh",
        "REEDIT_SAVED": "Đã lưu, sticker đang được dựng lại",
        "REEDIT_FAILED": "Lần chỉnh ảnh gần nhất chưa thành, sticker vẫn dùng ảnh cũ: {reason}",
        "REEDIT_NO_ORIGINAL": "Sticker này không còn ảnh gốc, bạn tải ảnh lên lại nhé.",
        "MOVE_FIRST": "Đưa lên đầu",
        "MOVE_LAST": "Đưa xuống cuối",
        "DELETE_STICKER": "Xoá sticker",
        "DELETE_STICKER_CONFIRM": "Xoá sticker này khỏi bộ «{name}»?",
        "STICKER_DELETED": "Đã xoá sticker",
        "REORDER_FAILED": "Không lưu được thứ tự",
        "LIFTED": "Đã nhấc {label}. Phím mũi tên để dời, Space để thả, Esc để huỷ.",
        "MOVED_TO": "Đã chuyển tới vị trí {index}/{total}",
        "REORDER_CANCELLED": "Đã huỷ dời chỗ",
        "DETAIL_TITLE": "Chi tiết sticker",
        "DETAIL_POSITION": "Ô {index}/{total}",
        "DETAIL_ANIMATED": "Ảnh động · {frames} khung",
        "DETAIL_STATIC": "Ảnh tĩnh",
        "DISCARD_CHANGES_TITLE": "Bỏ thay đổi chưa lưu?",
        "DISCARD_CHANGES_MESSAGE": "Nhãn và từ khoá vừa sửa sẽ không được lưu.",
        "KEEP_EDITING": "Tiếp tục sửa",
        "LABEL": "Nhãn",
        "KEYWORDS": "Từ khoá",
        "KEYWORDS_PLACEHOLDER": "haha, cảm ơn, chào",
        "KEYWORDS_HINT": "Khách gõ các từ này sẽ thấy gợi ý sticker (không phân biệt dấu).",
        "KEYWORD_CHIP_PLACEHOLDER": "Gõ rồi nhấn Enter",
        "KEYWORDS_FULL": "Đã đủ từ khoá",
        "REMOVE_KEYWORD": "Bỏ từ khoá {keyword}",
        "ERRORS": {
            "LABEL_TOO_LONG": "Nhãn tối đa {max} ký tự",
            "TOO_MANY_KEYWORDS": "Tối đa {max} từ khoá",
            "KEYWORD_TOO_LONG": "Từ khoá «{keyword}» dài quá {max} ký tự"
        }
    },
    "SUMMARY_REPORTS": {
        "INBOX": "Hộp thư",
        "AGENT": "Nhân viên",
        "TEAM": "Nhóm",
        "LABEL": "Nhãn",
        "AVG_RESOLUTION_TIME": "Thời gian xử lý TB",
        "AVG_FIRST_RESPONSE_TIME": "Thời gian phản hồi đầu tiên TB",
        "AVG_REPLY_TIME": "Thời gian khách chờ TB",
        "RESOLUTION_COUNT": "Số lượng giải quyết",
        "CONVERSATIONS": "Số hội thoại"
    },
    "SUPER_ADMIN": {
        "account_suspension": {
            "categories": {
                "spam": "Spam",
                "non_payment": "Không thanh toán",
                "other": "Khác"
            },
            "form": {
                "category": "Nhóm lý do tạm khóa",
                "category_prompt": "Chọn một nhóm lý do",
                "reason": "Lý do tạm khóa",
                "reason_hint": "Nhập lý do dài tối đa 256 ký tự."
            },
            "history": {
                "suspended_at": "Tạm khóa lúc",
                "category": "Loại",
                "reason": "Lý do",
                "empty": "Chưa có lịch sử tạm khóa nào."
            }
        },
        "users": {
            "resend_confirmation": {
                "button": "Gửi lại email xác nhận",
                "sent": "Đã gửi email xác nhận.",
                "already_confirmed": "Người dùng này đã xác nhận email rồi."
            }
        }
    },
    "SUPER_ADMIN_MFA": {
        "REQUIRED_TITLE": "Bắt buộc bật xác thực hai lớp",
        "REQUIRED_DESCRIPTION": "{installationName} yêu cầu bật 2FA để dùng console quản trị. Hoàn tất thiết lập bên dưới để tiếp tục."
    },
    "SURVEY": {
        "DESCRIPTION": "Quý khách kính mến 👋, vui lòng dành một chút thời gian để chia sẻ phản hồi về hội thoại mà bạn đã có với {inboxName}.",
        "RATING": {
            "LABEL": "Đánh giá hội thoại",
            "SUCCESS_MESSAGE": "Cảm ơn vì đã đánh giá"
        },
        "FEEDBACK": {
            "LABEL": "Bạn có bất kỳ cảm nhận nào muốn chia sẻ không?",
            "PLACEHOLDER": "Phản hồi của bạn (tuỳ ý)",
            "BUTTON_TEXT": "Gửi phản hồi"
        },
        "API": {
            "SUCCESS_MESSAGE": "Đã cập nhật khảo sát thành công",
            "ERROR_MESSAGE": "Không kết nối được máy chủ. Bạn hãy thử lại sau."
        },
        "POWERED_BY": "Cung cấp bởi {installationName}"
    },
    "SWITCH": {
        "TOGGLE": "Bật/tắt"
    },
    "TEAM_REPORTS": {
        "HEADER": "Tổng quan nhóm",
        "DESCRIPTION": "Xem nhanh hiệu suất của nhóm qua các chỉ số quan trọng như số hội thoại, thời gian phản hồi, thời gian xử lý và số ca đã xong. Bấm vào tên nhóm để xem chi tiết.",
        "LOADING_CHART": "Đang tải các biểu đồ dữ liệu...",
        "NO_ENOUGH_DATA": "Chúng tôi không nhận được đủ điểm dữ liệu để tạo báo cáo, Vui lòng thử lại sau.",
        "DOWNLOAD_TEAM_REPORTS": "Tải xuống báo cáo nhóm",
        "FILTER_DROPDOWN_LABEL": "Chọn nhóm",
        "FILTERS": {
            "ADD_FILTER": "Thêm bộ lọc",
            "CLEAR_ALL": "Xóa tất cả",
            "NO_FILTER": "Không có bộ lọc nào",
            "INPUT_PLACEHOLDER": {
                "TEAMS": "Tìm kiếm nhóm"
            }
        },
        "METRICS": {
            "CONVERSATIONS": {
                "NAME": "Các hội thoại",
                "DESC": "( Tổng cộng )"
            },
            "INCOMING_MESSAGES": {
                "NAME": "Tin nhắn nhận được",
                "DESC": "( Tổng cộng )"
            },
            "OUTGOING_MESSAGES": {
                "NAME": "Tin nhắn gửi đi",
                "DESC": "( Tổng cộng )"
            },
            "FIRST_RESPONSE_TIME": {
                "NAME": "Thời gian phản hồi đầu tiên",
                "DESC": "( Trung bình )",
                "INFO_TEXT": "Tổng số hội thoại được sử dụng để tính toán:",
                "TOOLTIP_TEXT": "Thời gian phản hồi đầu tiên là {metricValue} (dựa trên {conversationCount} hội thoại)"
            },
            "RESOLUTION_TIME": {
                "NAME": "Thời gian giải quyết",
                "DESC": "( Trung bình )",
                "INFO_TEXT": "Tổng số hội thoại được sử dụng để tính toán:",
                "TOOLTIP_TEXT": "Thời gian giải quyết là {metricValue} (dựa trên {conversationCount} hội thoại)"
            },
            "RESOLUTION_COUNT": {
                "NAME": "Số lượng giải quyết",
                "DESC": "( Tổng cộng )"
            }
        },
        "CUSTOM_DATE_RANGE": {
            "CONFIRM": "Áp dụng",
            "PLACEHOLDER": "Chọn phạm vi ngày"
        }
    },
    "TEAMS_SETTINGS": {
        "NEW_TEAM": "Tạo nhóm mới",
        "HEADER": "Nhóm",
        "LOADING": "Đang tải danh sách nhóm",
        "DESCRIPTION": "Nhóm giúp bạn sắp xếp nhân viên theo trách nhiệm công việc. Một nhân viên có thể thuộc nhiều nhóm. Khi làm việc cùng nhau, bạn có thể giao hội thoại cho một nhóm cụ thể.",
        "LEARN_MORE": "Tìm hiểu thêm về nhóm",
        "COUNT": "{n} nhóm | {n} nhóm",
        "SEARCH_PLACEHOLDER": "Tìm kiếm nhóm...",
        "NO_RESULTS": "Không tìm thấy nhóm nào khớp",
        "LIST": {
            "404": "Không có nhóm nào được tạo đối với tài khoản này.",
            "EDIT_TEAM": "Sửa nhóm",
            "NONE": "Không có"
        },
        "CREATE_FLOW": {
            "CREATE": {
                "TITLE": "Tạo nhóm mới",
                "DESC": "Thêm tiêu đề và mô tả cho nhóm mới."
            },
            "AGENTS": {
                "BUTTON_TEXT": "Thêm nhân viên vào nhóm",
                "TITLE": "Thêm nhân viên vào nhóm - {teamName}",
                "DESC": "Thêm Nhân viên vào nhóm mới tạo của bạn. Điều này cho phép bạn cộng tác như một nhóm trong các hội thoại, nhận thông báo về các sự kiện mới trong cùng một hội thoại."
            },
            "WIZARD_CREATE": {
                "TITLE": "Tạo",
                "BODY": "Tạo ra một nhóm nhân viên mới."
            },
            "WIZARD_ADD_AGENTS": {
                "TITLE": "Thêm nhân viên",
                "BODY": "Thêm nhân viên vào nhóm."
            },
            "WIZARD_FINISH": {
                "TITLE": "Hoàn tất",
                "BODY": "Bạn đã sẵn sàng để đi!"
            }
        },
        "EDIT_FLOW": {
            "CREATE": {
                "TITLE": "Sửa chi tiết nhóm",
                "DESC": "Sửa tiêu đề và mô tả cho nhóm.",
                "BUTTON_TEXT": "Cập nhật nhóm"
            },
            "AGENTS": {
                "BUTTON_TEXT": "Cập nhật nhân viên trong nhóm",
                "TITLE": "Thêm nhân viên vào nhóm - {teamName}",
                "DESC": "Thêm Nhân viên vào nhóm mới tạo của bạn. Tất cả các nhân viên được thêm vào sẽ nhận được thông báo khi có hội thoại được phân công cho nhóm này."
            },
            "EDIT_WIZARD_DETAILS": {
                "TITLE": "Chi tiết nhóm",
                "ROUTE": "settings_teams_edit",
                "BODY": "Đổi tên, mô tả và các chi tiết khác."
            },
            "EDIT_WIZARD_AGENTS": {
                "TITLE": "Sửa nhân viên",
                "ROUTE": "settings_teams_edit_members",
                "BODY": "Sửa nhân viên trong nhóm của bạn."
            },
            "EDIT_WIZARD_FINISH": {
                "TITLE": "Hoàn tất",
                "ROUTE": "settings_teams_edit_finish",
                "BODY": "Bạn đã sẵn sàng để đi!"
            }
        },
        "TEAM_FORM": {
            "ERROR_MESSAGE": "Không thể lưu chi tiết nhóm. Thử lại."
        },
        "AGENTS": {
            "AGENT": "Nhân viên",
            "EMAIL": "Email",
            "BUTTON_TEXT": "Thêm các nhà cung cấp",
            "ADD_AGENTS": "Thêm nhân viên vào nhóm của bạn...",
            "SELECT": "chọn",
            "SELECT_ALL": "chọn tất cả nhân viên",
            "SELECTED_COUNT": "{selected} trên {total} nhân viên được chọn."
        },
        "ADD": {
            "TITLE": "Thêm nhân viên vào nhóm - {teamName}",
            "DESC": "Thêm Nhân viên vào nhóm mới tạo của bạn. Điều này cho phép bạn cộng tác như một nhóm trong các hội thoại, nhận thông báo về các sự kiện mới trong cùng một hội thoại.",
            "SELECT": "chọn",
            "SELECT_ALL": "chọn tất cả nhân viên",
            "SELECTED_COUNT": "{selected} trên {total} nhân viên được chọn.",
            "BUTTON_TEXT": "Thêm các nhà cung cấp",
            "AGENT_VALIDATION_ERROR": "Chọn ít nhật một nhân viên."
        },
        "FINISH": {
            "TITLE": "Nhóm của bạn đã sẵn sàng!",
            "MESSAGE": "Giờ đây, bạn có thể cộng tác với tư cách là một nhóm trong các hội thoại. Chúc ủng hộ vui vẻ ",
            "BUTTON_TEXT": "Hoàn tất"
        },
        "DELETE": {
            "BUTTON_TEXT": "Xoá",
            "API": {
                "SUCCESS_MESSAGE": "Nhóm được xoá thành công.",
                "ERROR_MESSAGE": "Không thể xoá nhóm. Thử lại."
            },
            "CONFIRM": {
                "TITLE": "Bạn chắc chắn muốn xóa nhóm này?",
                "PLACE_HOLDER": "Vui lòng điền {teamName} để xác nhận",
                "MESSAGE": "Xóa nhóm sẽ xóa phân công nhóm khỏi các hội thoại được phân công cho nhóm này.",
                "YES": "Xoá ",
                "NO": "Huỷ"
            }
        },
        "SETTINGS": "Cài đặt",
        "FORM": {
            "UPDATE": "Cập nhật nhóm",
            "CREATE": "Tạo nhóm",
            "NAME": {
                "LABEL": "Tên nhóm",
                "PLACEHOLDER": "Ví dụ: Bán hàng, Hỗ trợ khách hàng",
                "ERROR": "Tên nhóm là bắt buộc và phải dài ít nhất 2 ký tự"
            },
            "DESCRIPTION": {
                "LABEL": "Mô tả nhóm",
                "PLACEHOLDER": "Mô tả ngắn về nhóm này."
            },
            "AUTO_ASSIGN": {
                "LABEL": "Cho phép tự động phân công đối với nhóm này."
            },
            "SUBMIT_CREATE": "Tạo nhóm"
        }
    },
    "THUMBNAIL": {
        "AUTHOR": {
            "NOT_AVAILABLE": "Không có thông tin tác giả"
        }
    },
    "TIME_AGO": {
        "SHORT": {
            "NOW": "vừa xong",
            "MINUTES": "{count} phút",
            "HOURS": "{count} giờ",
            "DAYS": "{count} ngày",
            "WEEKS": "{count} tuần",
            "MONTHS": "{count} tháng",
            "YEARS": "{count} năm",
            "AGO": "{time} trước"
        }
    },
    "TIME_UNITS": {
        "days": "{1} :count ngày|[2,*] :count ngày",
        "hours": "{1} :count giờ|[2,*] :count giờ",
        "minutes": "{1} :count phút|[2,*] :count phút",
        "seconds": "{0} :count giây|{1} :count giây|[2,*] :count giây"
    },
    "TRANSLATE_MODAL": {
        "TITLE": "Xem nội dung đã dịch",
        "DESC": "Bạn có thể xem nội dung đã dịch theo từng ngôn ngữ.",
        "ORIGINAL_CONTENT": "Nội dung gốc",
        "TRANSLATED_CONTENT": "Nội dung đã dịch",
        "NO_TRANSLATIONS_AVAILABLE": "Nội dung này chưa có bản dịch nào"
    },
    "TYPING": {
        "ONE": "{user} đang nhập",
        "TWO": "{user} và {secondUser} đang nhập",
        "MULTIPLE": "{user} và {count} người khác đang nhập"
    },
    "VIDEO_EMBED": {
        "PLACEHOLDER": "Dán liên kết video",
        "HINT": "Hỗ trợ liên kết YouTube, Vimeo, Loom, Wistia, Arcade, Bunny, CodePen, GuideJar và mp4",
        "ERROR": "Liên kết video này không được hỗ trợ",
        "ADD": "Nhúng",
        "CANCEL": "Huỷ"
    },
    "WEBHOOKS_SETTINGS": {
        "HEADER": "Cài đặt Webhook"
    },
    "WIDGET": {
        "COMPONENTS": {
            "FILE_BUBBLE": {
                "DOWNLOAD": "Tải xuống",
                "UPLOADING": "Đang tải lên..."
            },
            "FORM_BUBBLE": {
                "SUBMIT": "Gửi"
            },
            "MESSAGE_BUBBLE": {
                "RETRY": "Gửi lại tin nhắn",
                "ERROR_MESSAGE": "Không thể gửi, xin thử lại"
            }
        },
        "THUMBNAIL": {
            "AUTHOR": {
                "NOT_AVAILABLE": "Không có"
            }
        },
        "TEAM_AVAILABILITY": {
            "ONLINE": "Chúng tôi đang trực tuyến",
            "OFFLINE": "Hiện tại chúng tôi đang bận chút",
            "BACK_AS_SOON_AS_POSSIBLE": "Chúng tôi sẽ quay lại sớm nhất có thể"
        },
        "REPLY_TIME": {
            "IN_A_FEW_MINUTES": "Thường trả lời sau vài phút",
            "IN_A_FEW_HOURS": "Thường trả lời sau vài giờ",
            "IN_A_DAY": "Thường trả lời trong một ngày",
            "BACK_IN_HOURS": "Chúng tôi sẽ trực lại sau {n} giờ | Chúng tôi sẽ trực lại sau {n} giờ",
            "BACK_IN_MINUTES": "Chúng tôi sẽ trực lại sau {time} phút",
            "BACK_AT_TIME": "Chúng tôi sẽ trực lại lúc {time}",
            "BACK_ON_DAY": "Chúng tôi sẽ trực lại vào {day}",
            "BACK_TOMORROW": "Chúng tôi sẽ trực lại vào ngày mai",
            "BACK_IN_SOME_TIME": "Chúng tôi sẽ trực lại sau ít lâu"
        },
        "DAY_NAMES": {
            "SUNDAY": "Chủ Nhật",
            "MONDAY": "Thứ Hai",
            "TUESDAY": "Thứ Ba",
            "WEDNESDAY": "Thứ Tư",
            "THURSDAY": "Thứ Năm",
            "FRIDAY": "Thứ Sáu",
            "SATURDAY": "Thứ Bảy"
        },
        "START_CONVERSATION": "Bắt đầu một hội thoại",
        "END_CONVERSATION": "Kết thúc hội thoại",
        "CONTINUE_CONVERSATION": "Tiếp tục hội thoại",
        "YOU": "Bạn",
        "START_NEW_CONVERSATION": "Bắt đầu hội thoại mới",
        "RESET_SESSION": {
            "BUTTON": "Bắt đầu lại như khách mới",
            "CONFIRM_TITLE": "Bắt đầu cuộc trò chuyện mới?",
            "CONFIRM_BODY": "Khung chat sẽ bắt đầu lại như một khách mới. Các tin nhắn trước đó sẽ không còn hiện trên trình duyệt này.",
            "CONFIRM": "Bắt đầu lại",
            "CANCEL": "Huỷ"
        },
        "VIEW_UNREAD_MESSAGES": "Bạn có tin nhắn chưa đọc",
        "UNREAD_VIEW": {
            "VIEW_MESSAGES_BUTTON": "Xem tin nhắn mới",
            "CLOSE_MESSAGES_BUTTON": "Đóng",
            "COMPANY_FROM": "từ",
            "BOT": "Bot"
        },
        "BUBBLE": {
            "LABEL": "Trò chuyện với chúng tôi"
        },
        "POWERED_BY": "Powered by {installationName}",
        "EMAIL_PLACEHOLDER": "Vui lòng nhập email",
        "EMAIL_SAVE_FAILED": "Chưa lưu được email. Bạn thử lại nhé.",
        "CHAT_PLACEHOLDER": "Nhập tin nhắn…",
        "TODAY": "Hôm nay",
        "YESTERDAY": "Hôm qua",
        "PRE_CHAT_FORM": {
            "FIELDS": {
                "FULL_NAME": {
                    "LABEL": "Tên đầy đủ",
                    "PLACEHOLDER": "Vui lòng nhập tên đầy đủ của bạn",
                    "REQUIRED_ERROR": "Tên đầy đủ là bắt buộc"
                },
                "EMAIL_ADDRESS": {
                    "LABEL": "Email",
                    "PLACEHOLDER": "Vui lòng nhập email",
                    "REQUIRED_ERROR": "Phải có địa chỉ email",
                    "VALID_ERROR": "Vui lòng nhập một địa chỉ email hợp lệ"
                },
                "PHONE_NUMBER": {
                    "LABEL": "Số điện thoại",
                    "PLACEHOLDER": "Vui lòng nhập số điện thoại của bạn",
                    "REQUIRED_ERROR": "Cần phải nhập số điện thoại",
                    "DIAL_CODE_VALID_ERROR": "Vui lòng chọn quốc gia",
                    "VALID_ERROR": "Vui lòng nhập số điện thoại đúng",
                    "DROPDOWN_EMPTY": "Không tìm thấy kết quả",
                    "DROPDOWN_SEARCH": "Tìm quốc gia"
                },
                "MESSAGE": {
                    "LABEL": "Tin nhắn",
                    "PLACEHOLDER": "Vui lòng nhập tin nhắn",
                    "ERROR": "Tin nhắn quá ngắn"
                }
            },
            "CAMPAIGN_HEADER": "Vui lòng cung cấp tên và địa chỉ email của bạn trước khi bắt đầu hội thoại",
            "IS_REQUIRED": "được yêu cầu",
            "REQUIRED": "Bắt buộc",
            "REGEX_ERROR": "Bạn hãy nhập giá trị hợp lệ"
        },
        "CHAT_FORM": {
            "INVALID": {
                "FIELD": "Trường không hợp lệ"
            }
        },
        "EMOJI": {
            "PLACEHOLDER": "Tìm kiếm biểu tượng cảm xúc",
            "NOT_FOUND": "Không có biểu tượng cảm xúc nào phù hợp với tìm kiếm của bạn",
            "ARIA_LABEL": "Bảng chọn biểu tượng cảm xúc"
        },
        "EMOJI_ICON_PICKER": {
            "SEARCH_EMOJI": "Tìm biểu tượng cảm xúc…",
            "FREQUENTLY_USED": "Hay dùng",
            "NO_EMOJI": "Không có biểu tượng cảm xúc nào khớp"
        },
        "CSAT": {
            "TITLE": "Đánh giá hội thoại",
            "SUBMITTED_TITLE": "Cảm ơn vì đã đánh giá",
            "PLACEHOLDER": "Cho chúng tôi biết thêm..."
        },
        "EMAIL_CAPTURE": {
            "HINT": "Shop báo khi có trả lời, rời trang cũng không sao",
            "LABEL": "Email",
            "DONE": "Shop sẽ báo qua {email}"
        },
        "EMAIL_TRANSCRIPT": {
            "BUTTON_TEXT": "Yêu cầu bản ghi hội thoại",
            "SEND_EMAIL_SUCCESS": "Bản ghi hội thoại đã được gửi thành công",
            "SEND_EMAIL_ERROR": "Đã có lỗi, vui lòng thử lại"
        },
        "INTEGRATIONS": {
            "DYTE": {
                "CLICK_HERE_TO_JOIN": "Bấm vào đây để tham gia",
                "LEAVE_THE_ROOM": "Rời cuộc gọi"
            }
        },
        "PORTAL": {
            "POPULAR_ARTICLES": "Bài viết nổi bật",
            "VIEW_ALL_ARTICLES": "Xem tất cả bài viết",
            "IFRAME_LOAD_ERROR": "Có lỗi khi tải bài viết, bạn hãy tải lại trang rồi thử lại."
        },
        "ATTACHMENTS": {
            "image": {
                "CONTENT": "Tin nhắn hình ảnh"
            },
            "audio": {
                "CONTENT": "Tin nhắn thoại"
            },
            "video": {
                "CONTENT": "Tin nhắn video"
            },
            "file": {
                "CONTENT": "Tập tin đính kèm"
            },
            "location": {
                "CONTENT": "Địa điểm"
            },
            "fallback": {
                "CONTENT": "có một đường dẫn chia sẻ"
            }
        },
        "FOOTER_REPLY_TO": {
            "REPLY_TO": "Đang trả lời:"
        },
        "MESSAGE_ACTIONS": {
            "REACT": "Thả cảm xúc",
            "REPLY": "Trả lời",
            "MORE": "Thêm",
            "RECALL": "Thu hồi",
            "COPY": "Sao chép"
        },
        "ORDER_SHEET": {
            "CLOSE": "Đóng",
            "MAX": "Tối đa {count}",
            "QUANTITY": "Số lượng",
            "DECREASE": "Bớt một",
            "INCREASE": "Thêm một",
            "NOTE": "Ghi chú cho shop",
            "OPTIONAL": "Không bắt buộc",
            "NOTE_PLACEHOLDER": "Ví dụ: gói quà giúp mình",
            "SUBTOTAL": "Tạm tính",
            "SHIPPING_HINT": "Phí giao shop báo trong chat",
            "SUBMIT": "Gửi yêu cầu đặt hàng",
            "VIEW_SITE": "Xem trên website của shop",
            "SOLD_OUT": "{option}, hết hàng",
            "FAILED": "Chưa gửi được yêu cầu, thử lại nhé."
        },
        "WEBVIEW_SHEET": {
            "OPEN_TAB": "Mở trong tab mới",
            "CLOSE": "Đóng",
            "FAILED": "Chưa mở được trang, thử lại nhé."
        },
        "REACTIONS": {
            "COUNT": "{count} người thả {emoji}",
            "REMOVE": "Gỡ cảm xúc {emoji}",
            "FAILED": "Chưa thả được cảm xúc, thử lại nhé."
        },
        "RECALL": {
            "CONFIRM_TITLE": "Thu hồi tin nhắn này?",
            "CONFIRM_BODY": "Tin nhắn sẽ bị xoá với cả hai bên. Chỉ thu hồi được trong {minutes} phút sau khi gửi.",
            "CANCEL": "Huỷ",
            "CONFIRM": "Thu hồi",
            "BY_YOU": "Bạn đã thu hồi một tin nhắn",
            "BY_THEM": "Tin nhắn đã bị thu hồi",
            "EXPIRED": "Đã quá hạn thu hồi tin nhắn này.",
            "FAILED": "Không thu hồi được tin nhắn. Bạn thử lại nhé."
        },
        "REPLY": {
            "REPLYING_TO": "Trả lời {name}",
            "YOU": "Bạn",
            "CANCEL": "Bỏ trả lời",
            "JUMP_TO_ORIGINAL": "Xem tin gốc",
            "ORIGINAL_UNAVAILABLE": "Tin gốc không còn"
        },
        "DELIVERY": {
            "SENT": "Đã gửi",
            "DELIVERED": "Đã nhận",
            "SEEN": "Đã xem",
            "SENDING": "Đang gửi…",
            "FAILED": "Chưa gửi được",
            "FAILED_TITLE": "Không gửi được tin nhắn"
        },
        "COMPOSER": {
            "ADD": "Gửi ảnh hoặc tệp",
            "STICKER": "Sticker và emoji",
            "EMOJI": "Biểu tượng cảm xúc",
            "CANCEL_UPLOAD": "Huỷ gửi tệp",
            "CANCEL_SEND": "Huỷ gửi",
            "SEND": "Gửi",
            "CAPTION_PLACEHOLDER": "Thêm chú thích…",
            "ATTACH_IMAGE": "Ảnh",
            "ATTACH_IMAGE_HINT": "Chọn được nhiều ảnh",
            "ATTACH_FILE": "Tệp",
            "ATTACH_FILE_HINT": "Tối đa {size} mỗi tệp",
            "SELECTED_COUNT": "{count} ảnh đã chọn",
            "REMOVE_ATTACHMENT": "Bỏ",
            "ADD_MORE": "Thêm nữa"
        },
        "STICKER_PANEL": {
            "TAB_STICKER": "Sticker",
            "TAB_EMOJI": "Emoji",
            "TAB_RECENT": "Gần đây",
            "RECENT_EMPTY": "Chưa có gì ở đây.",
            "STICKER_ALT": "Sticker",
            "SUGGESTIONS": "Sticker gợi ý",
            "DISMISS_SUGGESTIONS": "Ẩn sticker gợi ý"
        },
        "ATTACHMENT_STATE": {
            "UPLOADING": "Đang gửi {count} ảnh…",
            "UPLOADING_FILE": "Đang gửi tệp…",
            "UPLOADING_PROGRESS": "{size} · đang tải {percent}%",
            "UPLOAD_FAILED_TITLE": "Không gửi được ảnh",
            "UPLOAD_FAILED_FILE_TITLE": "Không gửi được tệp",
            "UPLOAD_FAILED_SIZE": "Tệp vượt {size}",
            "UPLOAD_FAILED_NETWORK": "Mạng chập chờn, bạn thử lại nhé.",
            "RETRY": "Thử lại",
            "PHOTO_COUNT": "{count} ảnh",
            "VIEW_ALL": "Xem cả {count} ảnh"
        },
        "EMPTY_STATE": {
            "TITLE": "Chào bạn!",
            "BODY": "Nhắn cho {name} bất cứ điều gì. Bạn có thể gửi kèm ảnh, tệp hoặc sticker.",
            "BODY_WITHOUT_STICKER": "Nhắn cho {name} bất cứ điều gì. Bạn có thể gửi kèm ảnh hoặc tệp."
        },
        "HEADER": {
            "ONLINE": "Đang trực tuyến",
            "AWAY": "Đang vắng mặt",
            "CLOSE": "Đóng cửa sổ trò chuyện",
            "BACK": "Quay lại",
            "AGENT_ACTIVE": "Đang hoạt động",
            "MORE": "Tuỳ chọn khác",
            "POPOUT": "Mở trong cửa sổ riêng",
            "TRANSCRIPT": "Gửi lịch sử chat qua email",
            "NEW_CONVERSATION": "Cuộc trò chuyện mới"
        },
        "OUT_OF_HOURS": {
            "TITLE": "Shop đang nghỉ",
            "BODY": "Bạn cứ để lại tin nhắn, mình trả lời khi mở cửa lại.",
            "EMAIL_PLACEHOLDER": "Email để nhận trả lời",
            "CTA": "Để lại tin nhắn",
            "EMAIL_TITLE": "Nhận trả lời qua email",
            "EMAIL_LABEL": "Email của bạn",
            "HINT": "Hoặc nhắn ngay bên dưới, shop đọc khi mở cửa.",
            "HOURS": "Nhóm hỗ trợ trực từ {from} đến {to}.",
            "BODY_REOPEN": "Bạn cứ để lại tin nhắn, mình trả lời khi mở cửa {reopen}.",
            "REOPEN": "Mở cửa lại {reopen}.",
            "REOPEN_TODAY": "lúc {time}",
            "REOPEN_TOMORROW": "lúc {time} mai",
            "REOPEN_ON_DAY": "lúc {time} {day}",
            "REOPEN_TOMORROW_ALL_DAY": "vào ngày mai",
            "REOPEN_ON_DAY_ALL_DAY": "vào {day}",
            "BANNER": "Đang ngoài giờ hỗ trợ, mình trả lời khi mở cửa {reopen}.",
            "BANNER_FALLBACK": "Đang ngoài giờ hỗ trợ, mình trả lời khi mở cửa lại."
        },
        "CONVERSATION_END": {
            "TITLE": "Cuộc trò chuyện đã kết thúc",
            "RATE_PROMPT": "Bạn thấy lần hỗ trợ này thế nào?",
            "POOR": "Kém",
            "OKAY": "Ổn",
            "GREAT": "Tuyệt",
            "FEEDBACK_PLACEHOLDER": "Điều gì có thể tốt hơn? (không bắt buộc)",
            "SUBMIT": "Gửi đánh giá",
            "SUBMIT_FAILED": "Chưa gửi được đánh giá. Bạn thử lại nhé.",
            "THANKS": "Cảm ơn bạn đã đánh giá!",
            "SUPPORTED_MINUTES": "Đã hỗ trợ trong {n} phút",
            "SUPPORTED_HOURS": "Đã hỗ trợ trong {n} giờ",
            "SUPPORTED_DAYS": "Đã hỗ trợ trong {n} ngày"
        },
        "LAUNCHER": {
            "OPEN": "Mở trò chuyện",
            "CLOSE": "Thu nhỏ trò chuyện",
            "UNREAD": "{count} tin nhắn chưa đọc",
            "OPEN_UNREAD": "Mở trò chuyện, {count} tin nhắn chưa đọc"
        },
        "NEW_MESSAGES": "Tin nhắn mới",
        "TYPING_INDICATOR": {
            "LABEL": "Đang soạn tin…"
        },
        "CARD": {
            "CTA_FALLBACK": "Xem chi tiết",
            "PREVIOUS": "Thẻ trước",
            "NEXT": "Thẻ sau"
        },
        "TABS": {
            "LABEL": "Điều hướng widget",
            "HOME": "Trang chủ",
            "MESSAGES": "Tin nhắn",
            "HELP": "Trợ giúp",
            "UPDATES": "Cập nhật"
        },
        "NAV": {
            "BACK": "Quay lại",
            "CLOSE": "Đóng",
            "EXPAND": "Phóng to",
            "COLLAPSE": "Thu nhỏ"
        },
        "HOME": {
            "GREETING_LINE": "Chào bạn,",
            "GREETING_DEFAULT": "{name} có thể giúp gì?",
            "CONTINUE_WITH": "Tiếp tục với {name} · {time}",
            "CONTINUE": "Tiếp tục hội thoại · {time}",
            "SEND_NEW": "Gửi tin nhắn mới",
            "START": "Bắt đầu trò chuyện",
            "FIND_ANSWERS": "Tìm câu trả lời",
            "SEARCH_PLACEHOLDER": "Hỏi về đổi trả, giao hàng…",
            "OTHER_CHANNELS": "Nhắn qua kênh khác",
            "REQUEST": "Gửi yêu cầu bảo hành, đổi trả",
            "COMING_SOON": "Sắp ra mắt",
            "CHANNEL_HINT": {
                "ZALO": "Nhắn Zalo của {name}",
                "MESSENGER": "Trang Facebook {name}",
                "TELEGRAM": "Telegram của {name}",
                "WHATSAPP": "WhatsApp của {name}",
                "INSTAGRAM": "Instagram của {name}",
                "TIKTOK": "TikTok của {name}",
                "HOTLINE": "Gọi hotline",
                "EMAIL": "Gửi email",
                "CUSTOM": "Mở liên kết"
            },
            "CHANNEL_NAME": {
                "ZALO": "Zalo",
                "MESSENGER": "Messenger",
                "TELEGRAM": "Telegram",
                "WHATSAPP": "WhatsApp",
                "INSTAGRAM": "Instagram",
                "TIKTOK": "TikTok",
                "HOTLINE": "Gọi hotline",
                "EMAIL": "Email",
                "CUSTOM": "Liên kết"
            }
        },
        "MESSAGE_LIST": {
            "TITLE": "Tin nhắn",
            "NEW": "Gửi tin nhắn mới",
            "EMPTY_TITLE": "Chưa có tin nhắn nào",
            "EMPTY_BODY": "Các cuộc trò chuyện với {name} sẽ nằm ở đây.",
            "LOAD_FAILED": "Chưa tải được danh sách, thử lại nhé",
            "RETRY": "Thử lại",
            "LOAD_MORE": "Xem thêm",
            "UNREAD": "{count} tin chưa đọc",
            "YOU": "Bạn: {text}",
            "PICK": "Chọn một cuộc trò chuyện",
            "NEW_CONVERSATION": "Cuộc trò chuyện mới"
        },
        "HELP": {
            "TITLE": "Trợ giúp",
            "SEARCH": "Tìm câu trả lời",
            "CLEAR": "Xoá từ khoá",
            "POPULAR": "Hay được hỏi",
            "CATEGORIES": "Danh mục",
            "EMPTY_TITLE": "Chưa có bài viết nào",
            "EMPTY_BODY": "Nhắn cho shop, nhân viên sẽ trả lời bạn.",
            "LOAD_FAILED": "Chưa tải được bài viết, thử lại nhé",
            "RESULTS": "{count} bài viết",
            "NO_RESULTS": "Không thấy bài nào khớp “{query}”",
            "NOT_FOUND": "Chưa thấy câu trả lời?",
            "MESSAGE_TEAM": "Nhắn nhân viên",
            "UPDATED": "Cập nhật {date}",
            "READ_TIME": "{n} phút đọc",
            "STILL_NEED_HELP": "Vẫn cần hỗ trợ? Nhắn cho shop"
        },
        "UPDATES": {
            "TITLE": "Cập nhật",
            "EMPTY_TITLE": "Chưa có tin mới",
            "EMPTY_BODY": "Khuyến mãi, hàng mới và thông báo của {name} sẽ hiện ở đây.",
            "LOAD_FAILED": "Chưa tải được tin, thử lại nhé",
            "ASK": "Hỏi shop về tin này",
            "TAG": {
                "PROMO": "Khuyến mãi",
                "NEW": "Sản phẩm mới",
                "NOTICE": "Thông báo"
            }
        },
        "REQUEST": {
            "TITLE": "Gửi yêu cầu",
            "NOTICE_TITLE": "Tính năng đang hoàn thiện",
            "NOTICE_BODY": "Trong lúc chờ, bạn nhắn trực tiếp cho shop, nhân viên sẽ xử lý như một yêu cầu.",
            "WARRANTY": "Bảo hành sản phẩm",
            "WARRANTY_HINT": "Gửi ảnh lỗi, mã đơn",
            "RETURN": "Đổi trả",
            "RETURN_HINT": "Kèm mã đơn và lý do",
            "INVOICE": "Xuất hoá đơn VAT",
            "INVOICE_HINT": "Tên công ty, mã số thuế",
            "MESSAGE_SHOP": "Nhắn cho shop"
        },
        "TIME": {
            "NOW": "vừa xong",
            "MINUTES": "{n} phút",
            "HOURS": "{n} giờ",
            "YESTERDAY": "Hôm qua"
        }
    },
    "WIDGET_BUILDER": {
        "COMING_SOON": "Sắp ra mắt",
        "HEADER": {
            "BREADCRUMB_ARIA_LABEL": "Đường dẫn",
            "BREADCRUMB_SETTINGS": "Cài đặt",
            "BREADCRUMB_INBOXES": "Hộp thư",
            "TITLE": "Widget chat",
            "SAVE_SUCCESS": "Đã lưu cấu hình widget.",
            "SAVE_ERROR": "Lưu cấu hình widget không thành công, thử lại nhé."
        },
        "NAV": {
            "ARIA_LABEL": "Mục cấu hình widget",
            "APPEARANCE": "Giao diện",
            "HOME": "Trang chủ",
            "CHANNELS": "Kênh khác và liên kết",
            "CAPTURE": "Thu thông tin khách",
            "INVITE": "Lời mời chủ động",
            "AI": "Trợ lý AI",
            "EMBED": "Mã nhúng"
        },
        "PREVIEW": {
            "TITLE": "Xem trước",
            "DEVICE_LABEL": "Xem trước trên",
            "DEVICE_DESKTOP": "Máy tính",
            "DEVICE_MOBILE": "Điện thoại",
            "IFRAME_TITLE": "Xem trước widget"
        },
        "APPEARANCE": {
            "TITLE": "Giao diện",
            "DESCRIPTION": "Màu, launcher và vị trí trên website của bạn.",
            "ACCENT_COLOR_LABEL": "Màu nhấn",
            "ACCENT_COLOR_HEX_LABEL": "Mã màu (hex)",
            "ACCENT_COLOR_CONTRAST_GOOD": "Chữ trắng đọc tốt trên màu này ({ratio}:1)",
            "ACCENT_COLOR_CONTRAST_BAD": "Chữ trắng khó đọc trên màu này ({ratio}:1), widget sẽ tự đổi sang chữ mực",
            "ACCENT_COLOR_INVALID": "Mã màu không hợp lệ — dùng dạng #RRGGBB",
            "LAUNCHER_LABEL": "Kiểu launcher",
            "LAUNCHER_ROUND": "Tròn",
            "LAUNCHER_PILL": "Có chữ",
            "LAUNCHER_LABEL_PLACEHOLDER": "Chat với shop",
            "POSITION_LABEL": "Vị trí",
            "POSITION_LEFT": "Trái",
            "POSITION_RIGHT": "Phải",
            "GREETING_LABEL": "Lời chào trang chủ",
            "GREETING_HINT": "Hiện ngay dưới tên shop ở màn trang chủ widget.",
            "GREETING_PLACEHOLDER": "Chúng tôi có thể giúp gì?",
            "ACCOUNT_LANGUAGE_LABEL": "Ngôn ngữ",
            "ACCOUNT_LANGUAGE_HINT": "Áp cho cả tài khoản: mọi widget chat trên website và dashboard của nhân viên chưa tự chọn ngôn ngữ riêng. Trang nhúng vẫn chọn được ngôn ngữ khác bằng tuỳ chọn locale trong mã nhúng.",
            "SOUND_LABEL": "Âm báo tin mới",
            "SOUND_HINT": "Kêu trên website của bạn khi shop trả lời lúc khách đang mở trang."
        },
        "HOME": {
            "TITLE": "Trang chủ",
            "DESCRIPTION": "Bật tắt từng khối. Tắt hết thì widget mở thẳng vào khung chat.",
            "ALWAYS_ON": "Luôn bật",
            "BLOCK_MESSAGE_SHOP": "Gửi tin nhắn cho shop",
            "BLOCK_MESSAGE_SHOP_DESCRIPTION": "Luôn hiện, kèm trạng thái và thời gian phản hồi.",
            "BLOCK_RECENT_CONVERSATION": "Hội thoại gần nhất",
            "BLOCK_HELP": "Tìm trợ giúp và bài nổi bật",
            "HELP_BLOCK_CONNECTED": "Lấy từ Help Center \"{portal}\", {count} bài",
            "HELP_BLOCK_NOT_CONNECTED": "Chưa nối Help Center — kết nối ngay",
            "BLOCK_OTHER_CHANNELS": "Kênh khác (Zalo, Messenger, hotline)",
            "BLOCK_CUSTOM_LINKS": "Liên kết tuỳ chỉnh",
            "BLOCK_REQUEST": "Gửi yêu cầu theo loại",
            "BLOCK_REQUEST_DESCRIPTION": "Khách chọn đúng loại yêu cầu (đổi trả, bảo hành…) trước khi nhắn."
        },
        "CHANNELS": {
            "TITLE": "Kênh khác",
            "DESCRIPTION": "Khách bấm vào sẽ mở đúng kênh đó. Chỉ kênh đang bật mới hiện trên trang chủ widget.",
            "KIND_HOTLINE": "Hotline",
            "KIND_EMAIL": "Email",
            "KIND_CUSTOM": "Khác",
            "VALUE_LABEL": "Địa chỉ hoặc số",
            "ENABLED_LABEL": "Bật kênh này",
            "MOVE_UP": "Đưa lên trên",
            "MOVE_DOWN": "Đưa xuống dưới",
            "REMOVE": "Xoá",
            "ADD": "Thêm kênh",
            "LINKS_TITLE": "Liên kết tuỳ chỉnh",
            "LINKS_DESCRIPTION": "Tối đa {max} liên kết. Mở trong tab mới.",
            "LINK_LABEL_LABEL": "Tên hiển thị",
            "LINK_URL_LABEL": "Địa chỉ",
            "ADD_LINK": "Thêm liên kết"
        },
        "CAPTURE": {
            "TITLE": "Thu thông tin khách",
            "DESCRIPTION": "Hỏi trong luồng chat sau tin đầu tiên, không chặn khách trước khi nhắn.",
            "PHONE_LABEL": "Hỏi số điện thoại",
            "EMAIL_LABEL": "Hỏi email"
        },
        "INVITE": {
            "TITLE": "Lời mời chủ động",
            "DESCRIPTION": "Dùng chung với chiến dịch live chat — thêm/sửa lời mời ở trang Chiến dịch.",
            "ADD": "Thêm lời mời",
            "EMPTY": "Hộp thư này chưa có lời mời chủ động nào.",
            "QUICK_REPLIES_COUNT": "{count} nút trả lời nhanh",
            "STATUS_ON": "Đang bật",
            "STATUS_OFF": "Đang tắt",
            "AUDIENCE_ALL": "Mọi khách",
            "AUDIENCE_NEW": "Khách mới",
            "AUDIENCE_RETURNING": "Khách quay lại",
            "MANAGE_LINK": "Quản lý lời mời chủ động"
        },
        "AI": {
            "TITLE": "Trợ lý AI",
            "DESCRIPTION": "Bộ não AI chưa có trong Yona — đây là hình dung trước những gì nó sẽ làm.",
            "FEATURE_KNOWLEDGE": "Trả lời dựa trên tài liệu và câu trả lời mẫu của shop.",
            "FEATURE_AUTO_REPLY": "Tự trả lời khách, nhân viên vào tiếp quản khi cần.",
            "FEATURE_HANDOFF": "Chuyển cho nhân viên khi khách muốn gặp người hoặc AI không chắc câu trả lời.",
            "MOCK_CUSTOMER_MESSAGE": "Mua rồi mà không vừa thì đổi thế nào vậy shop?",
            "MOCK_AI_REPLY": "Bạn được đổi trong 7 ngày kể từ khi nhận hàng, sản phẩm còn nguyên tem.",
            "MOCK_SOURCE": "Nguồn: Đổi trả trong 7 ngày"
        },
        "EMBED": {
            "TITLE": "Mã nhúng",
            "DESCRIPTION": "Dán đoạn mã này trước thẻ </body>. Dán một lần là widget hiện trên mọi trang.",
            "NO_LOADED_EVENT_YET": "Yona chưa ghi lại thời điểm khách mở widget lần gần nhất, nên chưa hiện được banner \"đang chạy trên…\" ở đây.",
            "DOMAINS_LABEL": "Chỉ hiện trên các tên miền",
            "DOMAINS_HINT": "Chặn người khác chép mã của bạn lên website của họ. Để trống là cho phép mọi tên miền.",
            "DOMAINS_PLACEHOLDER": "Nhập tên miền, Enter để thêm"
        }
    },
    "WIDGET_UPDATES_MGMT": {
        "HEADER": "Bài cập nhật trên widget",
        "HEADER_BTN_TXT": "Thêm bài cập nhật",
        "DESCRIPTION": "Đăng khuyến mãi, hàng mới hoặc thông báo lên tab Cập nhật của widget chat trên website.",
        "LOADING": "Đang tải bài cập nhật",
        "SEARCH_PLACEHOLDER": "Tìm bài cập nhật...",
        "NO_RESULTS": "Không tìm thấy bài nào khớp",
        "LIST": {
            "404": "Chưa có bài cập nhật nào. Thêm bài đầu tiên để khách thấy ở tab Cập nhật.",
            "TABLE_HEADER": {
                "COVER": "Ảnh bìa",
                "TITLE": "Tiêu đề",
                "TAG": "Nhãn",
                "INBOX": "Hộp thư",
                "STATUS": "Trạng thái",
                "ACTION": "Hành động"
            },
            "ALL_INBOXES": "Mọi website",
            "STATUS_DRAFT": "Nháp",
            "STATUS_PUBLISHED": "Đã đăng"
        },
        "FORM": {
            "TITLE": {
                "LABEL": "Tiêu đề",
                "PLACEHOLDER": "Giảm 15% bộ sưu tập men lam đến hết 30/09",
                "REQUIRED_ERROR": "Tiêu đề là bắt buộc",
                "MAX_ERROR": "Tiêu đề tối đa 120 ký tự"
            },
            "BODY": {
                "LABEL": "Nội dung",
                "PLACEHOLDER": "Mô tả chi tiết bài cập nhật. Xuống dòng sẽ giữ nguyên khi hiển thị trên widget.",
                "MAX_ERROR": "Nội dung tối đa 5000 ký tự"
            },
            "TAG": {
                "LABEL": "Nhãn"
            },
            "COVER": {
                "LABEL": "Ảnh bìa",
                "UPLOAD_BTN": "Tải ảnh lên",
                "REPLACE_BTN": "Đổi ảnh",
                "REMOVE_BTN": "Gỡ ảnh",
                "UPLOAD_ERROR": "Tải ảnh lên thất bại, thử lại nhé"
            },
            "CTA_LABEL": {
                "LABEL": "Chữ trên nút hành động",
                "PLACEHOLDER": "Xem bộ sưu tập",
                "REQUIRED_ERROR": "Cần có chữ trên nút khi đã nhập đường dẫn",
                "MAX_ERROR": "Tối đa 40 ký tự"
            },
            "CTA_URL": {
                "LABEL": "Đường dẫn khi bấm nút",
                "PLACEHOLDER": "https://...",
                "INVALID_ERROR": "Đường dẫn phải bắt đầu bằng http:// hoặc https://"
            },
            "INBOX": {
                "LABEL": "Hiện ở hộp thư",
                "PLACEHOLDER": "Mọi website"
            },
            "PREVIEW_TITLE": "Xem trước trên widget",
            "SAVE_DRAFT": "Lưu nháp",
            "PUBLISH": "Đăng",
            "UNPUBLISH": "Gỡ đăng",
            "CANCEL": "Huỷ",
            "EDIT": "Sửa",
            "DELETE": "Xoá"
        },
        "ADD": {
            "TITLE": "Thêm bài cập nhật",
            "DESC": "Bài mới lưu ở dạng nháp cho tới khi bạn bấm Đăng.",
            "API": {
                "SUCCESS_MESSAGE": "Đã lưu bài cập nhật",
                "ERROR_MESSAGE": "Đã có lỗi, vui lòng thử lại"
            }
        },
        "EDIT": {
            "TITLE": "Sửa bài cập nhật",
            "API": {
                "SUCCESS_MESSAGE": "Đã lưu thay đổi",
                "ERROR_MESSAGE": "Đã có lỗi, vui lòng thử lại"
            }
        },
        "PUBLISH": {
            "API": {
                "SUCCESS_MESSAGE": "Đã đăng bài lên widget",
                "ERROR_MESSAGE": "Đăng bài thất bại, vui lòng thử lại"
            }
        },
        "UNPUBLISH": {
            "API": {
                "SUCCESS_MESSAGE": "Đã gỡ bài khỏi widget",
                "ERROR_MESSAGE": "Gỡ bài thất bại, vui lòng thử lại"
            }
        },
        "DELETE": {
            "CONFIRM": {
                "TITLE": "Xác nhận xoá",
                "MESSAGE": "Bạn có chắc muốn xoá bài",
                "YES": "Có, xoá",
                "NO": "Không, giữ lại"
            },
            "API": {
                "SUCCESS_MESSAGE": "Đã xoá bài cập nhật",
                "ERROR_MESSAGE": "Đã có lỗi, vui lòng thử lại"
            }
        }
    }
};

export default messages;
