export function normalisePoetName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[łŁ]/g, (c) => (c === "ł" ? "l" : "L"))
    .trim()
    .toLowerCase();
}
