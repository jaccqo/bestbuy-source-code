#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use once_cell::sync::Lazy;
use std::process::{Child, Command};
use std::sync::Mutex;
// In Tauri v2, Emitter and Manager are traits you MUST import to use .emit() and .path()
use tauri::{Emitter, Manager, RunEvent};
use tauri_plugin_updater::UpdaterExt;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

static BACKEND_PROCESS: Lazy<Mutex<Option<Child>>> = Lazy::new(|| Mutex::new(None));

fn kill_backend() {
    if let Ok(mut guard) = BACKEND_PROCESS.lock() {
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("taskkill")
            .args(&["/F", "/IM", "best_buy_engine.exe"])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .output();
    }
}

#[tauri::command]
async fn check_for_updates_with_license(
    app: tauri::AppHandle,
    license_key: String,
) -> Result<(), String> {
    let updater = app
        .updater_builder()
        .header("x-license-key", &license_key)
        .map_err(|e| e.to_string())?
        .build()
        .map_err(|e| e.to_string())?;

    let update = updater.check().await.map_err(|e| e.to_string())?;

    if let Some(update) = update {
        let payload = serde_json::json!({
            "version": update.version,
            "date": update.date
        });
        let _ = app.emit("tauri://update-available", payload);

        let app_progress = app.clone();
        let app_install = app.clone();

        update
            .download_and_install(
                move |chunk_length, content_length| {
                    let payload = serde_json::json!({
                        "chunkLength": chunk_length,
                        "contentLength": content_length.unwrap_or(0)
                    });
                    let _ = app_progress.emit("tauri://update-download-progress", payload);
                },
                move || {
                    // 1. Clean up backend
                    kill_backend();

                    // 2. Notify UI
                    let _ = app_install.emit("tauri://update-install", ());

                    // 3. let passive install handle the restart after a short delay to ensure the user sees the notification
                   
                   
                },
            )
            .await
            .map_err(|e| e.to_string())?;
    } else {
        let _ = app.emit("tauri://update-no-update", ());
    }

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init()) // Still keep the plugin for frontend access
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![check_for_updates_with_license])
        .setup(|app| {
            let backend_path = app
                .path()
                .resolve(
                    "backend/resources/best_buy_engine.dist/best_buy_engine.exe",
                    tauri::path::BaseDirectory::Resource,
                )
                .expect("Failed to resolve backend path");

            if backend_path.exists() {
                #[cfg(target_os = "windows")]
                let _ = Command::new("taskkill")
                    .args(&["/F", "/IM", "best_buy_engine.exe"])
                    .creation_flags(0x08000000)
                    .output();

                let mut cmd = Command::new(&backend_path);
                #[cfg(target_os = "windows")]
                cmd.creation_flags(0x08000000);

                let child = cmd.spawn().expect("Failed to start backend");
                let mut guard = BACKEND_PROCESS.lock().unwrap();
                *guard = Some(child);
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Error while building Tauri application")
        .run(|_app_handle, event| match event {
            RunEvent::Exit | RunEvent::ExitRequested { .. } => {
                kill_backend();
            }
            _ => {}
        });
}