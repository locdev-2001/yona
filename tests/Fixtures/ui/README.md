# Fixture cho `scripts/check-ui.py --self-test`

Ảnh lỗi THẬT, lấy từ lịch sử git, để chứng minh check bắt lại được lỗi cũ.
Check nào không fail được trên fixture của nó thì không đáng giữ — đó là bài học
từ bộ 7 gate grep cũ: xanh 100% trên một trang đang hỏng.

| Tệp | Nguồn | Lỗi |
|---|---|---|
| `cat-xuyen-chu-square-contacts.png` | `git show 39bc7bc9:public/landing/square-contacts.png` | lề trái 0px — mọi tên khách mất chữ cái đầu, mọi số điện thoại mất vài chữ số đầu |
