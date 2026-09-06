{{-- Port từ layouts/_portal_analytics.html.erb. Mọi giá trị đã qua
     Portal::ANALYTICS_CONFIG_FORMATS nên khuôn dạng an toàn trước khi nhúng. --}}
@php($analytics = $portal->analytics())
@if (filled($analytics['gtm_container_id'] ?? null))
  <!-- Google Tag Manager -->
  <script>
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer',{{ Js::from($analytics['gtm_container_id']) }});
  </script>
  <!-- End Google Tag Manager -->
@endif
@if (filled($analytics['ga4_measurement_id'] ?? null))
  <!-- Google Analytics 4 -->
  <script async src="https://www.googletagmanager.com/gtag/js?id={{ $analytics['ga4_measurement_id'] }}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', {{ Js::from($analytics['ga4_measurement_id']) }});
  </script>
  <!-- End Google Analytics 4 -->
@endif
@if (filled($analytics['hotjar_site_id'] ?? null))
  <!-- Hotjar -->
  <script>
    (function(h,o,t,j,a,r){
    h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
    h._hjSettings={hjid:{{ (int) $analytics['hotjar_site_id'] }},hjsv:6};
    a=o.getElementsByTagName('head')[0];
    r=o.createElement('script');r.async=1;
    r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
    a.appendChild(r);
    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
  </script>
  <!-- End Hotjar -->
@endif
@if (filled($analytics['plausible_domain'] ?? null))
  <!-- Plausible -->
  <script defer data-domain="{{ $analytics['plausible_domain'] }}" src="https://plausible.io/js/script.js"></script>
  <!-- End Plausible -->
@endif
@if (filled($analytics['amplitude_api_key'] ?? null))
  <!-- Amplitude (analytics-only SDK, not the unified loader) -->
  <script src="https://cdn.amplitude.com/libs/analytics-browser-2.45.5-min.js.gz"></script>
  <script>window.amplitude.init({{ Js::from($analytics['amplitude_api_key']) }});</script>
  <!-- End Amplitude -->
@endif
@if (filled($analytics['clarity_project_id'] ?? null))
  <!-- Microsoft Clarity -->
  <script>
    (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", {{ Js::from($analytics['clarity_project_id']) }});
  </script>
  <!-- End Microsoft Clarity -->
@endif
@if (filled($analytics['meta_pixel_id'] ?? null))
  <!-- Meta Pixel -->
  <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', {{ Js::from($analytics['meta_pixel_id']) }});
    fbq('track', 'PageView');
  </script>
  <!-- End Meta Pixel -->
@endif
