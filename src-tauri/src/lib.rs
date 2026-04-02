mod api_client;
mod commands;
mod state;

use api_client::SharedState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(SharedState::default())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Start polling the STS2MCP API
            api_client::start_polling(app.handle().clone());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_game_state,
            commands::get_data_source,
            commands::set_mcp_port,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
