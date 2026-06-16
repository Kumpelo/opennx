use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct ReleaseInfo {
    pub version: String,
    pub name: String,
    pub published_at: String,
    pub html_url: String,
}

fn extract_tag(url: &str) -> Option<String> {
    let path = url
        .split("/releases/tag/")
        .nth(1)
        .or_else(|| url.split("/tags/").nth(1))?;
    let tag = path.split('/').next().unwrap_or(path);
    let tag = tag.split('?').next().unwrap_or(tag);
    Some(tag.to_string())
}

fn meta_content(body: &str, property: &str) -> Option<String> {
    let marker = format!("property=\"{property}\"");
    let pos = body.find(&marker)?;
    let rest = &body[pos..];
    let content_start = rest.find("content=\"")? + 9;
    let rest2 = &rest[content_start..];
    let end = rest2.find('"')?;
    Some(rest2[..end].to_string())
}

async fn latest_release(owner: &str, repo: &str) -> Result<ReleaseInfo, String> {
    let url = format!("https://github.com/{owner}/{repo}/releases/latest");

    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(5))
        .build()
        .map_err(|e| format!("Client error: {e}"))?;

    let resp = client
        .get(&url)
        .header("User-Agent", "OpenNX/1.0")
        .header("Accept", "text/html")
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }

    let final_url = resp.url().to_string();
    let body = resp.text().await.map_err(|e| format!("Read error: {e}"))?;

    let tag = extract_tag(&final_url).ok_or_else(|| "Could not find tag in URL".to_string())?;

    let name = meta_content(&body, "og:title").unwrap_or_default();
    let published_at = meta_content(&body, "article:published_time").unwrap_or_default();

    Ok(ReleaseInfo {
        version: tag.clone(),
        name,
        published_at,
        html_url: format!("https://github.com/{owner}/{repo}/releases/tag/{tag}"),
    })
}

pub fn known_asset_url(owner: &str, repo: &str, tag: &str, name: &str) -> String {
    format!("https://github.com/{owner}/{repo}/releases/download/{tag}/{name}")
}

#[tauri::command]
pub async fn get_atmosphere_release() -> Result<ReleaseInfo, String> {
    latest_release("Atmosphere-NX", "Atmosphere").await
}

#[tauri::command]
pub async fn get_hekate_release() -> Result<ReleaseInfo, String> {
    latest_release("CTCaer", "hekate").await
}
