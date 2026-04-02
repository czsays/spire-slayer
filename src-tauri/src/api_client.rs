use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use log::{error, info, warn};
use tauri::{AppHandle, Emitter, Manager};

use crate::state::{AppGameState, McpApiResponse};

/// Shared app state accessible from commands and the poller
pub struct SharedState {
    pub game_state: Mutex<AppGameState>,
    pub version: AtomicU64,
    pub mcp_port: Mutex<u16>,
}

impl Default for SharedState {
    fn default() -> Self {
        Self {
            game_state: Mutex::new(AppGameState::disconnected()),
            version: AtomicU64::new(0),
            mcp_port: Mutex::new(15526),
        }
    }
}

/// Start polling the STS2MCP HTTP API in the background.
/// Emits "game-state-update" events to the frontend on each state change.
pub fn start_polling(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(2))
            .build()
            .expect("Failed to build HTTP client");

        let mut consecutive_errors: u32 = 0;
        let mut last_json_hash: u64 = 0;

        loop {
            let port = {
                let shared = app.state::<SharedState>();
                let p = *shared.mcp_port.lock().unwrap();
                p
            };

            let url = format!("http://localhost:{}/api/v1/singleplayer?format=json", port);

            match client.get(&url).send().await {
                Ok(response) => {
                    if response.status().is_success() {
                        match response.text().await {
                            Ok(body) => {
                                // Quick hash to detect changes
                                let hash = simple_hash(&body);
                                if hash != last_json_hash {
                                    last_json_hash = hash;

                                    match serde_json::from_str::<McpApiResponse>(&body) {
                                        Ok(api_resp) => {
                                            let shared = app.state::<SharedState>();
                                            let new_version = shared
                                                .version
                                                .fetch_add(1, Ordering::SeqCst)
                                                + 1;

                                            let app_state = AppGameState::from_api_response(
                                                &api_resp,
                                                new_version,
                                            );

                                            {
                                                let mut state =
                                                    shared.game_state.lock().unwrap();
                                                *state = app_state.clone();
                                            }

                                            if let Err(e) =
                                                app.emit("game-state-update", &app_state)
                                            {
                                                error!("Failed to emit game state: {}", e);
                                            }
                                        }
                                        Err(e) => {
                                            warn!("Failed to parse MCP response: {}", e);
                                        }
                                    }
                                }

                                if consecutive_errors > 0 {
                                    info!("STS2MCP connection restored");
                                }
                                consecutive_errors = 0;
                            }
                            Err(e) => {
                                warn!("Failed to read response body: {}", e);
                                consecutive_errors += 1;
                            }
                        }
                    } else {
                        consecutive_errors += 1;
                    }
                }
                Err(_) => {
                    consecutive_errors += 1;

                    // Update state to disconnected
                    if consecutive_errors == 1 || consecutive_errors % 20 == 0 {
                        let shared = app.state::<SharedState>();
                        let disconnected = AppGameState::disconnected();
                        {
                            let mut state = shared.game_state.lock().unwrap();
                            if state.connected {
                                *state = disconnected.clone();
                                let _ = app.emit("game-state-update", &disconnected);
                                info!(
                                    "STS2MCP not available at port {} — waiting for connection",
                                    port
                                );
                            }
                        }
                    }
                }
            }

            // Poll interval: 500ms when connected, 2s when disconnected
            let delay = if consecutive_errors > 0 { 2000 } else { 500 };
            tokio::time::sleep(Duration::from_millis(delay)).await;
        }
    });
}

/// Fast non-cryptographic hash for change detection
fn simple_hash(s: &str) -> u64 {
    let mut hash: u64 = 5381;
    for b in s.bytes() {
        hash = hash.wrapping_mul(33).wrapping_add(b as u64);
    }
    hash
}
