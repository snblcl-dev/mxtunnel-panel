import fs from 'fs';
import path from 'path';

export default function GetFilesDir(
  dir: string,
  excludes: string[] = []
): string[] {
  const results: string[] = [];

  const walk = (current: string) => {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) &&
        !excludes.includes(entry.name)
      ) {
        results.push(full);
      }
    }
  };

  walk(dir);
  return results;
}
