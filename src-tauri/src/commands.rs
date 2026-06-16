use crate::db;
use crate::error::{AppError, AppResult};
use crate::updater::github::{latest_release, ReleaseInfo};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Serialize)]
pub struct AppInfo {
    pub version: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SdInfo {
    pub root: Option<String>,
    pub total_gb: f64,
    pub used_gb: f64,
    pub free_gb: f64,
    pub healthy: bool,
    pub issues: Vec<String>,
    pub missing_files: Vec<String>,
    pub duplicate_files: Vec<String>,
}

#[derive(Serialize)]
pub struct DashboardStatus {
    pub app: AppInfo,
    pub sd: SdInfo,
    pub releases: Vec<ReleaseInfo>,
    pub recent_activity: Vec<crate::payload::PayloadHistoryEntry>,
}

#[derive(Serialize)]
pub struct DiagnosticResult {
    pub status: String,
    pub title: String,
    pub detail: String,
}

#[tauri::command]
pub fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
pub fn get_app_info() -> AppInfo {
    AppInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        name: "OpenNX".to_string(),
    }
}

#[tauri::command]
pub fn get_sd_info(app: tauri::AppHandle) -> AppResult<SdInfo> {
    get_sd_status(app)
}

#[tauri::command]
pub fn get_sd_status(app: tauri::AppHandle) -> AppResult<SdInfo> {
    let conn = db::connect(&app)?;
    let root = db::get_setting(&conn, "sd_root")?;
    match root {
        Some(path) => inspect_sd_root(Path::new(&path), Some(path.clone())),
        None => Ok(SdInfo {
            root: None,
            total_gb: 0.0,
            used_gb: 0.0,
            free_gb: 0.0,
            healthy: false,
            issues: vec!["sd_root_missing".to_string()],
            missing_files: Vec::new(),
            duplicate_files: Vec::new(),
        }),
    }
}

#[tauri::command]
pub fn analyze_sd(app: tauri::AppHandle) -> AppResult<SdInfo> {
    get_sd_status(app)
}

#[tauri::command]
pub async fn check_updates() -> AppResult<Vec<ReleaseInfo>> {
    let mut releases = Vec::new();
    releases.push(latest_release("Atmosphere-NX/Atmosphere").await?);
    releases.push(latest_release("CTCaer/hekate").await?);
    releases.push(latest_release("switchbrew/nx-hbmenu").await?);
    Ok(releases)
}

#[tauri::command]
pub async fn get_dashboard_status(app: tauri::AppHandle) -> AppResult<DashboardStatus> {
    let sd = get_sd_status(app.clone())?;
    let releases = check_updates().await.unwrap_or_default();
    let recent_activity = crate::payload::list_payload_history_inner(&app, 5)?;
    Ok(DashboardStatus {
        app: get_app_info(),
        sd,
        releases,
        recent_activity,
    })
}

#[tauri::command]
pub fn run_doctor(app: tauri::AppHandle) -> AppResult<Vec<DiagnosticResult>> {
    let sd = get_sd_status(app)?;
    let mut results = Vec::new();

    if sd.root.is_some() {
        results.push(DiagnosticResult {
            status: "success".to_string(),
            title: "SD root configured".to_string(),
            detail: sd.root.clone().unwrap_or_default(),
        });
    } else {
        results.push(DiagnosticResult {
            status: "warning".to_string(),
            title: "SD root missing".to_string(),
            detail: "Select the root of your SD card before running maintenance tasks".to_string(),
        });
    }

    if sd.missing_files.is_empty() {
        results.push(DiagnosticResult {
            status: "success".to_string(),
            title: "Atmosphère structure valid".to_string(),
            detail: "Required folders were found".to_string(),
        });
    } else {
        results.push(DiagnosticResult {
            status: "warning".to_string(),
            title: "Homebrew structure incomplete".to_string(),
            detail: sd.missing_files.join(", "),
        });
    }

    if sd.duplicate_files.is_empty() {
        results.push(DiagnosticResult {
            status: "success".to_string(),
            title: "No duplicate file names detected".to_string(),
            detail: "SD scan did not find duplicate names in indexed entries".to_string(),
        });
    } else {
        results.push(DiagnosticResult {
            status: "warning".to_string(),
            title: "Duplicate file names detected".to_string(),
            detail: sd.duplicate_files.join(", "),
        });
    }

    if sd.free_gb > 1.0 {
        results.push(DiagnosticResult {
            status: "success".to_string(),
            title: "Storage capacity acceptable".to_string(),
            detail: format!("{} GB free", sd.free_gb),
        });
    } else {
        results.push(DiagnosticResult {
            status: "error".to_string(),
            title: "Low free space".to_string(),
            detail: "Free at least 1 GB before updating components".to_string(),
        });
    }

    Ok(results)
}

