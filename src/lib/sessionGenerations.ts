const KEY = "wishwave:session-generation-ids";

export function getSessionGenerationIds(): string[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addSessionGenerationId(id: string): void {
  try {
    const ids = getSessionGenerationIds();
    if (!ids.includes(id)) {
      ids.unshift(id);
      sessionStorage.setItem(KEY, JSON.stringify(ids));
    }
  } catch {
    // ignore
  }
}
