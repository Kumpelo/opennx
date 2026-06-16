use crate::error::{AppError, AppResult};
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReleaseAsset {
    pub name: String,
    pub download_url: String,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReleaseInfo {
    pub component: String,
    pub name: String,
    pub version: String,
    pub html_url: String,
    pub published_at: String,
    pub assets: Vec<ReleaseAsset>,
}

#[derive(Deserialize)]
struct GithubRelease {
    tag_name: String,
    name: String,
    html_url: String,
    published_at: String,
    assets: Vec<GithubAsset>,
}

#[derive(Deserialize)]
struct GithubAsset {
    name: String,
    browser_download_url: String,
    size: u64,
}

pub async fn latest_release(repo: &str) -> AppResult<ReleaseInfo> {
    let client = Client::new();
    let release: GithubRelease = client
        .get(format!(
            "https://api.github.com/repos/{repo}/releases/latest"
        ))
        .header("User-Agent", "OpenNX")
        .send()
        .await?
        .error_for_status()
        .map_err(|e| {
            AppError::with_details("github_release", "GitHub returned an error", e.to_string())
        })?
        .json()
        .await?;

    Ok(ReleaseInfo {
        component: component_name(repo).to_string(),
        name: release.name,
        version: release.tag_name,
        html_url: release.html_url,
        published_at: release.published_at,
        assets: release
            .assets
            .into_iter()
            .map(|asset| ReleaseAsset {
                name: asset.name,
                download_url: asset.browser_download_url,
                size: asset.size,
            })
            .collect(),
    })
}

pub fn component_name(repo: &str) -> &'static str {
    match repo {
        "Atmosphere-NX/Atmosphere" => "atmosphere",
        "CTCaer/hekate" => "hekate",
        "switchbrew/nx-hbmenu" => "hbmenu",
        _ => "unknown",
    }
}

pub fn repo_for_component(component: &str) -> AppResult<&'static str> {
    match component {
        "atmosphere" => Ok("Atmosphere-NX/Atmosphere"),
        "hekate" => Ok("CTCaer/hekate"),
        "hbmenu" => Ok("switchbrew/nx-hbmenu"),
        _ => Err(AppError::new(
            "unsupported_component",
            "Unsupported update component",
        )),
    }
}
