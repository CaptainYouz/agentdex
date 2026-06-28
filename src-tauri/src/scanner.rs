use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

use walkdir::WalkDir;

use crate::parser::{parse_context_metadata, parse_frontmatter};
use crate::types::{
    CatalogGroup, CatalogItem, CatalogResponse, CatalogSummary, ItemKind, ItemPlatform, ItemScope,
};

const CURSOR_GLOBAL_SKILL_SOURCES: [(&str, &[&str]); 2] = [
    ("Cursor Built-in", &[".cursor", "skills-cursor"]),
    ("User Skills", &[".cursor", "skills"]),
];

const SHARED_GLOBAL_SKILL_SOURCES: [(&str, &[&str]); 1] =
    [("Personal Agents Skills", &[".agents", "skills"])];

const CURSOR_PLUGIN_SEGMENTS: &[&str] = &[".cursor", "plugins", "cache"];
const CLAUDE_PLUGIN_SEGMENTS: &[&str] = &[".claude", "plugins", "cache"];
const CODEX_PLUGIN_SEGMENTS: &[&str] = &[".codex", "plugins", "cache"];

const CODEX_GLOBAL_SKILL_SOURCES: [(&str, &[&str]); 1] = [("User Skills", &[".codex", "skills"])];

const CONTEXT_FILE_NAMES: [&str; 2] = ["CLAUDE.md", "claude.md"];

fn join_segments(base: &Path, segments: &[&str]) -> PathBuf {
    segments
        .iter()
        .fold(base.to_path_buf(), |path, segment| path.join(segment))
}

pub fn build_catalog(home_directory: &Path) -> CatalogResponse {
    let mut items = Vec::new();
    let mut collected_context_paths: HashSet<String> = HashSet::new();
    collect_cursor_global_skills(home_directory, &mut items);
    collect_codex_global_skills(home_directory, &mut items);
    collect_shared_global_skills(home_directory, &mut items);
    collect_plugin_skills(
        home_directory,
        CURSOR_PLUGIN_SEGMENTS,
        ItemPlatform::Cursor,
        &mut items,
    );
    collect_plugin_skills(
        home_directory,
        CLAUDE_PLUGIN_SEGMENTS,
        ItemPlatform::Claude,
        &mut items,
    );
    collect_plugin_skills(
        home_directory,
        CODEX_PLUGIN_SEGMENTS,
        ItemPlatform::Codex,
        &mut items,
    );
    collect_global_agents(
        &join_segments(home_directory, &[".cursor", "agents"]),
        "Global Agents",
        ItemPlatform::Cursor,
        &mut items,
    );
    collect_global_agents(
        &join_segments(home_directory, &[".claude", "agents"]),
        "Global Agents",
        ItemPlatform::Claude,
        &mut items,
    );
    collect_global_agents(
        &join_segments(home_directory, &[".codex", "agents"]),
        "Global Agents",
        ItemPlatform::Codex,
        &mut items,
    );
    collect_global_rules(
        &join_segments(home_directory, &[".cursor", "rules"]),
        "Global Rules",
        ItemPlatform::Cursor,
        &mut items,
    );
    collect_global_context(home_directory, &mut collected_context_paths, &mut items);

    let projects_root = home_directory.join("Development");
    collect_project_items(&projects_root, &mut items);
    collect_project_context(&projects_root, &mut collected_context_paths, &mut items);

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

fn collect_cursor_global_skills(home_directory: &Path, items: &mut Vec<CatalogItem>) {
    for (category, segments) in CURSOR_GLOBAL_SKILL_SOURCES {
        let root = join_segments(home_directory, segments);
        collect_skill_directory(
            &root,
            category,
            ItemPlatform::Cursor,
            ItemScope::Global,
            None,
            items,
        );
    }
}

fn collect_codex_global_skills(home_directory: &Path, items: &mut Vec<CatalogItem>) {
    for (category, segments) in CODEX_GLOBAL_SKILL_SOURCES {
        let root = join_segments(home_directory, segments);
        collect_skill_directory(
            &root,
            category,
            ItemPlatform::Codex,
            ItemScope::Global,
            None,
            items,
        );
    }
}

fn collect_shared_global_skills(home_directory: &Path, items: &mut Vec<CatalogItem>) {
    for (category, segments) in SHARED_GLOBAL_SKILL_SOURCES {
        let root = join_segments(home_directory, segments);
        collect_skill_directory(
            &root,
            category,
            ItemPlatform::Shared,
            ItemScope::Global,
            None,
            items,
        );
    }
}

fn collect_plugin_skills(
    home_directory: &Path,
    marker_segments: &[&str],
    platform: ItemPlatform,
    items: &mut Vec<CatalogItem>,
) {
    let cache_root = join_segments(home_directory, marker_segments);
    if !cache_root.exists() {
        return;
    }

    for entry in WalkDir::new(&cache_root)
        .follow_links(false)
        .into_iter()
        .filter_map(Result::ok)
    {
        if entry.file_name() != "SKILL.md" {
            continue;
        }

        let skill_path = entry.path().to_path_buf();
        let plugin_name = extract_plugin_name(&skill_path, marker_segments);
        let category = format!("Plugin · {plugin_name}");
        push_skill_item(
            &skill_path,
            &category,
            platform.clone(),
            ItemScope::Global,
            None,
            items,
        );
    }
}

fn collect_global_agents(
    agents_root: &Path,
    category: &str,
    platform: ItemPlatform,
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
        push_agent_item(&path, category, platform.clone(), ItemScope::Global, None, items);
    }
}

