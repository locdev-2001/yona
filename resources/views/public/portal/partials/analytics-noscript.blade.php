{{-- Port từ layouts/_portal_analytics_noscript.html.erb --}}
@php($analytics = $portal->analytics())
@if (filled($analytics['gtm_container_id'] ?? null))
  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id={{ $analytics['gtm_container_id'] }}"
    title="Google Tag Manager" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->
@endif
@if (filled($analytics['meta_pixel_id'] ?? null))
  <!-- Meta Pixel (noscript) -->
  <noscript><img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id={{ $analytics['meta_pixel_id'] }}&ev=PageView&noscript=1"/></noscript>
  <!-- End Meta Pixel (noscript) -->
@endif
