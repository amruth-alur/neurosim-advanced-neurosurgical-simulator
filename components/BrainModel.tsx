
import React, { useRef, useMemo, useState, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF, MeshDistortMaterial } from '@react-three/drei';
import { ZoomIn, ZoomOut } from 'lucide-react';
import * as THREE from 'three';
import { BleedPoint, TraumaPathology } from '../types';
import { COLORS } from '../constants';

// --- RESOURCES ---
const BRAIN_URL = 'https://raw.githubusercontent.com/amruth-alur/GoogleDeepMind/main/human-brain.glb';

// Preload models for smoother transitions
useGLTF.preload(BRAIN_URL);

interface BrainModelProps {
  bleeds: BleedPoint[];
  onInteractBleed: (id: string, point?: THREE.Vector3) => void;
  activeTool: string;
  layers: { dura: boolean; cortex: boolean };
  pathology?: TraumaPathology;
  isForeignBodyRemoved: boolean;
}

// --- CONSTANTS ---
// Hardcoded transforms to replace the removed GUI tool
const BRAIN_TRANSFORM = {
  position: [0, -0.6, 0.2] as [number, number, number],
  rotation: [0.2, Math.PI, 0] as [number, number, number],
  scale: 2.0
};

// --- ZOOM CONTROLS ---
const ZoomControls = () => {
  const { camera } = useThree();
  
  const handleZoom = (factor: number) => {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const targetPos = camera.position.clone().add(direction.multiplyScalar(factor));
    if (targetPos.length() > 2 && targetPos.length() < 25) {
      camera.position.copy(targetPos);
    }
  };

  return (
    <Html position={[0, 0, 0]} style={{ pointerEvents: 'none', width: '100%', height: '100%' }} zIndexRange={[1000, 1000]}>
       <div className="fixed bottom-8 right-8 flex flex-col gap-2 pointer-events-auto z-[9999]">
          <button 
            onClick={() => handleZoom(2)} 
            className="p-3 bg-slate-800/80 hover:bg-blue-600 text-white rounded-full backdrop-blur-md border border-slate-600 shadow-xl transition-all active:scale-95"
            title="Zoom In"
          >
             <ZoomIn size={20} />
          </button>
          <button 
            onClick={() => handleZoom(-2)} 
            className="p-3 bg-slate-800/80 hover:bg-blue-600 text-white rounded-full backdrop-blur-md border border-slate-600 shadow-xl transition-all active:scale-95"
            title="Zoom Out"
          >
             <ZoomOut size={20} />
          </button>
       </div>
    </Html>
  );
};

// --- ORGANIC BLOOD ---
const OrganicBleed = ({ 
  position, size, color, exposed, onInteract 
}: { 
  position: THREE.Vector3 | [number, number, number], size: number, color: string, exposed: boolean, onInteract: (e: any) => void
}) => {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (mesh.current && exposed) {
      const t = state.clock.getElapsedTime();
      mesh.current.scale.setScalar(1 + Math.sin(t * 3) * 0.05);
    }
  });

  return (
    <mesh position={position} onClick={exposed ? onInteract : undefined} scale={size}>
      <sphereGeometry args={[1, 32, 32]} /> 
      <MeshDistortMaterial color={color} speed={2} distort={0.4} radius={1} roughness={0.1} metalness={0.1} transparent opacity={exposed ? 0.95 : 0.0} />
    </mesh>
  );
};

// --- REALISTIC BRAIN ---
const RealisticBrain = ({ layers }: { layers: any }) => {
  const { scene } = useGLTF(BRAIN_URL);
  const brainScene = useMemo(() => scene.clone(), [scene]);
  const brainRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (brainRef.current) {
      // Gentle biological movement (pulsation) independent of transform
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.002;
      brainRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group ref={brainRef} visible={layers.cortex}>
       <primitive object={brainScene} />
    </group>
  );
}

// --- PARTICLES FX ---
const Particles: React.FC<{ position: THREE.Vector3, color: string }> = ({ position, color }) => {
  const mesh = useRef<THREE.Points>(null);
  useFrame(() => {
    if (mesh.current) {
      mesh.current.rotation.y += 0.02;
      mesh.current.position.y += 0.01;
      mesh.current.scale.multiplyScalar(0.95);
    }
  });
  return (
    <points ref={mesh} position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={20} array={new Float32Array(60).map(() => (Math.random() - 0.5) * 0.5)} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color={color} transparent opacity={0.8} />
    </points>
  );
};

// --- FOREIGN OBJECT ---
const ForeignObject: React.FC<{ position: any, onClick: any, activeTool: string }> = ({ position, onClick, activeTool }) => {
  return (
    <group position={position} rotation={[Math.PI/4, Math.PI/4, 0]} onClick={onClick}>
      <mesh castShadow>
        <boxGeometry args={[0.2, 3, 0.2]} /> 
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
      </mesh>
      <Html position={[0, 1.5, 0]} zIndexRange={[100, 0]}>
         <div className={`bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded animate-pulse border border-red-400 ${activeTool !== 'forceps' ? 'opacity-50' : 'opacity-100'}`}>
           FOREIGN BODY
         </div>
      </Html>
    </group>
  );
};

