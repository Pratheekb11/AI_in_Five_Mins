"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import { playCue } from "@/lib/game/sound";
import { type Mood, POSES } from "./moods";
import { NimoFlat } from "./NimoFlat";

/**
 * Nimo, in three dimensions.
 */

const C = {
  /* Warmed from the source file's grey-brown, which went muddy against cream
     paper. The page is a risograph print and he has to look printed on it. */
  brown: "#7a6552",
  brownDark: "#57453a",
  face: "#efe6d2",
  white: "#fffdf6",
  ink: "#14100c",
  nose: "#1c1712",
  whisker: "#f3efe4",
  /* The books he sits on, in the site's own inks. They carried over from the
     owl: he is a guide on a stack of reading, and without them he floated in
     the middle of the frame with nothing under him. */
  book: "#d9552f",
  bookTeal: "#1f4d49",
  pages: "#f3ecdd",
  rim: "#2a2a2a",
} as const;

/** Three flat steps, enough to read as volume, few enough to read as print. */
function useToonGradient() {
  return useMemo(() => {
    const data = new Uint8Array([90, 90, 90, 165, 165, 165, 255, 255, 255]);
    const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBFormat);
    tex.needsUpdate = true;
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    return tex;
  }, []);
}

/**
 * The source model is built at about 0.98 units tall, roughly half the height
 * of the owl it replaces. Scaling here rather than rewriting every coordinate
 * keeps this file directly comparable with `nimo-mascot.html`, and keeps the
 * camera below unchanged.
 */
const SCALE = 1.42;

/**
 * Where the group sits so the whole otter is centred on the origin.
 */
const BASE_Y = -0.56 * SCALE;

/**
 * The cursor's position on the page, in client coordinates.
 */
function usePagePointer() {
  const at = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      at.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return at;
}

/** How far the pupil can slide inside the eyeball before it hits the rim. */
const PUPIL_REACH = 0.022;

/**
 * What Nimo is doing right now because somebody touched him.
 */
export type EmoteKind = "none" | "greet" | "salute" | "spin";
/** `id` climbs on every trigger, so pressing him twice in a row restarts the
 *  emote rather than being read as no change at all. */
export type Emote = { kind: EmoteKind; id: number };

/** Seconds each emote runs for. */
const GREET_SECONDS = 1.5;
const SPIN_SECONDS = 1.15;
const SALUTE_SECONDS = 1.35;
/** Turns in a spin. Two reads as deliberate; one reads as a glitch. */
const SPIN_TURNS = 2;
/** How long a press has to last before it is a hold rather than a tap. */
const HOLD_MS = 420;

/**
 * Where an arm hangs, and where it goes when he waves or salutes.
 */
const ARM_REST = [0.255, 0.26, 0.18] as const;
const ARM_WAVE = [0.31, 0.42, 0.22] as const;
/* The salute arm sits well FORWARD as well as up. At the same depth as his
   shoulder the raised paw ends up inside his own head, which the frames
   showed as the gesture simply vanishing halfway through. */
const ARM_SALUTE = [0.3, 0.44, 0.34] as const;

function easeInOut(p: number): number {
  return p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
}

