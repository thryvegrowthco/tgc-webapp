// Making Tiptap JSON safe to send to a Server Action.
//
// prosemirror-model builds every node/mark `attrs` with Object.create(null)
// (see computeAttrs in prosemirror-model/dist/index.js). React's Server Action
// serializer silently DROPS null-prototype objects, so `attrs` disappears
// somewhere between the browser and the server action — a link arrives without
// its href, an image without its src, a heading without its level.
//
// Nothing about this is visible locally: JSON.stringify serializes a
// null-prototype object perfectly well, so the editor looks correct, the saved
// payload looks correct in any Node-side test, and only the row that reaches
// Postgres is wrong. Round-tripping through JSON re-parents every object onto
// Object.prototype, which the serializer preserves.
//
// Call this on anything from editor.getJSON() before it crosses into a
// "use server" function.

export function toPlainJSON<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
