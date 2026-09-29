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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemCapabilities {
    platform: String,
    arch: String,
    blender_path: Option<String>,
    python_path: Option<String>,
    git_path: Option<String>,
    nvidia_smi_path: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EngineStatus {
    id: String,
    installed: bool,
    source_path: Option<String>,
}

struct EngineSpec {
    id: &'static str,
    repository: &'static str,
}

const ENGINES: &[EngineSpec] = &[
    EngineSpec {
        id: "mpfb",
        repository: "https://github.com/makehumancommunity/mpfb2.git",
    },
    EngineSpec {
        id: "triposr",
        repository: "https://github.com/VAST-AI-Research/TripoSR.git",
    },
    EngineSpec {
        id: "charactergen",
        repository: "https://github.com/zjp-shadow/CharacterGen.git",
    },
    EngineSpec {
        id: "econ",
        repository: "https://github.com/YuliangXiu/ECON.git",
    },
    EngineSpec {
        id: "icon",
        repository: "https://github.com/YuliangXiu/ICON.git",
    },
    EngineSpec {
        id: "instantmesh",
        repository: "https://github.com/TencentARC/InstantMesh.git",
    },
    EngineSpec {
        id: "trellis2",
        repository: "https://github.com/microsoft/TRELLIS.2.git",
    },
];

fn existing_path(candidates: &[PathBuf]) -> Option<PathBuf> {
    candidates.iter().find(|path| path.exists()).cloned()
}

fn command_lookup(command: &str, executable: &str) -> Option<PathBuf> {
    let output = Command::new(command).arg(executable).output().ok()?;
    if !output.status.success() {
        return None;
    }

    String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(PathBuf::from)
        .find(|path| path.exists())
}

fn find_executable(unix_name: &str, windows_name: &str) -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        command_lookup("where", windows_name)
    }

    #[cfg(not(target_os = "windows"))]
    {
        command_lookup("which", unix_name)
    }
}

fn blender_path() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        let candidates = [
            PathBuf::from("/Applications/Blender.app/Contents/MacOS/Blender"),
            PathBuf::from("/Applications/Blender 4.0.app/Contents/MacOS/Blender"),
        ];
        existing_path(&candidates).or_else(|| find_executable("blender", "blender.exe"))
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
        existing_path(&candidates).or_else(|| find_executable("blender", "blender.exe"))
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        find_executable("blender", "blender")
    }
}

fn python_path() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        find_executable("python3", "python.exe")
            .or_else(|| find_executable("python", "py.exe"))
    }

    #[cfg(not(target_os = "windows"))]
    {
        find_executable("python3", "python3")
            .or_else(|| find_executable("python", "python"))
    }
}

fn git_path() -> Option<PathBuf> {
    find_executable("git", "git.exe")
}

fn nvidia_smi_path() -> Option<PathBuf> {
    find_executable("nvidia-smi", "nvidia-smi.exe")
}

fn engine_spec(id: &str) -> Option<&'static EngineSpec> {
    ENGINES.iter().find(|engine| engine.id == id)
}

fn engines_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let root = app
        .path()
        .app_local_data_dir()
        .map_err(|error| format!("Could not resolve local app data: {error}"))?
        .join("engines");

    fs::create_dir_all(&root)
        .map_err(|error| format!("Could not create engine directory: {error}"))?;

    Ok(root)
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

#[tauri::command]
fn system_capabilities() -> SystemCapabilities {
    SystemCapabilities {
        platform: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        blender_path: blender_path().map(|path| path.to_string_lossy().to_string()),
        python_path: python_path().map(|path| path.to_string_lossy().to_string()),
        git_path: git_path().map(|path| path.to_string_lossy().to_string()),
        nvidia_smi_path: nvidia_smi_path().map(|path| path.to_string_lossy().to_string()),
    }
}

#[tauri::command]
fn engine_statuses(app: tauri::AppHandle) -> Result<Vec<EngineStatus>, String> {
    let root = engines_root(&app)?;

    Ok(ENGINES
        .iter()
        .map(|engine| {
            let source = root.join(engine.id).join("source");
            let installed = source.join(".git").exists();

            EngineStatus {
                id: engine.id.to_string(),
                installed,
                source_path: installed.then(|| source.to_string_lossy().to_string()),
            }
        })
        .collect())
}

#[tauri::command]
fn install_engine_source(app: tauri::AppHandle, id: String) -> Result<String, String> {
    let spec = engine_spec(&id).ok_or_else(|| format!("Unknown engine: {id}"))?;
    let git = git_path().ok_or_else(|| "Git was not found on this system.".to_string())?;
    let root = engines_root(&app)?.join(spec.id);
    let source = root.join("source");

    if source.join(".git").exists() {
        return Ok(source.to_string_lossy().to_string());
    }

    if source.exists() {
        return Err(format!(
            "Engine source directory exists but is incomplete: {}",
            source.to_string_lossy()
        ));
    }

    fs::create_dir_all(&root)
        .map_err(|error| format!("Could not create engine folder: {error}"))?;

    let output = Command::new(git)
        .args(["clone", "--depth", "1", spec.repository])
        .arg(&source)
        .output()
        .map_err(|error| format!("Could not launch git: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git clone failed: {}", stderr.trim()));
    }

    Ok(source.to_string_lossy().to_string())
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
    if trimmed.is_empty() {
        "character".to_string()
    } else {
        trimmed.to_lowercase()
    }
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
        .invoke_handler(tauri::generate_handler![
            detect_blender,
            system_capabilities,
            engine_statuses,
            install_engine_source,
            save_recipe
        ])
        .run(tauri::generate_context!())
        .expect("error while running 3D Builder");
}
