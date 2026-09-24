<x-pulse::card :cols="$cols" :rows="$rows" :class="$class">
    <x-pulse::card-header name="Outbox tìm kiếm" details="{{ $enabled ? 'đồng bộ sang chỉ mục riêng' : 'engine tìm thẳng trong PostgreSQL' }}">
        <x-slot:icon>
            <x-pulse::icons.queue-list />
        </x-slot:icon>
    </x-pulse::card-header>

    <x-pulse::scroll :expand="$expand" wire:poll.15s="">
        <div class="grid grid-cols-2 gap-3 text-center">
            <div>
                <div class="text-xs uppercase text-gray-400 dark:text-gray-600 font-bold">Dòng còn tồn</div>
                <div class="text-3xl font-bold text-gray-700 dark:text-gray-300">{{ number_format($pending) }}</div>
            </div>
            <div>
                <div class="text-xs uppercase text-gray-400 dark:text-gray-600 font-bold">Dòng cũ nhất</div>
                <div class="text-3xl font-bold text-gray-700 dark:text-gray-300">
                    {{ $oldestAgeSeconds === null ? '—' : \Carbon\CarbonInterval::seconds($oldestAgeSeconds)->cascade()->forHumans(short: true) }}
                </div>
            </div>
        </div>
    </x-pulse::scroll>
</x-pulse::card>
