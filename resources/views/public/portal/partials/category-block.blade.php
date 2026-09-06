{{-- Port từ _category-block.html.erb (+ biến thể .html+plain.erb) --}}
@php($categoryLink = $links::category($portal->slug, $category->locale, $category->slug, $theme, $isPlainLayout))
@php($published = $category->articles->filter(fn ($article) => $article->isPublished())->sortBy('position')->values())

<section class="flex flex-col w-full h-full lg:container">
   <div @if (! $isPlainLayout) id="category-block" @endif class="flex flex-col gap-8 h-full {{ $isPlainLayout ? '' : 'border border-solid border-slate-100 dark:border-slate-800 py-5 px-3 rounded-lg' }}">
      <div class="flex items-center justify-between w-full">
         <div class="flex flex-col items-start gap-1">
            <div class="flex flex-row items-center gap-2 {{ $isPlainLayout ? '' : 'px-1' }}">
               @if (filled($category->icon))
               <span class="text-lg rounded-md cursor-pointer inline-flex {{ $isPlainLayout ? '' : 'pl-1' }}">{!! $links::emojiOrIcon($category->icon, $category->icon_color) !!}</span>
               @endif
               <h3 @if (! $isPlainLayout) id="category-name" @endif class="text-xl text-slate-800 dark:text-slate-50 font-semibold leading-relaxed hover:cursor-pointer {{ $isPlainLayout ? 'hover:underline' : (blank($category->icon) ? 'pl-1' : '') }}">
                  <a href="{{ $categoryLink }}">
                  {{ $category->name }}
                  </a>
               </h3>
            </div>
            @if (filled($category->description))
            <span class="text-base text-slate-600 dark:text-slate-400 {{ $isPlainLayout ? '' : 'px-2' }}">{{ $category->description }}</span>
            @endif
         </div>
      </div>
      <div class="flex flex-col gap-2 flex-grow {{ blank($category->description) ? '-mt-4' : '' }}">
         @if ($published->isEmpty())
         <div class="flex items-center justify-center h-full mb-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <p class="text-sm text-slate-500">{{ __('public_portal.common.no_articles') }}</p>
         </div>
         @else
         @foreach ($published->take(5) as $article)
         <a class="leading-7 text-slate-700 dark:text-slate-100" href="{{ $links::article($portal->slug, $article->slug, $theme, $isPlainLayout) }}">
            <div @if (! $isPlainLayout) id="category-item" @endif class="flex justify-between hover:cursor-pointer items-start py-1 rounded-lg gap-6 {{ $isPlainLayout ? 'hover:underline' : 'px-2' }}">
               {{ $article->title }}
               <span class="flex items-center font-normal mt-1.5">
                  @include('public.portal.icons.chevron-right')
               </span>
            </div>
         </a>
         @endforeach
         @endif
      </div>
      <div class="flex justify-between flex-row items-center {{ $isPlainLayout ? '' : 'px-2' }}">
         <div class="flex flex-row items-center gap-1">
           @include('public.portal.partials.authors', ['category' => $category, 'showExpanded' => false])
           <span class="text-slate-600 dark:text-slate-400">•</span>
           <span class="text-sm font-medium text-slate-600 dark:text-slate-400">@include('public.portal.partials.article-count', ['articleCount' => $published->count()])</span>
         </div>
         <div>
            <a href="{{ $categoryLink }}" class="flex flex-row items-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-100">
            {{ __('public_portal.common.view_all_articles') }}
            </a>
         </div>
      </div>
   </div>
</section>
