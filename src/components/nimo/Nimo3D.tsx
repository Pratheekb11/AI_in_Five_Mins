"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
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
 *
 * At this camera the frame is 2.0 units tall. With the book stack under him he
 * measures about 1.12, so this leaves a tenth of the height as air above his
 * ears and below the bottom book. Going bigger clipped his feet on the first
 * attempt.
 */
const SCALE = 1.42;

/**
 * Where the group sits so the whole otter is centred on the origin.
 *
 * With the books beneath him he runs from y 0 at the table to about y 1.12 at
 * the crown, so the middle of him is at 0.56 in model units and this is that,
 * scaled and negated. The bounce below ADDS to this. Assigning position.y
 * outright is what floated the old mascot's head out of frame.
 */
const BASE_Y = -0.56 * SCALE;

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
      position={[side * 0.255, 0.26, 0.18]}
      rotation={[0, 0, side * -0.26]}
    >
      <mesh position={[0, -0.06, 0]} material={mat.brown}>
        <capsuleGeometry args={[0.06, 0.08, 8, 16]} />
      </mesh>
      <mesh position={[side * -0.04, -0.13, 0.03]} material={mat.face}>
        <sphereGeometry args={[0.06, 16, 14]} />
      </mesh>
    </group>
  );

  /**
   * Three whiskers a side, each a thin cylinder springing from the muzzle.
   *
   * Thicker than the source file's by more than double. At 0.003 they were
   * under a pixel wide once he is drawn 200 pixels tall, so they existed in
   * the scene and were invisible on the page, which is the same as not having
   * them. They also start further out, clear of the muzzle, so what shows is
   * the whisker rather than the half of it buried in his face.
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
          <mesh key={s} position={[s * 0.115, 0.03, 0.305]} material={mat.rim}>
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
      {/* With the books he spans about 1.12 units and is scaled by SCALE
          above, which fills the frame at this distance. Move the geometry or
          the scale and this camera has to be rechecked: too close and the ears
          clip, too far and he reads as a sticker. */}
      <CanvasGuard>
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
      </CanvasGuard>
    </div>
  );
}

/**
 * What happens on a phone that cannot give us a WebGL context.
 *
 * Some low-memory Android devices, and any browser with hardware acceleration
 * switched off, refuse the context outright, and three throws when they do.
 * Without this the throw takes the whole page down: the mascot is decoration,
 * and decoration is never allowed to lose somebody the chapter they came for.
 * The sized box around it stays, so nothing below jumps.
 */
class CanvasGuard extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