fn collect_global_context(
    home_directory: &Path,
    collected_context_paths: &mut HashSet<String>,
    items: &mut Vec<CatalogItem>,
) {
    for file_name in CONTEXT_FILE_NAMES {
        let context_path = home_directory.join(file_name);
        if !context_path.is_file() {
            continue;
        }

        println!(
            "[collect_global_context] found global context file: {}",
            context_path.display()
        );
        push_context_item(
            &context_path,
            "Global Context",
            ItemPlatform::Claude,
            ItemScope::Global,
            None,
            collected_context_paths,
            items,
        );
    }
}

fn collect_project_items(projects_root: &Path, items: &mut Vec<CatalogItem>) {
    if !projects_root.exists() {
        println!(
            "[collect_project_items] projects root does not exist: {}",
            projects_root.display()
        );
        return;
    }

    let mut handled_projects: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();

    for entry in WalkDir::new(projects_root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| !should_skip_entry(entry.path()))
        .filter_map(Result::ok)
    {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let directory_name = path.file_name().and_then(|value| value.to_str());
        if directory_name != Some("skills")
            && directory_name != Some("agents")
            && directory_name != Some("rules")
        {
            continue;
        }

        let Some(config_directory) = path.parent() else {
            continue;
        };

        let platform = match config_directory
            .file_name()
            .and_then(|value| value.to_str())
        {
            Some(".cursor") => ItemPlatform::Cursor,
            Some(".claude") => ItemPlatform::Claude,
            Some(".codex") => ItemPlatform::Codex,
            _ => continue,
        };

        let Some(project_root) = config_directory.parent() else {
            continue;
        };

        let project_name = project_root
            .strip_prefix(projects_root)
            .map(|relative| relative.display().to_string())
            .unwrap_or_else(|_| {
                project_root
                    .file_name()
                    .and_then(|value| value.to_str())
                    .unwrap_or("unknown")
                    .to_string()
            });

        let project_key = format!("{project_name}|{}", platform_label(&platform));
        if !handled_projects.insert(project_key) {
            continue;
        }

        let skills_root = config_directory.join("skills");
        collect_skill_directory(
            &skills_root,
            "Project Skills",
            platform.clone(),
            ItemScope::Project,
            Some(project_name.clone()),
            items,
        );

        let agents_root = config_directory.join("agents");
        collect_project_agents(&agents_root, &project_name, platform.clone(), items);

        if platform == ItemPlatform::Cursor || platform == ItemPlatform::Codex {
            let rules_root = config_directory.join("rules");
            collect_project_rules(&rules_root, &project_name, platform, items);
        }
    }
}

fn collect_project_context(
    projects_root: &Path,
    collected_context_paths: &mut HashSet<String>,
    items: &mut Vec<CatalogItem>,
) {
    if !projects_root.exists() {
        return;
    }

    let mut handled_project_roots: std::collections::BTreeSet<String> =
        std::collections::BTreeSet::new();

    if let Ok(entries) = fs::read_dir(projects_root) {
        for entry in entries.flatten() {
            let project_root = entry.path();
            if !project_root.is_dir() {
                continue;
            }

            collect_context_at_project_root(
                &project_root,
                projects_root,
                &mut handled_project_roots,
                collected_context_paths,
                items,
            );
        }
    }

    for entry in WalkDir::new(projects_root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| !should_skip_entry(entry.path()))
        .filter_map(Result::ok)
    {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let directory_name = path.file_name().and_then(|value| value.to_str());
        if directory_name != Some(".cursor")
            && directory_name != Some(".claude")
            && directory_name != Some(".codex")
        {
            continue;
        }

        let Some(project_root) = path.parent() else {
            continue;
        };

        collect_context_at_project_root(
            project_root,
            projects_root,
            &mut handled_project_roots,
            collected_context_paths,
            items,
        );
    }
}

fn collect_context_at_project_root(
    project_root: &Path,
    projects_root: &Path,
    handled_project_roots: &mut std::collections::BTreeSet<String>,
    collected_context_paths: &mut HashSet<String>,
    items: &mut Vec<CatalogItem>,
) {
    let project_key = project_root.display().to_string();
    if !handled_project_roots.insert(project_key) {
        return;
    }

    let project_name = project_root
        .strip_prefix(projects_root)
        .map(|relative| relative.display().to_string())
        .unwrap_or_else(|_| {
            project_root
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or("unknown")
                .to_string()
        });

    for file_name in CONTEXT_FILE_NAMES {
        let context_path = project_root.join(file_name);
        if !context_path.is_file() {
            continue;
        }

        println!(
            "[collect_project_context] found context file for project {project_name}: {}",
            context_path.display()
        );
        push_context_item(
            &context_path,
            "Project Context",
            ItemPlatform::Claude,
            ItemScope::Project,
            Some(project_name.clone()),
            collected_context_paths,
            items,
        );
    }
}

