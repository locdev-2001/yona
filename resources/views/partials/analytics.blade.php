{{-- Analytics không cookie, tự bỏ qua localhost. Script và sự kiện đi qua đường dẫn first-party
     (routes/api.php) để trình chặn quảng cáo không chặn; đường dẫn tương đối nên trang lỗi của
     Help Center trên domain riêng cũng gửi về đúng máy chủ. Không nhúng vào widget.blade.php
     (iframe chạy trên web của khách — lượt xem ở đó không phải lượt xem của Yona). --}}
@if (app(\App\Services\Analytics\PlausibleProxy::class)->enabled())
<script defer src="{{ route('analytics.script', [], false) }}"></script>
<script>
    window.plausible = window.plausible || function () { (plausible.q = plausible.q || []).push(arguments) };
    plausible.init = plausible.init || function (i) { plausible.o = i || {} };
    plausible.init({ endpoint: @js(route('analytics.event', [], false)) });
</script>
@endif
