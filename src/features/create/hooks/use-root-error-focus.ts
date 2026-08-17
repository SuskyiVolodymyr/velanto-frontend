import { useEffect, useRef, useState } from "react";

/**
 * Scrolls the form-level error into view and focuses it, so a refusal the
 * author can't see doesn't read as a silent no-op.
 *
 * Driven by a counter + effect rather than by touching the ref directly:
 * `onValid` is reachable from the `handleSubmit(...)` call made during render,
 * and react-hooks/refs rejects a ref read from there. A counter, not a boolean,
 * so a second refused save re-focuses instead of doing nothing.
 */
export function useRootErrorFocus() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown === 0) return;
    // Optional-called: jsdom doesn't implement scrollIntoView, and an exception
    // here would take the error message down with it.
    ref.current?.scrollIntoView?.({ block: "center" });
    ref.current?.focus();
  }, [shown]);

  return { ref, reveal: () => setShown((count) => count + 1) };
}
