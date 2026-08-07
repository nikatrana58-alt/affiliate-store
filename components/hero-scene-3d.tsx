"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Float,
  ContactShadows,
  Sparkles,
  MeshTransmissionMaterial,
  AdaptiveDpr,
  AdaptiveEvents,
  Environment,
  RoundedBox,
} from "@react-three/drei";
import * as THREE from "three";

/**
 * Cinematic Obsidian Monolith — tall premium black glass slab
 */
function ObsidianMonolith({
  position,
  rotation,
  scale,
  speed,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = rotation[1] + Math.sin(t * speed * 0.18) * 0.12;
    ref.current.rotation.x = rotation[0] + Math.cos(t * speed * 0.12) * 0.06;
    ref.current.position.y = position[1] + Math.sin(t * speed * 0.22) * 0.12;
  });

  return (
    <Float speed={speed * 0.6} rotationIntensity={0.08} floatIntensity={0.25}>
      <mesh ref={ref} position={position} rotation={rotation} scale={scale} castShadow>
        <RoundedBox args={[1.4, 2.6, 0.06]} radius={0.04} smoothness={4}>
          <MeshTransmissionMaterial
            color="#0D0D1A"
            roughness={0.03}
            thickness={0.5}
            ior={1.88}
            transmission={0.92}
            transparent
            metalness={0.15}
            chromaticAberration={0.06}
            anisotropy={0.2}
            distortion={0.02}
            distortionScale={0.1}
            temporalDistortion={0.03}
          />
        </RoundedBox>
        {/* Elegant gold rim glow */}
        <mesh>
          <RoundedBox args={[1.42, 2.62, 0.04]} radius={0.04} smoothness={4}>
            <meshStandardMaterial
              color="#C9A84C"
              metalness={0.9}
              roughness={0.2}
              emissive="#C9A84C"
              emissiveIntensity={0.04}
              transparent
              opacity={0.15}
            />
          </RoundedBox>
        </mesh>
      </mesh>
    </Float>
  );
}

/**
 * Liquid Gold Ribbon — smooth torus-knot with brushed gold metal
 */
function GoldLiquidRibbon({
  position,
  scale,
  speed,
}: {
  position: [number, number, number];
  scale: number;
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y += 0.003 * speed;
    ref.current.rotation.z = Math.sin(t * speed * 0.3) * 0.15;
  });

  return (
    <Float speed={speed * 0.7} rotationIntensity={0.2} floatIntensity={0.4}>
      <mesh ref={ref} position={position} scale={scale} castShadow>
        <torusKnotGeometry args={[0.38, 0.08, 200, 20, 2, 3]} />
        <meshStandardMaterial
          color="#E5C158"
          metalness={0.97}
          roughness={0.07}
          envMapIntensity={2.5}
          emissive="#D4AF37"
          emissiveIntensity={0.06}
        />
      </mesh>
    </Float>
  );
}

/**
 * Chrome Mirror Sphere — perfect reflective ball
 */
function ChromeSphere({
  position,
  scale,
  speed,
}: {
  position: [number, number, number];
  scale: number;
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = position[1] + Math.sin(t * speed * 0.4) * 0.18;
    ref.current.rotation.y += 0.002 * speed;
  });

  return (
    <Float speed={speed * 0.5} rotationIntensity={0.06} floatIntensity={0.5}>
      <mesh ref={ref} position={position} scale={scale} castShadow>
        <sphereGeometry args={[0.5, 96, 96]} />
        <meshStandardMaterial
          color="#F0EEE6"
          metalness={1.0}
          roughness={0.0}
          envMapIntensity={3.0}
        />
      </mesh>
    </Float>
  );
}

/**
 * Diamond Crystal Prism — high-refraction luxury gem
 */
function DiamondCrystal({
  position,
  scale,
  speed,
}: {
  position: [number, number, number];
  scale: number;
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y += 0.004 * speed;
    ref.current.rotation.x = Math.sin(t * speed * 0.35) * 0.2;
    ref.current.rotation.z = Math.cos(t * speed * 0.25) * 0.1;
  });

  return (
    <Float speed={speed * 0.8} rotationIntensity={0.35} floatIntensity={0.55}>
      <mesh ref={ref} position={position} scale={scale} castShadow>
        <octahedronGeometry args={[0.6, 0]} />
        <MeshTransmissionMaterial
          backside
          backsideThickness={0.8}
          chromaticAberration={0.12}
          color="#FFF8E7"
          distortion={0.15}
          distortionScale={0.3}
          ior={2.1}
          roughness={0.0}
          thickness={0.6}
          transparent
          metalness={0.0}
          temporalDistortion={0.05}
          anisotropy={0.5}
        />
      </mesh>
    </Float>
  );
}

/**
 * Thin brushed gold accent ring
 */
function GoldAccentRing({
  position,
  rotation,
  scale,
  speed,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ref.current) return;
    ref.current.rotation.z += 0.002 * speed;
    ref.current.rotation.y += 0.0015 * speed;
  });

  return (
    <Float speed={speed * 0.6} rotationIntensity={0.15} floatIntensity={0.3}>
      <mesh ref={ref} position={position} rotation={rotation} scale={scale}>
        <torusGeometry args={[0.85, 0.018, 32, 120]} />
        <meshStandardMaterial
          color="#D4AF37"
          metalness={0.97}
          roughness={0.08}
          envMapIntensity={2.2}
          emissive="#C9A84C"
          emissiveIntensity={0.08}
        />
      </mesh>
    </Float>
  );
}