function Otter({
  mood,
  follow,
  emote,
}: {
  mood: Mood;
  follow: boolean;
  emote: Emote;
}) {
  const gradient = useToonGradient();
  const root = useRef<THREE.Group>(null);
  /* Everything above the books. The spin turns the otter on his perch; a spin
     that took the books with it looked like the camera moving, not like him. */
  const spinner = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  /* Elbows. The arm used to be one rigid group hinged at the shoulder, and a
     rigid arm can only ever be raised straight, which for a salute is the one
     silhouette nobody wants on their mascot. A salute is a BENT arm with the
     paw at the brow, so the joint has to exist. */
  const elbowL = useRef<THREE.Group>(null);
  const elbowR = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const lidL = useRef<THREE.Mesh>(null);
  const lidR = useRef<THREE.Mesh>(null);
  const pupilL = useRef<THREE.Group>(null);
  const pupilR = useRef<THREE.Group>(null);

  // Blink timing lives outside React entirely, it changes sixty times a
  // second and nothing on the page needs to re-render when it does. Seeded
  // with a constant rather than a random number, because rendering has to be
  // pure; the jitter gets added on the first frame instead.
  const blink = useRef({ next: 2.6, closing: 0, seeded: false });

  /* The running emote and how far through it is. Restarted from the prop,
     then owned entirely by the frame loop until it finishes. */
  const running = useRef<{ kind: EmoteKind; t: number }>({
    kind: "none",
    t: 0,
  });
  useEffect(() => {
    running.current = { kind: emote.kind, t: 0 };
  }, [emote]);
  const pagePointer = usePagePointer();
  const canvas = useThree((s) => s.gl.domElement);

  const mat = useMemo(
    () => ({
      brown: new THREE.MeshToonMaterial({
        color: C.brown,
        gradientMap: gradient,
      }),
      brownDark: new THREE.MeshToonMaterial({
        color: C.brownDark,
        gradientMap: gradient,
      }),
      face: new THREE.MeshToonMaterial({
        color: C.face,
        gradientMap: gradient,
      }),
      white: new THREE.MeshToonMaterial({
        color: C.white,
        gradientMap: gradient,
      }),
      ink: new THREE.MeshBasicMaterial({ color: C.ink }),
      nose: new THREE.MeshToonMaterial({
        color: C.nose,
        gradientMap: gradient,
      }),
      whisker: new THREE.MeshBasicMaterial({ color: C.whisker }),
      rim: new THREE.MeshToonMaterial({ color: C.rim, gradientMap: gradient }),
      book: new THREE.MeshToonMaterial({
        color: C.book,
        gradientMap: gradient,
      }),
      bookTeal: new THREE.MeshToonMaterial({
        color: C.bookTeal,
        gradientMap: gradient,
      }),
      pages: new THREE.MeshToonMaterial({
        color: C.pages,
        gradientMap: gradient,
      }),
    }),
    [gradient],
  );

  useFrame((state, delta) => {
    const pose = POSES[mood];
    const t = state.clock.elapsedTime;

    // --- breathing and bounce -------------------------------------------
    if (root.current) {
      root.current.position.y =
        BASE_Y +
        Math.sin(t * 2.4) * pose.bounce +
        (mood === "celebrate" ? Math.abs(Math.sin(t * 7)) * 0.05 : 0);
    }
    // The source file breathes by scaling the body a hair. Kept, because it is
    // what stops him reading as a still image while he waits for an answer.
    if (body.current) {
      const breathe = 1 + Math.sin(t * 1.1) * 0.015;
      body.current.scale.set(1.05 * breathe, 1.1, 0.95 * breathe);
    }

    // --- where is the cursor, relative to his face? -----------------------
    // Measured against the canvas each frame rather than once, so he keeps
    // aiming at the right place after the page scrolls. Half the viewport is
    // the unit: a cursor at the edge of the screen turns him as far as he
    // goes, anywhere further is the same look.
    let aimX = 0;
    let aimY = 0;
    if (follow && pagePointer.current) {
      const box = canvas.getBoundingClientRect();
      // His eyes sit in the upper third of the frame, not the middle, so
      // that is the point the angles are measured from.
      const eyesX = box.left + box.width / 2;
      const eyesY = box.top + box.height * 0.3;
      aimX = THREE.MathUtils.clamp(
        (pagePointer.current.x - eyesX) / (window.innerWidth / 2),
        -1,
        1,
      );
      aimY = THREE.MathUtils.clamp(
        (pagePointer.current.y - eyesY) / (window.innerHeight / 2),
        -1,
        1,
      );
    }

    // --- head: follows the cursor, then the mood on top ------------------
    let headPitch = 0;
    if (head.current) {
      // Positive rotation.x pitches the face downward, and aimY is positive
      // when the cursor is below him, so these already agree.
      const wantX = aimY * 0.22;
      const wantY = aimX * 0.45;

      head.current.rotation.y +=
        (wantY - head.current.rotation.y) * Math.min(1, delta * 5);
      head.current.rotation.x +=
        (wantX - THREE.MathUtils.degToRad(pose.nod) - head.current.rotation.x) *
        Math.min(1, delta * 5);
      head.current.rotation.z +=
        (THREE.MathUtils.degToRad(pose.tilt) - head.current.rotation.z) *
        Math.min(1, delta * 6);
      // Where the head ended up this frame. An emote below adds to this
      // number rather than to the rotation itself, so nothing compounds.
      headPitch = head.current.rotation.x;
    }

    // --- arms -------------------------------------------------------------
    // An otter has paws rather than wings, so the mood's `wings` value drives
    // how far they lift from the chest. At full lift he is clapping, which is
    // the reaction the celebrate pose was always asking for.
    const clap = pose.wings > 0.5 ? Math.sin(t * 12) * 0.3 * pose.wings : 0;
    if (armL.current) {
      const want = 0.35 + pose.wings * 0.9 + clap;
      armL.current.rotation.z +=
        (want - armL.current.rotation.z) * Math.min(1, delta * 8);
    }
    if (armR.current) {
      const want = -0.35 - pose.wings * 0.9 - clap;
      armR.current.rotation.z +=
        (want - armR.current.rotation.z) * Math.min(1, delta * 8);
      armR.current.rotation.x +=
        (0 - armR.current.rotation.x) * Math.min(1, delta * 8);
    }
    // Elbows straighten and shoulders slide home on their own, so nothing has
    // to remember to undo them when an emote ends part-way through.
    for (const joint of [elbowL.current, elbowR.current]) {
      if (!joint) continue;
      joint.rotation.z += (0 - joint.rotation.z) * Math.min(1, delta * 8);
      joint.rotation.x += (0 - joint.rotation.x) * Math.min(1, delta * 8);
    }
    for (const [shoulder, side] of [
      [armL.current, -1],
      [armR.current, 1],
    ] as const) {
      if (!shoulder) continue;
      const k = Math.min(1, delta * 8);
      shoulder.position.x += (side * ARM_REST[0] - shoulder.position.x) * k;
      shoulder.position.y += (ARM_REST[1] - shoulder.position.y) * k;
      shoulder.position.z += (ARM_REST[2] - shoulder.position.z) * k;
    }

    // --- blinking ---------------------------------------------------------
    const b = blink.current;
    if (!b.seeded) {
      b.seeded = true;
      b.next += Math.random() * 3;
    }
    b.next -= delta;
    if (b.next <= 0) {
      b.closing = 0.16;
      b.next = 2.4 + Math.random() * 3.5;
    }
    let closed = pose.lids;
    if (b.closing > 0) {
      b.closing -= delta;
      // A blink is a quick down-and-up, so a triangle over its own duration.
      closed = Math.max(closed, 1 - Math.abs(b.closing - 0.08) / 0.08);
    }
    const squash = Math.max(0.02, 1 - closed);
    if (lidL.current) lidL.current.scale.y = squash;
    if (lidR.current) lidR.current.scale.y = squash;

    // --- pupils -----------------------------------------------------------
    // The head only turns part of the way; the eyes cover the rest, which is
    // what makes him read as looking AT you rather than merely facing you.
    // They slide inside the eyeball, so the offset is small and clamped to
    // the white, a pupil that reaches the rim looks broken, not attentive.
    const pupilX = aimX * PUPIL_REACH;
    const pupilY = -aimY * PUPIL_REACH * 0.8;
    for (const p of [pupilL.current, pupilR.current]) {
      if (!p) continue;
      p.position.x += (pupilX - p.position.x) * Math.min(1, delta * 9);
      p.position.y += (pupilY - p.position.y) * Math.min(1, delta * 9);
    }

    // --- emotes -----------------------------------------------------------
    // Last, so what he was asked to do beats the mood he was in rather than
    // being averaged with it.
    //
    // Everything here is ASSIGNED, never added to. The lerps above have
    // already written this frame's value, so `+=` on top of one of them
    // compounds: the offset is applied again every frame, the lerp only pulls
    // a fraction of it back, and a head meant to tilt a few degrees ends up
    // cranked over on its side by the end of a wave.
    const e = running.current;
    if (e.kind === "none") {
      if (spinner.current) {
        spinner.current.rotation.y +=
          (0 - spinner.current.rotation.y) * Math.min(1, delta * 6);
        spinner.current.position.y +=
          (0 - spinner.current.position.y) * Math.min(1, delta * 6);
      }
    } else {
      e.t += delta;
      const span =
        e.kind === "spin"
          ? SPIN_SECONDS
          : e.kind === "salute"
            ? SALUTE_SECONDS
            : GREET_SECONDS;
      const p = Math.min(1, e.t / span);
      const tilt = THREE.MathUtils.degToRad(pose.tilt);

      if (e.kind === "greet") {
        // Paw up fast, wave for most of it, down at the end. The window is
        // what makes it read as a greeting rather than as a stuck arm.
        //
        // The arm goes up and OUTWARD, away from his body, so the whole of it
        // clears his silhouette and the swing is against open paper. Swung
        // inward it waves across his own belly and half of it is gone.
        const up = Math.min(1, p / 0.18);
        const down = p > 0.78 ? (p - 0.78) / 0.22 : 0;
        const lift = up * (1 - down);
        if (armR.current) {
          armR.current.position.set(
            ARM_REST[0] + lift * (ARM_WAVE[0] - ARM_REST[0]),
            ARM_REST[1] + lift * (ARM_WAVE[1] - ARM_REST[1]),
            ARM_REST[2] + lift * (ARM_WAVE[2] - ARM_REST[2]),
          );
          armR.current.rotation.z =
            -0.26 + lift * (2.55 + Math.sin(e.t * 15) * 0.28);
        }
        if (head.current) head.current.rotation.z = tilt + lift * 0.14;
        if (spinner.current) {
          spinner.current.position.y =
            Math.abs(Math.sin(p * Math.PI * 3)) * 0.02 * lift;
        }
      } else if (e.kind === "salute") {
        // The opposite shape to the wave, on purpose. A salute is a snap up,
        // a still hold, and a snap down; the stillness in the middle is the
        // whole read, so there is nothing oscillating anywhere in it.
        //
        // THE ARM MUST BEND. Raised from the shoulder alone it is a straight
        // diagonal arm, which is a completely different and much worse
        // gesture. So the shoulder lifts and swings FORWARD, the elbow folds
        // the forearm back in toward his face, and the paw finishes at the
        // brow. Bent elbow, paw touching the head, nothing extended: that is
        // the whole difference and it is not a detail.
        const up = Math.min(1, p / 0.14);
        const down = p > 0.7 ? Math.min(1, (p - 0.7) / 0.16) : 0;
        const lift = up * (1 - down);
        if (armR.current) {
          armR.current.position.set(
            ARM_REST[0] + lift * (ARM_SALUTE[0] - ARM_REST[0]),
            ARM_REST[1] + lift * (ARM_SALUTE[1] - ARM_REST[1]),
            ARM_REST[2] + lift * (ARM_SALUTE[2] - ARM_REST[2]),
          );
          // Straight UP alongside his head, not out at an angle.
          armR.current.rotation.z = -0.26 - lift * 2.5;
          armR.current.rotation.x = lift * 0.12;
        }
        if (elbowR.current) {
          // The fold that brings the paw in to the temple.
          elbowR.current.rotation.z = lift * 0.8;
          elbowR.current.rotation.x = lift * 0.3;
        }
        if (head.current) {
          // Chin up, and the head turned a touch toward the paw.
          head.current.rotation.x = headPitch - lift * 0.13;
          head.current.rotation.z = tilt * (1 - lift) + lift * 0.06;
        }
        if (spinner.current) spinner.current.position.y = lift * 0.012;
      } else if (spinner.current) {
        spinner.current.rotation.y = easeInOut(p) * Math.PI * 2 * SPIN_TURNS;
        // A hop under the turn. Spinning on the spot at a fixed height looks
        // like a turntable; leaving the books for a moment looks like glee.
        spinner.current.position.y = Math.sin(p * Math.PI) * 0.14;
      }

      if (p >= 1) {
        e.kind = "none";
        e.t = 0;
        if (spinner.current) spinner.current.rotation.y = 0;
      }
    }
  });

  /* Keys are prefixed rather than the bare side number: eyes and whiskers
     are siblings in the head group, and two children keyed "1" is a React
     error, not a style preference. */
  const eye = (side: 1 | -1) => (
    <group key={`eye${side}`} position={[side * 0.115, 0.03, 0.22]}>
      <mesh
        ref={side === 1 ? lidR : lidL}
        material={mat.white}
        geometry={new THREE.SphereGeometry(0.078, 24, 20)}
      />
      {/* Pupil and catchlight travel together, a highlight that stayed put
          while the pupil moved read as a smudge on the eye. */}
      <group ref={side === 1 ? pupilR : pupilL}>
        <mesh position={[0, 0, 0.058]} material={mat.ink}>
          <sphereGeometry args={[0.05, 16, 14]} />
        </mesh>
        <mesh position={[0.017, 0.017, 0.082]} material={mat.white}>
          <sphereGeometry args={[0.018, 10, 8]} />
        </mesh>
      </group>
    </group>
  );

  /**
   * One arm: shoulder, then elbow, then paw.
   */
  const arm = (side: 1 | -1) => (
    <group
      key={`arm${side}`}
      ref={side === 1 ? armR : armL}
      position={[side * 0.255, 0.26, 0.18]}
      rotation={[0, 0, side * -0.26]}
    >
      <mesh position={[0, -0.06, 0]} material={mat.brown}>
        <capsuleGeometry args={[0.06, 0.08, 8, 16]} />
      </mesh>
      <group ref={side === 1 ? elbowR : elbowL} position={[0, -0.1, 0]}>
        <mesh position={[side * -0.04, -0.03, 0.03]} material={mat.face}>
          <sphereGeometry args={[0.06, 16, 14]} />
        </mesh>
      </group>
    </group>
  );

  /**
   * Three whiskers a side, each a thin cylinder springing from the muzzle.
   */
  const whiskers = (side: 1 | -1) => (
    <group key={`whiskers${side}`}>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[side * 0.12, -0.075 - i * 0.022, 0.285]}
          rotation={[0, side * (0.35 + i * 0.1), Math.PI / 2 + i * 0.12]}
          material={mat.whisker}
        >
          <cylinderGeometry args={[0.007, 0.004, 0.22, 6]} />
        </mesh>
      ))}
    </group>
  );

  return (
    <group ref={root} position={[0, BASE_Y, 0]} scale={SCALE}>
      {/* ------------------------------------------------------- perch --- */}
      {/* Three books, each turned a little off the one below, so the stack
          reads as something somebody put down rather than as a plinth. */}
      {[
        { w: 0.58, h: 0.07, d: 0.44, y: 0, r: 0.05, m: mat.book },
        { w: 0.53, h: 0.065, d: 0.4, y: 0.07, r: -0.08, m: mat.bookTeal },
        { w: 0.47, h: 0.06, d: 0.36, y: 0.135, r: 0.1, m: mat.book },
      ].map((b) => (
        <group key={b.y} position={[0, b.y, 0]} rotation={[0, b.r, 0]}>
          <mesh position={[0, b.h / 2, 0]} material={b.m}>
            <boxGeometry args={[b.w, b.h, b.d]} />
          </mesh>
          <mesh position={[0, b.h * 0.5, 0]} material={mat.pages}>
            <boxGeometry args={[b.w * 0.94, b.h * 0.7, b.d * 0.94]} />
          </mesh>
        </group>
      ))}

      <group ref={spinner}>
        {/* -------------------------------------------------------- body --- */}
        <group position={[0, 0.195, 0]}>
          <mesh
            ref={body}
            position={[0, 0.3, 0]}
            scale={[1, 1.12, 0.95]}
            material={mat.brown}
          >
            <sphereGeometry args={[0.34, 48, 40]} />
          </mesh>

          {/* pale belly */}
          <mesh
            position={[0, 0.28, 0.205]}
            scale={[0.88, 1.14, 0.6]}
            material={mat.face}
          >
            <sphereGeometry args={[0.24, 40, 34]} />
          </mesh>

          {/* The tail, swept round to his left and forward onto the books.
            Otters are mostly tail, and tucked straight out behind him it was
            hidden by his own body from every angle the page ever shows him
            at, which left the silhouette of a bear. Out here it is the one
            part of him that says which animal this is. */}
          <mesh
            position={[-0.25, 0.1, -0.04]}
            rotation={[Math.PI / 2.6, 0, -1.15]}
            scale={[1, 1, 0.8]}
            material={mat.brownDark}
          >
            {/* A capsule, not a cylinder: flat end caps read as a plank
              propped against him rather than as something that grew there. */}
            <capsuleGeometry args={[0.075, 0.24, 8, 20]} />
          </mesh>

          {arm(1)}
          {arm(-1)}

          {/* stubby feet */}
          {[1, -1].map((s) => (
            <mesh
              key={s}
              position={[s * 0.21, 0.03, 0.13]}
              scale={[1.25, 0.55, 1.3]}
              material={mat.brownDark}
            >
              <sphereGeometry args={[0.09, 16, 14]} />
            </mesh>
          ))}
        </group>

        {/* -------------------------------------------------------- head --- */}
        <group ref={head} position={[0, 0.815, 0.08]}>
          <mesh scale={[1.08, 0.93, 0.98]} material={mat.brown}>
            <sphereGeometry args={[0.3, 48, 40]} />
          </mesh>

          {/* Ears, with a paler inner cup. Nudged up and out from the source
            file so they break the silhouette: set flush against a round head
            they disappeared entirely at the size he is drawn in a walkthrough. */}
          {[1, -1].map((s) => (
            <group key={s} position={[s * 0.245, 0.175, -0.02]}>
              <mesh scale={[1, 0.95, 0.6]} material={mat.brownDark}>
                <sphereGeometry args={[0.082, 20, 16]} />
              </mesh>
              <mesh
                position={[0, 0, 0.035]}
                scale={[0.62, 0.62, 0.4]}
                material={mat.face}
              >
                <sphereGeometry args={[0.082, 16, 14]} />
              </mesh>
            </group>
          ))}

          {/* The pale mask that makes him read as an otter and not a bear.
            Smaller and lower than the source file's, which covered the whole
            face and left him looking like a blank oval at small sizes. Sitting
            it under the eyes puts fur back around them, which is where the
            expression lives. */}
          <mesh
            position={[0, -0.075, 0.175]}
            scale={[0.95, 0.66, 0.62]}
            material={mat.face}
          >
            <sphereGeometry args={[0.21, 36, 30]} />
          </mesh>

          {/* The muzzle: broad and flat rather than a snout. An otter's face
            is wider than it is long, and the narrow version read as a mouse. */}
          <mesh
            position={[0, -0.085, 0.255]}
            scale={[1.35, 0.62, 0.8]}
            material={mat.face}
          >
            <sphereGeometry args={[0.1, 24, 20]} />
          </mesh>

          {eye(1)}
          {eye(-1)}

          {/* Round reading glasses. Nimo has worn them since he was an owl, and
            without them he is a soft toy rather than the one on this site who
            checks things. Set just clear of the eye whites so they read as
            glass in front of an eye rather than as rings painted on it. */}
          {[1, -1].map((s) => (
            <mesh
              key={s}
              position={[s * 0.115, 0.03, 0.305]}
              material={mat.rim}
            >
              <torusGeometry args={[0.098, 0.011, 10, 28]} />
            </mesh>
          ))}
          <mesh
            position={[0, 0.03, 0.305]}
            rotation={[0, 0, Math.PI / 2]}
            material={mat.rim}
          >
            <cylinderGeometry args={[0.009, 0.009, 0.045, 8]} />
          </mesh>
          {[1, -1].map((s) => (
            <mesh
              key={s}
              position={[s * 0.195, 0.035, 0.235]}
              rotation={[0, s * 0.6, Math.PI / 2]}
              material={mat.rim}
            >
              <cylinderGeometry args={[0.009, 0.009, 0.13, 8]} />
            </mesh>
          ))}

          {/* Nose, wide and slightly squashed. Round it read as a button on a
            teddy; this is nearer the flat wedge an otter actually has. */}
          <mesh
            position={[0, -0.078, 0.325]}
            scale={[1.6, 0.85, 0.85]}
            material={mat.nose}
          >
            <sphereGeometry args={[0.026, 16, 14]} />
          </mesh>

          {whiskers(1)}
          {whiskers(-1)}
        </group>
      </group>
    </group>
  );
}

