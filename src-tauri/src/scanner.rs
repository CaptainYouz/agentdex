use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

use walkdir::WalkDir;

use crate::parser::{parse_context_metadata, parse_frontmatter};
use crate::types::{
    CatalogGroup, CatalogItem, CatalogResponse, CatalogSummary, ItemKind, ItemPlatform, ItemScope,
};

const CONTEXT_FILE_NAMES: [&str; 2] = ["CLAUDE.md", "claude.md"];

/// Scan a base directory for skills, agents, rules, and context.
///
/// Classification is purely structural:
/// - A `.cursor` / `.claude` / `.codex` / `.agents` directory **at the root of
///   the base** holds **global** items.
/// - The same config directory found in **any other folder** makes that folder
///   a **project**, named after the folder that contains the config directory.
/// - `CLAUDE.md` / `claude.md` at the base root is global context; in any other
///   folder it is that folder's project context.
///
/// Items are only collected from inside the config directories (plus context
/// files). Noise directories (node_modules, Library, caches, …) are skipped.
pub fn build_catalog(base_directory: &Path) -> CatalogResponse {
    let mut items = Vec::new();
    let mut collected_context_paths: HashSet<String> = HashSet::new();

    if base_directory.exists() {
        let mut iterator = WalkDir::new(base_directory).follow_links(false).into_iter();

        while let Some(result) = iterator.next() {
            let Ok(entry) = result else {
                continue;
            };
            let path = entry.path();

            if entry.file_type().is_dir() {
                let directory_name = path.file_name().and_then(|value| value.to_str()).unwrap_or("");

                if is_noise_directory(path, directory_name) {
                    iterator.skip_current_dir();
                    continue;
                }

                if platform_for_config_directory(directory_name).is_some() {
                    collect_from_config_directory(base_directory, path, &mut items);
                    // Items inside config dirs are handled here; don't descend again.
                    iterator.skip_current_dir();
                }

                continue;
            }

            if entry.file_type().is_file() {
                collect_context_file(base_directory, path, &mut collected_context_paths, &mut items);
            }
        }
    }

    items.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));

    let mut groups = build_groups(items);
    sort_groups(&mut groups);
    let summary = build_summary(&groups);
    let scanned_at = chrono_lite_now();

    CatalogResponse {
        summary,
        groups,
        scanned_at,
    }
}

fn platform_for_config_directory(directory_name: &str) -> Option<ItemPlatform> {
    match directory_name {
        ".cursor" => Some(ItemPlatform::Cursor),
        ".claude" => Some(ItemPlatform::Claude),
        ".codex" => Some(ItemPlatform::Codex),
        ".agents" => Some(ItemPlatform::Shared),
        _ => None,
    }
}

/// Directories we never descend into: dependency trees, build output, and
/// language/tool caches. Skipping them keeps the scan fast and prevents config
/// dirs vendored inside dependencies (e.g. a `.claude` shipped in a node_modules
/// package or the Go module cache) from showing up as projects.
fn is_noise_directory(path: &Path, directory_name: &str) -> bool {
    // Go module cache lives at `~/go/pkg` — skip `pkg` only under a `go` parent
    // so real source folders named `pkg` are still scanned.
    if directory_name == "pkg" {
        let parent_is_go = path
            .parent()
            .and_then(|parent| parent.file_name())
            .and_then(|value| value.to_str())
            == Some("go");
        if parent_is_go {
            return true;
        }
    }

    matches!(
        directory_name,
        // JS / TS / web build + dep caches
        "node_modules"
            | "bower_components"
            | ".pnpm-store"
            | ".yarn"
            | ".turbo"
            | ".parcel-cache"
            | ".nuxt"
            | ".output"
            | ".svelte-kit"
            | ".angular"
            | ".docusaurus"
            | ".vite"
            | ".astro"
            | "jspm_packages"
            | "web_modules"
            | ".npm"
            | ".sass-cache"
            | ".nyc_output"
            // Rust
            | "target"
            | ".cargo"
            | ".rustup"
            // Python
            | ".venv"
            | "venv"
            | "site-packages"
            | "__pycache__"
            | ".tox"
            | ".mypy_cache"
            | ".pytest_cache"
            | ".ruff_cache"
            | ".eggs"
            | "__pypackages__"
            | ".nox"
            | ".ipynb_checkpoints"
            | ".hatch"
            | ".pdm-build"
            // Ruby / Flutter / Elixir / Haskell
            | ".bundle"
            | ".dart_tool"
            | "_build"
            | "deps"
            | ".stack-work"
            | "dist-newstyle"
            // JVM / Apple
            | ".gradle"
            | ".m2"
            | "Pods"
            | ".swiftpm"
            | "DerivedData"
            | "Carthage"
            // IaC
            | ".terraform"
            | ".terragrunt-cache"
            | ".serverless"
            // Editors / VCS / OS
            | ".vscode"
            | ".idea"
            | ".vs"
            | ".fleet"
            | ".history"
            | ".svn"
            | ".hg"
            | "$RECYCLE.BIN"
            | "System Volume Information"
            | "Library"
            | ".Trash"
            // Generic build / caches
            | "dist"
            | ".git"
            | "build"
            | ".next"
            | "vendor"
            | "coverage"
            | "cache"
            | ".cache"
            | "Caches"
    )
}

