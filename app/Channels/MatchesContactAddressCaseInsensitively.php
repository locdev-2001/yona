<?php

namespace App\Channels;

/**
 * Địa chỉ khách của kênh không phân biệt hoa thường (vd email): lõi tìm địa chỉ đã có của
 * liên hệ theo chữ thường trước khi tạo mới, để một khách không thành hai địa chỉ.
 */
interface MatchesContactAddressCaseInsensitively {}
