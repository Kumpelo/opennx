use std::fs::File;
use std::io::Write;
use tauri::Manager;

use crate::viewversions;

fn payloads_dir(app: &tauri::AppHandle) -> std::path::PathBuf {
    let dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."))
        .join("payloads");
    std::fs::create_dir_all(&dir).ok();
    dir
}

async fn download_asset(url: &str, dest: &std::path::Path) -> Result<u64, String> {
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(5))
        .build()
        .map_err(|e| format!("Client error: {e}"))?;

    let mut resp = client
        .get(url)
        .header("User-Agent", "OpenNX/1.0")
        .send()
        .await
        .map_err(|e| format!("Download failed: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("Server returned {}", resp.status()));
    }

    let mut file = File::create(dest).map_err(|e| format!("Failed to create file: {e}"))?;
    let mut written = 0u64;

    while let Some(chunk) = resp.chunk().await.map_err(|e| format!("Read error: {e}"))? {
        file.write_all(&chunk)
            .map_err(|e| format!("Write error: {e}"))?;
        written += chunk.len() as u64;
    }

    Ok(written)
}

#[tauri::command]
pub async fn download_fusee(app: tauri::AppHandle) -> Result<String, String> {
    let info = viewversions::get_atmosphere_release().await?;
    let tag = &info.version;
    let url = viewversions::known_asset_url("Atmosphere-NX", "Atmosphere", tag, "fusee.bin");
    let dest = payloads_dir(&app).join("fusee.bin");
    let size = download_asset(&url, &dest).await?;
    Ok(format!("Downloaded fusee.bin ({size} bytes)"))
}

#[tauri::command]
pub async fn download_hekate(app: tauri::AppHandle) -> Result<String, String> {
    let info = viewversions::get_hekate_release().await?;
    let tag = &info.version;
    let version = tag.trim_start_matches('v');
    let filename = format!("hekate_ctcaer_{version}.bin");
    let url = viewversions::known_asset_url("CTCaer", "hekate", tag, &filename);
    let dest = payloads_dir(&app).join(&filename);
    let size = download_asset(&url, &dest).await?;
    Ok(format!("Downloaded {filename} ({size} bytes)"))
}
