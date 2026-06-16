mod backup;
mod commands;
mod db;
mod downloadpayload;
mod error;
mod payload;
mod settings;
mod updater;
mod viewversions;

use commands::check_updates;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::app_version,
            commands::get_app_info,
            commands::get_sd_info,
            commands::get_sd_status,
            commands::analyze_sd,
            commands::get_dashboard_status,
            commands::run_doctor,
            check_updates,
            settings::get_settings,
            settings::set_language,
            settings::set_sd_root,
            settings::get_safety_settings,
            settings::set_safety_settings,
            payload::list_payloads,
            payload::add_payload,
            payload::delete_payload,
            payload::set_favorite_payload,
            payload::inject_payload,
            payload::list_payload_history,
            viewversions::get_atmosphere_release,
            viewversions::get_hekate_release,
            downloadpayload::download_fusee,
            downloadpayload::download_hekate,
            backup::create_sd_backup,
            backup::restore_sd_backup,
            backup::list_sd_backups,
            backup::delete_sd_backup,
            updater::install::prepare_update,
            updater::install::install_update,
            updater::rollback::list_rollbacks,
            updater::rollback::rollback_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
