# Atlas

A calm, content-first personal knowledge library built with React and
TypeScript. Atlas follows the published
[A/W Design System](https://adamw-studio.github.io/design-system-A-W/#overview)
tokens and component conventions.

## Prototype scope

- Home, unified library, meetings, notes, documents, and transcripts
- Search across titles, content, summaries, and tags (`Cmd/Ctrl + K`)
- Create, edit, favorite, filter, sort, and delete knowledge
- Collections, related knowledge, metadata, and responsive details panel
- Light and dark themes
- Browser-local persistence and autosave

Data currently persists to `localStorage`. Supabase authentication and database
storage are the intended production integration and are not connected in this
prototype.

## Work locally

```sh
npm install
npm run dev
```

Create a production build with `npm run build`.

## Publish changes

Every push to `main` builds and deploys the site through GitHub Actions:

```sh
git add .
git commit -m "Describe your change"
git push
```

The site is available at <https://adi-9898.github.io/mindspace/>.
