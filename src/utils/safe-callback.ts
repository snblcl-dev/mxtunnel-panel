export default async function SafeCallback<T>(callback: () => Promise<T>): Promise<T | null> {
  try {
    return await callback();
  } catch {
    return null;
  }
}
