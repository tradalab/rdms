import type * as Monaco from "monaco-editor"

const KEYWORDS =
  "MATCH OPTIONAL WHERE RETURN WITH CREATE MERGE DELETE DETACH SET REMOVE ORDER BY ASC DESC SKIP LIMIT UNWIND AS DISTINCT ON CALL YIELD UNION ALL AND OR XOR NOT IN STARTS ENDS CONTAINS IS NULL TRUE FALSE CASE WHEN THEN ELSE END FOREACH INDEX CONSTRAINT EXPLAIN PROFILE".split(
    " "
  )

const FUNCTIONS =
  "count collect sum avg min max size labels type id keys properties toInteger toFloat toString toUpper toLower substring replace split trim coalesce range head last tail exists timestamp".split(
    " "
  )

// Registered once, but the graph it completes for changes with every key opened,
// so it reads through this holder instead of closing over one snapshot.
let schema: { labels: string[]; relationships: string[]; properties: string[] } = {
  labels: [],
  relationships: [],
  properties: [],
}

export function setCypherSchema(next: { labels?: string[]; relationships?: string[]; properties?: string[] }) {
  schema = {
    labels: next.labels ?? [],
    relationships: next.relationships ?? [],
    properties: next.properties ?? [],
  }
}

let registered = false

export function registerCypher(monaco: typeof Monaco) {
  if (registered) return
  registered = true

  monaco.languages.register({ id: "cypher" })

  monaco.languages.setLanguageConfiguration("cypher", {
    comments: { lineComment: "//", blockComment: ["/*", "*/"] },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "'", close: "'" },
      { open: '"', close: '"' },
      { open: "`", close: "`" },
    ],
  })

  monaco.languages.setMonarchTokensProvider("cypher", {
    ignoreCase: true,
    keywords: KEYWORDS,
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/'([^'\\]|\\.)*'/, "string"],
        [/"([^"\\]|\\.)*"/, "string"],
        [/`[^`]*`/, "identifier"],
        [/:\s*[A-Za-z_]\w*/, "type"], // :Label and :REL_TYPE
        [/\$[A-Za-z_]\w*/, "variable"],
        [/\d+(\.\d+)?/, "number"],
        [/[A-Za-z_]\w*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
        [/[{}()[\]]/, "@brackets"],
        [/[<>=~!+\-*/%|]+/, "operator"],
      ],
      comment: [
        [/[^/*]+/, "comment"],
        [/\*\//, "comment", "@pop"],
        [/[/*]/, "comment"],
      ],
    },
  })

  monaco.languages.registerCompletionItemProvider("cypher", {
    triggerCharacters: [":", "."],
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }
      const { CompletionItemKind } = monaco.languages

      const item = (label: string, kind: Monaco.languages.CompletionItemKind, insert = label) => ({
        label,
        kind,
        insertText: insert,
        range,
      })

      return {
        suggestions: [
          ...KEYWORDS.map(k => item(k, CompletionItemKind.Keyword)),
          ...FUNCTIONS.map(f => item(f, CompletionItemKind.Function, `${f}()`)),
          ...schema.labels.map(l => item(l, CompletionItemKind.Class)),
          ...schema.relationships.map(r => item(r, CompletionItemKind.Interface)),
          ...schema.properties.map(p => item(p, CompletionItemKind.Property)),
        ],
      }
    },
  })
}