/// Global when the config directory sits directly in the base; otherwise a
/// project named after the folder that contains it.
fn scope_for(base_directory: &Path, container: &Path) -> (ItemScope, Option<String>) {
    if container == base_directory {
        return (ItemScope::Global, None);
    }

    let project_name = container
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("unknown")
        .to_string();

    (ItemScope::Project, Some(project_name))
}

fn collect_from_config_directory(
    base_directory: &Path,
    config_directory: &Path,
    items: &mut Vec<CatalogItem>,
) {
    let Some(directory_name) = config_directory.file_name().and_then(|value| value.to_str()) else {
        return;
    };
    let Some(platform) = platform_for_config_directory(directory_name) else {
        return;
    };
    let Some(container) = config_directory.parent() else {
        return;
    };

    let (scope, project_name) = scope_for(base_directory, container);
    let skills_category = scoped_category("Skills", &scope);
    let agents_category = scoped_category("Agents", &scope);
    let rules_category = scoped_category("Rules", &scope);

    // Skills (and the Cursor built-in skills directory).
    collect_skill_directory(
        &config_directory.join("skills"),
        &skills_category,
        platform.clone(),
        scope.clone(),
        project_name.clone(),
        items,
    );
    if platform == ItemPlatform::Cursor {
        collect_skill_directory(
            &config_directory.join("skills-cursor"),
            &skills_category,
            platform.clone(),
            scope.clone(),
            project_name.clone(),
            items,
        );
    }

    // Plugin skills under plugins/cache/**.
    collect_plugin_skills(
        &config_directory.join("plugins").join("cache"),
        platform.clone(),
        scope.clone(),
        project_name.clone(),
        items,
    );

    // Agents (*.md) and rules (*.mdc).
    collect_agents_directory(
        &config_directory.join("agents"),
        &agents_category,
        platform.clone(),
        scope.clone(),
        project_name.clone(),
        items,
    );
    collect_rules_directory(
        &config_directory.join("rules"),
        &rules_category,
        platform,
        scope,
        project_name,
        items,
    );
}

fn scoped_category(kind_label: &str, scope: &ItemScope) -> String {
    match scope {
        ItemScope::Global => format!("Global {kind_label}"),
        ItemScope::Project => format!("Project {kind_label}"),
    }
}

fn collect_context_file(
    base_directory: &Path,
    path: &Path,
    collected_context_paths: &mut HashSet<String>,
    items: &mut Vec<CatalogItem>,
) {
    let file_name = path.file_name().and_then(|value| value.to_str()).unwrap_or("");
    if !CONTEXT_FILE_NAMES.iter().any(|name| *name == file_name) {
        return;
    }

    let Some(container) = path.parent() else {
        return;
    };

    let (scope, project_name) = scope_for(base_directory, container);
    let category = match scope {
        ItemScope::Global => "Global Context",
        ItemScope::Project => "Project Context",
    };

    push_context_item(
        path,
        category,
        ItemPlatform::Claude,
        scope,
        project_name,
        collected_context_paths,
        items,
    );
}

