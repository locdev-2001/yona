<?php

// Danh sách tĩnh các ngân hàng có BIN NAPAS (VietQR), không gọi API ngoài lúc
// chạy. Nguồn: api.vietqr.io/v2/banks (truy vấn 26/09/2026) — chỉ giữ lại
// ngân hàng có BIN 6 số bắt đầu bằng 970 (NAPAS thật), bỏ ví điện tử/ngân hàng
// số dùng BIN khác dải (CIMB, HSBC, MoMo, CAKE, Ubank…). Thêm ngân hàng mới thì
// đối chiếu lại nguồn này trước khi thêm BIN.
//
// `code`: mã ngắn hiển thị (monogram). `short_name`: tên rút gọn cho danh sách
// chọn. `name`: tên đầy đủ.

return [
    ['bin' => '970436', 'code' => 'VCB', 'short_name' => 'Vietcombank', 'name' => 'Ngân hàng TMCP Ngoại Thương Việt Nam'],
    ['bin' => '970415', 'code' => 'ICB', 'short_name' => 'VietinBank', 'name' => 'Ngân hàng TMCP Công thương Việt Nam'],
    ['bin' => '970418', 'code' => 'BIDV', 'short_name' => 'BIDV', 'name' => 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam'],
    ['bin' => '970405', 'code' => 'VBA', 'short_name' => 'Agribank', 'name' => 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam'],
    ['bin' => '970422', 'code' => 'MB', 'short_name' => 'MBBank', 'name' => 'Ngân hàng TMCP Quân đội'],
    ['bin' => '970407', 'code' => 'TCB', 'short_name' => 'Techcombank', 'name' => 'Ngân hàng TMCP Kỹ thương Việt Nam'],
    ['bin' => '970416', 'code' => 'ACB', 'short_name' => 'ACB', 'name' => 'Ngân hàng TMCP Á Châu'],
    ['bin' => '970432', 'code' => 'VPB', 'short_name' => 'VPBank', 'name' => 'Ngân hàng TMCP Việt Nam Thịnh Vượng'],
    ['bin' => '970423', 'code' => 'TPB', 'short_name' => 'TPBank', 'name' => 'Ngân hàng TMCP Tiên Phong'],
    ['bin' => '970403', 'code' => 'STB', 'short_name' => 'Sacombank', 'name' => 'Ngân hàng TMCP Sài Gòn Thương Tín'],
    ['bin' => '970437', 'code' => 'HDB', 'short_name' => 'HDBank', 'name' => 'Ngân hàng TMCP Phát triển TP Hồ Chí Minh'],
    ['bin' => '970454', 'code' => 'VCCB', 'short_name' => 'VietCapitalBank', 'name' => 'Ngân hàng TMCP Bản Việt'],
    ['bin' => '970429', 'code' => 'SCB', 'short_name' => 'SCB', 'name' => 'Ngân hàng TMCP Sài Gòn'],
    ['bin' => '970441', 'code' => 'VIB', 'short_name' => 'VIB', 'name' => 'Ngân hàng TMCP Quốc tế Việt Nam'],
    ['bin' => '970443', 'code' => 'SHB', 'short_name' => 'SHB', 'name' => 'Ngân hàng TMCP Sài Gòn - Hà Nội'],
    ['bin' => '970431', 'code' => 'EIB', 'short_name' => 'Eximbank', 'name' => 'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam'],
    ['bin' => '970426', 'code' => 'MSB', 'short_name' => 'MSB', 'name' => 'Ngân hàng TMCP Hàng Hải Việt Nam'],
    ['bin' => '970412', 'code' => 'PVCB', 'short_name' => 'PVcomBank', 'name' => 'Ngân hàng TMCP Đại Chúng Việt Nam'],
    ['bin' => '970414', 'code' => 'MBV', 'short_name' => 'MBV', 'name' => 'Ngân hàng TNHH MTV Việt Nam Hiện Đại'],
    ['bin' => '970419', 'code' => 'NCB', 'short_name' => 'NCB', 'name' => 'Ngân hàng TMCP Quốc Dân'],
    ['bin' => '970425', 'code' => 'ABB', 'short_name' => 'ABBANK', 'name' => 'Ngân hàng TMCP An Bình'],
    ['bin' => '970427', 'code' => 'VAB', 'short_name' => 'VietABank', 'name' => 'Ngân hàng TMCP Việt Á'],
    ['bin' => '970440', 'code' => 'SEAB', 'short_name' => 'SeABank', 'name' => 'Ngân hàng TMCP Đông Nam Á'],
    ['bin' => '970449', 'code' => 'LPB', 'short_name' => 'LPBank', 'name' => 'Ngân hàng TMCP Lộc Phát Việt Nam'],
    ['bin' => '970428', 'code' => 'NAB', 'short_name' => 'NamABank', 'name' => 'Ngân hàng TMCP Nam Á'],
    ['bin' => '970452', 'code' => 'KLB', 'short_name' => 'KienLongBank', 'name' => 'Ngân hàng TMCP Kiên Long'],
    ['bin' => '970433', 'code' => 'VIETBANK', 'short_name' => 'VietBank', 'name' => 'Ngân hàng TMCP Việt Nam Thương Tín'],
    ['bin' => '970438', 'code' => 'BVB', 'short_name' => 'BaoVietBank', 'name' => 'Ngân hàng TMCP Bảo Việt'],
    ['bin' => '970400', 'code' => 'SGICB', 'short_name' => 'SaigonBank', 'name' => 'Ngân hàng TMCP Sài Gòn Công Thương'],
    ['bin' => '970409', 'code' => 'BAB', 'short_name' => 'BacABank', 'name' => 'Ngân hàng TMCP Bắc Á'],
    ['bin' => '970408', 'code' => 'GPB', 'short_name' => 'GPBank', 'name' => 'Ngân hàng Thương mại TNHH MTV Dầu Khí Toàn Cầu'],
    ['bin' => '970457', 'code' => 'WVN', 'short_name' => 'Woori', 'name' => 'Ngân hàng TNHH MTV Woori Việt Nam'],
    ['bin' => '970421', 'code' => 'VRB', 'short_name' => 'VRB', 'name' => 'Ngân hàng Liên doanh Việt - Nga'],
    ['bin' => '970430', 'code' => 'PGB', 'short_name' => 'PGBank', 'name' => 'Ngân hàng TMCP Thịnh vượng và Phát triển'],
    ['bin' => '970444', 'code' => 'CBB', 'short_name' => 'CBBank', 'name' => 'Ngân hàng Thương mại TNHH MTV Xây dựng Việt Nam'],
    ['bin' => '970439', 'code' => 'PBVN', 'short_name' => 'PublicBank', 'name' => 'Ngân hàng TNHH MTV Public Việt Nam'],
    ['bin' => '970424', 'code' => 'SHBVN', 'short_name' => 'ShinhanBank', 'name' => 'Ngân hàng TNHH MTV Shinhan Việt Nam'],
    ['bin' => '970446', 'code' => 'COOPBANK', 'short_name' => 'COOPBANK', 'name' => 'Ngân hàng Hợp tác xã Việt Nam'],
    ['bin' => '970434', 'code' => 'IVB', 'short_name' => 'IndovinaBank', 'name' => 'Ngân hàng TNHH Indovina'],
    ['bin' => '970458', 'code' => 'UOB', 'short_name' => 'UnitedOverseas', 'name' => 'Ngân hàng United Overseas - Chi nhánh TP. Hồ Chí Minh'],
    ['bin' => '970410', 'code' => 'SCVN', 'short_name' => 'StandardChartered', 'name' => 'Ngân hàng TNHH MTV Standard Chartered Bank Việt Nam'],
];
