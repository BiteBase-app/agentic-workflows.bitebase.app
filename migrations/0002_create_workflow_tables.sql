-- Migration number: 0002 	 2024-03-21
-- Create workflow tables for the agentic workflow system

-- Workflow executions table to track all workflow runs
CREATE TABLE IF NOT EXISTS workflow_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_name TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    execution_time_ms INTEGER,
    user_id TEXT,
    input_data TEXT,
    output_data TEXT,
    error TEXT
);

-- Analysis requests table to track analysis requests
CREATE TABLE IF NOT EXISTS analysis_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id TEXT UNIQUE NOT NULL,
    project_id TEXT NOT NULL,
    status TEXT NOT NULL,
    analysis_types TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    execution_time_ms INTEGER,
    request_data TEXT,
    result_data TEXT,
    error TEXT
);

-- Agent executions table to track individual agent activities
CREATE TABLE IF NOT EXISTS agent_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_type TEXT NOT NULL,
    workflow_execution_id INTEGER,
    analysis_request_id INTEGER,
    status TEXT NOT NULL,
    confidence REAL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    execution_time_ms INTEGER,
    input_data TEXT,
    output_data TEXT,
    error TEXT,
    FOREIGN KEY (workflow_execution_id) REFERENCES workflow_executions(id),
    FOREIGN KEY (analysis_request_id) REFERENCES analysis_requests(id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_name ON workflow_executions(workflow_name);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_analysis_requests_analysis_id ON analysis_requests(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_requests_project_id ON analysis_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_requests_status ON analysis_requests(status);
CREATE INDEX IF NOT EXISTS idx_agent_executions_agent_type ON agent_executions(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_executions_workflow_execution_id ON agent_executions(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_analysis_request_id ON agent_executions(analysis_request_id);

-- Insert sample workflow data
INSERT INTO workflow_executions (workflow_name, status, created_at, completed_at, execution_time_ms, user_id, input_data, output_data)
VALUES 
    ('customer_support', 'completed', datetime('now', '-2 hours'), datetime('now', '-1 hour, -55 minutes'), 300000, 'user-123', '{"query": "How do I update my order?", "customerId": "cust-456", "priority": "high"}', '{"ticketId": "SUP-123456", "resolution": "Support ticket created and assigned", "category": "orders"}');

-- Insert sample analysis request data
INSERT INTO analysis_requests (analysis_id, project_id, status, analysis_types, created_at, completed_at, execution_time_ms, request_data, result_data)
VALUES 
    ('analysis_1616161616_project123', 'project123', 'completed', 'sentiment', datetime('now', '-1 day'), datetime('now', '-1 day, +5 minutes'), 300000, '{"projectId": "project123", "analysisTypes": ["sentiment"], "confidenceThreshold": 0.7}', '{"sentiment": {"overall_score": 0.75, "trend": "increasing"}}');

-- Insert sample agent execution data
INSERT INTO agent_executions (agent_type, workflow_execution_id, analysis_request_id, status, confidence, created_at, completed_at, execution_time_ms, input_data, output_data)
VALUES 
    ('sentiment', 1, NULL, 'completed', 0.85, datetime('now', '-2 hours'), datetime('now', '-1 hour, -59 minutes'), 60000, '{"query": "How do I update my order?"}', '{"sentiment": "neutral", "score": 0.5}'),
    ('sentiment', NULL, 1, 'completed', 0.92, datetime('now', '-1 day'), datetime('now', '-1 day, +2 minutes'), 120000, '{"projectId": "project123"}', '{"overall_score": 0.75, "trend": "increasing"}'); 