fn collect_skill_directory(
    root: &Path,
    category: &str,
    platform: ItemPlatform,
    scope: ItemScope,
    project_name: Option<String>,
    items: &mut Vec<CatalogItem>,
) {
    if !root.exists() {
        return;
    }

    for entry in WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_map(Result::ok)
    {
        if entry.file_name() != "SKILL.md" {
            continue;
        }
        push_skill_item(
            entry.path(),
            category,
            platform.clone(),
            scope.clone(),
            project_name.clone(),
            items,
        );
    }
}

fn collect_plugin_skills(
    cache_root: &Path,
    platform: ItemPlatform,
    scope: ItemScope,
    project_name: Option<String>,
    items: &mut Vec<CatalogItem>,
) {
    if !cache_root.exists() {
        return;
    }

    for entry in WalkDir::new(cache_root)
        .follow_links(false)
        .into_iter()
        .filter_map(Result::ok)
    {
        if entry.file_name() != "SKILL.md" {
            continue;
        }

        let plugin_name = plugin_name_from_cache(cache_root, entry.path());
        let category = format!("Plugin · {plugin_name}");
        push_skill_item(
            entry.path(),
            &category,
            platform.clone(),
            scope.clone(),
            project_name.clone(),
            items,
        );
    }
}

/// Plugin layout: `<cache>/<hash>/<plugin>/skills/SKILL.md` → the plugin name is
/// the second path segment relative to the cache root.
fn plugin_name_from_cache(cache_root: &Path, skill_path: &Path) -> String {
    let Ok(relative) = skill_path.strip_prefix(cache_root) else {
        return "unknown".to_string();
    };

    let segments: Vec<String> = relative
        .components()
        .filter_map(|component| match component {
            std::path::Component::Normal(value) => value.to_str().map(str::to_string),
            _ => None,
        })
        .collect();

    segments
        .get(1)
        .or_else(|| segments.first())
        .cloned()
        .unwrap_or_else(|| "unknown".to_string())
}

fn collect_agents_directory(
    agents_root: &Path,
    category: &str,
    platform: ItemPlatform,
    scope: ItemScope,
    project_name: Option<String>,
    items: &mut Vec<CatalogItem>,
) {
    if !agents_root.exists() {
        return;
    }

    let entries = match fs::read_dir(agents_root) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|value| value.to_str()) != Some("md") {
            continue;
        }
        push_agent_item(
            &path,
            category,
            platform.clone(),
            scope.clone(),
            project_name.clone(),
            items,
        );
    }
}

fn collect_rules_directory(
    rules_root: &Path,
    category: &str,
    platform: ItemPlatform,
    scope: ItemScope,
    project_name: Option<String>,
    items: &mut Vec<CatalogItem>,
) {
    if !rules_root.exists() {
        return;
    }

    let entries = match fs::read_dir(rules_root) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|value| value.to_str()) != Some("mdc") {
            continue;
        }
        push_rule_item(
            &path,
            category,
            platform.clone(),
            scope.clone(),
            project_name.clone(),
            items,
        );
    }
}

fn push_skill_item(
    path: &Path,
    category: &str,
    platform: ItemPlatform,
    scope: ItemScope,
    project_name: Option<String>,
    items: &mut Vec<CatalogItem>,
) {
    let fallback_name = path
        .parent()
        .and_then(|parent| parent.file_name())
        .and_then(|value| value.to_str())
        .unwrap_or("unknown")
        .to_string();

    let content = match fs::read_to_string(path) {
        Ok(content) => content,
        Err(_) => return,
    };

    let metadata = parse_frontmatter(&content, &fallback_name);
    items.push(CatalogItem {
        id: format!("skill:{}", path.display()),
        kind: ItemKind::Skill,
        platform,
        name: metadata.name,
        description: metadata.description,
        path: path.display().to_string(),
        scope,
        category: category.to_string(),
        project_name,
        created_by: metadata.created_by,
    });
}

