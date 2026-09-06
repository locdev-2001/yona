{{-- Port từ _authors.html.erb --}}
@php($authors = $category->articles->filter(fn ($article) => $article->isPublished())->sortBy('position')->map->author->filter()->unique('id')->values())
@php($authorCount = $authors->count())
@if ($authorCount > 0)
  <div class="flex flex-row items-center gap-1">
    <div class="flex items-center ltr:flex-row rtl:flex-row-reverse -space-x-2">
      @php($zClasses = ['z-30', 'z-20', 'z-10'])
      @foreach ($authors->take(3) as $index => $author)
        <span class="relative {{ $zClasses[$index] ?? '' }}">
          @include('public.portal.partials.thumbnail', ['author' => $author, 'size' => 5])
        </span>
      @endforeach
    </div>

    @php($firstAuthor = $authors->first()?->name ?? '')
    @php($authorText = $authorCount.' '.($authorCount > 1 ? __('public_portal.common.authors') : __('public_portal.common.author')))
    @php($otherAuthorsCount = $authorCount - 1)
    @php($otherAuthorsText = $otherAuthorsCount > 1 ? __('public_portal.common.others') : __('public_portal.common.other'))

    <span class="{{ $showExpanded ? 'text-base' : 'text-sm' }} font-medium text-slate-600 dark:text-slate-400">
    @if ($showExpanded)
        {{ __('public_portal.common.by').' '.$firstAuthor }}
        {{ $otherAuthorsCount > 0 ? " and {$otherAuthorsCount} {$otherAuthorsText}" : '' }}
    @else
        {{ $authorText }}
    @endif
    </span>
  </div>
@endif
