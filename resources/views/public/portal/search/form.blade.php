{{-- Port từ search/_form.html.erb --}}
<form class="w-full my-4" action="{{ '/'.request()->path() }}" method="GET" data-search-form>
  <input type="hidden" name="locale" value="{{ $locale }}">
  @if ($isPlainLayout)
    <input type="hidden" name="show_plain_layout" value="true">
  @endif
  <input type="text"
         name="query"
         value="{{ $query }}"
         placeholder="{{ __('public_portal.search.search_placeholder') }}"
         data-search-input
         autofocus
         class="{{ $searchInputClass }}">
  <button type="submit" class="sr-only">
    {{ __('public_portal.search.submit') }}
  </button>
</form>
