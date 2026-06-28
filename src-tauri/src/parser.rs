use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct Frontmatter {
    pub name: String,
    pub description: String,
    pub created_by: Option<String>,
}

const DEFAULT_CONTEXT_DESCRIPTION: &str = "Claude project context";

pub fn parse_context_metadata(content: &str, fallback_name: &str) -> Frontmatter {
    let metadata = parse_frontmatter(content, fallback_name);
    let description = if metadata.description.is_empty() {
        extract_first_paragraph(content).unwrap_or_else(|| DEFAULT_CONTEXT_DESCRIPTION.to_string())
    } else {
        metadata.description
    };

    Frontmatter {
        name: metadata.name,
        description,
        created_by: metadata.created_by,
    }
}

pub fn parse_frontmatter(content: &str, fallback_name: &str) -> Frontmatter {
    let fields = extract_frontmatter_fields(content);
    let name = fields
        .get("name")
        .cloned()
        .unwrap_or_else(|| fallback_name.to_string());
    let description = fields
        .get("description")
        .cloned()
        .unwrap_or_default()
        .replace('\n', " ")
        .trim()
        .to_string();
    let created_by = extract_created_by(&fields);

    if let Some(ref author) = created_by {
        println!("[parse_frontmatter] extracted created_by={author} for item {name}");
    }

    Frontmatter {
        name,
        description,
        created_by,
    }
}

fn extract_created_by(fields: &HashMap<String, String>) -> Option<String> {
    const AUTHOR_KEYS: [&str; 5] = [
        "author",
        "createdBy",
        "created_by",
        "created-by",
        "creator",
    ];

    for key in AUTHOR_KEYS {
        if let Some(value) = fields.get(key) {
            let trimmed_value = value.trim();
            if !trimmed_value.is_empty() {
                return Some(trimmed_value.to_string());
            }
        }
    }

    None
}

fn extract_first_paragraph(content: &str) -> Option<String> {
    let body = strip_frontmatter(content);
    let mut paragraph_lines: Vec<&str> = Vec::new();

    for line in body.lines() {
        let trimmed_line = line.trim();

        if trimmed_line.is_empty() {
            if !paragraph_lines.is_empty() {
                break;
            }
            continue;
        }

        if trimmed_line.starts_with('#') {
            continue;
        }

        paragraph_lines.push(trimmed_line);
    }

    if paragraph_lines.is_empty() {
        return None;
    }

    Some(
        paragraph_lines
            .join(" ")
            .chars()
            .take(240)
            .collect::<String>()
            .trim()
            .to_string(),
    )
}

fn strip_frontmatter(content: &str) -> &str {
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return trimmed;
    }

    let after_open = &trimmed[3..];
    let Some(close_index) = after_open.find("\n---") else {
        return trimmed;
    };

    after_open[close_index + 4..].trim_start()
}

fn extract_frontmatter_fields(content: &str) -> HashMap<String, String> {
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return HashMap::new();
    }

    let after_open = &trimmed[3..];
    let Some(close_index) = after_open.find("\n---") else {
        return HashMap::new();
    };

    let yaml_block = &after_open[..close_index];
    parse_simple_yaml(yaml_block)
}

fn parse_simple_yaml(yaml_block: &str) -> HashMap<String, String> {
    let mut fields = HashMap::new();
    let mut current_key: Option<String> = None;
    let mut current_value = String::new();
    let mut is_multiline = false;

    for line in yaml_block.lines() {
        if let Some((key, value)) = line.split_once(':') {
            flush_field(&mut fields, &mut current_key, &mut current_value);
            current_key = Some(key.trim().to_string());
            let trimmed_value = value.trim();
            if trimmed_value == ">" || trimmed_value == "|" {
                is_multiline = true;
                current_value.clear();
                continue;
            }
            is_multiline = false;
            current_value = trimmed_value.trim_matches('"').trim_matches('\'').to_string();
            continue;
        }

        if is_multiline {
            let piece = line.trim();
            if !piece.is_empty() {
                if !current_value.is_empty() {
                    current_value.push(' ');
                }
                current_value.push_str(piece);
            }
        }
    }

    flush_field(&mut fields, &mut current_key, &mut current_value);
    fields
}

fn flush_field(
    fields: &mut HashMap<String, String>,
    current_key: &mut Option<String>,
    current_value: &mut String,
) {
    if let Some(key) = current_key.take() {
        fields.insert(key, current_value.trim().to_string());
        current_value.clear();
    }
}
