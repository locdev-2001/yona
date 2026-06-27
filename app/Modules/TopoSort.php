<?php

namespace App\Modules;

use RuntimeException;

/**
 * Kahn's algorithm topological sort for module `depends` graph.
 *
 * Input: array<string, string[]>  (name → list of names it depends on)
 * Output: string[] sorted so dependencies come before dependents.
 *
 * Throws RuntimeException on cyclic dependency with names of involved modules.
 */
final class TopoSort
{
    /**
     * @param  array<string, string[]>  $graph  name → depends[]
     * @return string[] sorted names
     */
    public static function sort(array $graph): array
    {
        // Build in-degree map and adjacency list (dependency → dependents).
        $inDegree = [];
        $dependents = []; // dependency → list of modules that depend on it

        foreach ($graph as $name => $deps) {
            $inDegree[$name] ??= 0;
            foreach ($deps as $dep) {
                $inDegree[$dep] ??= 0;
                $dependents[$dep][] = $name;
                $inDegree[$name]++;
            }
        }

        // Start with nodes that have no dependencies.
        $queue = array_keys(array_filter($inDegree, fn ($d) => $d === 0));
        sort($queue); // stable order for identical in-degree

        $sorted = [];
        while ($queue) {
            $node = array_shift($queue);
            $sorted[] = $node;

            foreach ($dependents[$node] ?? [] as $dependent) {
                $inDegree[$dependent]--;
                if ($inDegree[$dependent] === 0) {
                    $queue[] = $dependent;
                }
            }
        }

        if (count($sorted) !== count($graph)) {
            $cycle = array_diff(array_keys($graph), $sorted);
            throw new RuntimeException(
                'Cyclic module dependency detected among: ['.implode(', ', $cycle).']'
            );
        }

        return $sorted;
    }
}