fn push_rule_item(
    path: &Path,
    category: &str,
    platform: ItemPlatform,
    scope: ItemScope,
    project_name: Option<String>,
    items: &mut Vec<CatalogItem>,
) {
    let fallback_name = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("unknown")
        .to_string();

    let content = match fs::read_to_string(path) {
        Ok(content) => content,
        Err(_) => return,
    };

    let metadata = parse_frontmatter(&content, &fallback_name);
    let display_name = humanize_rule_name(&metadata.name);
    items.push(CatalogItem {
        id: format!("rule:{}", path.display()),
        kind: ItemKind::Rule,
        platform,
        name: display_name,
        description: metadata.description,
        path: path.display().to_string(),
        scope,
        category: category.to_string(),
        project_name,
        created_by: metadata.created_by,
    });
}

fn humanize_rule_name(name: &str) -> String {
    name.replace('-', " ")
}

fn push_context_item(
    path: &Path,
    category: &str,
    platform: ItemPlatform,
    scope: ItemScope,
    project_name: Option<String>,
    collected_context_paths: &mut HashSet<String>,
    items: &mut Vec<CatalogItem>,
) {
    let canonical_path = canonical_context_path(path);
    let canonical_path_label = canonical_path.display().to_string();

    if !collected_context_paths.insert(canonical_path_label.clone()) {
        return;
    }

    let fallback_name = canonical_path
        .parent()
        .and_then(|parent| parent.file_name())
        .and_then(|value| value.to_str())
        .unwrap_or("Claude project context")
        .to_string();

    let content = match fs::read_to_string(&canonical_path) {
        Ok(content) => content,
        Err(_) => {
            collected_context_paths.remove(&canonical_path_label);
            return;
        }
    };

    let metadata = parse_context_metadata(&content, &fallback_name);
    items.push(CatalogItem {
        id: format!("context:{canonical_path_label}"),
        kind: ItemKind::Context,
        platform,
        name: metadata.name,
        description: metadata.description,
        path: canonical_path_label,
        scope,
        category: category.to_string(),
        project_name,
        created_by: metadata.created_by,
    });
}

fn push_agent_item(
    path: &Path,
    category: &str,
    platform: ItemPlatform,
    scope: ItemScope,
    project_name: Option<String>,
    items: &mut Vec<CatalogItem>,
) {
    let fallback_name = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("unknown")
        .to_string();

    let content = match fs::read_to_string(path) {
        Ok(content) => content,
        Err(_) => return,
    };

    let metadata = parse_frontmatter(&content, &fallback_name);
    items.push(CatalogItem {
        id: format!("agent:{}", path.display()),
        kind: ItemKind::Agent,
        platform,
        name: metadata.name,
        description: metadata.description,
        path: path.display().to_string(),
        scope,
        category: category.to_string(),
        project_name,
        created_by: metadata.created_by,
    });
}

fn canonical_context_path(path: &Path) -> PathBuf {
    path.canonicalize().unwrap_or_else(|_| path.to_path_buf())
}

fn build_groups(items: Vec<CatalogItem>) -> Vec<CatalogGroup> {
    let mut group_map: Vec<(
        String,
        String,
        ItemScope,
        ItemKind,
        ItemPlatform,
        Vec<CatalogItem>,
    )> = Vec::new();

    for item in items {
        let group_key = format!(
            "{}|{}|{}|{}|{}",
            scope_label(&item.scope),
            kind_label(&item.kind),
            platform_label(&item.platform),
            item.category,
            item.project_name.clone().unwrap_or_default()
        );

        if let Some(group) = group_map
            .iter_mut()
            .find(|(key, _, _, _, _, _)| key == &group_key)
        {
            group.5.push(item);
            continue;
        }

        let label = build_group_label(&item);
        group_map.push((
            group_key,
            label,
            item.scope.clone(),
            item.kind.clone(),
            item.platform.clone(),
            vec![item],
        ));
    }

    group_map
        .into_iter()
        .map(|(id, label, scope, kind, platform, items)| CatalogGroup {
            id,
            label,
            scope,
            kind,
            platform,
            items,
        })
        .collect()
}

