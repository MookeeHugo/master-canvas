//! Project management commands for Master Canvas

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{command, AppHandle, Emitter, Manager};
use uuid::Uuid;

#[derive(Default)]
pub struct PendingOpenFile(pub Mutex<Option<String>>);

pub fn supported_project_arg(args: impl IntoIterator<Item = String>) -> Option<String> {
    args.into_iter().find(|arg| {
        let path = PathBuf::from(arg);
        matches!(
            path.extension().and_then(|ext| ext.to_str()).map(|ext| ext.to_ascii_lowercase()),
            Some(ext) if matches!(ext.as_str(), "mastercanvas" | "mcproject" | "json")
        )
    })
}

pub fn queue_open_project_arg(app: &AppHandle, args: Vec<String>) {
    let Some(path) = supported_project_arg(args) else {
        return;
    };

    if let Some(pending) = app.try_state::<PendingOpenFile>() {
        match pending.0.lock() {
            Ok(mut value) => *value = Some(path.clone()),
            Err(error) => tracing::warn!("Could not lock pending open file state: {}", error),
        }
    }

    if let Err(error) = app.emit("master-canvas://open-project-file", path) {
        tracing::warn!("Could not emit project file open event: {}", error);
    }
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_focus();
    }
}

#[command]
pub fn take_pending_open_file(state: tauri::State<'_, PendingOpenFile>) -> Result<Option<String>, String> {
    let mut pending = state
        .0
        .lock()
        .map_err(|e| format!("无法读取启动文件状态: {}", e))?;
    Ok(pending.take())
}

/// Get the app data directory
#[command]
pub fn get_app_data_dir(app: AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| e.to_string())
}

/// Card structure matching the frontend data model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Card {
    pub id: String,
    pub card_type: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub title: String,
    pub content: String,
    pub prompt: Option<String>,
    pub negative_prompt: Option<String>,
    pub tags: Vec<String>,
    pub metadata: serde_json::Value,
}

/// Canvas structure
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Canvas {
    pub id: String,
    pub name: String,
    pub cards: Vec<Card>,
    pub zoom: f64,
    pub pan_x: f64,
    pub pan_y: f64,
}

/// Project structure
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub canvases: Vec<Canvas>,
    pub active_canvas_id: String,
    pub created_at: String,
    pub updated_at: String,
    pub schema_version: i32,
}

/// Project metadata for listing
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMeta {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
    pub canvas_count: i32,
    pub card_count: i32,
}

/// Get the projects directory path
#[command]
pub fn get_projects_dir() -> Result<PathBuf, String> {
    dirs::document_dir()
        .map(|d| d.join("MasterCanvas"))
        .ok_or_else(|| "Cannot find documents directory".to_string())
}

/// List all projects
#[command]
pub async fn list_projects() -> Result<Vec<ProjectMeta>, String> {
    let projects_dir = dirs::document_dir()
        .map(|d| d.join("MasterCanvas"))
        .ok_or_else(|| "Cannot find documents directory".to_string())?;

    let mut projects = Vec::new();

    if !projects_dir.exists() {
        return Ok(projects);
    }

    let mut entries = tokio::fs::read_dir(&projects_dir)
        .await
        .map_err(|e| e.to_string())?;

    while let Some(entry) = entries.next_entry().await.map_err(|e| e.to_string())? {
        let path = entry.path();
        if path.extension().map(|e| e == "mcproject").unwrap_or(false) {
            match load_project_from_path(&path).await {
                Ok(project) => {
                    let card_count: i32 = project.canvases.iter().map(|c| c.cards.len() as i32).sum();
                    projects.push(ProjectMeta {
                        id: project.id,
                        name: project.name,
                        created_at: project.created_at,
                        updated_at: project.updated_at,
                        canvas_count: project.canvases.len() as i32,
                        card_count,
                    });
                }
                Err(e) => {
                    tracing::warn!("Failed to load project {:?}: {}", path, e);
                }
            }
        }
    }

    projects.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(projects)
}

/// Load a project from a file path
async fn load_project_from_path(path: &PathBuf) -> Result<Project, String> {
    let content = tokio::fs::read_to_string(path)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse project: {}", e))
}

