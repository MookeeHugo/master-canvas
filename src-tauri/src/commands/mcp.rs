//! MCP server management commands
//! The actual MCP server runs as a Node.js subprocess

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::command;

use crate::commands::project::validate_project_id;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

/// MCP server status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpStatus {
    pub running: bool,
    pub port: Option<u16>,
    pub project_id: Option<String>,
}

/// MCP server state (managed by Tauri)
static MCP_SERVERS: Mutex<Option<HashMap<String, McpServerHandle>>> = Mutex::new(None);

struct McpServerHandle {
    child: tokio::process::Child,
}

fn get_servers() -> &'static Mutex<Option<HashMap<String, McpServerHandle>>> {
    &MCP_SERVERS
}

fn init_servers() {
    let mut servers = get_servers().lock().unwrap();
    if servers.is_none() {
        *servers = Some(HashMap::new());
    }
}

/// Start the MCP server for a project
#[command]
pub async fn start_mcp_server(project_id: String) -> Result<McpStatus, String> {
    validate_project_id(&project_id)?;
    init_servers();

    // Check if already running
    {
        let servers = get_servers().lock().unwrap();
        if let Some(ref servers) = *servers {
            if servers.contains_key(&project_id) {
                return Ok(McpStatus {
                    running: true,
                    port: None,
                    project_id: Some(project_id),
                });
            }
        }
    }

    // Find the MCP server script path
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    // Try multiple possible locations for the MCP server
    let mcp_script_paths = [
        exe_dir.join("resources").join("master-canvas-mcp.mjs"),
        exe_dir.join("mcp").join("master-canvas-mcp.mjs"),
        std::path::PathBuf::from("mcp").join("master-canvas-mcp.mjs"),
    ];

    let mcp_script = mcp_script_paths
        .iter()
        .find(|p| p.exists())
        .cloned()
        .ok_or_else(|| "MCP server script not found".to_string())?;

    // Start the MCP server as a child process
    let mut child = Command::new("node")
        .arg(mcp_script.to_string_lossy().to_string())
        .arg("--project-id".to_string())
        .arg(project_id.clone())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Failed to start MCP server: {}", e))?;

    // Log stderr output
    if let Some(stderr) = child.stderr.take() {
        let mut reader = BufReader::new(stderr).lines();
        tokio::spawn(async move {
            while let Ok(Some(line)) = reader.next_line().await {
                tracing::debug!("MCP stderr: {}", line);
            }
        });
    }

    // Store the handle
    {
        let mut servers = get_servers().lock().unwrap();
        if let Some(ref mut servers) = *servers {
            servers.insert(project_id.clone(), McpServerHandle { child });
        }
    }

    tracing::info!("Started MCP server for project {}", project_id);

    Ok(McpStatus {
        running: true,
        port: None,
        project_id: Some(project_id),
    })
}

/// Stop the MCP server for a project
#[command]
pub async fn stop_mcp_server(project_id: String) -> Result<(), String> {
    validate_project_id(&project_id)?;
    init_servers();

    let child = {
        let mut servers = get_servers().lock().unwrap();
        if let Some(ref mut servers) = *servers {
            servers.remove(&project_id).map(|h| h.child)
        } else {
            None
        }
    };

    if let Some(mut child) = child {
        child.kill().await.map_err(|e| e.to_string())?;
        tracing::info!("Stopped MCP server for project {}", project_id);
    }

    Ok(())
}

/// Get MCP server status
#[command]
pub fn get_mcp_status(project_id: Option<String>) -> Result<Vec<McpStatus>, String> {
    init_servers();

    let servers = get_servers().lock().unwrap();
    let servers = servers.as_ref().ok_or("Servers not initialized")?;

    if let Some(id) = project_id {
        validate_project_id(&id)?;
        let running = servers.contains_key(&id);
        return Ok(vec![McpStatus {
            running,
            port: None,
            project_id: Some(id),
        }]);
    }

    Ok(servers
        .keys()
        .map(|id| McpStatus {
            running: true,
            port: None,
            project_id: Some(id.clone()),
        })
        .collect())
}
