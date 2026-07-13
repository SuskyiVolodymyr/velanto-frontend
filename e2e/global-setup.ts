import { startMockBackend } from "./mock-backend";

/**
 * Starts the shared mock backend on :3001 once for the whole run and returns a
 * teardown that closes it. Runs in Playwright's main process; worker processes
 * reach it over localhost. This replaces each spec binding :3001 itself, which
 * raced under parallel workers.
 */
export default async function globalSetup() {
  const server = await startMockBackend();
  return async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  };
}
