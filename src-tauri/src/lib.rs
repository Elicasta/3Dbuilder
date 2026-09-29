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

fn find_executable(unix_name: &str, _windows_name: &str) -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        command_lookup("where", _windows_name)
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

fn compatible_engine_python() -> Option<PathBuf> {
    // TripoSR/PyMCubes is not ready for Python 3.14. Prefer a known-good
    // interpreter instead of blindly using the newest system Python.
    #[cfg(target_os = "windows")]
    let candidates = ["python3.12", "python3.11", "python3.10", "python"];

    #[cfg(not(target_os = "windows"))]
    let candidates = ["python3.12", "python3.11", "python3.10", "python3"];

    for candidate in candidates {
        if let Some(path) = find_executable(candidate, candidate) {
            let output = match Command::new(&path)
                .args(["-c", "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"])
                .output()
            {
                Ok(output) => output,
                Err(_) => continue,
            };
            if output.status.success() {
                let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if matches!(version.as_str(), "3.10" | "3.11" | "3.12") {
                    return Some(path);
                }
            }
        }
    }
    None
}

fn venv_is_compatible(python: &Path) -> bool {
    let output = match Command::new(python)
        .args(["-c", "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"])
        .output()
    {
        Ok(output) if output.status.success() => output,
        _ => return false,
    };

    matches!(
        String::from_utf8_lossy(&output.stdout).trim(),
        "3.10" | "3.11" | "3.12"
    )
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

    let system_python = compatible_engine_python().ok_or_else(|| {
        "TripoSR needs Python 3.10, 3.11, or 3.12. Python 3.14 is currently incompatible with its PyMCubes dependency. Install Python 3.12 and retry Prepare runtime.".to_string()
    })?;
    let python = venv_python(&root);
    let venv = root.join("venv");

    // Automatically discard an old environment made with an unsupported
    // interpreter. This fixes machines where 3D Builder first picked Python 3.14.
    if python.exists() && !venv_is_compatible(&python) {
        fs::remove_dir_all(&venv)
            .map_err(|error| format!("Could not replace incompatible Python environment: {error}"))?;
    }

    if !python.exists() {
        let mut command = Command::new(system_python);
        command.args(["-m", "venv"]).arg(&venv);
        run_checked(&mut command, "Create Python 3.10-3.12 environment")?;
    }

    let mut upgrade = Command::new(&python);
    // PyMCubes still imports pkg_resources while building. Newer setuptools
    // releases removed that compatibility path, so keep a compatible toolchain.
    upgrade.args(["-m", "pip", "install", "--upgrade", "pip", "wheel", "setuptools<81"]);
    run_checked(&mut upgrade, "Prepare compatible Python tooling")?;

    let mut torch = Command::new(&python);
    torch.args(["-m", "pip", "install", "torch", "torchvision"]);
    run_checked(&mut torch, "Install PyTorch")?;

    // Upstream pins xatlas==0.0.9. That release has no CPython 3.12
    // macOS ARM64 wheel, so pip falls back to a source build whose old CMake
    // policy currently fails on modern macOS. xatlas 0.0.11 publishes native
    // CPython 3.10-3.13 Apple Silicon wheels and is API-compatible with the
    // import/export calls TripoSR uses.
    //
    // The CLI inference path also does not need Gradio. Leaving an unpinned
    // Gradio in the engine requirements makes pip backtrack through years of
    // releases. Build a small local requirements overlay instead of modifying
    // the checked-out research engine.
    let upstream_requirements = source.join("requirements.txt");
    let requirements_text = fs::read_to_string(&upstream_requirements)
        .map_err(|error| format!("Could not read TripoSR requirements: {error}"))?;
    let mut runtime_requirements = Vec::new();
    for raw_line in requirements_text.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        if line == "gradio" || line.starts_with("gradio==") {
            continue;
        }
        if line == "xatlas==0.0.9" || line == "xatlas" {
            runtime_requirements.push("xatlas==0.0.11".to_string());
        } else {
            runtime_requirements.push(line.to_string());
        }
    }
    if !runtime_requirements.iter().any(|line| line.starts_with("xatlas")) {
        runtime_requirements.push("xatlas==0.0.11".to_string());
    }

    // rembg intentionally keeps ONNX Runtime as an install extra in newer
    // releases. TripoSR imports rembg during CLI startup, so the managed
    // runtime must include the CPU ONNX backend explicitly.
    if !runtime_requirements.iter().any(|line| line.starts_with("onnxruntime")) {
        runtime_requirements.push("onnxruntime".to_string());
    }

    // Keep Python 3.12 on a wheel-backed numerical stack. NumPy 1.23 has no
    // CPython 3.12 wheel. Use NumPy 1.26 + a matching SciPy and upgrade
    // trimesh instead of downgrading NumPy to satisfy trimesh 4.0.5.
    runtime_requirements.retain(|line| {
        let lower = line.to_ascii_lowercase();
        !lower.starts_with("numpy")
            && !lower.starts_with("scipy")
            && !lower.starts_with("trimesh")
    });
    runtime_requirements.push("numpy==1.26.4".to_string());
    runtime_requirements.push("scipy==1.12.0".to_string());
    runtime_requirements.push("trimesh>=4.4,<5".to_string());

    let runtime_requirements_path = root.join("triposr-runtime-requirements.txt");
    fs::write(
        &runtime_requirements_path,
        format!("{}\n", runtime_requirements.join("\n")),
    )
    .map_err(|error| format!("Could not write TripoSR runtime requirements: {error}"))?;

    let mut dependencies = Command::new(&python);
    dependencies
        .args(["-m", "pip", "install", "--prefer-binary", "-r"])
        .arg(&runtime_requirements_path);
    run_checked(&mut dependencies, "Install TripoSR dependencies")?;

    // Fail preparation here, not later during the first build.
    let mut verify = Command::new(&python);
    verify.args([
        "-c",
        "import torch, xatlas, trimesh, rembg, PIL, omegaconf, transformers; print('TripoSR runtime verified')",
    ]);
    run_checked(&mut verify, "Verify TripoSR runtime")?;

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

    // Self-heal older prepared runtimes before reconstruction. These versions
    // all publish CPython 3.12 macOS wheels and avoid the NumPy-2/trimesh-4.0
    // exporter collision.
    let numerical_stack_compatible = Command::new(&python)
        .args([
            "-c",
            "import numpy, scipy, trimesh, sys; from packaging.version import Version; sys.exit(0 if numpy.__version__ == '1.26.4' and scipy.__version__ == '1.12.0' and Version(trimesh.__version__) >= Version('4.4.0') else 1)",
        ])
        .status()
        .map(|status| status.success())
        .unwrap_or(false);

    if !numerical_stack_compatible {
        let mut repair_stack = Command::new(&python);
        repair_stack.args([
            "-m",
            "pip",
            "install",
            "--upgrade",
            "--prefer-binary",
            "numpy==1.26.4",
            "scipy==1.12.0",
            "trimesh>=4.4,<5",
        ]);
        run_checked(&mut repair_stack, "Repair TripoSR numerical compatibility")?;
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
fn latest_generated_mesh(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let jobs = app
        .path()
        .app_local_data_dir()
        .map_err(|error| format!("Could not resolve local app data: {error}"))?
        .join("jobs");

    if !jobs.exists() {
        return Ok(None);
    }

    let mut candidates: Vec<(SystemTime, PathBuf)> = Vec::new();
    for entry in fs::read_dir(&jobs).map_err(|error| format!("Could not scan jobs: {error}"))? {
        let entry = entry.map_err(|error| format!("Could not read job entry: {error}"))?;
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.starts_with("triposr-") || !entry.path().is_dir() {
            continue;
        }
        let mesh = entry.path().join("0").join("mesh.glb");
        if mesh.exists() {
            let modified = fs::metadata(&mesh)
                .and_then(|metadata| metadata.modified())
                .unwrap_or(UNIX_EPOCH);
            candidates.push((modified, mesh));
        }
    }

    candidates.sort_by_key(|(modified, _)| *modified);
    Ok(candidates
        .pop()
        .map(|(_, path)| path.to_string_lossy().to_string()))
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

    // Blender treats a positional path as a .blend project. GLB/GLTF/OBJ
    // meshes must be imported into a Blender scene instead.
    let extension = mesh
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    // Pass the path to Python through an environment variable instead of
    // interpolating it into Python source. This avoids Rust/Python quoting
    // collisions and handles spaces/apostrophes in paths safely.
    let importer = match extension.as_str() {
        "glb" | "gltf" => "import bpy, os; bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False); bpy.ops.import_scene.gltf(filepath=os.environ['THREEDBUILDER_MESH'])",
        "obj" => "import bpy, os; bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False); bpy.ops.wm.obj_import(filepath=os.environ['THREEDBUILDER_MESH'])",
        _ => return Err(format!("Blender import is not wired for .{extension} files.")),
    };

    Command::new(blender)
        .env("THREEDBUILDER_MESH", &mesh)
        .args(["--python-expr", importer])
        .spawn()
        .map_err(|error| format!("Could not launch Blender and import mesh: {error}"))?;

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
fn open_character_in_blender(
    app: tauri::AppHandle,
    name: String,
    obj_text: String,
    recipe: String,
) -> Result<(), String> {
    let blender = blender_path().ok_or_else(|| "Blender was not found.".to_string())?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("System clock error: {error}"))?
        .as_millis();
    let dir = app.path().app_local_data_dir()
        .map_err(|error| format!("Could not resolve local app data: {error}"))?
        .join("jobs").join(format!("canonical-{stamp}"));
    fs::create_dir_all(&dir).map_err(|error| format!("Could not create canonical export: {error}"))?;
    let obj = dir.join(format!("{}.obj", safe_filename(&name)));
    let json = dir.join("character.json");
    fs::write(&obj, obj_text).map_err(|error| format!("Could not write canonical OBJ: {error}"))?;
    fs::write(&json, recipe).map_err(|error| format!("Could not write character recipe: {error}"))?;

    let script = r#"import bpy, json, os
obj_path=os.environ['THREEDBUILDER_CANONICAL_OBJ']
recipe_path=os.environ['THREEDBUILDER_CHARACTER_JSON']
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.wm.obj_import(filepath=obj_path)
body=bpy.context.selected_objects[0]
body.name='CanonicalBody'
with open(recipe_path,'r',encoding='utf-8') as f:
    data=json.load(f)
joints=data['rig']['joints']
def cv(p):
    return (float(p[0]), -float(p[2]), float(p[1]))
bpy.ops.object.armature_add(enter_editmode=True, location=(0,0,0))
arm=bpy.context.object
arm.name='3DBuilder_Rig'
edit=arm.data.edit_bones
for b in list(edit):
    edit.remove(b)
children={}
for j in joints:
    if j.get('parent'):
        children.setdefault(j['parent'],[]).append(j)
bones={}
for j in joints:
    b=edit.new(j['name'])
    b.head=cv(j['position'])
    kids=children.get(j['name'],[])
    if kids:
        b.tail=cv(kids[0]['position'])
    else:
        x,y,z=b.head
        b.tail=(x,y,z+0.08)
    if sum((b.tail[i]-b.head[i])**2 for i in range(3)) < 1e-6:
        x,y,z=b.head
        b.tail=(x,y,z+0.08)
    bones[j['name']]=b
for j in joints:
    parent=j.get('parent')
    if parent and parent in bones:
        bones[j['name']].parent=bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
body.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active=arm
try:
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
except Exception as exc:
    print('3D Builder automatic weights warning:', exc)
arm['3dbuilder_schema']=data.get('schema','3dbuilder.character.v2')
arm['3dbuilder_character']=data.get('character',{}).get('name','Character')
bpy.context.view_layer.objects.active=body
body.select_set(True)
"#;

    let script_path = dir.join("import_character.py");
    fs::write(&script_path, script)
        .map_err(|error| format!("Could not write Blender import script: {error}"))?;
    Command::new(blender)
        .env("THREEDBUILDER_CANONICAL_OBJ", &obj)
        .env("THREEDBUILDER_CHARACTER_JSON", &json)
        .args(["--python", script_path.to_string_lossy().as_ref()])
        .spawn()
        .map_err(|error| format!("Could not launch Blender character export: {error}"))?;
    Ok(())
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
            latest_generated_mesh,
            open_in_blender,
            open_character_in_blender,
            save_recipe
        ])
        .run(tauri::generate_context!())
        .expect("error while running 3D Builder");
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn safe_filename_normalizes_character_names() {
        assert_eq!(safe_filename("Field Soldier 01"), "field-soldier-01");
        assert_eq!(safe_filename("  "), "character");
        assert_eq!(safe_filename("Alpha_Bravo"), "alpha_bravo");
    }

    #[test]
    fn engine_catalog_rejects_unknown_ids() {
        assert!(engine_spec("triposr").is_some());
        assert!(engine_spec("charactergen").is_some());
        assert!(engine_spec("definitely-not-an-engine").is_none());
    }
}
