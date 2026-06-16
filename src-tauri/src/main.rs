#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    configure_linux_webview_backend();
    app_lib::run();
}

#[cfg(target_os = "linux")]
fn configure_linux_webview_backend() {
    let forced = std::env::var("OPENNX_WEBVIEW_BACKEND").ok();
    if forced.as_deref() == Some("wayland") {
        return;
    }

    if std::env::var("WAYLAND_DISPLAY").is_ok() {
        std::env::set_var("GDK_BACKEND", forced.unwrap_or_else(|| "x11".to_string()));
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
}

#[cfg(not(target_os = "linux"))]
fn configure_linux_webview_backend() {}
