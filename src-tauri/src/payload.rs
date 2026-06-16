use crate::db;
use crate::error::{AppError, AppResult};
use byteorder::{BigEndian, WriteBytesExt};
use rusb::{Context, UsbContext};
use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::Manager;

const SWITCH_VENDOR_ID: u16 = 0x0955;
const SWITCH_PRODUCT_ID: u16 = 0x7321;
const RCM_MAX_PAYLOAD_SIZE: usize = 0x30000;

#[derive(Serialize)]
pub struct PayloadFile {
    pub name: String,
    pub path: String,
    pub size_kb: u64,
    pub favorite: bool,
}

#[derive(Serialize)]
pub struct PayloadHistoryEntry {
    pub id: i64,
    pub name: String,
    pub action: String,
    pub status: String,
    pub message: Option<String>,
    pub created_at: String,
}

pub fn payloads_dir(app: &tauri::AppHandle) -> AppResult<PathBuf> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| {
            AppError::with_details(
                "app_data_dir",
                "Could not resolve application data directory",
                e.to_string(),
            )
        })?
        .join("payloads");
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

#[tauri::command]
pub fn list_payloads(app: tauri::AppHandle) -> AppResult<Vec<PayloadFile>> {
    let dir = payloads_dir(&app)?;
    let conn = db::connect(&app)?;
    let mut payloads = Vec::new();

    for entry in fs::read_dir(&dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.extension().map_or(false, |ext| ext == "bin") {
            let metadata = fs::metadata(&path)?;
            let name = path
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .into_owned();
            let favorite = is_favorite(&conn, &name)?;
            payloads.push(PayloadFile {
                name,
                path: path.to_string_lossy().into_owned(),
                size_kb: metadata.len() / 1024,
                favorite,
            });
        }
    }

    payloads.sort_by(|a, b| b.favorite.cmp(&a.favorite).then(a.name.cmp(&b.name)));
    Ok(payloads)
}

#[tauri::command]
pub fn add_payload(app: tauri::AppHandle, source: String) -> AppResult<PayloadFile> {
    let source_path = PathBuf::from(&source);
    if source_path.extension().map_or(true, |ext| ext != "bin") {
        return Err(AppError::new(
            "invalid_payload",
            "Payload must be a .bin file",
        ));
    }

    let name = source_path
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();

    let dest_dir = payloads_dir(&app)?;
    let dest_path = dest_dir.join(format!("{name}.bin"));
    fs::copy(&source_path, &dest_path)?;
    record_history(&app, &name, "add", "success", None)?;
    let metadata = fs::metadata(&dest_path)?;
    let conn = db::connect(&app)?;

    Ok(PayloadFile {
        name: name.clone(),
        path: dest_path.to_string_lossy().into_owned(),
        size_kb: metadata.len() / 1024,
        favorite: is_favorite(&conn, &name)?,
    })
}

#[tauri::command]
pub fn delete_payload(app: tauri::AppHandle, name: String) -> AppResult<()> {
    let name = validated_payload_name(&name)?;
    let dir = payloads_dir(&app)?;
    let path = dir.join(format!("{name}.bin"));
    fs::remove_file(&path)?;
    let conn = db::connect(&app)?;
    conn.execute("DELETE FROM payload_favorites WHERE name = ?1", [name])?;
    record_history(&app, name, "delete", "success", None)?;
    Ok(())
}

#[tauri::command]
pub fn set_favorite_payload(app: tauri::AppHandle, name: String) -> AppResult<()> {
    let name = validated_payload_name(&name)?;
    let conn = db::connect(&app)?;
    conn.execute("DELETE FROM payload_favorites", [])?;
    conn.execute(
        "INSERT INTO payload_favorites (name) VALUES (?1)
         ON CONFLICT(name) DO NOTHING",
        [name],
    )?;
    record_history(&app, name, "favorite", "success", None)?;
    Ok(())
}

#[tauri::command]
pub fn inject_payload(app: tauri::AppHandle, name: String) -> AppResult<()> {
    let name = validated_payload_name(&name)?;
    let result = inject_payload_inner(&app, name);
    match &result {
        Ok(_) => record_history(&app, name, "inject", "success", None)?,
        Err(err) => record_history(&app, name, "inject", "error", Some(err.message.clone()))?,
    }
    result
}

