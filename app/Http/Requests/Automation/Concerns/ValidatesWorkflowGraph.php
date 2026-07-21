<?php

namespace App\Http\Requests\Automation\Concerns;

use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Entry-layer graph validation (write-time guard, not the Engine's job —
 * docs/crm-automation-workflow.md §Layer architecture). Keeps
 * WorkflowEngine::enroll()'s assumption true: a "start" node is always node
 * 0 with no predecessor, never reachable via an incoming edge.
 */
trait ValidatesWorkflowGraph
{
    /** v1 Node Handler registry (docs/crm-automation-workflow.md §Node Handler
     * registry) — 'start' + the 8 types app/Modules/Automation/AutomationServiceProvider.php
     * registers on NodeHandlerManager. Rejecting anything else here keeps a
     * bad/legacy type string from ever reaching the canvas, which has no
     * fallback renderer for an unknown WorkflowNodeType. */
    private const NODE_TYPES = [
        'start', 'condition', 'wait', 'end',
        'send_message', 'create_task', 'notify_internal', 'tag', 'change_lead_stage',
    ];

    /** @return array<string, mixed> */
    protected function graphRules(): array
    {
        return [
            'graph' => ['required', 'array'],
            'graph.nodes' => ['required', 'array', 'min:1'],
            'graph.nodes.*.id' => ['required', 'string'],
            'graph.nodes.*.type' => ['required', 'string', Rule::in(self::NODE_TYPES)],
            'graph.nodes.*.config' => ['nullable', 'array'],
            // Canvas layout only — WorkflowEngine never reads this key, it just
            // round-trips through the jsonb column so the editor doesn't
            // re-scatter every node on each reload.
            'graph.nodes.*.position' => ['nullable', 'array'],
            'graph.nodes.*.position.x' => ['nullable', 'numeric'],
            'graph.nodes.*.position.y' => ['nullable', 'numeric'],
            'graph.edges' => ['present', 'array'],
            'graph.edges.*.from' => ['required', 'string'],
            'graph.edges.*.to' => ['required', 'string'],
            'graph.edges.*.branch' => ['nullable', 'boolean'],
        ];
    }

    protected function validateGraphShape(Validator $validator): void
    {
        $graph = $this->input('graph', []);
        $nodes = $graph['nodes'] ?? [];
        $edges = $graph['edges'] ?? [];

        $nodeIds = collect($nodes)->pluck('id')->all();
        $startNodeIds = collect($nodes)->where('type', 'start')->pluck('id')->all();

        if (count($startNodeIds) !== 1) {
            // WorkflowEngine::findStartNode() picks whichever "start" node
            // appears first in graph.nodes and silently ignores the rest —
            // reject at write time instead of allowing an ambiguous graph.
            $validator->errors()->add('graph.nodes', 'a workflow graph must have exactly one start node');
        }

        foreach ($edges as $i => $edge) {
            if (! in_array($edge['from'] ?? null, $nodeIds, true)) {
                $validator->errors()->add("graph.edges.{$i}.from", 'edge references a node id not present in graph.nodes');
            }

            if (! in_array($edge['to'] ?? null, $nodeIds, true)) {
                $validator->errors()->add("graph.edges.{$i}.to", 'edge references a node id not present in graph.nodes');
            }

            if (in_array($edge['to'] ?? null, $startNodeIds, true)) {
                $validator->errors()->add("graph.edges.{$i}.to", 'a start node cannot have an incoming edge');
            }
        }
    }
}