// --- TOOL VISUAL ---
const ToolVisual: React.FC<{ activeTool: string }> = ({ activeTool }) => {
  const ref = useRef<THREE.Group>(null);
  const { mouse, camera } = useThree();
  useFrame(() => {
    if (ref.current) {
      const vector = new THREE.Vector3(mouse.x, mouse.y, 0.9);
      vector.unproject(camera);
      const dir = vector.sub(camera.position).normalize();
      const pos = camera.position.clone().add(dir.multiplyScalar(5));
      ref.current.position.copy(pos);
      ref.current.lookAt(camera.position);
      ref.current.rotation.x += Math.PI / 2;
    }
  });

  return (
    <group ref={ref}>
      {activeTool === 'scalpel' && <mesh><boxGeometry args={[0.05, 0.4, 0.01]} /><meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} /></mesh>}
      {activeTool === 'suction' && <mesh><cylinderGeometry args={[0.02, 0.02, 0.6, 8]} /><meshStandardMaterial color="#ec4899" transparent opacity={0.5} /></mesh>}
      {/* Fallback visual for generic tools */}
      {activeTool !== 'scalpel' && activeTool !== 'suction' && (
        <mesh><sphereGeometry args={[0.05]} /><meshStandardMaterial color="#64748b" /></mesh>
      )}
    </group>
  );
};

// --- MAIN CONTAINER ---
const BrainContainer = ({ ...props }: BrainModelProps) => {
  const { bleeds, onInteractBleed, activeTool, layers, pathology, isForeignBodyRemoved } = props;
  const [effectPos, setEffectPos] = useState<THREE.Vector3 | null>(null);

  const handleAction = (id: string, point: THREE.Vector3) => {
    setEffectPos(point);
    onInteractBleed(id, point);
    setTimeout(() => setEffectPos(null), 300);
  };

  return (
    <group>
        {/* 
            UNIFIED GROUP: 
            Wrapping Brain, DURA, and Bleeds in the same group with the same scale/rotation/position.
            This prevents 'floating' artifacts and aligns the Foreign Object with the Dura correctly.
        */}
        <group 
           position={BRAIN_TRANSFORM.position}
           rotation={BRAIN_TRANSFORM.rotation}
           scale={BRAIN_TRANSFORM.scale}
        >
            {/* INTERACTIVE DURA LAYER - Now scaled with the brain */}
            {layers.dura && (
              <mesh position={[0, 0.5, 0]} rotation={[0, 0, 0]} onClick={(e) => activeTool === 'scalpel' && handleAction('dura-layer', e.point)} receiveShadow>
                {/* Adjusted geometry to act as a 'lid' over the brain */}
                 <cylinderGeometry args={[1.3, 1.3, 0.05, 64]} />
                 <meshStandardMaterial color={COLORS.DURA} roughness={0.3} metalness={0.1} transparent opacity={0.95} />
              </mesh>
            )}

            <RealisticBrain layers={layers} />

            {/* BLEEDS & PATHOLOGY */}
            {bleeds.map((bleed, idx) => {
              // Visibility Logic
              let visible = false;
              // Without bone, we check dura state or pathology type
              if (layers.dura) {
                 // Epidurals sit on TOP of dura or just under bone (now gone), so visible
                 visible = pathology?.includes('Epidural') === true; 
              } else {
                 // Dura removed, all bleeds visible
                 visible = true;
              }
              
              if (pathology?.includes('Penetrating')) visible = true;

              // Treatment Styling
              let color = COLORS.BLOOD_POOL;
              let size = bleed.size;
              if (bleed.treatmentStage === 'cauterized') { color = '#3f1818'; size *= 0.8; }
              else if (bleed.treatmentStage === 'irrigated') { visible = false; }
              else if (bleed.treatmentStage === 'suctioned') { size *= 0.4; }

              if (!visible) return null;

              return (
                <group key={bleed.id}>
                  <OrganicBleed 
                    position={bleed.position} size={size} color={color} exposed={visible}
                    onInteract={(e) => { e.stopPropagation(); handleAction(bleed.id, e.point); }}
                  />
                  {!isForeignBodyRemoved && pathology?.includes('Penetrating') && idx === 0 && (
                    <ForeignObject 
                      position={[bleed.position[0], bleed.position[1], bleed.position[2] + 0.2]} 
                      onClick={(e: any) => { e.stopPropagation(); if (activeTool === 'forceps') handleAction('foreign-body', e.point); }} 
                      activeTool={activeTool} 
                    />
                  )}
                </group>
              );
            })}
        </group>

        {/* FX */}
        {effectPos && <Particles position={effectPos} color={activeTool === 'cautery' ? '#fbbf24' : activeTool === 'suction' ? '#ef4444' : '#ffffff'} />}
    </group>
  );
}

// --- ROOT EXPORT ---
const BrainModel: React.FC<BrainModelProps> = (props) => {
  return (
    <>
      {/* Lighting Setup per requirements */}
      <ambientLight intensity={1.0} />
      <directionalLight position={[5, 10, 7]} intensity={2.0} castShadow />
      <pointLight position={[-5, 5, 5]} intensity={0.5} color="#e0f2fe" />

      <ZoomControls />

      <group position={[0, -0.5, 0]}>
        <Suspense fallback={null}>
           <BrainContainer {...props} />
        </Suspense>
      </group>

      <ToolVisual activeTool={props.activeTool} />
      
      <OrbitControls 
        enableDamping dampingFactor={0.1} 
        minDistance={3} maxDistance={15} 
        maxPolarAngle={Math.PI / 1.5} 
      />
    </>
  );
};

export default BrainModel;
