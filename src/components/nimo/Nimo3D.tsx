"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { type Mood, POSES } from "./moods";

/**
 * Nimo, in three dimensions.
 *
 * Rebuilt procedurally from the same primitives the original model was made
 * from, rather than loading the 2.8MB OBJ export. Same owl, a fraction of the
 * weight, and every joint is addressable — which is what lets him blink, tilt
 * toward the cursor and react to a wrong answer.
 *
 * His own colours are fixed and do not follow the theme. An owl does not change
 * species between light and dark mode; only the ground he sits on does. That
 * was the bug in the flat version — his cream belly went dark because it was
 * painted with a theme variable.
 *
 * Shading is toon-stepped with a hard outline so he reads as printed rather
 * than rendered, which is how he sits inside a risograph page without looking
 * pasted in from another project.
 */

const C = {
  teal: "#2f6f6a",
  tealDark: "#1f4d49",
  cream: "#f6ead6",
  amber: "#e8912f",
  white: "#ffffff",
  ink: "#1a1a1a",
  rim: "#2a2a2a",
  book: "#d9552f",
  pages: "#f3ecdd",
} as const;

/** Three flat steps — enough to read as volume, few enough to read as print. */
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
 * Where the group sits so the whole owl is centred on the origin. The model
 * runs from y 0 at the books to about y 1.6 at the ear tufts, so it has to be
 * pushed down by half its height. The bounce below ADDS to this — assigning
 * position.y outright was what floated his head out of frame.
 */
const BASE_Y = -0.8;

