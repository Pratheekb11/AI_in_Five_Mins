"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { type Mood, POSES } from "./moods";

/**
 * Nimo, in three dimensions.
 *
 * Rebuilt procedurally from the primitives in `nimo-mascot.html`, rather than
 * loading a multi-megabyte OBJ export. Same otter, a fraction of the weight,
 * and every joint is addressable, which is what lets him blink, tilt toward
 * the cursor and react to a wrong answer. Names and proportions follow the
 * source file so the two can be compared side by side.
 *
 * His own colours are fixed and do not follow the theme. An otter does not
 * change species between light and dark mode; only the ground he sits on does.
 * That was the bug in the flat version, whose pale belly went dark because it
 * was painted with a theme variable.
 *
 * Shading is toon-stepped so he reads as printed rather than rendered, which is
 * how he sits inside a risograph page without looking pasted in from another
 * project.
 */

const C = {
  brown: "#6e5e4e",
  brownDark: "#4f4234",
  face: "#e6ddc8",
  white: "#fffdf6",
  ink: "#14100c",
  nose: "#1c1712",
  whisker: "#f3efe4",
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
 *
 * At this camera the frame is 2.0 units tall, so 1.6 leaves about a tenth of
 * the height as air above his ears and below his feet. Going bigger clipped his
 * feet on the first attempt.
 */
const SCALE = 1.6;

/**
 * Where the group sits so the whole otter is centred on the origin.
 *
 * His geometry runs from about y -0.07 at the underside of the body to y 0.91 at
 * the crown, so the middle of him is at 0.42 in model units and this is that,
 * scaled and negated. The bounce below ADDS to this. Assigning position.y
 * outright is what floated the old mascot's head out of frame.
 */
const BASE_Y = -0.42 * SCALE;

/**
 * The cursor's position on the page, in client coordinates.
 *
 * Deliberately not R3F's own `pointer`: that one is canvas-local and only
 * updates while the cursor is actually over the canvas, so he froze the moment
 * you moved away from him, which is exactly when you want him to turn and watch
 * you. A window listener sees the whole page.
 *
 * Kept in a ref rather than state because it changes on every mouse event and
 * nothing on the page needs to re-render when it does; only the next animation
 * frame reads it.
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

function Otter({ mood, follow }: { mood: Mood; follow: boolean }) {
  const gradient = useToonGradient();
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
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
      face: new THREE.MeshToonMaterial({ color: C.face, gradientMap: gradient }),
      white: new THREE.MeshToonMaterial({
        color: C.white,
        gradientMap: gradient,
      }),
      ink: new THREE.MeshBasicMaterial({ color: C.ink }),
      nose: new THREE.MeshToonMaterial({ color: C.nose, gradientMap: gradient }),
      whisker: new THREE.MeshBasicMaterial({ color: C.whisker }),
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

  /** One arm, hinged at the shoulder so the paw swings with it. */
  const arm = (side: 1 | -1) => (
    <group
      key={`arm${side}`}
      ref={side === 1 ? armR : armL}
      position={[side * 0.2, 0.22, 0.22]}
      rotation={[0, 0, side * -0.35]}
    >
      <mesh position={[0, -0.06, 0]} material={mat.brown}>
        <capsuleGeometry args={[0.06, 0.08, 8, 16]} />
      </mesh>
      <mesh position={[side * -0.04, -0.13, 0.03]} material={mat.face}>
        <sphereGeometry args={[0.06, 16, 14]} />
      </mesh>
    </group>
  );

  /** Three whiskers a side, each a thin cylinder laid across the muzzle. */
  const whiskers = (side: 1 | -1) => (
    <group key={`whiskers${side}`}>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[side * 0.07, -0.09 + i * 0.015, 0.3]}
          rotation={[0, side * (0.3 + i * 0.16), Math.PI / 2]}
          material={mat.whisker}
        >
          <cylinderGeometry args={[0.003, 0.003, 0.2, 5]} />
        </mesh>
      ))}
    </group>
  );

  return (
    <group ref={root} position={[0, BASE_Y, 0]} scale={SCALE}>
      {/* -------------------------------------------------------- body --- */}
      <group>
        <mesh ref={body} position={[0, 0.3, 0]} scale={[1.05, 1.1, 0.95]} material={mat.brown}>
          <sphereGeometry args={[0.34, 48, 40]} />
        </mesh>

        {/* pale belly */}
        <mesh position={[0, 0.28, 0.2]} scale={[0.95, 1.15, 0.6]} material={mat.face}>
          <sphereGeometry args={[0.24, 40, 34]} />
        </mesh>

        {/* short, plump tail curled behind him */}
        <mesh
          position={[0, 0.16, -0.32]}
          rotation={[Math.PI / 2.1, 0, 0]}
          scale={[1, 1, 0.7]}
          material={mat.brownDark}
        >
          <cylinderGeometry args={[0.1, 0.03, 0.42, 16, 5]} />
        </mesh>

        {arm(1)}
        {arm(-1)}

        {/* stubby feet */}
        {[1, -1].map((s) => (
          <mesh
            key={s}
            position={[s * 0.19, 0.03, 0.1]}
            scale={[1.15, 0.6, 1.2]}
            material={mat.brownDark}
          >
            <sphereGeometry args={[0.09, 16, 14]} />
          </mesh>
        ))}
      </group>

      {/* -------------------------------------------------------- head --- */}
      <group ref={head} position={[0, 0.62, 0.08]}>
        <mesh scale={[1.02, 0.95, 0.98]} material={mat.brown}>
          <sphereGeometry args={[0.3, 48, 40]} />
        </mesh>

        {/* small round ears */}
        {[1, -1].map((s) => (
          <mesh
            key={s}
            position={[s * 0.21, 0.16, -0.05]}
            scale={[1, 0.85, 0.55]}
            material={mat.brownDark}
          >
            <sphereGeometry args={[0.055, 20, 16]} />
          </mesh>
        ))}

        {/* the pale mask that makes him read as an otter and not a bear */}
        <mesh
          position={[0, -0.02, 0.16]}
          scale={[0.92, 0.82, 0.65]}
          material={mat.face}
        >
          <sphereGeometry args={[0.24, 36, 30]} />
        </mesh>

        {/* blunt muzzle */}
        <mesh
          position={[0, -0.09, 0.26]}
          scale={[0.9, 0.65, 0.85]}
          material={mat.face}
        >
          <sphereGeometry args={[0.1, 24, 20]} />
        </mesh>

        {eye(1)}
        {eye(-1)}

        <mesh
          position={[0, -0.08, 0.34]}
          scale={[1.2, 0.85, 1]}
          material={mat.nose}
        >
          <sphereGeometry args={[0.026, 14, 12]} />
        </mesh>

        {whiskers(1)}
        {whiskers(-1)}
      </group>
    </group>
  );
}

export function Nimo3D({
  mood = "idle",
  follow = true,
  height = 260,
  className = "",
}: {
  mood?: Mood;
  /** Track the pointer. Turned off where he is decorative. */
  follow?: boolean;
  height?: number;
  className?: string;
}) {
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  return (
    <div
      className={className}
      style={{ height }}
      role="img"
      aria-label={`Nimo the otter, ${mood}`}
    >
      {/* The model spans about 0.93 units and is scaled to 1.75 above, so it
          fills roughly the same frame the owl did at this distance. Move the
          geometry or the scale and this number has to be rechecked: too close
          and the ears clip, too far and he reads as a sticker. */}
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 32 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        frameloop={reduced ? "demand" : "always"}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[2.5, 4, 3]} intensity={2.4} />
        <directionalLight position={[-3, 1, -2]} intensity={0.7} />
        <Otter mood={mood} follow={follow && !reduced} />
      </Canvas>
    </div>
  );
}