fn build_group_label(item: &CatalogItem) -> String {
    if item.scope == ItemScope::Project {
        if let Some(project_name) = &item.project_name {
            return project_name.clone();
        }
        return "Unknown Project".to_string();
    }

    if item.category.starts_with("Plugin · ") {
        return "Plugins".to_string();
    }

    let category_label = strip_scope_prefix_from_category(&item.category);
    let display_name = strip_kind_suffix_from_label(&category_label);

    if display_name.is_empty() {
        return "Global".to_string();
    }

    display_name
}

fn strip_kind_suffix_from_label(label: &str) -> String {
    for kind_name in ["Skills", "Agents", "Rules", "Context"] {
        if label == kind_name {
            return String::new();
        }

        if let Some(rest) = label.strip_suffix(&format!(" {kind_name}")) {
            return rest.to_string();
        }
    }

    label.to_string()
}

fn strip_scope_prefix_from_category(category: &str) -> String {
    if let Some(rest) = category.strip_prefix("Global ") {
        return rest.to_string();
    }
    if let Some(rest) = category.strip_prefix("Project ") {
        return rest.to_string();
    }
    category.to_string()
}

fn scope_label(scope: &ItemScope) -> &'static str {
    match scope {
        ItemScope::Global => "global",
        ItemScope::Project => "project",
    }
}

fn kind_label(kind: &ItemKind) -> &'static str {
    match kind {
        ItemKind::Skill => "skill",
        ItemKind::Agent => "agent",
        ItemKind::Rule => "rule",
        ItemKind::Context => "context",
    }
}

fn platform_label(platform: &ItemPlatform) -> &'static str {
    match platform {
        ItemPlatform::Cursor => "cursor",
        ItemPlatform::Claude => "claude",
        ItemPlatform::Codex => "codex",
        ItemPlatform::Shared => "shared",
    }
}

fn sort_groups(groups: &mut [CatalogGroup]) {
    groups.sort_by(|left, right| {
        left.label
            .to_lowercase()
            .cmp(&right.label.to_lowercase())
            .then_with(|| left.id.cmp(&right.id))
    });
}

fn build_summary(groups: &[CatalogGroup]) -> CatalogSummary {
    let mut total_skills = 0;
    let mut total_agents = 0;
    let mut total_rules = 0;
    let mut total_context = 0;
    let mut cursor_skills = 0;
    let mut cursor_agents = 0;
    let mut cursor_rules = 0;
    let mut claude_skills = 0;
    let mut claude_agents = 0;
    let mut claude_context = 0;
    let mut codex_skills = 0;
    let mut codex_agents = 0;
    let mut codex_rules = 0;
    let mut shared_skills = 0;
    let mut global_skills = 0;
    let mut global_agents = 0;
    let mut global_rules = 0;
    let mut global_context = 0;
    let mut project_skills = 0;
    let mut project_agents = 0;
    let mut project_rules = 0;
    let mut project_context = 0;
    let mut projects = std::collections::BTreeSet::new();

    for group in groups {
        let count = group.items.len();
        match (&group.kind, &group.scope) {
            (ItemKind::Skill, ItemScope::Global) => global_skills += count,
            (ItemKind::Skill, ItemScope::Project) => project_skills += count,
            (ItemKind::Agent, ItemScope::Global) => global_agents += count,
            (ItemKind::Agent, ItemScope::Project) => project_agents += count,
            (ItemKind::Rule, ItemScope::Global) => global_rules += count,
            (ItemKind::Rule, ItemScope::Project) => project_rules += count,
            (ItemKind::Context, ItemScope::Global) => global_context += count,
            (ItemKind::Context, ItemScope::Project) => project_context += count,
        }

        match (&group.kind, &group.platform) {
            (ItemKind::Skill, ItemPlatform::Cursor) => cursor_skills += count,
            (ItemKind::Skill, ItemPlatform::Claude) => claude_skills += count,
            (ItemKind::Skill, ItemPlatform::Codex) => codex_skills += count,
            (ItemKind::Skill, ItemPlatform::Shared) => shared_skills += count,
            (ItemKind::Agent, ItemPlatform::Cursor) => cursor_agents += count,
            (ItemKind::Agent, ItemPlatform::Claude) => claude_agents += count,
            (ItemKind::Context, ItemPlatform::Claude) => claude_context += count,
            (ItemKind::Agent, ItemPlatform::Codex) => codex_agents += count,
            (ItemKind::Rule, ItemPlatform::Cursor) => cursor_rules += count,
            (ItemKind::Rule, ItemPlatform::Codex) => codex_rules += count,
            (ItemKind::Agent, ItemPlatform::Shared)
            | (ItemKind::Rule, ItemPlatform::Claude)
            | (ItemKind::Rule, ItemPlatform::Shared)
            | (ItemKind::Context, ItemPlatform::Cursor)
            | (ItemKind::Context, ItemPlatform::Codex)
            | (ItemKind::Context, ItemPlatform::Shared) => {}
        }

        match group.kind {
            ItemKind::Skill => total_skills += count,
            ItemKind::Agent => total_agents += count,
            ItemKind::Rule => total_rules += count,
            ItemKind::Context => total_context += count,
        }

        for item in &group.items {
            if let Some(project_name) = &item.project_name {
                projects.insert(project_name.clone());
            }
        }
    }

    CatalogSummary {
        total_skills,
        total_agents,
        total_rules,
        total_context,
        cursor_skills,
        cursor_agents,
        cursor_rules,
        claude_skills,
        claude_agents,
        claude_context,
        codex_skills,
        codex_agents,
        codex_rules,
        shared_skills,
        global_skills,
        global_agents,
        global_rules,
        global_context,
        project_skills,
        project_agents,
        project_rules,
        project_context,
        project_count: projects.len(),
    }
}

