import type { WorkflowGraph, WorkflowGraphEdge, WorkflowGraphNode, WorkflowNodeType } from '@/types';
import type { Edge, Node } from '@xyflow/react';
import type { WorkflowNodeData } from './workflow-node';

export type FlowNode = Node<WorkflowNodeData>;
type Translator = (key: string, params?: Record<string, string | number>) => string;

let autoId = 0;
/** Node ids are opaque strings the backend never parses (WorkflowEngine looks
 * nodes up by exact id match) — a short random-ish id is enough, no need for
 * a real UUID library dependency for a client-only identifier. */
export function newNodeId(): string {
    autoId += 1;

    return `n_${Date.now().toString(36)}_${autoId}`;
}

export function graphToFlow(graph: WorkflowGraph, t: Translator): { nodes: FlowNode[]; edges: Edge[] } {
    const nodes: FlowNode[] = graph.nodes.map((node, index) => ({
        id: node.id,
        type: 'workflowNode',
        // Single top-to-bottom column — WorkflowNodeCard only exposes
        // top(target)/bottom(source) handles, so a vertical default layout
        // avoids a looping bezier before the user repositions anything.
        position: node.position ?? { x: 250, y: index * 160 + 40 },
        data: { nodeType: node.type, config: node.config ?? {}, summary: summarizeNode(node.type, node.config ?? {}, t) },
    }));

    const edges: Edge[] = graph.edges.map((edge, index) => ({
        id: `e_${index}_${edge.from}_${edge.to}`,
        source: edge.from,
        target: edge.to,
        sourceHandle: edge.branch === true ? 'true' : edge.branch === false ? 'false' : undefined,
    }));

    return { nodes, edges };
}

export function flowToGraph(nodes: FlowNode[], edges: Edge[]): WorkflowGraph {
    const graphNodes: WorkflowGraphNode[] = nodes.map((node) => ({
        id: node.id,
        type: node.data.nodeType,
        config: node.data.config,
        position: node.position,
    }));

    const graphEdges: WorkflowGraphEdge[] = edges.map((edge) => ({
        from: edge.source,
        to: edge.target,
        branch: edge.sourceHandle === 'true' ? true : edge.sourceHandle === 'false' ? false : null,
    }));

    return { nodes: graphNodes, edges: graphEdges };
}

/** Short 1-line description shown on the node card — mirrors what each
 * NodeHandler actually reads off `config` (app/Modules/Automation/Handlers/*). */
export function summarizeNode(type: WorkflowNodeType, config: Record<string, unknown>, t: Translator): string {
    switch (type) {
        case 'start':
            return config.trigger ? t(`automation.triggers.${config.trigger}`) : '';
        case 'condition': {
            const count = Array.isArray(config.conditions) ? config.conditions.length : 0;

            return count > 0 ? t('automation.canvas.condition_count', { count }) : '';
        }
        case 'wait':
            return config.amount ? `${config.amount} ${t(`automation.fields.wait_${config.unit ?? 'minutes'}`).toLowerCase()}` : '';
        case 'end':
            return '';
        case 'send_message':
            return typeof config.body === 'string' && config.body ? config.body : '';
        case 'create_task':
            return typeof config.name === 'string' && config.name ? config.name : '';
        case 'notify_internal': {
            const count = Array.isArray(config.user_ids) ? config.user_ids.length : 0;

            return count > 0 ? t('automation.canvas.recipient_count', { count }) : '';
        }
        case 'tag': {
            const action = t(`automation.fields.tag_${config.action === 'detach' ? 'detach' : 'attach'}`);

            return config.tag ? `${action} "${config.tag}"` : '';
        }
        case 'change_lead_stage':
            return typeof config.stage_id === 'string' && config.stage_id ? t('automation.canvas.stage_selected') : '';
        default:
            return '';
    }
}

/** Client-side mirror of ValidatesWorkflowGraph — a fast fail before the
 * round trip to the server, NOT a replacement for it (server remains the
 * source of truth). */
export function validateGraphShape(graph: WorkflowGraph): string[] {
    const errors: string[] = [];
    const nodeIds = new Set(graph.nodes.map((n) => n.id));
    const startNodes = graph.nodes.filter((n) => n.type === 'start');

    if (startNodes.length !== 1) {
        errors.push('automation.canvas.validation_no_start');
    }

    const startIds = new Set(startNodes.map((n) => n.id));

    for (const edge of graph.edges) {
        if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
            errors.push('automation.canvas.validation_dangling_edge');
        }
        if (startIds.has(edge.to)) {
            errors.push('automation.canvas.validation_start_incoming');
        }
    }

    return [...new Set(errors)];
}
