'use client';

import {
  Background,
  Controls,
  type Edge,
  MarkerType,
  type Node,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import { useEffect, useMemo } from 'react';
import '@xyflow/react/dist/style.css';
import { GitBranch, PlayCircle, StopCircle } from 'lucide-react';
import './workflow-graph-viewer.css';
import type { WorkflowGraph } from '@/lib/workflow-graph-types';

interface WorkflowGraphViewerProps {
  workflow: WorkflowGraph;
}

// Custom node components
const nodeTypes = {};

// Get node styling based on node kind - uses theme-aware colors
function getNodeStyle(nodeKind: string) {
  const baseStyle = {
    color: 'hsl(var(--card-foreground))',
  };

  if (nodeKind === 'workflow_start') {
    return {
      ...baseStyle,
      backgroundColor: 'rgba(34, 197, 94, 0.15)', // green with 15% opacity
      borderColor: '#22c55e', // green-500 - works in both light and dark
    };
  }
  if (nodeKind === 'workflow_end') {
    return {
      ...baseStyle,
      backgroundColor: 'rgba(148, 163, 184, 0.15)', // slate with 15% opacity
      borderColor: '#94a3b8', // slate-400 - works in both light and dark
    };
  }
  return {
    ...baseStyle,
    backgroundColor: 'rgba(96, 165, 250, 0.15)', // blue with 15% opacity
    borderColor: '#60a5fa', // blue-400 - works in both light and dark
  };
}

// Get node icon based on node kind
function getNodeIcon(nodeKind: string) {
  if (nodeKind === 'workflow_start') {
    return (
      <PlayCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
    );
  }
  if (nodeKind === 'workflow_end') {
    return (
      <StopCircle className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
    );
  }
  return <GitBranch className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />;
}

// Convert our graph nodes to React Flow format
function convertToReactFlowNodes(workflow: WorkflowGraph): Node[] {
  return workflow.nodes.map((node) => {
    const styles = getNodeStyle(node.data.nodeKind);

    // Determine node type based on its role in the workflow
    let nodeType: 'input' | 'output' | 'default' = 'default';
    if (node.type === 'workflowStart') {
      nodeType = 'input'; // Only source handle (outputs edges)
    } else if (node.type === 'workflowEnd') {
      nodeType = 'output'; // Only target handle (receives edges)
    }

    return {
      id: node.id,
      type: nodeType,
      position: node.position,
      data: {
        ...node.data,
        label: (
          <div className="flex items-start gap-2 w-full overflow-hidden">
            <div className="flex-shrink-0">
              {getNodeIcon(node.data.nodeKind)}
            </div>
            <span className="text-sm font-medium break-words whitespace-normal leading-tight flex-1 min-w-0">
              {node.data.label}
            </span>
          </div>
        ),
      },
      style: {
        borderWidth: 2,
        borderRadius: 8,
        padding: 12,
        width: 220,
        ...styles,
      },
    };
  });
}

// Convert our graph edges to React Flow format
function convertToReactFlowEdges(workflow: WorkflowGraph): Edge[] {
  return workflow.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: false,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#94a3b8',
    },
    style: {
      strokeWidth: 2,
      stroke: '#94a3b8',
    },
  }));
}

export function WorkflowGraphViewer({ workflow }: WorkflowGraphViewerProps) {
  const initialNodes = useMemo(
    () => convertToReactFlowNodes(workflow),
    [workflow]
  );
  const initialEdges = useMemo(
    () => convertToReactFlowEdges(workflow),
    [workflow]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when workflow changes
  useEffect(() => {
    setNodes(convertToReactFlowNodes(workflow));
    setEdges(convertToReactFlowEdges(workflow));
  }, [workflow, setNodes, setEdges]);

  return (
    <div className="h-full w-full border rounded-none bg-background relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <Panel
          position="top-left"
          className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-2 text-xs"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-100 dark:bg-green-950 border-2 border-green-600 dark:border-green-400" />
              <span>Workflow Start</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-100 dark:bg-blue-950 border-2 border-blue-600 dark:border-blue-400" />
              <span>Step</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-600 dark:border-gray-400" />
              <span>Workflow End</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
