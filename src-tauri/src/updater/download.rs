use crate::error::{AppError, AppResult};
use std::io::Write;
use std::path::Path;

pub async fn download_asset(url: &str, dest: &Path) -> AppResult<u64> {
    let client = reqwest::Client::new();
    let mut resp = client
        .get(url)
        .header("User-Agent", "OpenNX")
        .send()
        .await?
        .error_for_status()
        .map_err(|e| AppError::with_details("download_failed", "Download failed", e.to_string()))?;

    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let mut file = std::fs::File::create(dest)?;
    let mut written = 0u64;

    while let Some(chunk) = resp.chunk().await? {
        file.write_all(&chunk)?;
        written += chunk.len() as u64;
    }

    Ok(written)
}
