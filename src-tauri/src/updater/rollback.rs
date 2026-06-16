use crate::commands::selected_sd_root;
use crate::db;
use crate::error::{AppError, AppResult};
use serde::Serialize;
use std::path::Path;

#[derive(Serialize)]
pub struct RollbackEntry {
    pub id: i64,
    pub component: String,
    pub path: String,
    pub created_at: String,
    pub status: String,
}

#[tauri::command]
pub fn list_rollbacks(app: tauri::AppHandle) -> AppResult<Vec<RollbackEntry>> {
    let conn = db::connect(&app)?;
    let mut stmt = conn.prepare(
        "SELECT id, component, path, created_at, status
         FROM update_backups
         ORDER BY id DESC",
    )?;
    let entries = stmt
        .query_map([], |row| {
            Ok(RollbackEntry {
                id: row.get(0)?,
                component: row.get(1)?,
                path: row.get(2)?,
                created_at: row.get(3)?,
                status: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(entries)
}

#[tauri::command]
pub fn rollback_update(app: tauri::AppHandle, id: i64) -> AppResult<()> {
    let conn = db::connect(&app)?;
    let mut stmt = conn.prepare("SELECT path FROM update_backups WHERE id = ?1")?;
    let path: String = stmt
        .query_row([id], |row| row.get(0))
        .map_err(|_| AppError::new("rollback_missing", "Rollback backup was not found"))?;
    let sd_root = selected_sd_root(&app)?;
    restore_path(Path::new(&path), &sd_root)?;
    conn.execute(
        "UPDATE update_backups SET status = ?1 WHERE id = ?2",
        ("restored", id),
    )?;
    Ok(())
}

fn restore_path(source: &Path, dest: &Path) -> AppResult<()> {
    if !source.is_dir() {
        return Err(AppError::new(
            "rollback_invalid",
            "Rollback backup path is invalid",
        ));
    }
    for entry in std::fs::read_dir(source)? {
        let entry = entry?;
        copy_path(&entry.path(), &dest.join(entry.file_name()))?;
    }
    Ok(())
}

fn copy_path(source: &Path, dest: &Path) -> AppResult<()> {
    let metadata = std::fs::metadata(source)?;
    if metadata.is_dir() {
        std::fs::create_dir_all(dest)?;
        for entry in std::fs::read_dir(source)? {
            let entry = entry?;
            copy_path(&entry.path(), &dest.join(entry.file_name()))?;
        }
    } else {
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::copy(source, dest)?;
    }
    Ok(())
}
