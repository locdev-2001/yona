{{-- Port từ _home_categories.html.erb --}}
<div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
  @foreach ($homeCategories as $category)
    @include('public.portal.partials.category-block', ['category' => $category])
  @endforeach
</div>
<div class="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-6">
  @if ($uncategorizedArticles->isNotEmpty())
    @include('public.portal.partials.uncategorized-block')
  @endif
</div>
