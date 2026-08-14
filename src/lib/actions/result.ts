/** Shared result shape for every server action. Not a "use server" module, so
 * it may export a type. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };
