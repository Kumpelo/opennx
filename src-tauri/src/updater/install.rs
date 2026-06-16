use crate::commands::selected_sd_root;
use crate::db;
use crate::error::{AppError, AppResult};
use crate::updater::download::download_asset;
use crate::updater::github::{latest_release, repo_for_component, ReleaseInfo};
use crate::updater::integrity::sha256_file;
use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::Manager;

#[derive(Serialize)]
pub struct PreparedUpdate {
    pub component: String,
    pub version: String,
    pub asset_name: String,
    pub downloaded_path: String,
    pub sha256: String,
    pub bytes: u64,
}

#[derive(Serialize)]
pub struct InstallResult {
    pub component: String,
    pub version: String,
    pub backup_path: String,
    pub installed_files: usize,
}

#[tauri::command]
pub async fn prepare_update(app: tauri::AppHandle, component: String) -> AppResult<PreparedUpdate> {
    let repo = repo_for_component(&component)?;
    let release = latest_release(repo).await?;
    let asset = select_asset(&release)?;
    let asset_name = asset.name.clone();
    let asset_url = asset.download_url.clone();
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| {
            AppError::with_details(
                "cache_dir",
                "Could not resolve cache directory",
                e.to_string(),
            )
        })?
        .join("updates")
        .join(&component)
        .join(&release.version);
    std::fs::create_dir_all(&cache_dir)?;
    let dest = cache_dir.join(&asset_name);
    let bytes = download_asset(&asset_url, &dest).await?;
    let sha256 = sha256_file(&dest)?;

    Ok(PreparedUpdate {
        component,
        version: release.version,
        asset_name,
        downloaded_path: dest.to_string_lossy().into_owned(),
        sha256,
        bytes,
    })
}

#[tauri::command]
pub async fn install_update(app: tauri::AppHandle, component: String) -> AppResult<InstallResult> {
    let prepared = prepare_update(app.clone(), component.clone()).await?;
    let sd_root = selected_sd_root(&app)?;
    let backup_path = create_component_backup(&app, &sd_root, &component)?;
    let installed_files =
        install_prepared(Path::new(&prepared.downloaded_path), &sd_root, &component)?;
    let conn = db::connect(&app)?;
    conn.execute(
        "INSERT INTO update_backups (component, path, status) VALUES (?1, ?2, ?3)",
        (&component, backup_path.to_string_lossy().as_ref(), "ready"),
    )?;

    Ok(InstallResult {
        component,
        version: prepared.version,
        backup_path: backup_path.to_string_lossy().into_owned(),
        installed_files,
    })
}

fn select_asset(release: &ReleaseInfo) -> AppResult<&crate::updater::github::ReleaseAsset> {
    release
        .assets
        .iter()
        .find(|asset| {
            let name = asset.name.to_ascii_lowercase();
            name.ends_with(".zip") || name.ends_with(".bin") || name.ends_with(".nro")
        })
        .ok_or_else(|| AppError::new("asset_missing", "No installable release asset was found"))
}

fn create_component_backup(
    app: &tauri::AppHandle,
    sd_root: &Path,
    component: &str,
) -> AppResult<PathBuf> {
    let backup_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| {
            AppError::with_details(
                "app_data_dir",
                "Could not resolve application data directory",
                e.to_string(),
            )
        })?
        .join("backups")
        .join(format!("{component}-{}", chrono_like_timestamp()));
    std::fs::create_dir_all(&backup_dir)?;

    for entry in component_paths(component) {
        let source = sd_root.join(entry);
        if source.exists() {
            let dest = backup_dir.join(entry);
            copy_path(&source, &dest)?;
        }
    }

    Ok(backup_dir)
}

fn install_prepared(source: &Path, sd_root: &Path, component: &str) -> AppResult<usize> {
    let name = source
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_ascii_lowercase();

    if name.ends_with(".zip") {
        extract_zip(source, sd_root)
    } else if name.ends_with(".bin") {
        let dest = sd_root
            .join("bootloader")
            .join("payloads")
            .join(source.file_name().unwrap_or_default());
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::copy(source, dest)?;
        Ok(1)
    } else if name.ends_with(".nro") {
        let dest = if component == "hbmenu" {
            sd_root.join("hbmenu.nro")
        } else {
            sd_root
                .join("switch")
                .join(source.file_name().unwrap_or_default())
        };
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::copy(source, dest)?;
        Ok(1)
    } else {
        Err(AppError::new(
            "unsupported_asset",
            "Downloaded asset is not installable",
        ))
    }
}

fn extract_zip(source: &Path, sd_root: &Path) -> AppResult<usize> {
    let file = std::fs::File::open(source)?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| {
        AppError::with_details("zip_read", "Could not read zip archive", e.to_string())
    })?;
    let mut installed = 0usize;

    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).map_err(|e| {
            AppError::with_details("zip_entry", "Could not read zip entry", e.to_string())
        })?;
        let Some(path) = entry.enclosed_name().map(|p| p.to_owned()) else {
            continue;
        };
        let dest = sd_root.join(path);

        if entry.is_dir() {
            std::fs::create_dir_all(&dest)?;
        } else {
            if let Some(parent) = dest.parent() {
                std::fs::create_dir_all(parent)?;
            }
            let mut output = std::fs::File::create(&dest)?;
            std::io::copy(&mut entry, &mut output)?;
            installed += 1;
        }
    }

    Ok(installed)
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

fn component_paths(component: &str) -> &'static [&'static str] {
    match component {
        "atmosphere" => &["atmosphere", "sept", "switch/reboot_to_payload.nro"],
        "hekate" => &["bootloader"],
        "hbmenu" => &["hbmenu.nro"],
        _ => &[],
    }
}

fn chrono_like_timestamp() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or_default();
    secs.to_string()
}