export function Nimo3D({
  mood = "idle",
  follow = true,
  height = 260,
  className = "",
  interactive = true,
}: {
  mood?: Mood;
  /** Track the pointer. Turned off where he is decorative. */
  follow?: boolean;
  height?: number;
  className?: string;
  /** Answer a tap with a wave and a hold with a spin. */
  interactive?: boolean;
}) {
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const [emote, setEmote] = useState<Emote>({ kind: "none", id: 0 });
  /* Presses alternate between a wave and a salute. Both are things he does
     when you say hello and there is no way to ask for one specifically, so
     taking turns is what puts both of them in front of somebody who is
     prodding him. */
  const turn = useRef(0);
  /* A press is a wave or a spin depending only on how long it lasts, so the
     decision cannot be made until it ends, or until the clock beats the
     reader to it. `fired` is what stops a hold also counting as a tap when
     the finger finally comes up. */
  const press = useRef<{ timer: number | null; fired: boolean }>({
    timer: null,
    fired: false,
  });

  const start = useCallback(
    (kind: EmoteKind) => {
      /* Somebody who has asked for less motion is not made to watch him
         spin. The sound still answers the press, so it is not a dead
         control. */
      if (!reduced) setEmote((e) => ({ kind, id: e.id + 1 }));
      playCue(kind === "spin" ? "reveal" : "tap");
    },
    [reduced],
  );

  /** A press that was not held: wave, then salute, then wave again. */
  const greet = useCallback(() => {
    turn.current += 1;
    start(turn.current % 2 === 0 ? "salute" : "greet");
  }, [start]);

  const onDown = useCallback(() => {
    if (press.current.timer !== null) clearTimeout(press.current.timer);
    press.current.fired = false;
    press.current.timer = window.setTimeout(() => {
      press.current.fired = true;
      press.current.timer = null;
      start("spin");
    }, HOLD_MS);
  }, [start]);

  const onUp = useCallback(() => {
    if (press.current.timer !== null) {
      clearTimeout(press.current.timer);
      press.current.timer = null;
      if (!press.current.fired) greet();
    }
    press.current.fired = false;
  }, [greet]);

  /* A finger that slides off him is not a greeting. */
  const onCancel = useCallback(() => {
    if (press.current.timer !== null) clearTimeout(press.current.timer);
    press.current.timer = null;
    press.current.fired = false;
  }, []);

  useEffect(
    () => () => {
      if (press.current.timer !== null) clearTimeout(press.current.timer);
    },
    [],
  );

  const scene = (
    /* With the books he spans about 1.12 units and is scaled by SCALE
       above, which fills the frame at this distance. Move the geometry or
       the scale and this camera has to be rechecked: too close and the ears
       clip, too far and he reads as a sticker. */
    <CanvasGuard mood={mood} height={height}>
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 32 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        frameloop={reduced ? "demand" : "always"}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[2.5, 4, 3]} intensity={2.4} />
        <directionalLight position={[-3, 1, -2]} intensity={0.7} />
        <Otter mood={mood} follow={follow && !reduced} emote={emote} />
      </Canvas>
    </CanvasGuard>
  );

  if (!interactive) {
    return (
      <div
        className={className}
        style={{ height }}
        role="img"
        aria-label={`Nimo the otter, ${mood}`}
      >
        {scene}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {/* A real button, not a div with a click handler: he is now something
          you can do a thing to, so he belongs in the tab order and says what
          he does. Enter waves, holding space spins, same as the pointer. */}
      <button
        type="button"
        className="block h-full w-full cursor-pointer"
        style={{
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
        }}
        aria-label={`Nimo the otter, ${mood}. Press to say hello, hold for a spin.`}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerLeave={onCancel}
        onPointerCancel={onCancel}
        /* A long press on a phone otherwise opens the selection menu over
           him, which cancels the spin the reader was asking for. */
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          // Held keys repeat, and a held key is a hold.
          if (event.repeat) {
            if (!press.current.fired) {
              press.current.fired = true;
              start("spin");
            }
            return;
          }
          press.current.fired = false;
        }}
        onKeyUp={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          if (!press.current.fired) greet();
          press.current.fired = false;
        }}
      >
        {scene}
      </button>
    </div>
  );
}

/**
 * What happens on a phone that cannot give us a WebGL context.
 */
class CanvasGuard extends Component<
  { children: ReactNode; mood: Mood; height: number },
  { failed: boolean }
> {
  constructor(props: { children: ReactNode; mood: Mood; height: number }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <NimoFlat
        mood={this.props.mood}
        height={this.props.height}
        className="mx-auto block"
      />
    );
  }
}