/**
 * The cursor's position on the page, in client coordinates.
 *
 * Deliberately not R3F's own `pointer`: that one is canvas-local and only
 * updates while the cursor is actually over the canvas, so the owl froze the
 * moment you moved away from him — which is exactly when you want him to turn
 * and watch you. A window listener sees the whole page.
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
const PUPIL_REACH = 0.032;

function Owl({ mood, follow }: { mood: Mood; follow: boolean }) {
  const gradient = useToonGradient();
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const wingL = useRef<THREE.Group>(null);
  const wingR = useRef<THREE.Group>(null);
  const lidL = useRef<THREE.Mesh>(null);
  const lidR = useRef<THREE.Mesh>(null);
  const pupilL = useRef<THREE.Group>(null);
  const pupilR = useRef<THREE.Group>(null);

  // Blink timing lives outside React entirely — it changes sixty times a
  // second and nothing on the page needs to re-render when it does. Seeded
  // with a constant rather than a random number, because rendering has to be
  // pure; the jitter gets added on the first frame instead.
  const blink = useRef({ next: 2.6, closing: 0, seeded: false });
  const pagePointer = usePagePointer();
  const canvas = useThree((s) => s.gl.domElement);

  const mat = useMemo(
    () => ({
      teal: new THREE.MeshToonMaterial({ color: C.teal, gradientMap: gradient }),
      tealDark: new THREE.MeshToonMaterial({
        color: C.tealDark,
        gradientMap: gradient,
      }),
      cream: new THREE.MeshToonMaterial({ color: C.cream, gradientMap: gradient }),
      amber: new THREE.MeshToonMaterial({ color: C.amber, gradientMap: gradient }),
      white: new THREE.MeshToonMaterial({ color: C.white, gradientMap: gradient }),
      ink: new THREE.MeshBasicMaterial({ color: C.ink }),
      rim: new THREE.MeshToonMaterial({ color: C.rim, gradientMap: gradient }),
      book: new THREE.MeshToonMaterial({ color: C.book, gradientMap: gradient }),
      pages: new THREE.MeshToonMaterial({ color: C.pages, gradientMap: gradient }),
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

    // --- wings ------------------------------------------------------------
    const flap =
      pose.wings > 0.5 ? Math.sin(t * 12) * 0.35 * pose.wings : 0;
    if (wingL.current) {
      const want = -0.35 - pose.wings * 0.9 - flap;
      wingL.current.rotation.z += (want - wingL.current.rotation.z) * Math.min(1, delta * 8);
    }
    if (wingR.current) {
      const want = 0.35 + pose.wings * 0.9 + flap;
      wingR.current.rotation.z += (want - wingR.current.rotation.z) * Math.min(1, delta * 8);
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
    // the white — a pupil that reaches the rim looks broken, not attentive.
    const pupilX = aimX * PUPIL_REACH;
    const pupilY = -aimY * PUPIL_REACH * 0.8;
    for (const p of [pupilL.current, pupilR.current]) {
      if (!p) continue;
      p.position.x += (pupilX - p.position.x) * Math.min(1, delta * 9);
      p.position.y += (pupilY - p.position.y) * Math.min(1, delta * 9);
    }
  });

  const eye = (side: 1 | -1) => (
    <group key={side} position={[side * 0.12, 0.03, 0.3]}>
      <mesh
        ref={side === 1 ? lidR : lidL}
        material={mat.white}
        geometry={new THREE.SphereGeometry(0.1, 24, 20)}
      />
      {/* Pupil and catchlight travel together — a highlight that stayed put
          while the pupil moved read as a smudge on the eye. */}
      <group ref={side === 1 ? pupilR : pupilL}>
        <mesh position={[0, 0, 0.075]} material={mat.ink}>
          <sphereGeometry args={[0.05, 16, 14]} />
        </mesh>
        <mesh position={[0.02, 0.025, 0.115]} material={mat.white}>
          <sphereGeometry args={[0.016, 10, 8]} />
        </mesh>
      </group>
    </group>
  );

  return (
    <group ref={root} position={[0, BASE_Y, 0]}>
      {/* ------------------------------------------------------- perch --- */}
      {[
        { w: 0.62, h: 0.075, d: 0.46, y: 0, r: 0.05, m: mat.book },
        { w: 0.56, h: 0.07, d: 0.42, y: 0.075, r: -0.08, m: mat.tealDark },
        { w: 0.5, h: 0.065, d: 0.38, y: 0.145, r: 0.1, m: mat.book },
      ].map((b, i) => (
        <group key={i} position={[0, b.y, 0]} rotation={[0, b.r, 0]}>
          <mesh position={[0, b.h / 2, 0]} material={b.m}>
            <boxGeometry args={[b.w, b.h, b.d]} />
          </mesh>
          <mesh position={[0, b.h * 0.5, 0]} material={mat.pages}>
            <boxGeometry args={[b.w * 0.94, b.h * 0.7, b.d * 0.94]} />
          </mesh>
        </group>
      ))}

      {/* -------------------------------------------------------- body --- */}
      <group position={[0, 0.21, 0]}>
        <mesh position={[0, 0.45, 0]} scale={[1, 1.12, 0.92]} material={mat.teal}>
          <sphereGeometry args={[0.42, 40, 32]} />
        </mesh>
        <mesh
          position={[0, 0.42, 0.2]}
          scale={[1, 1.15, 0.72]}
          material={mat.cream}
        >
          <sphereGeometry args={[0.3, 32, 28]} />
        </mesh>

        {/* tail */}
        <mesh
          position={[0, 0.1, -0.42]}
          rotation={[Math.PI / 2.1, 0, 0]}
          material={mat.teal}
        >
          <coneGeometry args={[0.14, 0.3, 20]} />
        </mesh>

        {/* wings, hinged at the shoulder so they actually swing */}
        <group ref={wingL} position={[-0.3, 0.5, -0.02]}>
          <mesh position={[-0.08, -0.1, 0]} scale={[0.55, 1.05, 0.65]} material={mat.tealDark}>
            <sphereGeometry args={[0.2, 20, 16]} />
          </mesh>
        </group>
        <group ref={wingR} position={[0.3, 0.5, -0.02]}>
          <mesh position={[0.08, -0.1, 0]} scale={[0.55, 1.05, 0.65]} material={mat.tealDark}>
            <sphereGeometry args={[0.2, 20, 16]} />
          </mesh>
        </group>

        {/* feet */}
        {[1, -1].map((s) => (
          <mesh
            key={s}
            position={[s * 0.15, 0.02, 0.08]}
            scale={[1.3, 0.6, 1]}
            material={mat.amber}
          >
            <sphereGeometry args={[0.075, 14, 12]} />
          </mesh>
        ))}
      </group>

      {/* -------------------------------------------------------- head --- */}
      <group ref={head} position={[0, 1.19, 0]}>
        <mesh material={mat.teal}>
          <sphereGeometry args={[0.34, 40, 32]} />
        </mesh>

        {/* ear tufts */}
        {[1, -1].map((s) => (
          <mesh
            key={s}
            position={[s * 0.16, 0.32, 0.02]}
            rotation={[0, 0, s * -0.25]}
            material={mat.tealDark}
          >
            <coneGeometry args={[0.06, 0.14, 14]} />
          </mesh>
        ))}

        {/* facial disc */}
        <mesh position={[0, -0.01, 0.2]} scale={[1, 1, 0.55]} material={mat.cream}>
          <sphereGeometry args={[0.27, 32, 28]} />
        </mesh>

        {eye(1)}
        {eye(-1)}

        {/* glasses */}
        {[1, -1].map((s) => (
          <mesh key={s} position={[s * 0.12, 0.03, 0.345]} material={mat.rim}>
            <torusGeometry args={[0.135, 0.014, 10, 28]} />
          </mesh>
        ))}
        <mesh position={[0, 0.03, 0.345]} rotation={[0, 0, Math.PI / 2]} material={mat.rim}>
          <cylinderGeometry args={[0.012, 0.012, 0.1, 8]} />
        </mesh>
        {[1, -1].map((s) => (
          <mesh
            key={s}
            position={[s * 0.22, 0.03, 0.28]}
            rotation={[0, s * 0.5, Math.PI / 2]}
            material={mat.rim}
          >
            <cylinderGeometry args={[0.012, 0.012, 0.16, 8]} />
          </mesh>
        ))}

        {/* beak */}
        <mesh
          position={[0, -0.08, 0.35]}
          rotation={[Math.PI / 2.4, 0, 0]}
          material={mat.amber}
        >
          <coneGeometry args={[0.07, 0.14, 16]} />
        </mesh>
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
      aria-label={`Nimo the owl, ${mood}`}
    >
      {/* Pulled in from 4.3: at that distance he sat in the middle of a lot of
          empty box and read as a sticker. The model spans 1.6 units and this
          leaves about a fifth of the frame as headroom, so the ear tufts and
          the books both still clear the edge. Move the geometry and this
          number has to be rechecked. */}
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 32 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        frameloop={reduced ? "demand" : "always"}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[2.5, 4, 3]} intensity={2.4} />
        <directionalLight position={[-3, 1, -2]} intensity={0.7} />
        <Owl mood={mood} follow={follow && !reduced} />
      </Canvas>
    </div>
  );
}
