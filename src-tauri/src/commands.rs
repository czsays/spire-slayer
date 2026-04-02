use tauri::State;

use crate::api_client::SharedState;
use crate::state::AppGameState;

#[tauri::command]
pub fn get_game_state(shared: State<SharedState>) -> AppGameState {
    shared.game_state.lock().unwrap().clone()
}

#[tauri::command]
pub fn get_data_source(shared: State<SharedState>) -> String {
    shared.game_state.lock().unwrap().data_source.clone()
}

#[tauri::command]
pub fn set_mcp_port(port: u16, shared: State<SharedState>) -> String {
    let mut current_port = shared.mcp_port.lock().unwrap();
    *current_port = port;
    format!("MCP port set to {}", port)
}
