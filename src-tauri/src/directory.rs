use std::fs;
use std::path::Path;

use crate::types::{DirectoryEntry, DirectoryEntryKind};

const SKIP_DIRECTORY_NAMES: &[&str] = &[
    "node_modules",
    "target",
    "dist",
    ".git",
    "build",
    ".next",
    "vendor",
];

pub fn list_children(directory_path: &Path) -> Result<Vec<DirectoryEntry>, String> {
    let path_label = directory_path.display();
    println!("[list_directory_children] listing children for: {path_label}");

    if !directory_path.exists() {
        let message = format!("Directory does not exist: {path_label}");
        println!("[list_directory_children] {message}");
        return Err(message);
    }

    if !directory_path.is_dir() {
        let message = format!("Path is not a directory: {path_label}");
        println!("[list_directory_children] {message}");
        return Err(message);
    }

    let entries = fs::read_dir(directory_path).map_err(|error| {
        let message = format!("Could not read directory {path_label}: {error}");
        println!("[list_directory_children] {message}");
        message
    })?;

    let mut children = Vec::new();

    for entry in entries.flatten() {
        let entry_path = entry.path();
        let entry_name = entry
            .file_name()
            .to_string_lossy()
            .to_string();

        if entry_path.is_dir() && should_skip_directory(&entry_name) {
            println!(
                "[list_directory_children] skipping heavy directory: {}/{}",
                path_label,
                entry_name
            );
            continue;
        }

        let kind = if entry_path.is_dir() {
            DirectoryEntryKind::Folder
        } else if entry_path.is_file() {
            DirectoryEntryKind::File
        } else {
            continue;
        };

        children.push(DirectoryEntry {
            name: entry_name,
            path: entry_path.display().to_string(),
            kind,
        });
    }

    children.sort_by(|left, right| {
        let left_is_folder = left.kind == DirectoryEntryKind::Folder;
        let right_is_folder = right.kind == DirectoryEntryKind::Folder;

        right_is_folder
            .cmp(&left_is_folder)
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
    });

    println!(
        "[list_directory_children] returning {} children for {path_label}",
        children.len()
    );

    Ok(children)
}

fn should_skip_directory(directory_name: &str) -> bool {
    SKIP_DIRECTORY_NAMES.contains(&directory_name)
}
