{{-- Port từ _article_count.html.erb --}}
@if ($articleCount == 0)
@elseif ($articleCount == 1)
  {{ $articleCount }} {{ __('public_portal.common.article') }}
@else
  {{ $articleCount }} {{ __('public_portal.common.articles') }}
@endif
