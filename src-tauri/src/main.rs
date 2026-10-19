#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use serde_json::{json, Value};
use std::{collections::HashMap, path::PathBuf, sync::Arc};
use tauri::{Emitter, Manager};
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    process::{Child, ChildStdin, Command},
    sync::{oneshot, Mutex},
};
struct Bridge {
    stdin: Mutex<Option<ChildStdin>>,
    pending: Mutex<HashMap<String, oneshot::Sender<Result<Value, String>>>>,
    child: Mutex<Option<Child>>,
    error: Mutex<Option<String>>,
}
impl Bridge {
    fn new() -> Self {
        Self {
            stdin: Mutex::new(None),
            pending: Mutex::new(HashMap::new()),
            child: Mutex::new(None),
            error: Mutex::new(None),
        }
    }
}
#[tauri::command]
async fn request(message: Value, state: tauri::State<'_, Arc<Bridge>>) -> Result<Value, String> {
    let id = message
        .get("id")
        .and_then(Value::as_str)
        .ok_or("Missing request ID")?
        .to_string();
    if let Some(e) = state.error.lock().await.as_ref() {
        return Err(e.clone());
    }
    let (tx, rx) = oneshot::channel();
    state.pending.lock().await.insert(id.clone(), tx);
    let result = {
        let mut input = state.stdin.lock().await;
        if let Some(stdin) = input.as_mut() {
            stdin
                .write_all(format!("{}\n", message).as_bytes())
                .await
                .map_err(|e| e.to_string())
        } else {
            Err("Engine is starting. Retry in a moment.".to_string())
        }
    };
    if let Err(e) = result {
        state.pending.lock().await.remove(&id);
        return Err(e);
    }
    let response = tokio::time::timeout(std::time::Duration::from_secs(240), rx).await;
    state.pending.lock().await.remove(&id);
    match response {
        Ok(Ok(v)) => v,
        Ok(Err(_)) => Err("Engine disconnected".into()),
        Err(_) => Err("Operation timed out. Check activity before retrying.".into()),
    }
}
async fn launch(app: tauri::AppHandle, state: Arc<Bridge>) -> Result<(), String> {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .to_path_buf();
    let script = if cfg!(debug_assertions) {
        root.join("dist-engine/main.mjs")
    } else {
        app.path()
            .resource_dir()
            .map_err(|e| e.to_string())?
            .join("engine/main.mjs")
    };
    let home = std::env::var("HOME").unwrap_or_default();
    let node = std::env::var("CLINEAR_NODE")
        .ok()
        .map(PathBuf::from)
        .or_else(|| {
            [
                format!("{home}/.local/bin/node"),
                format!("{home}/.hermes/node/bin/node"),
                "/opt/homebrew/bin/node".into(),
                "/usr/local/bin/node".into(),
                format!("{home}/.proto/shims/node"),
            ]
            .into_iter()
            .map(PathBuf::from)
            .find(|p| p.exists())
        })
        .unwrap_or_else(|| PathBuf::from("node"));
    let data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let mut command = Command::new(node);
    command
        .arg(&script)
        .env("CLINEAR_DATA_DIR", data)
        .env("COMPOSIO_LOG_LEVEL", "error")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .kill_on_drop(true);
    if cfg!(debug_assertions) {
        command.current_dir(root);
    } else {
        command.current_dir(script.parent().unwrap());
    }
    let mut child = command.spawn().map_err(|e| {
        format!("Cannot launch Node engine: {e}. Set CLINEAR_NODE to your Node 22 executable.")
    })?;
    let stdout = child.stdout.take().ok_or("No engine stdout")?;
    let stderr = child.stderr.take().ok_or("No engine stderr")?;
    *state.stdin.lock().await = child.stdin.take();
    *state.child.lock().await = Some(child);
    tauri::async_runtime::spawn(async move {
        let mut lines = BufReader::new(stderr).lines();
        while let Ok(Some(_line)) = lines.next_line().await { /* SDK diagnostics are not forwarded; RPC errors are sanitized. */
        }
    });
    let reader_state = state.clone();
    tauri::async_runtime::spawn(async move {
        let mut lines = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if let Ok(value) = serde_json::from_str::<Value>(&line) {
                if let Some(id) = value.get("id").and_then(Value::as_str) {
                    if let Some(tx) = reader_state.pending.lock().await.remove(id) {
                        let result = if let Some(e) = value.get("error").and_then(Value::as_str) {
                            Err(e.to_string())
                        } else {
                            Ok(value.get("result").cloned().unwrap_or(Value::Null))
                        };
                        let _ = tx.send(result);
                    }
                } else {
                    let _ = app.emit("engine", value);
                }
            }
        }
        *reader_state.error.lock().await =
            Some("Local engine stopped. Restart Clinear to recover saved work.".into());
        reader_state.pending.lock().await.clear();
        let _ = app.emit("engine", json!({"event":"disconnected"}));
    });
    Ok(())
}
fn main() {
    let bridge = Arc::new(Bridge::new());
    let setup_bridge = bridge.clone();
    tauri::Builder::default()
        .manage(bridge)
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![request])
        .setup(move |app| {
            let handle = app.handle().clone();
            let state = setup_bridge.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = launch(handle.clone(), state.clone()).await {
                    *state.error.lock().await = Some(e.clone());
                    let _ = handle.emit("engine", json!({"event":"error","data":e}));
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Clinear failed to start")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                let state = app.state::<Arc<Bridge>>().inner().clone();
                tauri::async_runtime::block_on(async {
                    state.stdin.lock().await.take();
                    tokio::time::sleep(std::time::Duration::from_millis(2000)).await;
                    if let Some(child) = state.child.lock().await.as_mut() {
                        let _ = child.kill().await;
                    }
                });
            }
        });
}
