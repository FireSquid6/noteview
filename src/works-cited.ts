import { Cite, plugins } from "@citation-js/core";
import "@citation-js/plugin-csl";
import { escapeHtml } from "@kitajs/html";
import type { TokenizerAndRendererExtension, Tokens } from "marked";
import { parse } from "yaml";
import mlaStyle from "../static/modern-language-association.csl" with { type: "text" };

const styleName = "noteview-mla";
plugins.config.get("@csl").styles.add(styleName, mlaStyle);

const supportedTypes = new Set([
  "article-journal",
  "article-magazine",
  "article-newspaper",
  "book",
  "chapter",
  "motion_picture",
  "report",
  "thesis",
  "webpage",
]);

const nameFields = new Set([
  "dropping-particle",
  "family",
  "given",
  "literal",
  "non-dropping-particle",
  "suffix",
]);
const nameVariables = new Set(["author", "editor", "translator"]);
const dateVariables = new Set(["accessed", "issued"]);
const scalarFields = new Set([
  "DOI",
  "URL",
  "container-title",
  "edition",
  "genre",
  "issue",
  "page",
  "publisher",
  "publisher-place",
  "title-short",
  "volume",
]);
const entryFields = new Set([
  "id",
  "type",
  "title",
  ...nameVariables,
  ...dateVariables,
  ...scalarFields,
]);

type CslEntry = Record<string, unknown>;

interface WorksCitedToken extends Tokens.Generic {
  entries: CslEntry[];
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateNames(value: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${path} must be a non-empty list.`);
    return;
  }

  value.forEach((name, index) => {
    const namePath = `${path}[${index + 1}]`;
    if (!isRecord(name)) {
      errors.push(`${namePath} must be an object.`);
      return;
    }

    for (const field of Object.keys(name)) {
      if (!nameFields.has(field)) {
        errors.push(`${namePath}.${field} is not supported.`);
      }
    }

    const hasLiteral = isNonEmptyString(name.literal);
    const hasFamily = isNonEmptyString(name.family);
    if (!hasLiteral && !hasFamily) {
      errors.push(`${namePath} must define literal or family.`);
    }
    if (hasLiteral && Object.keys(name).some((field) => field !== "literal")) {
      errors.push(`${namePath}.literal cannot be combined with structured name fields.`);
    }

    for (const [field, fieldValue] of Object.entries(name)) {
      if (!isNonEmptyString(fieldValue)) {
        errors.push(`${namePath}.${field} must be a non-empty string.`);
      }
    }
  });
}

function validateDate(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`);
    return;
  }

  const fields = Object.keys(value);
  for (const field of fields) {
    if (field !== "date-parts" && field !== "literal") {
      errors.push(`${path}.${field} is not supported.`);
    }
  }

  const hasLiteral = value.literal !== undefined;
  const hasDateParts = value["date-parts"] !== undefined;
  if (hasLiteral === hasDateParts) {
    errors.push(`${path} must define exactly one of literal or date-parts.`);
    return;
  }

  if (hasLiteral) {
    if (!isNonEmptyString(value.literal)) {
      errors.push(`${path}.literal must be a non-empty string.`);
    }
    return;
  }

  const dateParts = value["date-parts"];
  if (!Array.isArray(dateParts) || dateParts.length < 1 || dateParts.length > 2) {
    errors.push(`${path}.date-parts must contain one date or a two-date range.`);
    return;
  }

  dateParts.forEach((parts, index) => {
    const partPath = `${path}.date-parts[${index + 1}]`;
    if (!Array.isArray(parts) || parts.length < 1 || parts.length > 3) {
      errors.push(`${partPath} must contain year, optional month, and optional day.`);
      return;
    }
    if (!parts.every((part) => Number.isInteger(part))) {
      errors.push(`${partPath} values must be integers.`);
      return;
    }
    if (parts[1] !== undefined && (parts[1] < 1 || parts[1] > 12)) {
      errors.push(`${partPath} month must be between 1 and 12.`);
    }
    if (parts[2] !== undefined && (parts[2] < 1 || parts[2] > 31)) {
      errors.push(`${partPath} day must be between 1 and 31.`);
    }
  });
}

