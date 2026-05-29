interface SavePoint {
  stage: number;
  objectives: string[];
}

const KEY = 'byteplague_save';

export const SaveManager = {
  save(stage: number, objectives: readonly string[]): void {
    sessionStorage.setItem(KEY, JSON.stringify({ stage, objectives: [...objectives] }));
  },

  load(): SavePoint | null {
    const raw = sessionStorage.getItem(KEY);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as SavePoint;
    } catch {
      return null;
    }
  },

  clear(): void {
    sessionStorage.removeItem(KEY);
  },
};
