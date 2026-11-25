import { describe, expect, it } from "vitest";
import { queueHref, queueSince, queueSkipped } from "./queue-params";

describe("queue URL state", () => {
  it("reads a valid start time only", () => {
    expect(queueSince({ since: "2026-12-06T12:00:00.000Z" })).toBe("2026-12-06T12:00:00.000Z");
    expect(queueSince({ since: "nonsense" })).toBeNull();
    expect(queueSince({})).toBeNull();
  });

  it("reads skipped ids, ignoring junk", () => {
    expect(queueSkipped({ skip: "3,7,x,-1,0" })).toEqual([3, 7]);
    expect(queueSkipped({})).toEqual([]);
  });

  it("writes the URL with extra params, the start time and the skipped list", () => {
    expect(queueHref("/today/reminders", "2026-12-06T12:00:00Z", [3, 7], { day: "2026-12-07" })).toBe(
      "/today/reminders?day=2026-12-07&since=2026-12-06T12%3A00%3A00Z&skip=3%2C7",
    );
    expect(queueHref("/payments/queue", "2026-12-06T12:00:00Z", [])).toBe(
      "/payments/queue?since=2026-12-06T12%3A00%3A00Z",
    );
  });

  it("round-trips", () => {
    const href = queueHref("/x", "2026-12-06T12:00:00.000Z", [5, 9]);
    const params = Object.fromEntries(new URL(href, "http://h").searchParams);
    expect(queueSince(params)).toBe("2026-12-06T12:00:00.000Z");
    expect(queueSkipped(params)).toEqual([5, 9]);
  });
});
