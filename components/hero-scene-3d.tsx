"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Float,
  ContactShadows,
  Sparkles,
  AdaptiveDpr,
  AdaptiveEvents,
} from "@react-three/drei";
import * as THREE from "three";

/**
 * 3D Obsidian Luxury Pedestal Platform
 * Chamfered obsidian cylinder base with champagne gold metallic inlay ring
 */
function ObsidianPedestal() {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = Math.sin(t * 0.08) * 0.05;
  });

  return (
    <group ref={ref} position={[0, -1.25, 0]}>
      {/* Main Obsidian Cylinder Base */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[2.2, 2.5, 0.45, 32]} />
        <meshStandardMaterial
          color="#08080E"
          metalness={0.92}
          roughness={0.08}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Champagne Gold Outer Rim Ring */}
      <mesh position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.22, 0.025, 12, 48]} />
        <meshStandardMaterial
          color="#D4AF37"
          metalness={0.95}
          roughness={0.15}
          emissive="#D4AF37"
          emissiveIntensity={0.12}
        />
      </mesh>

      {/* Inner Dark Glass Inset Disc */}
      <mesh position={[0, 0.23, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.18, 32]} />
        <meshStandardMaterial
          color="#0B0B12"
          metalness={0.8}
          roughness={0.04}
        />
      </mesh>
    </group>
  );
}

/**
 * Floating 3D Illuminated Gold RA2Z Emblem Centerpiece
 * Sculpted metallic gold emblem with smooth rotation and subtle float
 */
function GoldEmblemCenterpiece() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.18;
    groupRef.current.position.y = 0.25 + Math.sin(t * 0.4) * 0.08;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.25}>
      <group ref={groupRef} position={[0, 0.25, 0]}>
        {/* Outer Sculpted Metallic Shield / Crest */}
        <mesh castShadow position={[0, 0, 0]}>
          <octahedronGeometry args={[1.05, 0]} />
          <meshStandardMaterial
            color="#D4AF37"
            metalness={0.96}
            roughness={0.15}
            emissive="#C9A84C"
            emissiveIntensity={0.08}
          />
        </mesh>

        {/* Inner Diamond Core */}
        <mesh position={[0, 0, 0]} scale={[0.6, 0.6, 0.6]}>
          <octahedronGeometry args={[1.0, 0]} />
          <meshStandardMaterial
            color="#FFF8DC"
            metalness={0.98}
            roughness={0.05}
            emissive="#F3E5AB"
            emissiveIntensity={0.18}
          />
        </mesh>

        {/* Concentric Gold Orbit Ring 1 */}
        <mesh rotation={[Math.PI / 3, 0.4, 0]}>
          <torusGeometry args={[1.5, 0.018, 12, 48]} />
          <meshStandardMaterial
            color="#E5C158"
            metalness={0.95}
            roughness={0.1}
            emissive="#D4AF37"
            emissiveIntensity={0.15}
          />
        </mesh>

        {/* Concentric Gold Orbit Ring 2 */}
        <mesh rotation={[-Math.PI / 4, -0.6, 0]}>
          <torusGeometry args={[1.8, 0.014, 12, 48]} />
          <meshStandardMaterial
            color="#C9A84C"
            metalness={0.9}
            roughness={0.15}
            emissive="#C9A84C"
            emissiveIntensity={0.1}
          />
        </mesh>
      </group>
    </Float>
  );
}

/**
 * Main Studio Scene Lighting & Ambient Environment Rig
 */
function SceneContent() {
  return (
    <group>
      {/* Balanced Studio Lighting */}
      <ambientLight intensity={0.45} />

      {/* Main Champagne Gold Key Light */}
      <directionalLight
        castShadow
        intensity={1.8}
        position={[4, 8, 5]}
        shadow-mapSize={[512, 512]}
        color="#FFF5E0"
      />

      {/* Secondary Soft Fill Light */}
      <directionalLight
        intensity={0.5}
        position={[-6, 4, -3]}
        color="#E8D5FF"
      />

      {/* Gold Accent Point Light */}
      <pointLight
        intensity={2.2}
        position={[1.5, 3.5, 3]}
        color="#D4AF37"
        distance={10}
      />

      {/* Deep Gold Rim Light from Behind */}
      <pointLight
        intensity={1.2}
        position={[-3, -1, -4]}
        color="#C9A84C"
        distance={8}
      />

      {/* Floating Obsidian Pedestal Base */}
      <ObsidianPedestal />

      {/* Illuminated Floating Gold RA2Z Emblem */}
      <GoldEmblemCenterpiece />

      {/* Champagne Gold Ambient Dust Particles */}
      <Sparkles
        color="#D4AF37"
        count={65}
        opacity={0.45}
        scale={7}
        size={0.09}
        speed={0.2}
      />
      <Sparkles
        color="#FFF8E7"
        count={35}
        opacity={0.25}
        scale={5}
        size={0.05}
        speed={0.15}
      />

      {/* Soft Contact Shadows on Pedestal Base */}
      <ContactShadows
        blur={3.5}
        color="#050508"
        far={4}
        opacity={0.6}
        position={[0, -1.48, 0]}
        resolution={512}
        scale={7}
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
    <div className="hero-3d-canvas" aria-hidden="true" suppressHydrationWarning>
      {mounted && (
        <Canvas
          camera={{
            fov: 40,
            position: [0, 0.4, 5.4],
            near: 0.1,
            far: 25,
          }}
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.15,
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
