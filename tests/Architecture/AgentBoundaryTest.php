<?php

// Ranh giới giữa lõi Yona và nhân viên AI (App\Agent). Mọi chuỗi một namespace kết
// thúc bằng `\`: Pest lọc lớp theo tiền tố chuỗi, thiếu `\` thì `App\Models\Agent`
// dính cả `App\Models\AgentBot` của lõi. Không `ignoring` chính namespace đang cấm
// (luật sẽ không bao giờ đỏ), và mỗi kỳ vọng sau `classes()` là một biểu thức riêng.
// Mỗi đích của `not->toUse` cũng là một biểu thức riêng (forbidUse): Pest 5.1.3 đảo
// cả nhóm `expect([a, b])->toUse(x)`, nên luật chỉ đỏ khi MỌI đích cùng vi phạm.

const AGENT_NAMESPACES = [
    'App\\Agent\\',
    'App\\Models\\Agent\\',
    'App\\Http\\Controllers\\App\\Agent\\',
    'App\\Http\\Controllers\\WebApi\\Agent\\',
    'App\\Http\\Requests\\Agent\\',
    'App\\Http\\Resources\\Agent\\',
];

const AGENT_CODE = ['App\\Agent\\', 'App\\Models\\Agent\\'];

const REPO_ROOT = __DIR__.'/../..';

/**
 * Namespace lõi = phần bù của namespace thuộc agent trên cây app/: thư mục nằm trên
 * đường tới một namespace agent thì tách tiếp thành từng lớp và thư mục con.
 *
 * @return list<string>
 */
function coreNamespaces(): array
{
    $agentDirectories = array_map(
        fn (string $namespace) => REPO_ROOT.('/app/'.str_replace('\\', '/', substr($namespace, 4, -1))),
        AGENT_NAMESPACES,
    );

    $walk = function (string $directory, string $namespace) use (&$walk, $agentDirectories): array {
        $found = [];

        foreach (glob($directory.'/*') as $path) {
            $name = basename($path);

            if (is_file($path)) {
                if (str_ends_with($name, '.php')) {
                    $found[] = $namespace.substr($name, 0, -4);
                }

                continue;
            }

            if (in_array($path, $agentDirectories, true)) {
                continue;
            }

            $onPathToAgent = array_filter($agentDirectories, fn (string $agentDirectory) => str_starts_with($agentDirectory, $path.'/'));

            $found = [...$found, ...($onPathToAgent === [] ? [$namespace.$name.'\\'] : $walk($path, $namespace.$name.'\\'))];
        }

        return $found;
    };

    return $walk(REPO_ROOT.'/app', 'App\\');
}

/** @return list<string> thành phần cấp 2 `App\Agent\<Hệ>\<ThànhPhần>\` (chỉ thư mục) */
function agentComponents(): array
{
    $excludedSystems = ['Kernel', 'Runtime', 'ValueObjects', 'Contracts', 'Identity', 'Persistence', 'Skills'];
    $components = [];

    foreach (glob(REPO_ROOT.'/app/Agent/*', GLOB_ONLYDIR) as $systemPath) {
        $system = basename($systemPath);

        if (in_array($system, $excludedSystems, true)) {
            continue;
        }

        foreach (glob($systemPath.'/*', GLOB_ONLYDIR) as $componentPath) {
            $components[] = "App\\Agent\\{$system}\\".basename($componentPath).'\\';
        }
    }

    return $components;
}

test('phần bù namespace lõi phủ lớp lõi trùng tiền tố chữ Agent', function () {
    $core = coreNamespaces();

    expect($core)->not->toContain('App\\Agent\\')
        ->and($core)->toContain('App\\Models\\AgentBot')
        ->and($core)->toContain('App\\Http\\Resources\\AgentResource')
        ->and($core)->toContain('App\\Http\\Controllers\\WebApi\\AgentsController');

    foreach ($core as $namespace) {
        foreach (AGENT_NAMESPACES as $agentNamespace) {
            expect(str_starts_with($namespace, $agentNamespace))->toBeFalse();
        }
    }
});

