use crate::db;
use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct Settings {
    pub language: String,
    pub sd_root: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct SafetySettings {
    pub backup_before_update: bool,
    pub verify_after_extract: bool,
    pub rollback_on_failure: bool,
}

#[tauri::command]
pub fn get_settings(app: tauri::AppHandle) -> AppResult<Settings> {
    let conn = db::connect(&app)?;
    Ok(Settings {
        language: db::get_setting(&conn, "language")?.unwrap_or_else(|| "en".to_string()),
        sd_root: db::get_setting(&conn, "sd_root")?,
    })
}

#[tauri::command]
pub fn set_language(app: tauri::AppHandle, language: String) -> AppResult<Settings> {
    if language != "en" && language != "es" {
        return Err(AppError::new("invalid_language", "Unsupported language"));
    }
    let conn = db::connect(&app)?;
    db::set_setting(&conn, "language", &language)?;
    get_settings(app)
}

#[tauri::command]
pub fn set_sd_root(app: tauri::AppHandle, path: String) -> AppResult<Settings> {
    let root = std::path::PathBuf::from(&path);
    if !root.is_dir() {
        return Err(AppError::new(
            "invalid_sd_root",
            "Selected path is not a directory",
        ));
    }
    let conn = db::connect(&app)?;
    db::set_setting(&conn, "sd_root", &path)?;
    get_settings(app)
}

#[tauri::command]
pub fn get_safety_settings(app: tauri::AppHandle) -> AppResult<SafetySettings> {
    let conn = db::connect(&app)?;
    Ok(SafetySettings {
        backup_before_update: read_bool(&conn, "safety.backup_before_update", true)?,
        verify_after_extract: read_bool(&conn, "safety.verify_after_extract", true)?,
        rollback_on_failure: read_bool(&conn, "safety.rollback_on_failure", true)?,
    })
}

#[tauri::command]
pub fn set_safety_settings(
    app: tauri::AppHandle,
    settings: SafetySettings,
) -> AppResult<SafetySettings> {
    let conn = db::connect(&app)?;
    db::set_setting(
        &conn,
        "safety.backup_before_update",
        bool_value(settings.backup_before_update),
    )?;
    db::set_setting(
        &conn,
        "safety.verify_after_extract",
        bool_value(settings.verify_after_extract),
    )?;
    db::set_setting(
        &conn,
        "safety.rollback_on_failure",
        bool_value(settings.rollback_on_failure),
    )?;
    get_safety_settings(app)
}

fn read_bool(conn: &rusqlite::Connection, key: &str, fallback: bool) -> AppResult<bool> {
    Ok(db::get_setting(conn, key)?
        .map(|value| value == "true")
        .unwrap_or(fallback))
}

fn bool_value(value: bool) -> &'static str {
    if value {
        "true"
    } else {
        "false"
    }
}
