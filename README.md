# Search Configuration for Directus

Provides a way to configure the Directus search filters for a collection. This allows you to supercharge your Directus `search` field with AND/OR groups, strict equality, case-insensitive searches, and nested relational searches, fully under your control.

## How It Works

When a user searches a collection, this extension intercepts the search query and replaces the default Directus search behavior with a custom filter defined by you. The extension looks for a field named `_search_config` in the collection and uses its configuration to build the filter that will be applied.

Inside the filter configuration, you use **placeholders** that get replaced at search time:

- **`$SEARCH`** — Use this placeholder for **string** fields (e.g., name, email, description). It will be replaced with the user's search query.
- **`-1`** — Use this placeholder for fields that only accept **numbers** (e.g., age, id, quantity). It will be replaced with the numeric value of the search query. If the search query is not a valid number, the condition is skipped.

### Search Modes

The extension supports two search modes:

- **Lax mode** (default) — The search query is split into individual words, and **each word must match independently**. For example, searching `joão maia` will find records where both `joão` and `maia` appear (not necessarily together in the same field).
- **Strict mode** — Wrap the search query in double quotes (`"`) to search for the **exact phrase**. For example, searching `"joão maia"` will only find records containing the exact string `joão maia`.

### Accent-Insensitive Search

The extension normalizes diacritical marks so that accented characters match their unaccented equivalents. For example, searching for `joão` will also match `joao`, and vice versa. This works for all common diacritics (é/e, ã/a, ç/c, ñ/n, ü/u, etc.).

## Installation

This plugin has not yet been published on NPM, but you can try installing it directly from GitHub.

## Usage

1. Add a new field named `_search_config` in the collection you want to add search configuration for. The field must use the key `_search_config`.

2. Configure your filter in the `Search Config` interface options. Use `$SEARCH` as a placeholder for string fields and `-1` as a placeholder for numeric fields.

3. Search the collection. Both app and API searches will now use the filter pattern you've specified. You can use nested relational fields for the search.

![](./assets/screenshots/search-config.png)