/**
 * @param  list<string>  $targets
 * @param  list<string>  $forbidden
 * @param  list<string>  $exempt
 */
function forbidUse(string $rule, array $targets, array $forbidden, array $exempt = []): void
{
    foreach ($targets as $target) {
        $expectation = arch("{$rule}: {$target}")->expect($target)->not->toUse($forbidden);

        if ($exempt !== []) {
            $expectation->ignoring($exempt);
        }
    }
}

forbidUse('lõi không dùng namespace thuộc agent', coreNamespaces(), AGENT_NAMESPACES);

forbidUse('trong agent chỉ Boundary chạm namespace lõi', AGENT_CODE, coreNamespaces(), ['App\\Agent\\Boundary\\']);

forbidUse(
    'gọi mạng chỉ ở cổng mô hình, nguồn website và connector',
    AGENT_CODE,
    ['Illuminate\\Support\\Facades\\Http', 'Illuminate\\Http\\Client\\', 'GuzzleHttp\\', 'Anthropic\\', 'OpenAI\\'],
    ['App\\Agent\\Inference\\Gateway\\', 'App\\Agent\\Ingestion\\Pipeline\\Sources\\Website\\', 'App\\Agent\\Boundary\\Connectors\\'],
);

forbidUse('DB và Redis chỉ qua Persistence', AGENT_CODE, ['Illuminate\\Support\\Facades\\DB', 'Illuminate\\Support\\Facades\\Redis'], ['App\\Agent\\Persistence\\']);

forbidUse('chỉ Boundary\\Inbound nghe sự kiện', ['App\\Agent\\'], ['Illuminate\\Support\\Facades\\Event'], ['App\\Agent\\Boundary\\Inbound\\']);

forbidUse('chỉ Kernel lấy đồ từ container', ['App\\Agent\\'], ['app', 'resolve', 'Illuminate\\Support\\Facades\\App'], ['App\\Agent\\Kernel\\']);

forbidUse('agent không đọc người đăng nhập hay ngữ cảnh ngầm', AGENT_CODE, ['auth', 'Illuminate\\Support\\Facades\\Auth', 'Illuminate\\Support\\Facades\\Context']);

arch('Contracts chỉ có interface')
    ->expect('App\\Agent\\Contracts\\')
    ->toBeInterfaces();

arch('value object là lớp final')
    ->expect('App\\Agent\\ValueObjects\\')
    ->classes()
    ->toBeFinal();

arch('value object là lớp readonly')
    ->expect('App\\Agent\\ValueObjects\\')
    ->classes()
    ->toBeReadonly();

arch('lớp nền model agent chỉ dùng trong App\\Models\\Agent')
    ->expect('App\\Models\\Agent\\AccountScopedModel')
    ->toOnlyBeUsedIn('App\\Models\\Agent\\');

arch('không ai dùng Kernel')
    ->expect('App\\Agent\\Kernel\\')
    ->toOnlyBeUsedIn('App\\Agent\\Kernel\\');

forbidUse('Boundary không dùng Runtime hay Kernel', ['App\\Agent\\Boundary\\'], ['App\\Agent\\Runtime\\', 'App\\Agent\\Kernel\\']);

test('bootstrap/providers.php chỉ tham chiếu agent qua đúng dòng provider', function () {
    $source = file_get_contents(REPO_ROOT.'/bootstrap/providers.php');

    preg_match_all('/App\\\\(Agent|Models\\\\Agent|Http\\\\(Controllers\\\\(App|WebApi)|Requests|Resources)\\\\Agent)\\\\[A-Za-z\\\\]+/', $source, $matches);

    expect($matches[0])->toBe(['App\\Agent\\Kernel\\AgentServiceProvider']);
});

foreach (agentComponents() as $component) {
    forbidUse('thành phần không gọi ngang thành phần khác', [$component], array_values(array_diff(agentComponents(), [$component])));
}
