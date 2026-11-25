// Reading and writing the reminder queues' URL state (?since=…&skip=1,2). Pure.

type Params = Record<string, string | string[] | undefined>;

/** The queue's start time, if the URL has a valid one. */
export function queueSince(params: Params): string | null {
  const since = params.since;
  return typeof since === "string" && !Number.isNaN(Date.parse(since)) ? since : null;
}

/** Skipped order ids from "skip=1,2,3". */
export function queueSkipped(params: Params): number[] {
  return typeof params.skip === "string"
    ? params.skip.split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0)
    : [];
}

/** "/path?<extra>&since=…&skip=1,2" for the given start time and skipped ids. */
export function queueHref(path: string, since: string, skipped: number[], extra: Record<string, string> = {}): string {
  const query = new URLSearchParams({ ...extra, since });
  if (skipped.length > 0) query.set("skip", skipped.join(","));
  return `${path}?${query.toString()}`;
}