fn should_skip_entry(path: &Path) -> bool {
    let Some(name) = path.file_name().and_then(|value| value.to_str()) else {
        return false;
    };

    matches!(
        name,
        "node_modules" | "target" | "dist" | ".git" | "build" | ".next" | "vendor"
    )
}

fn canonical_context_path(path: &Path) -> PathBuf {
    path.canonicalize().unwrap_or_else(|_| path.to_path_buf())
}

fn collect_global_rules(
    rules_root: &Path,
    category: &str,
    platform: ItemPlatform,
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
        push_rule_item(&path, category, platform.clone(), ItemScope::Global, None, items);
    }
}

fn collect_project_rules(
    rules_root: &Path,
    project_name: &str,
    platform: ItemPlatform,
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
            "Project Rules",
            platform.clone(),
            ItemScope::Project,
            Some(project_name.to_string()),
            items,
        );
    }
}

fn collect_project_agents(
    agents_root: &Path,
    project_name: &str,
    platform: ItemPlatform,
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
            "Project Agents",
            platform.clone(),
            ItemScope::Project,
            Some(project_name.to_string()),
            items,
        );
    }
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
            &entry.path().to_path_buf(),
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
        println!(
            "[push_context_item] skipping duplicate context file {} (canonical: {})",
            path.display(),
            canonical_path_label
        );
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
        Err(error) => {
            collected_context_paths.remove(&canonical_path_label);
            println!(
                "[push_context_item] could not read {}: {error}",
                canonical_path.display()
            );
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

fn path_component_strings(path: &Path) -> Vec<String> {
    path.components()
        .filter_map(|component| match component {
            std::path::Component::Normal(value) => value.to_str().map(str::to_string),
            _ => None,
        })
        .collect()
}

fn find_marker_end_index(components: &[String], marker_segments: &[&str]) -> Option<usize> {
    if marker_segments.is_empty() || components.len() < marker_segments.len() {
        return None;
    }

    components
        .windows(marker_segments.len())
        .position(|window| {
            window
                .iter()
                .zip(marker_segments.iter())
                .all(|(left, right)| left == *right)
        })
        .map(|start| start + marker_segments.len() - 1)
}

fn extract_plugin_name(skill_path: &Path, marker_segments: &[&str]) -> String {
    let components = path_component_strings(skill_path);
    let Some(cache_index) = find_marker_end_index(&components, marker_segments) else {
        println!(
            "[extract_plugin_name] could not find marker {:?} in {}",
            marker_segments,
            skill_path.display()
        );
        return "unknown".to_string();
    };

    // cache/{id}/{plugin_name}/skills/SKILL.md
    if let Some(plugin_name) = components.get(cache_index + 2) {
        return plugin_name.clone();
    }

    if let Some(fallback_name) = components.get(cache_index + 1) {
        return fallback_name.clone();
    }

    println!(
        "[extract_plugin_name] no plugin segment after cache in {}",
        skill_path.display()
    );
    "unknown".to_string()
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

    // Build a path with the running OS's native separator so component-based
    // parsing is exercised identically on macOS, Linux, and Windows.
    fn path_from_segments(segments: &[&str]) -> PathBuf {
        segments.iter().copied().collect()
    }

    #[test]
    fn extract_plugin_name_from_native_path() {
        let skill_path = path_from_segments(&[
            "Users",
            "dev",
            ".cursor",
            "plugins",
            "cache",
            "abc123",
            "notion-workspace",
            "skills",
            "SKILL.md",
        ]);
        let plugin_name = extract_plugin_name(&skill_path, CURSOR_PLUGIN_SEGMENTS);
        assert_eq!(plugin_name, "notion-workspace");
    }

    #[test]
    fn extract_plugin_name_returns_unknown_when_marker_missing() {
        let skill_path =
            path_from_segments(&["Users", "dev", ".cursor", "skills", "my-skill", "SKILL.md"]);
        let plugin_name = extract_plugin_name(&skill_path, CURSOR_PLUGIN_SEGMENTS);
        assert_eq!(plugin_name, "unknown");
    }

    #[test]
    fn join_segments_builds_nested_path() {
        let base = path_from_segments(&["Users", "dev"]);
        let joined = join_segments(&base, &[".cursor", "plugins", "cache"]);
        let expected = path_from_segments(&["Users", "dev", ".cursor", "plugins", "cache"]);
        assert_eq!(joined, expected);
    }

    // Real backslash literal — only meaningful where `\` is a path separator.
    #[test]
    #[cfg(windows)]
    fn extract_plugin_name_from_windows_backslash_path() {
        let skill_path = Path::new(
            r"C:\Users\dev\.cursor\plugins\cache\abc123\notion-workspace\skills\SKILL.md",
        );
        let plugin_name = extract_plugin_name(skill_path, CURSOR_PLUGIN_SEGMENTS);
        assert_eq!(plugin_name, "notion-workspace");
    }
}
