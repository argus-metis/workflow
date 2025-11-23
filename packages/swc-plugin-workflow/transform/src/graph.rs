use serde::Serialize;
use std::collections::HashMap;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowGraphManifest {
    pub version: String,
    pub workflows: HashMap<String, WorkflowGraph>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowGraph {
    pub workflow_id: String,
    pub workflow_name: String,
    pub file_path: String,
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GraphNode {
    pub id: String,
    #[serde(rename = "type")]
    pub node_type: String,
    pub position: Position,
    pub data: NodeData,
}

#[derive(Debug, Serialize, Clone)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NodeData {
    pub label: String,
    pub node_kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub step_id: Option<String>,
    pub line: usize,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GraphEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    #[serde(rename = "type")]
    pub edge_type: String,
}

#[derive(Debug)]
pub struct GraphBuilder {
    graphs: HashMap<String, WorkflowGraph>,
    current_workflow: Option<String>,
    current_y: f64,
    node_count: usize,
    prev_node_id: Option<String>,
}

impl GraphBuilder {
    pub fn new() -> Self {
        Self {
            graphs: HashMap::new(),
            current_workflow: None,
            current_y: 0.0,
            node_count: 0,
            prev_node_id: None,
        }
    }

    pub fn start_workflow(&mut self, name: &str, file_path: &str, workflow_id: &str) {
        let graph = WorkflowGraph {
            workflow_id: workflow_id.to_string(),
            workflow_name: name.to_string(),
            file_path: file_path.to_string(),
            nodes: vec![],
            edges: vec![],
        };

        self.graphs.insert(name.to_string(), graph);
        self.current_workflow = Some(name.to_string());
        self.current_y = 0.0;
        self.node_count = 0;
        self.prev_node_id = None;

        // Add start node
        self.add_node(
            "start",
            "workflowStart",
            &format!("Start: {}", name),
            "workflow_start",
            None,
            0,
        );
    }

    pub fn add_step_node(&mut self, step_name: &str, step_id: &str, line: usize) {
        let node_id = format!("node_{}", self.node_count);
        self.add_node(
            &node_id,
            "step",
            step_name,
            "step",
            Some(step_id.to_string()),
            line,
        );
    }

    pub fn add_workflow_node(&mut self, workflow_name: &str, workflow_id: &str, line: usize) {
        let node_id = format!("node_{}", self.node_count);
        self.add_node(
            &node_id,
            "workflowCall",
            workflow_name,
            "workflow",
            Some(workflow_id.to_string()),
            line,
        );
    }

    fn add_node(
        &mut self,
        id: &str,
        node_type: &str,
        label: &str,
        node_kind: &str,
        step_id: Option<String>,
        line: usize,
    ) {
        if let Some(workflow_name) = &self.current_workflow {
            if let Some(graph) = self.graphs.get_mut(workflow_name) {
                let node = GraphNode {
                    id: id.to_string(),
                    node_type: node_type.to_string(),
                    position: Position {
                        x: 250.0,
                        y: self.current_y,
                    },
                    data: NodeData {
                        label: label.to_string(),
                        node_kind: node_kind.to_string(),
                        step_id,
                        line,
                    },
                };

                // Add edge from previous node
                if let Some(prev_id) = &self.prev_node_id {
                    let edge = GraphEdge {
                        id: format!("e_{}_{}", prev_id, id),
                        source: prev_id.clone(),
                        target: id.to_string(),
                        edge_type: "default".to_string(),
                    };
                    graph.edges.push(edge);
                }

                graph.nodes.push(node);
                self.prev_node_id = Some(id.to_string());
                self.current_y += 100.0;
                self.node_count += 1;
            }
        }
    }

    pub fn finish_workflow(&mut self) {
        if let Some(workflow_name) = &self.current_workflow {
            if let Some(graph) = self.graphs.get_mut(workflow_name) {
                // Add end node
                let end_node = GraphNode {
                    id: "end".to_string(),
                    node_type: "workflowEnd".to_string(),
                    position: Position {
                        x: 250.0,
                        y: self.current_y,
                    },
                    data: NodeData {
                        label: "Return".to_string(),
                        node_kind: "workflow_end".to_string(),
                        step_id: None,
                        line: 0,
                    },
                };

                // Add edge from last node to end
                if let Some(prev_id) = &self.prev_node_id {
                    let edge = GraphEdge {
                        id: format!("e_{}_end", prev_id),
                        source: prev_id.clone(),
                        target: "end".to_string(),
                        edge_type: "default".to_string(),
                    };
                    graph.edges.push(edge);
                }

                graph.nodes.push(end_node);
            }
        }

        self.current_workflow = None;
        self.prev_node_id = None;
    }

    pub fn to_manifest(self) -> WorkflowGraphManifest {
        WorkflowGraphManifest {
            version: "1.0.0".to_string(),
            workflows: self.graphs,
        }
    }

    pub fn has_workflows(&self) -> bool {
        !self.graphs.is_empty()
    }
}
