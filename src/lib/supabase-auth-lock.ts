type AuthLockTask<T> = () => Promise<T>;

let authLockTail: Promise<void> = Promise.resolve();

/** Serializes GoTrue storage operations avoids Navigator Lock orphans in React Strict Mode. */
export function runWithSupabaseAuthLock<T>(task: AuthLockTask<T>): Promise<T> {
  const run = authLockTail.then(task, task);
  authLockTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function createSupabaseAuthLock<T>(
  _name: string,
  _acquireTimeout: number,
  fn: AuthLockTask<T>,
): Promise<T> {
  return runWithSupabaseAuthLock(fn);
}

/** @internal Test-only reset for lock queue isolation. */
export function resetSupabaseAuthLockForTests(): void {
  if (process.env.VITEST !== 'true') {
    throw new Error('resetSupabaseAuthLockForTests is only available under Vitest');
  }
  authLockTail = Promise.resolve();
}