/**
 * Floating acrylic sheet — transparent layered premium panel
 */
function AcrylicSheet({
  position,
  rotation,
  scale,
  speed,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = rotation[1] + Math.sin(t * speed * 0.2) * 0.1;
    ref.current.position.y = position[1] + Math.cos(t * speed * 0.28) * 0.08;
  });

  return (
    <Float speed={speed * 0.5} rotationIntensity={0.06} floatIntensity={0.2}>
      <mesh ref={ref} position={position} rotation={rotation} scale={scale}>
        <planeGeometry args={[1.2, 1.8, 1, 1]} />
        <MeshTransmissionMaterial
          color="#C9D8E8"
          roughness={0.04}
          thickness={0.12}
          ior={1.45}
          transmission={0.96}
          transparent
          metalness={0.05}
          chromaticAberration={0.02}
        />
      </mesh>
    </Float>
  );
}

function SceneContent() {
  const { mouse } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      (mouse.y * Math.PI) / 28,
      0.025,
    );
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      (mouse.x * Math.PI) / 28,
      0.025,
    );
  });

  return (
    <group ref={groupRef}>
      {/* Premium cinematic environment for reflections */}
      <Environment preset="city" />

      {/* Studio + cinematic lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        castShadow
        intensity={2.2}
        position={[5, 10, 5]}
        shadow-mapSize={[2048, 2048]}
        color="#FFF8F0"
      />
      <directionalLight intensity={0.6} position={[-8, 4, -4]} color="#E8D5FF" />
      {/* Gold key light */}
      <pointLight intensity={2.5} position={[1, 4, 4]} color="#D4AF37" distance={12} />
      {/* Rim light from behind */}
      <pointLight intensity={1.2} position={[-4, -2, -5]} color="#C9A84C" distance={10} />
      {/* Cool fill from side */}
      <pointLight intensity={0.6} position={[6, 0, 2]} color="#8888FF" distance={8} />

      {/* === MAIN OBSIDIAN GLASS MONOLITHS === */}
      <ObsidianMonolith
        position={[-2.2, 0.5, -1.0]}
        rotation={[0.08, 0.35, -0.08]}
        scale={[1.05, 1.05, 1.05]}
        speed={0.65}
      />
      <ObsidianMonolith
        position={[2.3, -0.3, -1.5]}
        rotation={[-0.06, -0.45, 0.1]}
        scale={[0.78, 0.78, 0.78]}
        speed={0.85}
      />

      {/* === GOLD LIQUID RIBBON === */}
      <GoldLiquidRibbon position={[0.4, 0.6, -1.0]} scale={0.72} speed={0.8} />
      <GoldLiquidRibbon position={[-1.2, -1.0, -1.6]} scale={0.45} speed={1.1} />

      {/* === CHROME MIRROR SPHERES === */}
      <ChromeSphere position={[-0.6, 1.1, -0.9]} scale={0.42} speed={0.6} />
      <ChromeSphere position={[1.4, -0.9, -0.7]} scale={0.28} speed={0.9} />

      {/* === DIAMOND CRYSTALS === */}
      <DiamondCrystal position={[0.2, -1.1, -1.3]} scale={0.5} speed={0.75} />
      <DiamondCrystal position={[-1.8, -0.4, -1.8]} scale={0.35} speed={1.0} />

      {/* === ACCENT RINGS === */}
      <GoldAccentRing
        position={[-1.6, -0.6, -0.5]}
        rotation={[0.5, 0.3, 0]}
        scale={0.72}
        speed={0.7}
      />
      <GoldAccentRing
        position={[1.8, 0.9, -1.2]}
        rotation={[-0.4, 0.7, 0.3]}
        scale={0.58}
        speed={0.95}
      />

      {/* === ACRYLIC ACCENT SHEETS === */}
      <AcrylicSheet
        position={[1.0, 0.2, -2.0]}
        rotation={[0.1, -0.5, 0.15]}
        scale={[0.7, 0.7, 0.7]}
        speed={0.7}
      />

      {/* === PREMIUM AMBIENT PARTICLES === */}
      {/* Main champagne gold dust */}
      <Sparkles
        color="#D4AF37"
        count={100}
        opacity={0.45}
        scale={8}
        size={0.08}
        speed={0.25}
      />
      {/* Soft warm white dust */}
      <Sparkles
        color="#FFF8E7"
        count={50}
        opacity={0.22}
        scale={6}
        size={0.05}
        speed={0.18}
      />
      {/* Blue-violet accent sparkles */}
      <Sparkles
        color="#BBA0FF"
        count={25}
        opacity={0.12}
        scale={4}
        size={0.04}
        speed={0.15}
      />

      {/* Cinematic contact shadows */}
      <ContactShadows
        blur={4.0}
        color="#0A0A0A"
        far={5}
        opacity={0.45}
        position={[0, -1.4, 0]}
        resolution={1024}
        scale={8}
      />
    </group>
  );
}

export function HeroScene3D() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="hero-3d-canvas" aria-hidden="true">
      {mounted && (
        <Canvas
          camera={{
            fov: 42,
            position: [0, 0, 5.2],
            near: 0.1,
            far: 25,
          }}
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
          shadows
          style={{
            height: "100%",
            left: 0,
            position: "absolute",
            top: 0,
            width: "100%",
          }}
        >
          <AdaptiveDpr pixelated />
          <AdaptiveEvents />
          <SceneContent />
        </Canvas>
      )}
    </div>
  );
}