pub fn selected_sd_root(app: &tauri::AppHandle) -> AppResult<PathBuf> {
    let conn = db::connect(app)?;
    let root = db::get_setting(&conn, "sd_root")?
        .ok_or_else(|| AppError::new("sd_root_missing", "Select an SD card folder first"))?;
    let path = PathBuf::from(root);
    if !path.is_dir() {
        return Err(AppError::new(
            "invalid_sd_root",
            "Configured SD card path is unavailable",
        ));
    }
    Ok(path)
}

fn inspect_sd_root(path: &Path, label: Option<String>) -> AppResult<SdInfo> {
    if !path.is_dir() {
        return Err(AppError::new(
            "invalid_sd_root",
            "Configured SD card path is unavailable",
        ));
    }

    let used_bytes = dir_size(path)?;
    let total_bytes = available_space(path)? + used_bytes;
    let free_bytes = available_space(path)?;
    let required = ["atmosphere", "bootloader", "switch"];
    let missing_files = required
        .iter()
        .filter(|entry| !path.join(entry).exists())
        .map(|entry| entry.to_string())
        .collect::<Vec<_>>();
    let duplicate_files = find_duplicates(path)?;
    let mut issues = Vec::new();

    if !missing_files.is_empty() {
        issues.push("required_entries_missing".to_string());
    }
    if free_bytes < 1024 * 1024 * 1024 {
        issues.push("low_space".to_string());
    }
    if !duplicate_files.is_empty() {
        issues.push("duplicates_found".to_string());
    }

    Ok(SdInfo {
        root: label,
        total_gb: bytes_to_gb(total_bytes),
        used_gb: bytes_to_gb(used_bytes),
        free_gb: bytes_to_gb(free_bytes),
        healthy: issues.is_empty(),
        issues,
        missing_files,
        duplicate_files,
    })
}

fn available_space(path: &Path) -> AppResult<u64> {
    #[cfg(unix)]
    {
        let stat = nix::sys::statvfs::statvfs(path).map_err(|e| {
            AppError::with_details("disk_stats", "Could not read disk stats", e.to_string())
        })?;
        Ok((stat.blocks_available() as u64) * stat.fragment_size())
    }

    #[cfg(not(unix))]
    {
        available_space_non_unix(path)
    }
}

#[cfg(all(not(unix), windows))]
fn available_space_non_unix(path: &Path) -> AppResult<u64> {
    use std::os::windows::ffi::OsStrExt;

    let mut free_bytes = 0u64;
    let wide_path = path
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect::<Vec<_>>();

    let success = unsafe {
        GetDiskFreeSpaceExW(
            wide_path.as_ptr(),
            &mut free_bytes,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
        )
    };

    if success == 0 {
        return Err(AppError::with_details(
            "disk_stats",
            "Could not read disk stats",
            std::io::Error::last_os_error().to_string(),
        ));
    }

    Ok(free_bytes)
}

#[cfg(all(not(unix), windows))]
extern "system" {
    fn GetDiskFreeSpaceExW(
        lp_directory_name: *const u16,
        lp_free_bytes_available_to_caller: *mut u64,
        lp_total_number_of_bytes: *mut u64,
        lp_total_number_of_free_bytes: *mut u64,
    ) -> i32;
}

#[cfg(all(not(unix), not(windows)))]
fn available_space_non_unix(_path: &Path) -> AppResult<u64> {
    Err(AppError::new(
        "disk_stats",
        "Disk stats are not supported on this platform",
    ))
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

fn find_duplicates(path: &Path) -> AppResult<Vec<String>> {
    let mut names = std::collections::HashMap::<String, u32>::new();
    collect_names(path, &mut names)?;
    Ok(names
        .into_iter()
        .filter_map(|(name, count)| (count > 1).then_some(name))
        .take(20)
        .collect())
}

fn collect_names(path: &Path, names: &mut std::collections::HashMap<String, u32>) -> AppResult<()> {
    for entry in std::fs::read_dir(path)? {
        let entry = entry?;
        let metadata = entry.metadata()?;
        let name = entry.file_name().to_string_lossy().into_owned();
        *names.entry(name).or_insert(0) += 1;
        if metadata.is_dir() {
            collect_names(&entry.path(), names)?;
        }
    }
    Ok(())
}

fn bytes_to_gb(bytes: u64) -> f64 {
    ((bytes as f64 / 1_073_741_824.0) * 10.0).round() / 10.0
}
