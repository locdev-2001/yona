{{-- Port từ layouts/_portal_scripts.html.erb --}}
@isset($article)
<script>
  (function() {
    let viewTracked = false;
    const trackView = function() {
      if (!viewTracked) {
        viewTracked = true;
        const img = new Image();
        img.src = {{ Js::from(url('/hc/'.$portal->slug.'/articles/'.$article->slug.'.png')) }};
      }
    };

    const addTrackingListeners = function() {
      const events = ['mouseenter', 'touchstart', 'focus'];
      events.forEach(event => {
        document.body.addEventListener(event, function() {
          setTimeout(trackView, 5000);
        }, { once: true });
      });
    };
    addTrackingListeners();
  })();
</script>
@endisset
<style>
html.dark {
  --dynamic-portal-bg: {{ $links::background($portal->color, 'dark') }};
  --dynamic-portal-bg-gradient: {{ $links::backgroundGradient('dark') }};
  --dynamic-hover-bg-color: {{ $links::hoverBackground($portal->color, 'dark') }};
  --dynamic-portal-color: {{ $portal->color }};
  --dynamic-portal-color-soft: color-mix(in srgb, {{ $portal->color }} 18%, transparent);
  --dynamic-portal-color-faint: color-mix(in srgb, {{ $portal->color }} 6%, transparent);
}

html.light {
  --dynamic-portal-bg: {{ $links::background($portal->color, 'light') }};
  --dynamic-portal-bg-gradient: {{ $links::backgroundGradient('light') }};
  --dynamic-hover-bg-color: {{ $links::hoverBackground($portal->color, 'light') }};
  --dynamic-portal-color: {{ $portal->color }};
  --dynamic-portal-color-soft: color-mix(in srgb, {{ $portal->color }} 12%, transparent);
  --dynamic-portal-color-faint: color-mix(in srgb, {{ $portal->color }} 5%, transparent);
}

/* Portal background */
#portal-bg {
  background: var(--dynamic-portal-bg);
}
/* Portal background gradient */
#portal-bg-gradient {
  background-image: var(--dynamic-portal-bg-gradient);
}
/* Category block item hover color */
#category-item:hover {
  background-color: var(--dynamic-hover-bg-color);
}

/* Header section */
#header-action-button:hover,
#toggle-appearance:hover,
#toggle-theme-button:hover {
  color: var(--dynamic-hover-color);
  stroke: var(--dynamic-hover-color);
}
#category-block:hover {
  border-color: var(--dynamic-hover-color);
}
#category-block:hover #category-name  {
  color: var(--dynamic-hover-color);
}
/* Recommended topic pills in the classic hero */
.recommended-pill:hover {
  border-color: var(--dynamic-hover-color);
  color: var(--dynamic-hover-color);
}
</style>

<script>
  window.portalConfig = {
    portalSlug: @json($portal->slug),
    portalColor: @json($portal->color),
    theme: @json($theme ?? ''),
    customDomain: @json($portal->custom_domain ?? ''),
    hostURL: @json(config('app.url')),
    localeCode: @json($locale),
    searchTranslations: {
      searchPlaceholder: @json(__('public_portal.search.search_placeholder')),
      emptyPlaceholder: @json(__('public_portal.search.empty_placeholder')),
      loadingPlaceholder: @json(__('public_portal.search.loading_placeholder')),
      resultsTitle: @json(__('public_portal.search.results_title')),
      submit: @json(__('public_portal.search.submit')),
    },
    isPlainLayoutEnabled: @json($isPlainLayout ? 'true' : 'false'),
    tocHeader: @json(__('public_portal.toc_header')),
  };
</script>
@if ($portal->channelWebWidget && ! $isPlainLayout)
<script>
  window.chatwootSettings = window.chatwootSettings || {};
  window.chatwootSettings.locale = @json($locale);
</script>
{!! $portal->channelWebWidget->web_widget_script !!}
@endif
