import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTranslator } from '@/lib/i18n';
import type { Pipeline, PipelineStage, User, WorkflowGraph, WorkflowNodeType } from '@/types';
import {
    addEdge,
    Background,
    Controls,
    ReactFlow,
    ReactFlowProvider,
    useEdgesState,
    useNodesState,
    useReactFlow,
    type Connection,
    type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useMemo, useState } from 'react';
import { flowToGraph, graphToFlow, newNodeId, summarizeNode, validateGraphShape, type FlowNode } from './graph-serialize';
import { InspectorPanel } from './inspector-panel';
import { defaultConfigFor } from './node-registry';
import { Palette } from './palette';
import { WorkflowNodeCard } from './workflow-node';

const nodeTypes = { workflowNode: WorkflowNodeCard };

interface Props {
    initialGraph: WorkflowGraph;
    initialName: string;
    initialIsActive: boolean;
    pipelines: (Pipeline & { stages: PipelineStage[] })[];
    members: Pick<User, 'id' | 'name'>[];
    saving: boolean;
    errors: Record<string, string>;
    onSave: (data: { name: string; is_active: boolean; graph: WorkflowGraph }) => void;
    headerActions?: React.ReactNode;
}

export function WorkflowCanvas(props: Props) {
    return (
        <ReactFlowProvider>
            <WorkflowCanvasInner {...props} />
        </ReactFlowProvider>
    );
}

function WorkflowCanvasInner({ initialGraph, initialName, initialIsActive, pipelines, members, saving, errors, onSave, headerActions }: Props) {
    const t = useTranslator();
    const { screenToFlowPosition } = useReactFlow();
    const initial = useMemo(() => graphToFlow(initialGraph, t), [initialGraph, t]);
    const [nodes, setNodes, onNodesChangeRaw] = useNodesState<FlowNode>(initial.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
    const [name, setName] = useState(initialName);
    const [isActive, setIsActive] = useState(initialIsActive);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [clientErrors, setClientErrors] = useState<string[]>([]);

    const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

    // The start node is placed once by the page's initial graph and is never
    // draggable from the palette again (backend rejects a 2nd start node) —
    // block its removal here too so a stray Delete-key press can't leave the
    // canvas without one. Identified by nodeType, not a fixed id — an
    // existing workflow's start node id is whatever was assigned when it was
    // first created, not necessarily "n_start".
    const startNodeId = nodes.find((n) => n.data.nodeType === 'start')?.id;
    const onNodesChange = useCallback(
        (changes: NodeChange<FlowNode>[]) => {
            const filtered = changes.filter((change) => !(change.type === 'remove' && change.id === startNodeId));
            onNodesChangeRaw(filtered);
        },
        [onNodesChangeRaw, startNodeId],
    );

    const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge(connection, eds)), [setEdges]);

    const onDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            const nodeType = e.dataTransfer.getData('application/workflow-node-type') as WorkflowNodeType;
            if (!nodeType) return;

            const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
            const id = newNodeId();
            const config = defaultConfigFor(nodeType);

            setNodes((nds) => [
                ...nds,
                { id, type: 'workflowNode', position, data: { nodeType, config, summary: summarizeNode(nodeType, config, t) } },
            ]);
        },
        [screenToFlowPosition, setNodes, t],
    );

    function updateSelectedNodeConfig(config: Record<string, unknown>) {
        if (!selectedNodeId) return;
        setNodes((nds) =>
            nds.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, config, summary: summarizeNode(n.data.nodeType, config, t) } } : n)),
        );
    }

    function deleteSelectedNode() {
        if (!selectedNodeId || selectedNodeId === startNodeId) return;
        setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
        setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
        setSelectedNodeId(null);
    }

    function handleSave() {
        const graph = flowToGraph(nodes, edges);
        const graphErrors = validateGraphShape(graph);

        if (graphErrors.length > 0) {
            setClientErrors(graphErrors);
            return;
        }

        setClientErrors([]);
        onSave({ name, is_active: isActive, graph });
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-4 border-b p-3">
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('automation.canvas.name_placeholder')}
                    className="max-w-xs"
                />
                {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}

                <div className="flex items-center gap-2">
                    <Switch checked={isActive} onCheckedChange={setIsActive} id="workflow-active" />
                    <Label htmlFor="workflow-active">{t('automation.canvas.active_toggle')}</Label>
                </div>

                <div className="ml-auto flex items-center gap-2">
                    {headerActions}
                    <Button type="button" onClick={handleSave} disabled={saving}>
                        {saving ? t('automation.canvas.saving') : t('automation.canvas.save')}
                    </Button>
                </div>
            </div>

            {clientErrors.length > 0 && (
                <div className="bg-destructive/10 text-destructive space-y-0.5 border-b px-3 py-2 text-xs">
                    {clientErrors.map((key) => (
                        <p key={key}>{t(key)}</p>
                    ))}
                </div>
            )}
            {errors.graph && <div className="bg-destructive/10 text-destructive border-b px-3 py-2 text-xs">{errors.graph}</div>}

            <div className="flex min-h-0 flex-1">
                <Palette />

                <div className="min-w-0 flex-1" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                        onPaneClick={() => setSelectedNodeId(null)}
                        nodeTypes={nodeTypes}
                        fitView
                    >
                        <Background />
                        <Controls />
                    </ReactFlow>
                </div>

                <InspectorPanel
                    node={selectedNode}
                    onChange={updateSelectedNodeConfig}
                    onDelete={deleteSelectedNode}
                    pipelines={pipelines}
                    members={members}
                />
            </div>
        </div>
    );
}
