"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Float,
  ContactShadows,
  Sparkles,
  MeshTransmissionMaterial,
  Environment,
  AdaptiveDpr,
  AdaptiveEvents,
} from "@react-three/drei";
import * as THREE from "three";

function GlassSphere({ position, size, color, speed }: {
  position: [number, number, number];
  size: number;
  color: string;
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * speed * 0.3) * 0.1;
    ref.current.rotation.y += 0.002 * speed;
  });

  return (
    <Float speed={speed} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={ref} position={position}>
        <sphereGeometry args={[size, 48, 48]} />
        <MeshTransmissionMaterial
          backside
          backsideThickness={0.5}
          chromaticAberration={0.02}
          color={color}
          distortion={0.1}
          distortionScale={0.3}
          ior={1.5}
          roughness={0.1}
          thickness={0.5}
          temporalDistortion={0.05}
          transparent
          metalness={0.1}
        />
      </mesh>
    </Float>
  );
}

function MetallicRing({ position, rotation, color, radius, speed }: {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  radius: number;
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.x += 0.001 * speed;
    ref.current.rotation.y += 0.002 * speed;
    ref.current.position.y += Math.sin(state.clock.elapsedTime * speed * 0.3) * 0.001;
  });

  return (
    <mesh ref={ref} position={position} rotation={rotation}>
      <torusGeometry args={[radius, 0.04, 24, 64]} />
      <meshPhysicalMaterial
        color={color}
        envMapIntensity={1.5}
        metalness={0.8}
        roughness={0.2}
        transparent
        opacity={0.5}
      />
    </mesh>
  );
}

function RoseGoldShape({ position, color }: {
  position: [number, number, number];
  color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.3;
    ref.current.rotation.y += 0.005;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.6}>
      <mesh ref={ref} position={position}>
        <octahedronGeometry args={[0.3, 0]} />
        <meshPhysicalMaterial
          color={color}
          envMapIntensity={2}
          metalness={0.6}
          roughness={0.15}
          transparent
          opacity={0.7}
        />
      </mesh>
    </Float>
  );
}

function LightRays() {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.05) * 0.02;
  });

  const rays = [
    { angle: 0, length: 3.5 },
    { angle: Math.PI * 0.25, length: 3 },
    { angle: Math.PI * 0.5, length: 2.8 },
    { angle: Math.PI * 0.75, length: 3.2 },
    { angle: Math.PI, length: 2.5 },
    { angle: Math.PI * 1.25, length: 3.3 },
    { angle: Math.PI * 1.5, length: 2.7 },
    { angle: Math.PI * 1.75, length: 3.1 },
  ];

  return (
    <group ref={ref}>
      {rays.map((ray, i) => (
        <mesh
          key={i}
          position={[Math.cos(ray.angle) * 1.5, Math.sin(ray.angle) * 1.5, -0.5]}
          rotation={[0, 0, ray.angle]}
        >
          <planeGeometry args={[0.02, ray.length]} />
          <meshBasicMaterial
            color="#E8B4B8"
            transparent
            opacity={0.06}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function SceneContent() {
  const { mouse } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      (mouse.y * Math.PI) / 12,
      0.02,
    );
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      (mouse.x * Math.PI) / 12,
      0.02,
    );
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.4} />
      <directionalLight
        castShadow
        intensity={0.8}
        position={[5, 5, 5]}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight intensity={0.3} position={[-3, 2, -3]} />
      <pointLight intensity={0.5} position={[0, 2, 2]} color="#E8B4B8" />

      <GlassSphere position={[-1.8, 0.6, -1]} size={0.4} color="#E8B4B8" speed={0.8} />
      <GlassSphere position={[2, -0.4, -1.5]} size={0.3} color="#D4A0A5" speed={1.1} />
      <GlassSphere position={[-0.5, -0.8, -2]} size={0.25} color="#C9959B" speed={0.6} />
      <GlassSphere position={[1.5, 0.8, -1.8]} size={0.2} color="#F0D0C8" speed={1.4} />

      <MetallicRing
        position={[-1.2, -0.2, -0.5]}
        rotation={[Math.PI * 0.2, 0, Math.PI * 0.1]}
        color="#E8B4B8"
        radius={0.7}
        speed={0.6}
      />
      <MetallicRing
        position={[1.5, 0.3, -0.8]}
        rotation={[Math.PI * 0.3, Math.PI * 0.2, 0]}
        color="#D4A0A5"
        radius={0.5}
        speed={0.8}
      />
      <MetallicRing
        position={[0, -0.6, -1.2]}
        rotation={[0, Math.PI * 0.4, Math.PI * 0.15]}
        color="#C9959B"
        radius={0.9}
        speed={0.5}
      />

      <RoseGoldShape position={[-2, -0.3, -0.3]} color="#E8B4B8" />
      <RoseGoldShape position={[2.2, 0.1, -0.5]} color="#D4A0A5" />
      <RoseGoldShape position={[-0.8, 0.9, -1]} color="#C9959B" />

      <LightRays />

      <Sparkles
        color="#E8B4B8"
        count={80}
        opacity={0.3}
        scale={6}
        size={0.04}
        speed={0.3}
      />
      <Sparkles
        color="#D4A0A5"
        count={40}
        opacity={0.15}
        scale={4}
        size={0.02}
        speed={0.2}
      />

      <ContactShadows
        blur={2.5}
        color="#2C2822"
        far={4}
        opacity={0.25}
        position={[0, -1.2, 0]}
        resolution={512}
        scale={6}
      />

      <Environment preset="city" />
    </group>
  );
}

export function HeroScene3D() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted) return <div className="hero-3d-canvas" aria-hidden="true" />;

  return (
    <div className="hero-3d-canvas" aria-hidden="true">
      <Canvas
        camera={{
          fov: 45,
          position: [0, 0, 5],
          near: 0.1,
          far: 20,
        }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
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
    </div>
  );
}
