use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BlenderStatus {
    found: bool,
    path: Option<String>,
    platform: String,
}

fn existing_path(candidates: &[PathBuf]) -> Option<PathBuf> {
    candidates.iter().find(|path| path.exists()).cloned()
}

fn command_lookup(command: &str, executable: &str) -> Option<PathBuf> {
    let output = Command::new(command).arg(executable).output().ok()?;
    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let first = stdout.lines().find(|line| !line.trim().is_empty())?;
    let path = PathBuf::from(first.trim());

    if path.exists() { Some(path) } else { None }
}

fn blender_path() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        let candidates = [
            PathBuf::from("/Applications/Blender.app/Contents/MacOS/Blender"),
            PathBuf::from("/Applications/Blender 4.0.app/Contents/MacOS/Blender"),
        ];
        existing_path(&candidates).or_else(|| command_lookup("which", "blender"))
    }

    #[cfg(target_os = "windows")]
    {
        let mut candidates = Vec::new();
        if let Ok(program_files) = std::env::var("ProgramFiles") {
            let blender_root = Path::new(&program_files).join("Blender Foundation");
            if let Ok(entries) = fs::read_dir(blender_root) {
                for entry in entries.flatten() {
                    candidates.push(entry.path().join("blender.exe"));
                }
            }
        }
        existing_path(&candidates).or_else(|| command_lookup("where", "blender.exe"))
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        command_lookup("which", "blender")
    }
}

#[tauri::command]
fn detect_blender() -> BlenderStatus {
    let path = blender_path();
    BlenderStatus {
        found: path.is_some(),
        path: path.map(|value| value.to_string_lossy().to_string()),
        platform: std::env::consts::OS.to_string(),
    }
}

fn safe_filename(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || matches!(character, '-' | '_') {
                character
            } else {
                '-'
            }
        })
        .collect();

    let trimmed = cleaned.trim_matches('-');
    if trimmed.is_empty() { "character".to_string() } else { trimmed.to_lowercase() }
}

#[tauri::command]
fn save_recipe(app: tauri::AppHandle, name: String, recipe: String) -> Result<String, String> {
    let documents = app
        .path()
        .document_dir()
        .map_err(|error| format!("Could not find Documents folder: {error}"))?;

    let output_dir = documents.join("3D Builder");
    fs::create_dir_all(&output_dir)
        .map_err(|error| format!("Could not create output folder: {error}"))?;

    let output_path = output_dir.join(format!("{}.3dbuilder.json", safe_filename(&name)));
    fs::write(&output_path, recipe)
        .map_err(|error| format!("Could not save character recipe: {error}"))?;

    Ok(output_path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![detect_blender, save_recipe])
        .run(tauri::generate_context!())
        .expect("error while running 3D Builder");
}