fn chrono_lite_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    format!("unix:{seconds}")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn path_from_segments(segments: &[&str]) -> PathBuf {
        segments.iter().copied().collect()
    }

    #[test]
    fn root_level_config_is_global() {
        let base = path_from_segments(&["Users", "dev"]);
        let cursor_dir = path_from_segments(&["Users", "dev", ".cursor"]);
        let (scope, project) = scope_for(&base, cursor_dir.parent().unwrap());
        assert_eq!(scope, ItemScope::Global);
        assert_eq!(project, None);
    }

    #[test]
    fn nested_config_is_project_named_after_its_folder() {
        let base = path_from_segments(&["Users", "dev"]);
        let cursor_dir = path_from_segments(&["Users", "dev", "work", "cognyx", ".cursor"]);
        let (scope, project) = scope_for(&base, cursor_dir.parent().unwrap());
        assert_eq!(scope, ItemScope::Project);
        assert_eq!(project, Some("cognyx".to_string()));
    }

    #[test]
    fn plugin_name_is_second_segment_after_cache() {
        let cache_root = path_from_segments(&["Users", "dev", ".cursor", "plugins", "cache"]);
        let skill_path = path_from_segments(&[
            "Users", "dev", ".cursor", "plugins", "cache", "abc123", "notion-workspace", "skills",
            "SKILL.md",
        ]);
        assert_eq!(plugin_name_from_cache(&cache_root, &skill_path), "notion-workspace");
    }

    #[test]
    fn go_module_cache_is_noise_but_source_pkg_is_not() {
        let go_cache = path_from_segments(&["Users", "dev", "go", "pkg"]);
        assert!(is_noise_directory(&go_cache, "pkg"));

        let source_pkg = path_from_segments(&["Users", "dev", "myapp", "pkg"]);
        assert!(!is_noise_directory(&source_pkg, "pkg"));

        let node_modules = path_from_segments(&["Users", "dev", "app", "node_modules"]);
        assert!(is_noise_directory(&node_modules, "node_modules"));
    }

    #[test]
    fn platform_resolves_from_config_directory_name() {
        assert_eq!(platform_for_config_directory(".claude"), Some(ItemPlatform::Claude));
        assert_eq!(platform_for_config_directory(".agents"), Some(ItemPlatform::Shared));
        assert_eq!(platform_for_config_directory("src"), None);
    }
}
