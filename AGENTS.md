# Architecture rules
- Link-in-bio content lives in `pages` + `blocks` (jsonb content per block type); code never hard-codes page content — so teams edit without deploys.
- `PageRenderer` renders plain page+blocks data and all block components read design via `useTheme()` — so the editor preview can reuse it with unsaved data.
- UTM tagging goes through `withUtm` in `src/lib/linkinbio/utm.ts` (source pattern in `utmSourceFor`) — one place to change tracking.
- Access rules are prototype-open and named "Prototype open ..." — tighten when sign-in arrives.
- Fixed UI strings live in `src/lib/uiText.ts` until a translation system exists.
- Editor (`/`, `/edit/:address`) keeps a working copy in `useEditorState` and autosaves the whole page + block list ~1s after changes — simple and predictable for a no-login prototype.
- Addresses "edit", "admin", "api", "settings" are reserved (DB check + `RESERVED_ADDRESSES`) — so editor routes never clash with pages.
- Editor uses zinc/teal via `html.editor-theme` CSS variables — internal-tool look without touching public pages.
- Image uploads go straight to the `page-images` bucket via XHR (for progress), max 5 MB.
