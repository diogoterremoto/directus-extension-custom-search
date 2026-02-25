import type { SandboxHookRegisterContext } from 'directus:api'

// Strip diacritical marks from a string (e.g., "é" → "e", "ã" → "a", "ç" → "c").
function normalizeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// Deep clone a JSON-serializable value.
function deepClone(value: unknown): unknown {
  if (value == null) return value
  if (Array.isArray(value)) return value.map(deepClone)
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const key in value as Record<string, unknown>) {
      result[key] = deepClone((value as Record<string, unknown>)[key])
    }
    return result
  }
  return value
}

// Recursively replace $SEARCH and -1 placeholders in a filter object.
function replacePlaceholders(value: unknown, searchTerm: string): unknown {
  if (value == null) return value

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = replacePlaceholders(value[i], searchTerm)
    }
  } else if (typeof value === 'object') {
    for (const key in value as Record<string, unknown>) {
      ;(value as Record<string, unknown>)[key] = replacePlaceholders(
        (value as Record<string, unknown>)[key],
        searchTerm,
      )
    }
  } else if (typeof value === 'string' && value === '$SEARCH') {
    return searchTerm
  } else if (typeof value === 'string' && value === '-1') {
    const result = +searchTerm
    if (!isNaN(result)) return result
  }

  return value
}

// Parse the search string to determine mode and extract terms.
// Wrapping the search in double quotes enables strict (exact phrase) mode.
// Without quotes, the search is split into individual words (lax mode).
function parseSearchInput(search: string): {
  strict: boolean
  terms: string[]
} {
  const trimmed = search.trim()
  if (
    trimmed.startsWith('"') &&
    trimmed.endsWith('"') &&
    trimmed.length >= 2
  ) {
    return { strict: true, terms: [trimmed.slice(1, -1)] }
  }
  return {
    strict: false,
    terms: trimmed.split(/\s+/).filter((t) => t.length > 0),
  }
}

// Build a filter for a single search term, generating accent-insensitive variants when needed.
function buildFilterForTerm(
  searchConfig: unknown,
  term: string,
): unknown {
  const normalizedTerm = normalizeAccents(term)

  if (normalizedTerm === term) {
    return replacePlaceholders(deepClone(searchConfig), term)
  }

  // Generate filters for both the original and accent-stripped versions.
  const originalFilter = replacePlaceholders(deepClone(searchConfig), term)
  const normalizedFilter = replacePlaceholders(
    deepClone(searchConfig),
    normalizedTerm,
  )

  return { _or: [originalFilter, normalizedFilter] }
}

// Overrides the search functionality with additional configuration from a _search_config field from a collection.
export default ({ filter }: SandboxHookRegisterContext, { services }: { services: any }) => {
  filter(
    'items.query',
    //@ts-ignore
    async (
      query: { search?: string; filter: any },
      { collection }: { collection: string },
      context: { schema: any },
    ) => {
      if (!query.search) return query

      const fieldsService = new services.FieldsService({
        schema: context?.schema,
        accountability: { admin: true, roles: [] },
      })

      // Bail out early if we don't find any search configuration information.
      let searchConfig: unknown = null
      try {
        searchConfig = (
          await fieldsService.readOne(collection, '_search_config')
        )?.meta?.options?.search_config
        if (!searchConfig) return query
      } catch (_e) {
        return query
      }

      const { strict, terms } = parseSearchInput(query.search)

      if (terms.length === 0) return query

      let searchFilter: unknown

      if (strict || terms.length === 1) {
        // Strict mode or single term: use the full phrase.
        const term = terms.join(' ')
        searchFilter = buildFilterForTerm(searchConfig, term)
      } else {
        // Lax mode: each word must match independently.
        const wordFilters = terms.map((term) =>
          buildFilterForTerm(searchConfig, term),
        )
        searchFilter =
          wordFilters.length === 1 ? wordFilters[0] : { _and: wordFilters }
      }

      // Take search out of the query and apply the custom filter.
      const modifiedQuery = { ...query, search: undefined }
      if (!modifiedQuery.filter) modifiedQuery.filter = searchFilter
      else modifiedQuery.filter = { _and: [modifiedQuery.filter, searchFilter] }
      return modifiedQuery
    },
  )
}
