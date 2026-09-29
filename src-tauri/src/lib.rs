use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
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
    prepared: bool,
    source_path: Option<String>,
}

struct EngineSpec {
    id: &'static str,
    repository: &'static str,
}

const ENGINES: &[EngineSpec] = &[
    EngineSpec { id: "mpfb", repository: "https://github.com/makehumancommunity/mpfb2.git" },
    EngineSpec { id: "triposr", repository: "https://github.com/VAST-AI-Research/TripoSR.git" },
    EngineSpec { id: "charactergen", repository: "https://github.com/zjp-shadow/CharacterGen.git" },
    EngineSpec { id: "econ", repository: "https://github.com/YuliangXiu/ECON.git" },
    EngineSpec { id: "icon", repository: "https://github.com/YuliangXiu/ICON.git" },
    EngineSpec { id: "instantmesh", repository: "https://github.com/TencentARC/InstantMesh.git" },
    EngineSpec { id: "trellis2", repository: "https://github.com/microsoft/TRELLIS.2.git" },
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
        find_executable("python", "python.exe").or_else(|| find_executable("python", "py.exe"))
    }

    #[cfg(not(target_os = "windows"))]
    {
        find_executable("python3", "python3").or_else(|| find_executable("python", "python"))
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

fn engine_repository(spec: &EngineSpec) -> &'static str {
    #[cfg(target_os = "macos")]
    {
        if spec.id == "triposr" {
            return "https://github.com/StarxSky/TRIPOSR.git";
        }
    }

    spec.repository
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

fn engine_root(app: &tauri::AppHandle, id: &str) -> Result<PathBuf, String> {
    engine_spec(id).ok_or_else(|| format!("Unknown engine: {id}"))?;
    Ok(engines_root(app)?.join(id))
}

fn venv_python(root: &Path) -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        root.join("venv").join("Scripts").join("python.exe")
    }

    #[cfg(not(target_os = "windows"))]
    {
        root.join("venv").join("bin").join("python")
    }
}

fn run_checked(command: &mut Command, label: &str) -> Result<String, String> {
    let output = command
        .output()
        .map_err(|error| format!("{label} could not start: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!(
            "{label} failed.\n{}\n{}",
            stdout.trim(),
            stderr.trim()
        ));
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
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
            let engine_root = root.join(engine.id);
            let source = engine_root.join("source");
            let installed = source.join(".git").exists();
            let prepared = engine_root.join("venv").join(".3dbuilder-ready").exists();

            EngineStatus {
                id: engine.id.to_string(),
                installed,
                prepared,
                source_path: installed.then(|| source.to_string_lossy().to_string()),
            }
        })
        .collect())
}

#[tauri::command]
fn install_engine_source(app: tauri::AppHandle, id: String) -> Result<String, String> {
    let spec = engine_spec(&id).ok_or_else(|| format!("Unknown engine: {id}"))?;
    let git = git_path().ok_or_else(|| "Git was not found on this system.".to_string())?;
    let root = engine_root(&app, spec.id)?;
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

    let mut command = Command::new(git);
    command
        .args(["clone", "--depth", "1", engine_repository(spec)])
        .arg(&source);

    run_checked(&mut command, "Git clone")?;
    Ok(source.to_string_lossy().to_string())
}

#[tauri::command]
fn prepare_engine_runtime(app: tauri::AppHandle, id: String) -> Result<String, String> {
    if id != "triposr" {
        return Err(format!(
            "{id} runtime preparation is not wired yet. Source installation is available."
        ));
    }

    let root = engine_root(&app, &id)?;
    let source = root.join("source");
    if !source.join(".git").exists() {
        return Err("Install the TripoSR source first.".to_string());
    }

    let system_python = python_path().ok_or_else(|| "Python 3 was not found.".to_string())?;
    let python = venv_python(&root);

    if !python.exists() {
        let mut command = Command::new(system_python);
        command.args(["-m", "venv"]).arg(root.join("venv"));
        run_checked(&mut command, "Create Python environment")?;
    }

    let mut upgrade = Command::new(&python);
    upgrade.args(["-m", "pip", "install", "--upgrade", "pip", "setuptools", "wheel"]);
    run_checked(&mut upgrade, "Upgrade Python tooling")?;

    let mut torch = Command::new(&python);
    torch.args(["-m", "pip", "install", "torch", "torchvision"]);
    run_checked(&mut torch, "Install PyTorch")?;

    let requirements = source.join("requirements.txt");
    let mut dependencies = Command::new(&python);
    dependencies
        .args(["-m", "pip", "install", "-r"])
        .arg(&requirements);
    run_checked(&mut dependencies, "Install TripoSR dependencies")?;

    fs::write(root.join("venv").join(".3dbuilder-ready"), b"ready")
        .map_err(|error| format!("Could not write runtime marker: {error}"))?;

    Ok(python.to_string_lossy().to_string())
}

