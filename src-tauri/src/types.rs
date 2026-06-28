use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogItem {
    pub id: String,
    pub kind: ItemKind,
    pub platform: ItemPlatform,
    pub name: String,
    pub description: String,
    pub path: String,
    pub scope: ItemScope,
    pub category: String,
    pub project_name: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ItemPlatform {
    Cursor,
    Claude,
    Codex,
    Shared,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ItemKind {
    Skill,
    Agent,
    Rule,
    Context,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ItemScope {
    Global,
    Project,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogGroup {
    pub id: String,
    pub label: String,
    pub scope: ItemScope,
    pub kind: ItemKind,
    pub platform: ItemPlatform,
    pub items: Vec<CatalogItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogSummary {
    pub total_skills: usize,
    pub total_agents: usize,
    pub total_rules: usize,
    pub total_context: usize,
    pub cursor_skills: usize,
    pub cursor_agents: usize,
    pub cursor_rules: usize,
    pub claude_skills: usize,
    pub claude_agents: usize,
    pub claude_context: usize,
    pub codex_skills: usize,
    pub codex_agents: usize,
    pub codex_rules: usize,
    pub shared_skills: usize,
    pub global_skills: usize,
    pub global_agents: usize,
    pub global_rules: usize,
    pub global_context: usize,
    pub project_skills: usize,
    pub project_agents: usize,
    pub project_rules: usize,
    pub project_context: usize,
    pub project_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogResponse {
    pub summary: CatalogSummary,
    pub groups: Vec<CatalogGroup>,
    pub scanned_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemFileStats {
    pub created_at: Option<i64>,
    pub modified_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum DirectoryEntryKind {
    File,
    Folder,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryEntry {
    pub name: String,
    pub path: String,
    pub kind: DirectoryEntryKind,
}
