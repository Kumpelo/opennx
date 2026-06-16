use crate::commands::selected_sd_root;
use crate::error::{AppError, AppResult};
use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::Manager;

#[derive(Serialize)]
pub struct BackupResult {
    pub path: String,
    pub files: usize,
    pub bytes: u64,
}

#[derive(Serialize)]
pub struct BackupEntry {
    pub name: String,
    pub path: String,
    pub created_at: String,
    pub backup_type: String,
    pub size_bytes: u64,
}

#[tauri::command]
pub fn create_sd_backup(app: tauri::AppHandle) -> AppResult<BackupResult> {
    let sd_root = selected_sd_root(&app)?;
    let backup_store = backups_root(&app)?;
    std::fs::create_dir_all(&backup_store)?;
    ensure_backup_store_outside_source(&sd_root, &backup_store)?;
    let backup_root = backup_store.join(timestamp());
    std::fs::create_dir(&backup_root)?;
    let mut stats = CopyStats::default();
    copy_path(&sd_root, &backup_root, &mut stats)?;
    Ok(BackupResult {
        path: backup_root.to_string_lossy().into_owned(),
        files: stats.files,
        bytes: stats.bytes,
    })
}

#[tauri::command]
pub fn restore_sd_backup(app: tauri::AppHandle, backup_path: String) -> AppResult<BackupResult> {
    let sd_root = selected_sd_root(&app)?;
    let source = validated_backup_path(&app, &backup_path)?;
    let mut stats = CopyStats::default();
    copy_path(&source, &sd_root, &mut stats)?;
    Ok(BackupResult {
        path: backup_path,
        files: stats.files,
        bytes: stats.bytes,
    })
}

#[tauri::command]
pub fn list_sd_backups(app: tauri::AppHandle) -> AppResult<Vec<BackupEntry>> {
    let root = backups_root(&app)?;
    std::fs::create_dir_all(&root)?;
    let mut entries = Vec::new();

    for entry in std::fs::read_dir(root)? {
        let entry = entry?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().into_owned();
        entries.push(BackupEntry {
            created_at: name.clone(),
            backup_type: "Manual backup".to_string(),
            size_bytes: dir_size(&path)?,
            path: path.to_string_lossy().into_owned(),
            name,
        });
    }

    entries.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(entries)
}

#[tauri::command]
pub fn delete_sd_backup(app: tauri::AppHandle, backup_path: String) -> AppResult<()> {
    let path = validated_backup_path(&app, &backup_path)?;
    std::fs::remove_dir_all(path)?;
    Ok(())
}

#[derive(Default)]
struct CopyStats {
    files: usize,
    bytes: u64,
}

fn copy_path(source: &Path, dest: &Path, stats: &mut CopyStats) -> AppResult<()> {
    let metadata = std::fs::metadata(source)?;
    if metadata.is_dir() {
        std::fs::create_dir_all(dest)?;
        for entry in std::fs::read_dir(source)? {
            let entry = entry?;
            copy_path(&entry.path(), &dest.join(entry.file_name()), stats)?;
        }
    } else {
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::copy(source, dest)?;
        stats.files += 1;
        stats.bytes = stats.bytes.saturating_add(metadata.len());
    }
    Ok(())
}

fn timestamp() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or_default();
    secs.to_string()
}

fn backups_root(app: &tauri::AppHandle) -> AppResult<PathBuf> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|e| {
            AppError::with_details(
                "app_data_dir",
                "Could not resolve application data directory",
                e.to_string(),
            )
        })?
        .join("sd-backups"))
}

fn ensure_backup_store_outside_source(source: &Path, backup_store: &Path) -> AppResult<()> {
    let source = source.canonicalize()?;
    let backup_store = backup_store.canonicalize()?;
    if backup_store.starts_with(&source) {
        return Err(AppError::new(
            "backup_inside_source",
            "Backup storage must be outside the selected SD root",
        ));
    }
    Ok(())
}

fn validated_backup_path(app: &tauri::AppHandle, backup_path: &str) -> AppResult<PathBuf> {
    let root = backups_root(app)?;
    std::fs::create_dir_all(&root)?;
    let root = root.canonicalize()?;
    let path = PathBuf::from(backup_path);
    let path = path
        .canonicalize()
        .map_err(|_| AppError::new("backup_missing", "Backup folder was not found"))?;

    if path == root || !path.starts_with(&root) || !path.is_dir() {
        return Err(AppError::new("backup_invalid", "Backup path is invalid"));
    }

    Ok(path)
}

fn dir_size(path: &Path) -> AppResult<u64> {
    let mut total = 0u64;
    for entry in std::fs::read_dir(path)? {
        let entry = entry?;
        let metadata = entry.metadata()?;
        if metadata.is_dir() {
            total = total.saturating_add(dir_size(&entry.path())?);
        } else {
            total = total.saturating_add(metadata.len());
        }
    }
    Ok(total)
}