#[tauri::command]
fn stage_reference(app: tauri::AppHandle, name: String, bytes: Vec<u8>) -> Result<String, String> {
    if bytes.is_empty() {
        return Err("Reference image is empty.".to_string());
    }

    let extension = Path::new(&name)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("png")
        .to_ascii_lowercase();

    if !matches!(extension.as_str(), "png" | "jpg" | "jpeg" | "webp") {
        return Err(format!("Unsupported image type: {extension}"));
    }

    let root = app
        .path()
        .app_local_data_dir()
        .map_err(|error| format!("Could not resolve local app data: {error}"))?
        .join("jobs")
        .join("staged");

    fs::create_dir_all(&root)
        .map_err(|error| format!("Could not create staging directory: {error}"))?;

    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("System clock error: {error}"))?
        .as_millis();

    let path = root.join(format!("reference-{stamp}.{extension}"));
    fs::write(&path, bytes)
        .map_err(|error| format!("Could not stage reference: {error}"))?;

    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn run_reconstruction(
    app: tauri::AppHandle,
    id: String,
    input_path: String,
) -> Result<String, String> {
    if id != "triposr" {
        return Err(format!("{id} inference adapter is not wired yet."));
    }

    let root = engine_root(&app, &id)?;
    let source = root.join("source");
    let python = venv_python(&root);
    let ready = root.join("venv").join(".3dbuilder-ready");

    if !source.join(".git").exists() {
        return Err("TripoSR source is not installed.".to_string());
    }

    if !python.exists() || !ready.exists() {
        return Err("TripoSR runtime is not prepared.".to_string());
    }

    let input = PathBuf::from(input_path);
    if !input.exists() {
        return Err("Staged reference image no longer exists.".to_string());
    }

    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("System clock error: {error}"))?
        .as_millis();

    let output_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|error| format!("Could not resolve local app data: {error}"))?
        .join("jobs")
        .join(format!("triposr-{stamp}"));

    fs::create_dir_all(&output_dir)
        .map_err(|error| format!("Could not create output directory: {error}"))?;

    let mut command = Command::new(&python);
    command
        .current_dir(&source)
        .arg(source.join("run.py"))
        .arg(&input)
        .arg("--output-dir")
        .arg(&output_dir)
        .args([
            "--pretrained-model-name-or-path",
            "stabilityai/TripoSR",
            "--model-save-format",
            "glb",
        ]);

    #[cfg(target_os = "macos")]
    command.args(["--device", "mps"]);

    #[cfg(target_os = "windows")]
    {
        if nvidia_smi_path().is_some() {
            command.args(["--device", "cuda:0"]);
        } else {
            command.args(["--device", "cpu"]);
        }
    }

    run_checked(&mut command, "TripoSR reconstruction")?;

    let mesh = output_dir.join("0").join("mesh.glb");
    if !mesh.exists() {
        return Err(format!(
            "TripoSR finished but no mesh was found at {}",
            mesh.to_string_lossy()
        ));
    }

    Ok(mesh.to_string_lossy().to_string())
}

#[tauri::command]
fn open_in_blender(app: tauri::AppHandle, mesh_path: String) -> Result<(), String> {
    let blender = blender_path().ok_or_else(|| "Blender was not found.".to_string())?;
    let app_data = app
        .path()
        .app_local_data_dir()
        .map_err(|error| format!("Could not resolve local app data: {error}"))?;

    let mesh = PathBuf::from(mesh_path)
        .canonicalize()
        .map_err(|error| format!("Could not resolve mesh path: {error}"))?;
    let app_data = app_data
        .canonicalize()
        .map_err(|error| format!("Could not resolve app-data path: {error}"))?;

    if !mesh.starts_with(&app_data) {
        return Err("Refusing to open a mesh outside 3D Builder app data.".to_string());
    }

    Command::new(blender)
        .arg(mesh)
        .spawn()
        .map_err(|error| format!("Could not launch Blender: {error}"))?;

    Ok(())
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
            prepare_engine_runtime,
            stage_reference,
            run_reconstruction,
            open_in_blender,
            save_recipe
        ])
        .run(tauri::generate_context!())
        .expect("error while running 3D Builder");
}