#[tauri::command]
pub fn list_payload_history(
    app: tauri::AppHandle,
    limit: Option<i64>,
) -> AppResult<Vec<PayloadHistoryEntry>> {
    list_payload_history_inner(&app, limit.unwrap_or(30))
}

pub fn list_payload_history_inner(
    app: &tauri::AppHandle,
    limit: i64,
) -> AppResult<Vec<PayloadHistoryEntry>> {
    let conn = db::connect(app)?;
    let mut stmt = conn.prepare(
        "SELECT id, name, action, status, message, created_at
         FROM payload_history
         ORDER BY id DESC
         LIMIT ?1",
    )?;
    let entries = stmt
        .query_map([limit], |row| {
            Ok(PayloadHistoryEntry {
                id: row.get(0)?,
                name: row.get(1)?,
                action: row.get(2)?,
                status: row.get(3)?,
                message: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(entries)
}

fn inject_payload_inner(app: &tauri::AppHandle, name: &str) -> AppResult<()> {
    let dir = payloads_dir(app)?;
    let path = dir.join(format!("{name}.bin"));
    let raw_payload = fs::read(&path)?;

    if raw_payload.len() > RCM_MAX_PAYLOAD_SIZE {
        return Err(AppError::new(
            "payload_too_large",
            "Payload is too large for RCM injection",
        ));
    }

    let context = Context::new().map_err(|e| {
        AppError::with_details("usb_context", "Failed to initialize USB", e.to_string())
    })?;

    let handle = context
        .open_device_with_vid_pid(SWITCH_VENDOR_ID, SWITCH_PRODUCT_ID)
        .ok_or_else(|| {
            AppError::new("rcm_not_found", "Nintendo Switch in RCM mode was not found")
        })?;

    handle.claim_interface(0).map_err(|e| {
        AppError::with_details("usb_claim", "Failed to claim USB interface", e.to_string())
    })?;

    let mut endpoint_buffer = [0u8; 16];
    let timeout = std::time::Duration::from_secs(2);
    handle
        .read_bulk(0x81, &mut endpoint_buffer, timeout)
        .map_err(|e| {
            AppError::with_details("usb_read", "Failed to read device ID", e.to_string())
        })?;

    let rcm_packet = construct_rcm_packet(&raw_payload).map_err(|e| {
        AppError::with_details(
            "payload_packet",
            "Failed to build payload packet",
            e.to_string(),
        )
    })?;

    let request_type = rusb::request_type(
        rusb::Direction::Out,
        rusb::RequestType::Standard,
        rusb::Recipient::Interface,
    );

    handle
        .write_control(request_type, 0x01, 0x0000, 0x0000, &rcm_packet, timeout)
        .map_err(|e| AppError::with_details("usb_write", "USB transfer failed", e.to_string()))?;

    Ok(())
}

fn validated_payload_name(name: &str) -> AppResult<&str> {
    if name.is_empty() || name == "." || name == ".." || name.contains('/') || name.contains('\\') {
        return Err(AppError::new(
            "invalid_payload_name",
            "Payload name must not contain path separators",
        ));
    }
    Ok(name)
}

fn record_history(
    app: &tauri::AppHandle,
    name: &str,
    action: &str,
    status: &str,
    message: Option<String>,
) -> AppResult<()> {
    let conn = db::connect(app)?;
    conn.execute(
        "INSERT INTO payload_history (name, action, status, message) VALUES (?1, ?2, ?3, ?4)",
        (name, action, status, message),
    )?;
    Ok(())
}

fn is_favorite(conn: &rusqlite::Connection, name: &str) -> AppResult<bool> {
    let mut stmt = conn.prepare("SELECT 1 FROM payload_favorites WHERE name = ?1 LIMIT 1")?;
    let mut rows = stmt.query([name])?;
    Ok(rows.next()?.is_some())
}

fn construct_rcm_packet(payload: &[u8]) -> Result<Vec<u8>, std::io::Error> {
    let mut packet = Vec::with_capacity(RCM_MAX_PAYLOAD_SIZE);
    packet.write_u32::<BigEndian>(RCM_MAX_PAYLOAD_SIZE as u32)?;
    packet.write_all(&vec![0u8; 680])?;
    packet.write_all(payload)?;

    if packet.len() < RCM_MAX_PAYLOAD_SIZE {
        let padding = RCM_MAX_PAYLOAD_SIZE - packet.len();
        packet.write_all(&vec![0u8; padding])?;
    }

    Ok(packet)
}