export function parseWorksCited(source: string): { entries: CslEntry[]; errors: string[] } {
  let parsed: unknown;
  try {
    parsed = parse(source, { maxAliasCount: 0 });
  } catch {
    return { entries: [], errors: ["The YAML could not be parsed."] };
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { entries: [], errors: ["The tag must contain a non-empty YAML list."] };
  }

  const errors: string[] = [];
  const entries: CslEntry[] = [];
  const ids = new Set<string>();

  parsed.forEach((entry, index) => {
    const entryPath = `Entry ${index + 1}`;
    if (!isRecord(entry)) {
      errors.push(`${entryPath} must be an object.`);
      return;
    }

    for (const field of Object.keys(entry)) {
      if (!entryFields.has(field)) {
        errors.push(`${entryPath}.${field} is not supported.`);
      }
    }

    if (!isNonEmptyString(entry.id)) {
      errors.push(`${entryPath}.id must be a non-empty string.`);
    } else if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(entry.id)) {
      errors.push(`${entryPath}.id may contain only letters, numbers, dots, underscores, colons, and hyphens.`);
    } else if (ids.has(entry.id)) {
      errors.push(`${entryPath}.id must be unique.`);
    } else {
      ids.add(entry.id);
    }

    if (!isNonEmptyString(entry.type) || !supportedTypes.has(entry.type)) {
      errors.push(`${entryPath}.type is not a supported source type.`);
    }
    if (!isNonEmptyString(entry.title)) {
      errors.push(`${entryPath}.title must be a non-empty string.`);
    }

    for (const [field, value] of Object.entries(entry)) {
      if (nameVariables.has(field)) {
        validateNames(value, `${entryPath}.${field}`, errors);
      } else if (dateVariables.has(field)) {
        validateDate(value, `${entryPath}.${field}`, errors);
      } else if (scalarFields.has(field) && !isNonEmptyString(value)) {
        errors.push(`${entryPath}.${field} must be a non-empty string.`);
      }
    }

    if (isNonEmptyString(entry.URL)) {
      try {
        const url = new URL(entry.URL);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          errors.push(`${entryPath}.URL must use http or https.`);
        }
      } catch {
        errors.push(`${entryPath}.URL must be a valid URL.`);
      }
    }

    entries.push(entry);
  });

  return { entries, errors };
}

function renderErrors(errors: string[]): string {
  const items = errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("");
  return `<aside class="works-cited-error" role="alert"><strong>Invalid works cited data</strong><ul>${items}</ul></aside>\n`;
}

export const worksCitedExtension: TokenizerAndRendererExtension = {
  name: "worksCited",
  level: "block",
  start(source) {
    const index = source.search(/^ {0,3}<workscited>[ \t]*$/im);
    return index >= 0 ? index : undefined;
  },
  tokenizer(source) {
    const match = /^ {0,3}<workscited>[ \t]*\r?\n([\s\S]*?)\r?\n {0,3}<\/workscited>[ \t]*(?:\r?\n|$)/i.exec(source);
    if (!match) return;

    const inner = match[1]!;
    const result = /<\/?workscited>/i.test(inner)
      ? { entries: [], errors: ["Nested workscited tags are not supported."] }
      : parseWorksCited(inner);

    return {
      type: "worksCited",
      raw: match[0],
      entries: result.entries,
      errors: result.errors,
    } satisfies WorksCitedToken;
  },
  renderer(token) {
    const worksCited = token as WorksCitedToken;
    if (worksCited.errors.length > 0) {
      return renderErrors(worksCited.errors);
    }

    try {
      const bibliography = new Cite(worksCited.entries).format("bibliography", {
        format: "html",
        lang: "en-US",
        template: styleName,
      });
      return `<section class="works-cited"><h2 class="works-cited-title">Works Cited</h2>${bibliography}</section>\n`;
    } catch {
      return renderErrors(["The citations could not be formatted."]);
    }
  },
};
