mod directory;
mod parser;
mod scanner;
mod types;

use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use tauri_plugin_opener::OpenerExt;
use types::{CatalogResponse, DirectoryEntry, ItemFileStats};

#[tauri::command]
fn scan_catalog() -> Result<CatalogResponse, String> {
    let home_directory = home_directory()?;
    Ok(scanner::build_catalog(&home_directory))
}

#[tauri::command]
async fn reveal_item_path(path: String, app: tauri::AppHandle) -> Result<(), String> {
    println!("[reveal_item_path] revealing file: {path}");

    app.opener()
        .reveal_item_in_dir(&path)
        .map_err(|error| error.to_string())?;

    println!("[reveal_item_path] revealed successfully: {path}");
    Ok(())
}

#[tauri::command]
fn read_item_file(path: String) -> Result<String, String> {
    println!("[read_item_file] reading file: {path}");

    let content = std::fs::read_to_string(&path).map_err(|error| {
        let message = format!("Could not read file: {error}");
        println!("[read_item_file] {message}");
        message
    })?;

    println!(
        "[read_item_file] read {} bytes from {path}",
        content.len()
    );
    Ok(content)
}

#[tauri::command]
fn write_item_file(path: String, content: String) -> Result<(), String> {
    println!(
        "[write_item_file] writing {} bytes to {path}",
        content.len()
    );

    std::fs::write(&path, &content).map_err(|error| {
        let message = format!("Could not write file: {error}");
        println!("[write_item_file] {message}");
        message
    })?;

    println!("[write_item_file] wrote successfully: {path}");
    Ok(())
}

#[tauri::command]
fn delete_item_file(path: String) -> Result<(), String> {
    println!("[delete_item_file] deleting file: {path}");

    std::fs::remove_file(&path).map_err(|error| {
        let message = format!("Could not delete file: {error}");
        println!("[delete_item_file] {message}");
        message
    })?;

    println!("[delete_item_file] deleted successfully: {path}");
    Ok(())
}

#[tauri::command]
fn get_home_directory() -> Result<String, String> {
    let home_directory = home_directory()?;
    let home_path = home_directory.display().to_string();
    println!("[get_home_directory] resolved home directory: {home_path}");
    Ok(home_path)
}

#[tauri::command]
fn list_directory_children(path: String) -> Result<Vec<DirectoryEntry>, String> {
    println!("[list_directory_children] command received for path: {path}");
    directory::list_children(Path::new(&path))
}

#[tauri::command]
fn get_item_file_stats(path: String) -> Result<ItemFileStats, String> {
    println!("[get_item_file_stats] reading metadata for: {path}");

    let metadata = std::fs::metadata(&path).map_err(|error| {
        let message = format!("Could not read file metadata: {error}");
        println!("[get_item_file_stats] {message}");
        message
    })?;

    let created_at = metadata
        .created()
        .ok()
        .and_then(system_time_to_unix_seconds);
    let modified_at = metadata
        .modified()
        .ok()
        .and_then(system_time_to_unix_seconds)
        .ok_or_else(|| {
            let message = "Could not read file modified time".to_string();
            println!("[get_item_file_stats] {message} for {path}");
            message
        })?;

    println!(
        "[get_item_file_stats] created_at={created_at:?}, modified_at={modified_at} for {path}"
    );

    Ok(ItemFileStats {
        created_at,
        modified_at,
    })
}

fn system_time_to_unix_seconds(timestamp: SystemTime) -> Option<i64> {
    timestamp
        .duration_since(UNIX_EPOCH)
        .ok()
        .map(|duration| duration.as_secs() as i64)
}

fn home_directory() -> Result<PathBuf, String> {
    dirs::home_dir()
        .ok_or_else(|| {
            println!("[home_directory] could not resolve home directory");
            "Could not resolve home directory".to_string()
        })
        .map(|home_path| {
            println!(
                "[home_directory] resolved home directory: {}",
                home_path.display()
            );
            home_path
        })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .invoke_handler(tauri::generate_handler![
            scan_catalog,
            reveal_item_path,
            read_item_file,
            write_item_file,
            delete_item_file,
            get_item_file_stats,
            get_home_directory,
            list_directory_children
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
