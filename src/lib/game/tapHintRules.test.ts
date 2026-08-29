import { describe, expect, it } from "vitest";
import { canArmTapHint, TAP_HINT_LIMIT } from "./tapHintRules";

/**
 * The rules the tap hint arms by. They live apart from `GameShell` because the
 * test environment here is node: there is no DOM to mount a cabinet into, and
 * the one thing worth pinning down is the decision, not the markup.
 */
describe("canArmTapHint", () => {
  const armable = {
    phase: "playing" as const,
    onScreen: true,
    count: 0,
    armed: false,
  };

  it("arms on a round that is being looked at", () => {
    expect(canArmTapHint(armable)).toBe(true);
  });

  /* The one that matters. Every deck lesson renders all of its beats and hides
     the inactive ones with `display: none`, and every scrolling lesson mounts
     its game far below the fold, so a game dealt server-side is in "playing"
     the moment the page loads whether or not anybody can see it. Arming there
     spends one of the few showings this hint gets on nobody. */
  it("does not arm while the cabinet is off screen", () => {
    expect(canArmTapHint({ ...armable, onScreen: false })).toBe(false);
  });

  it("does not arm before the round starts or after it ends", () => {
    expect(canArmTapHint({ ...armable, phase: "ready" })).toBe(false);
    expect(canArmTapHint({ ...armable, phase: "over" })).toBe(false);
  });

  it("stops once this game has had its showings", () => {
    expect(canArmTapHint({ ...armable, count: TAP_HINT_LIMIT - 1 })).toBe(true);
    expect(canArmTapHint({ ...armable, count: TAP_HINT_LIMIT })).toBe(false);
    expect(canArmTapHint({ ...armable, count: TAP_HINT_LIMIT + 1 })).toBe(false);
  });

  it("arms at most once for a mount", () => {
    expect(canArmTapHint({ ...armable, armed: true })).toBe(false);
  });
});