/// Load a project by ID
#[command]
pub async fn load_project(id: String) -> Result<Project, String> {
    let projects_dir = dirs::document_dir()
        .map(|d| d.join("MasterCanvas"))
        .ok_or_else(|| "Cannot find documents directory".to_string())?;

    let path = projects_dir.join(format!("{}.mcproject", id));
    load_project_from_path(&path).await
}

/// Save a project
#[command]
pub async fn save_project(project: Project) -> Result<String, String> {
    let projects_dir = dirs::document_dir()
        .map(|d| d.join("MasterCanvas"))
        .ok_or_else(|| "Cannot find documents directory".to_string())?;

    // Ensure directory exists
    tokio::fs::create_dir_all(&projects_dir)
        .await
        .map_err(|e| format!("Failed to create projects directory: {}", e))?;

    let path = projects_dir.join(format!("{}.mcproject", project.id));
    let content = serde_json::to_string_pretty(&project)
        .map_err(|e| format!("Failed to serialize project: {}", e))?;

    tokio::fs::write(&path, content)
        .await
        .map_err(|e| format!("Failed to write file: {}", e))?;

    tracing::info!("Saved project {} to {:?}", project.name, path);
    Ok(path.to_string_lossy().to_string())
}

/// Create a new project
#[command]
pub async fn create_project(name: String) -> Result<Project, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let canvas_id = Uuid::new_v4().to_string();

    let project = Project {
        id: Uuid::new_v4().to_string(),
        name,
        canvases: vec![Canvas {
            id: canvas_id.clone(),
            name: "Main Canvas".to_string(),
            cards: Vec::new(),
            zoom: 1.0,
            pan_x: 0.0,
            pan_y: 0.0,
        }],
        active_canvas_id: canvas_id,
        created_at: now.clone(),
        updated_at: now,
        schema_version: 1,
    };

    save_project(project.clone()).await?;
    Ok(project)
}

/// Delete a project by ID
#[command]
pub async fn delete_project(id: String) -> Result<(), String> {
    let projects_dir = dirs::document_dir()
        .map(|d| d.join("MasterCanvas"))
        .ok_or_else(|| "Cannot find documents directory".to_string())?;

    let path = projects_dir.join(format!("{}.mcproject", id));

    if !path.exists() {
        return Err("Project not found".to_string());
    }

    tokio::fs::remove_file(&path)
        .await
        .map_err(|e| format!("Failed to delete project: {}", e))?;

    tracing::info!("Deleted project {}", id);
    Ok(())
}

/// Export a project to JSON
#[command]
pub async fn export_project(
    project_id: String,
    output_path: PathBuf,
) -> Result<String, String> {
    let project = load_project(project_id).await?;

    let content = serde_json::to_string_pretty(&project)
        .map_err(|e| format!("Failed to serialize: {}", e))?;

    tokio::fs::write(&output_path, content)
        .await
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(output_path.to_string_lossy().to_string())
}

/// Import a project from a JSON file
#[command]
pub async fn import_project(input_path: PathBuf) -> Result<Project, String> {
    let content = tokio::fs::read_to_string(&input_path)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let mut project: Project = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse project: {}", e))?;

    // Generate new ID to avoid conflicts
    project.id = Uuid::new_v4().to_string();
    project.updated_at = chrono::Utc::now().to_rfc3339();

    save_project(project.clone()).await?;
    Ok(project)
}

/// Read a UTF-8 project file selected by the user.
#[command]
pub async fn read_text_file(file_path: String) -> Result<String, String> {
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err("文件不存在".to_string());
    }
    tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("无法读取文件: {}", e))
}

/// Write a UTF-8 project file to a user-selected path.
#[command]
pub async fn write_text_file(file_path: String, content: String) -> Result<String, String> {
    let path = PathBuf::from(&file_path);
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| format!("无法创建目录: {}", e))?;
        }
    }
    tokio::fs::write(&path, content.as_bytes())
        .await
        .map_err(|e| format!("无法写入文件: {}", e))?;
    Ok(path.to_string_lossy().to_string())
}
