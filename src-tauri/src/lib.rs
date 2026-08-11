// Library entry point for Master Canvas
pub mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let pending_open_file =
        commands::project::supported_project_arg(std::env::args().collect::<Vec<_>>());

    tauri::Builder::default()
        .manage(commands::project::PendingOpenFile(std::sync::Mutex::new(
            pending_open_file,
        )))
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            commands::project::queue_open_project_arg(app, args);
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            commands::project::get_app_data_dir,
            commands::project::get_projects_dir,
            commands::project::list_projects,
            commands::project::load_project,
            commands::project::save_project,
            commands::project::create_project,
            commands::project::delete_project,
            commands::project::export_project,
            commands::project::import_project,
            commands::project::read_text_file,
            commands::project::write_text_file,
            commands::project::take_pending_open_file,
            commands::version::get_version,
            commands::mcp::start_mcp_server,
            commands::mcp::stop_mcp_server,
            commands::mcp::get_mcp_status,
        ])
        .setup(|app| {
            println!("Starting Master Canvas v{}", app.package_info().version);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
