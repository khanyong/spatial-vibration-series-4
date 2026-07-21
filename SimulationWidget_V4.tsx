import React, { useState, useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
}

export const SimulationWidget_V4: React.FC<{ initialMode?: 'knot' | 'su3' | 'exclusion', compact?: boolean }> = ({ initialMode, compact = false }) => {
  const [simMode, setSimMode] = useState<'knot' | 'su3' | 'exclusion'>('knot');

  useEffect(() => {
    if (initialMode) {
      setSimMode(initialMode);
    }
  }, [initialMode]);

  // Mode A: Knot Parameters
  const [elongation, setElongation] = useState<number>(0.3); // 0.0 to 1.0
  const [isRuptured, setIsRuptured] = useState<boolean>(false);
  const [massRigidity, setMassRigidity] = useState<number>(1.2); // κ parameter

  // Mode B: SU(3) Resonance Parameters
  const [selectedHadron, setSelectedHadron] = useState<'proton' | 'neutron' | 'pion' | 'omega'>('proton');
  const [compressionRatio, setCompressionRatio] = useState<number>(0.5); // 0 to 1.0

  // Mode C: Pauli Exclusion Parameters
  const [nodeDistance, setNodeDistance] = useState<number>(180); // 80 to 250
  const [berryPhaseDiff, setBerryPhaseDiff] = useState<number>(Math.PI); // 0 to 2*PI

  // Refs for rendering loops
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const requestRef = useRef<number | null>(null);
  const frameCountRef = useRef<number>(0);
  const tensionHistoryRef = useRef<number[]>([]);
  const shockwaveRadiusRef = useRef<number>(0);

  // 3D View angle tracking
  const angleXRef = useRef<number>(20 * Math.PI / 180);
  const angleYRef = useRef<number>(45 * Math.PI / 180);
  const isDragging = useRef<boolean>(false);
  const prevMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const resetSimulation = () => {
    particlesRef.current = [];
    frameCountRef.current = 0;
    tensionHistoryRef.current = Array(100).fill(0);
    shockwaveRadiusRef.current = 0;
    if (simMode === 'knot') {
      setIsRuptured(false);
    }
  };

  useEffect(() => {
    resetSimulation();
  }, [simMode, selectedHadron, isRuptured]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    prevMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - prevMousePos.current.x;
    const dy = e.clientY - prevMousePos.current.y;
    angleYRef.current += dx * 0.007;
    angleXRef.current = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, angleXRef.current - dy * 0.007));
    prevMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  // Helper to project 3D coordinates to 2D screen
  const project3D = (x: number, y: number, z: number, cx: number, cy: number, scale: number) => {
    // Rotate Y
    const cosY = Math.cos(angleYRef.current);
    const sinY = Math.sin(angleYRef.current);
    let x1 = x * cosY - z * sinY;
    let z1 = x * sinY + z * cosY;

    // Rotate X
    const cosX = Math.cos(angleXRef.current);
    const sinX = Math.sin(angleXRef.current);
    let y2 = y * cosX - z1 * sinX;
    let z2 = y * sinX + z1 * cosX;

    // Perspective projection
    const fov = 350;
    const projScale = fov / (fov + z2);
    return {
      x: cx + x1 * projScale * scale,
      y: cy + y2 * projScale * scale,
      depth: z2
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let width = canvas.clientWidth || 600;
    let height = canvas.clientHeight || 400;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width || 600;
      height = rect.height || 400;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();

    window.addEventListener('resize', resize);

    let animId: number;

    const render = () => {
      frameCountRef.current += 1;
      const t = frameCountRef.current * 0.02;

      // Reset compositing mode to default before drawing background to prevent canvas whiteout
      ctx.globalCompositeOperation = 'source-over';

      // Dark background
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, width, height);

      // Glow compositing for particle/knot effects
      ctx.globalCompositeOperation = 'screen';

      const cx = width / 2;
      const cy = height / 2 - 20;

      if (simMode === 'knot') {
        // ==========================================
        // Mode A: Topological Tensor Knot & Confinement
        // ==========================================
        const kScale = 45;
        const currentTension = massRigidity * (1.0 + elongation * 4.0);

        // Record tension history
        tensionHistoryRef.current.push(currentTension);
        if (tensionHistoryRef.current.length > 100) {
          tensionHistoryRef.current.shift();
        }

        // Auto rupture if elongation goes to 95% and not already ruptured
        if (elongation >= 0.95 && !isRuptured) {
          setIsRuptured(true);
          shockwaveRadiusRef.current = 10; // 파열 시 충격파 반경 초기화
          // Spawn rupture particles
          for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            particlesRef.current.push({
              x: cx,
              y: cy,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: 2 + Math.random() * 3,
              color: '#ef4444',
              alpha: 1,
              life: 1.0
            });
          }
        }

        if (!isRuptured) {
          // --- RENDER SINGLE KNOT (TREFOIL) ---
          const knotPoints: { x: number; y: number; z: number }[] = [];
          const numPoints = 120;

          // Stretch along Z/X based on elongation
          const stretchX = 1.0 + elongation * 1.5;
          const stretchY = 1.0; // Locked by Topological Flux Quantization (논문 완벽 반영)
          
          for (let i = 0; i <= numPoints; i++) {
            const theta = (i / numPoints) * Math.PI * 2 * 3;
            // Trefoil knot equations
            let kx = (Math.sin(theta) + 2 * Math.sin(2 * theta)) * stretchX;
            let ky = (Math.cos(theta) - 2 * Math.cos(2 * theta)) * stretchY;
            let kz = -Math.sin(3 * theta) * (1.0 + elongation * 0.8);
            knotPoints.push({ x: kx, y: ky, z: kz });
          }

          // Project points
          const projPoints = knotPoints.map(p => project3D(p.x, p.y, p.z, cx, cy, kScale));

          // Draw the tensor flux tube (thick glow)
          ctx.beginPath();
          projPoints.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.closePath();

          // Outer tube glow
          ctx.lineWidth = 14 + elongation * 4;
          ctx.strokeStyle = `rgba(59, 130, 246, ${0.15 - elongation * 0.05})`;
          ctx.stroke();

          // Mid tube (intensity changes with tension)
          ctx.lineWidth = 6 + elongation * 2;
          const tensionHue = 210 - elongation * 210; // Blue (210) to Red (0)
          ctx.strokeStyle = `hsla(${tensionHue}, 90%, 60%, 0.5)`;
          ctx.stroke();

          // Core fiber
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          // Draw knot crossing nodes (Vorticity core)
          projPoints.forEach((p, idx) => {
            if (idx % 20 === 0) {
              const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 8);
              grad.addColorStop(0, '#ffffff');
              // 코어 내부는 장력이 0으로 수렴하므로 붉어지지 않고 항상 안정적인 푸른색(210) 유지
              grad.addColorStop(0.3, `hsla(210, 90%, 65%, 0.8)`);
              grad.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
              ctx.fill();
            }
          });

          // Draw flux tension lines showing Short-Distance Core Softening
          ctx.globalCompositeOperation = 'source-over';
          ctx.font = '9px monospace';
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillText(`Fluid Helicity: H_fluid = 1.0 (h_0)`, 20, 30);
          ctx.fillText(`Model Tension (T_model): ${currentTension.toFixed(2)} N`, 20, 45);
          ctx.fillText(`Core Softening: T_core(\u03c1) \u2192 0 (\u03c1 \u2192 0)`, 20, 60);

        } else {
          // --- RENDER HADRONIZATION (SPLIT KNOTS) ---
          // Two separate smaller loops (representing produced mesons/hadrons)
          const numPoints = 80;
          const separation = 80 + Math.sin(t * 2) * 5;

          // Hadron 1 (Left)
          const knot1: { x: number; y: number; z: number }[] = [];
          for (let i = 0; i <= numPoints; i++) {
            const theta = (i / numPoints) * Math.PI * 2;
            knot1.push({
              x: -separation/kScale + Math.cos(theta) * 0.8,
              y: Math.sin(theta) * 0.8,
              z: Math.sin(theta * 2) * 0.3
            });
          }
          const proj1 = knot1.map(p => project3D(p.x, p.y, p.z, cx, cy, kScale));

          // Hadron 2 (Right)
          const knot2: { x: number; y: number; z: number }[] = [];
          for (let i = 0; i <= numPoints; i++) {
            const theta = (i / numPoints) * Math.PI * 2;
            knot2.push({
              x: separation/kScale + Math.cos(theta) * 0.8,
              y: Math.sin(theta) * 0.8,
              z: Math.cos(theta * 2) * 0.3
            });
          }
          const proj2 = knot2.map(p => project3D(p.x, p.y, p.z, cx, cy, kScale));

          // Draw Left Loop
          ctx.beginPath();
          proj1.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.closePath();
          ctx.lineWidth = 8;
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
          ctx.stroke();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#60a5fa';
          ctx.stroke();

          // Draw Right Loop
          ctx.beginPath();
          proj2.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.closePath();
          ctx.lineWidth = 8;
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
          ctx.stroke();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#34d399';
          ctx.stroke();

          ctx.globalCompositeOperation = 'source-over';
          ctx.font = '9px monospace';
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillText(`String Breaking: Static-Light Meson Pair Production`, 20, 30);
          ctx.fillText(`Yield Energy (E_crit) Analogous to Tensor Shockwave`, 20, 45);
          ctx.fillText(`New topological boundaries formed (H1, H2)`, 20, 60);
        }

        // Update & draw rupture particles
        particlesRef.current.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.02;
          p.alpha = Math.max(0, p.life);

          ctx.fillStyle = `rgba(239, 68, 74, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
        particlesRef.current = particlesRef.current.filter(p => p.life > 0);

        // --- W/Z Boson Tensor Shockwave Ring ---
        if (shockwaveRadiusRef.current > 0 && shockwaveRadiusRef.current < width * 1.5) {
          ctx.globalCompositeOperation = 'screen';
          const shockwaveAlpha = Math.max(0, 1.0 - shockwaveRadiusRef.current / (width * 0.8));
          ctx.strokeStyle = `rgba(239, 68, 68, ${shockwaveAlpha})`;
          ctx.lineWidth = 15 * shockwaveAlpha;
          ctx.beginPath();
          ctx.arc(cx, cy, shockwaveRadiusRef.current, 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.fillStyle = `rgba(255, 255, 255, ${shockwaveAlpha})`;
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText("W/Z TENSOR SHOCKWAVE TRIGGERED", cx, cy - shockwaveRadiusRef.current - 10);
          ctx.textAlign = 'left';
          
          shockwaveRadiusRef.current += 12;
        }

        // Switch to source-over for crisp text and graph rendering
        ctx.globalCompositeOperation = 'source-over';

        // Draw String Tension Real-time Graph (Bottom right)
        const gx = width - 180;
        const gy = height - 120;
        const gw = 160;
        const gh = 80;

        ctx.fillStyle = 'rgba(24, 24, 27, 0.8)';
        ctx.fillRect(gx, gy, gw, gh);
        ctx.strokeStyle = 'rgba(39, 39, 42, 1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(gx, gy, gw, gh);

        ctx.fillStyle = 'rgba(161, 161, 170, 0.6)';
        ctx.font = '8px monospace';
        ctx.fillText("String Tension (\u03c3)", gx + 5, gy + 12);

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        tensionHistoryRef.current.forEach((val, idx) => {
          // Normalise val (between 1 and 6)
          const normY = ((val - 1.0) / 5.0) * (gh - 25);
          const px = gx + (idx / 100) * gw;
          const py = gy + gh - 10 - normY;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();

      } else if (simMode === 'su3') {
        // ==========================================
        // Mode B: SU(3) Resonance Eigen-nodes
        // ==========================================
        const gridSize = 7;
        const step = 25;
        const gridScale = 1.2;

        let freqMultiplier = 1;
        let axisWeight = { x: 1, y: 1, z: 1 };
        let nodeComplexity = 1;
        let hadronLabel = "";

        if (selectedHadron === 'proton') {
          freqMultiplier = 1.5;
          axisWeight = { x: 1.0, y: 1.0, z: 0.5 };
          nodeComplexity = 3;
          hadronLabel = "Proton (uud) - 3-Axis Resonance (Octet)";
        } else if (selectedHadron === 'neutron') {
          freqMultiplier = 1.48;
          axisWeight = { x: 0.5, y: 1.0, z: 1.0 };
          nodeComplexity = 3.2;
          hadronLabel = "Neutron (udd) - Phase-Shift Resonance (Octet)";
        } else if (selectedHadron === 'pion') {
          freqMultiplier = 0.8;
          axisWeight = { x: 1.2, y: 0.0, z: 1.2 }; // Missing Y axis
          nodeComplexity = 1.5;
          hadronLabel = "Pion (\u03c0\u207a) - 2-Axis Flat Resonance (Meson)";
        } else if (selectedHadron === 'omega') {
          freqMultiplier = 2.2;
          axisWeight = { x: 1.5, y: 1.5, z: 1.5 };
          nodeComplexity = 5.0;
          hadronLabel = "Omega (\u03a9\u207b) - High-Frequency Resonance (Decuplet)";
        }

        // Generate 3D grid points matrix with visual deceleration
        const gridPoints3D: { x: number; y: number; z: number; ox: number; oy: number; oz: number }[][][] = [];
        const half = Math.floor(gridSize / 2);

        for (let i = 0; i < gridSize; i++) {
          const row: { x: number; y: number; z: number; ox: number; oy: number; oz: number }[][] = [];
          for (let j = 0; j < gridSize; j++) {
            const col: { x: number; y: number; z: number; ox: number; oy: number; oz: number }[] = [];
            for (let k = 0; k < gridSize; k++) {
              const ox = i - half;
              const oy = j - half;
              const oz = k - half;
              
              const gx = ox * step;
              const gy = oy * step;
              const gz = oz * step;

              col.push({
                x: gx * axisWeight.x,
                y: gy * axisWeight.y,
                z: gz * axisWeight.z,
                ox, oy, oz
              });
            }
            row.push(col);
          }
          gridPoints3D.push(row);
        }

        // Project 3D points to 2D
        const projectedMatrix: { x: number; y: number; ox: number; oy: number; oz: number; waveVal: number; isEigenNode: boolean }[][][] = [];
        for (let i = 0; i < gridSize; i++) {
          const row: { x: number; y: number; ox: number; oy: number; oz: number; waveVal: number; isEigenNode: boolean }[][] = [];
          for (let j = 0; j < gridSize; j++) {
            const col: { x: number; y: number; ox: number; oy: number; oz: number; waveVal: number; isEigenNode: boolean }[] = [];
            for (let k = 0; k < gridSize; k++) {
              const p = gridPoints3D[i][j][k];
              const proj = project3D(p.x, p.y, p.z, cx, cy, gridScale);
              const spatialAmp = Math.cos(p.ox * 0.4 * axisWeight.x) * Math.cos(p.oy * 0.4 * axisWeight.y) * Math.cos(p.oz * 0.4 * axisWeight.z);
              const isEigenNode = Math.abs(spatialAmp) > 0.8;
              col.push({
                x: proj.x,
                y: proj.y,
                ox: p.ox,
                oy: p.oy,
                oz: p.oz,
                waveVal: spatialAmp * Math.cos(t * 1.5 * freqMultiplier),
                isEigenNode: isEigenNode
              });
            }
            row.push(col);
          }
          projectedMatrix.push(row);
        }

        // Draw connecting 3D spatial filament wires
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.08)';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < gridSize; i++) {
          for (let j = 0; j < gridSize; j++) {
            for (let k = 0; k < gridSize; k++) {
              const p = projectedMatrix[i][j][k];
              if (i < gridSize - 1) {
                const px = projectedMatrix[i+1][j][k];
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(px.x, px.y);
                ctx.stroke();
              }
              if (j < gridSize - 1) {
                const py = projectedMatrix[i][j+1][k];
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(py.x, py.y);
                ctx.stroke();
              }
              if (k < gridSize - 1) {
                const pz = projectedMatrix[i][j][k+1];
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(pz.x, pz.y);
                ctx.stroke();
              }
            }
          }
        }

        // Render resonance junction nodes
        for (let i = 0; i < gridSize; i++) {
          for (let j = 0; j < gridSize; j++) {
            for (let k = 0; k < gridSize; k++) {
              const p = projectedMatrix[i][j][k];

              if (p.isEigenNode) {
                const glow = Math.abs(Math.cos(t * 1.5 * freqMultiplier));
                const glowSize = 3 + nodeComplexity * 0.8 * glow;
                ctx.fillStyle = `rgba(168, 85, 247, ${0.3 + compressionRatio * 0.5})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + glow * 0.6})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
                ctx.fill();
              } else {
                ctx.fillStyle = `rgba(59, 130, 246, 0.2)`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 0.8, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        }

        // Switch to source-over for text
        ctx.globalCompositeOperation = 'source-over';

        // Overlay text
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#a855f7';
        ctx.fillText(hadronLabel, 20, 30);
        
        ctx.font = '9px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText(`Vacuum Compression: ${(compressionRatio * 100).toFixed(0)}%`, 20, 45);
        ctx.fillText(`Effective Collective Modes (\u03a8_topo): ${nodeComplexity.toFixed(0)} components`, 20, 60);
        ctx.fillText("Effective Flavor SU(3)_f Multiplet Ansatz", 20, 75);

      } else if (simMode === 'exclusion') {
        // ==========================================
        // Mode C: Pauli Phase Exclusion
        // ==========================================
        const n1x = -nodeDistance / 2;
        const n1y = Math.sin(t) * 10;
        
        const n2x = nodeDistance / 2;
        const n2y = -Math.sin(t) * 10;

        const p1 = project3D(n1x, n1y, 0, cx, cy, 1.0);
        const p2 = project3D(n2x, n2y, 0, cx, cy, 1.0);

        const effectivePhase = berryPhaseDiff % (2 * Math.PI);
        const isDestructive = Math.abs(effectivePhase - Math.PI) < 0.8;
        const isVeryClose = nodeDistance < 130;

        // Draw Node 1 wave rings
        for (let r = 15; r < 90; r += 20) {
          ctx.strokeStyle = `rgba(59, 130, 246, ${0.4 - r/200})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p1.x, p1.y, r, 0, Math.PI * 2);
          ctx.stroke();
          
          const angle = t * 2 + (r * 0.1);
          ctx.fillStyle = '#60a5fa';
          ctx.beginPath();
          ctx.arc(p1.x + Math.cos(angle) * r, p1.y + Math.sin(angle) * r, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw Node 2 wave rings
        for (let r = 15; r < 90; r += 20) {
          ctx.strokeStyle = `rgba(16, 185, 129, ${0.4 - r/200})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p2.x, p2.y, r, 0, Math.PI * 2);
          ctx.stroke();

          const angle = t * 2 + (r * 0.1) + berryPhaseDiff;
          ctx.fillStyle = '#34d399';
          ctx.beginPath();
          ctx.arc(p2.x + Math.cos(angle) * r, p2.y + Math.sin(angle) * r, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Switch to source-over for text
        ctx.globalCompositeOperation = 'source-over';

        // Draw Spinor Cores
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 6, 0, Math.PI * 2);
        ctx.arc(p2.x, p2.y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.font = 'bold 9px sans-serif';
        ctx.fillStyle = '#60a5fa';
        ctx.fillText("\u03a8\u2081 (Spinor)", p1.x - 22, p1.y - 12);
        ctx.fillStyle = '#34d399';
        ctx.fillText("\u03a8\u2082 (Spinor)", p2.x - 22, p2.y - 12);

        // Exclusion Force Field
        if (isVeryClose && isDestructive) {
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          const overlap = 90 - (nodeDistance / 2);

          const grad = ctx.createRadialGradient(midX, midY, 0, midX, midY, overlap * 2.5);
          grad.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
          grad.addColorStop(0.4, 'rgba(239, 68, 68, 0.3)');
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(midX, midY, overlap * 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(midX, midY - overlap * 1.2);
          ctx.lineTo(midX, midY + overlap * 1.2);
          ctx.stroke();

          p1.x -= Math.random() * 2;
          p2.x += Math.random() * 2;

          ctx.fillStyle = '#f87171';
          ctx.font = 'bold 10px monospace';
          ctx.fillText("TOPOLOGICAL DEFORMATION WARNING!", cx - 80, cy + 90);
          ctx.font = '9px monospace';
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.fillText(`Energy Barrier: \u0394E_topo \u2192 \u221e`, cx - 80, cy + 105);

          if (frameCountRef.current % 3 === 0) {
            particlesRef.current.push({
              x: midX + (Math.random() - 0.5) * 10,
              y: midY + (Math.random() - 0.5) * 40,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 12,
              size: 1 + Math.random() * 2,
              color: '#fbbf24',
              alpha: 1.0,
              life: 0.6
            });
          }
        }

        // Draw particles with glow
        ctx.globalCompositeOperation = 'screen';
        particlesRef.current.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.03;
          p.alpha = Math.max(0, p.life);

          ctx.fillStyle = `rgba(251, 191, 36, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
        particlesRef.current = particlesRef.current.filter(p => p.life > 0);

        // Overlay text
        ctx.globalCompositeOperation = 'source-over';
        ctx.font = '9px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText(`Finkelstein-Rubinstein Constraint (4\u03c0 loop)`, 20, 30);
        ctx.fillText(`Spatial Rotation (\u03b8): ${(berryPhaseDiff * 2 * 180 / Math.PI).toFixed(0)}\u00b0 \u2192 Phase Discordance (\u0394\u03b8): ${(berryPhaseDiff * 180 / Math.PI).toFixed(0)}\u00b0`, 20, 45);
        ctx.fillText(`Destructive overlap: ${isDestructive ? "MAX (Deformation Barrier)" : "NONE"}`, 20, 60);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [simMode, elongation, isRuptured, massRigidity, selectedHadron, compressionRatio, nodeDistance, berryPhaseDiff]);

  return (
    <div className="flex flex-col bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden shadow-2xl">
      <div className="relative aspect-[3/2] w-full bg-zinc-950">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className="w-full h-full block cursor-grab active:cursor-grabbing"
        />
        <div className="absolute top-3 right-3 flex gap-2">
          {['knot', 'su3', 'exclusion'].map((m) => (
            <button
              key={m}
              onClick={() => { setSimMode(m as any); resetSimulation(); }}
              className={`px-2 py-1 text-[9px] font-mono font-bold rounded border transition-colors ${
                simMode === m
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>

        {simMode !== 'knot' && (
          <div className="absolute bottom-3 left-3 text-[9px] text-zinc-500 font-mono pointer-events-none">
            💡 Drag canvas to rotate camera angle
          </div>
        )}
      </div>

      <div className="bg-zinc-900 border-t border-zinc-800 p-4 space-y-4">
        {simMode === 'knot' && (
          <div className="space-y-3.5">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">Topological Elongation (r):</span>
                <span className="text-[#60a5fa] font-bold">{(elongation * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="99"
                value={Math.round(elongation * 100)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) / 100;
                  setElongation(val);
                  if (val < 0.9) setIsRuptured(false);
                }}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">Geometric Mass Rigidity (\u03ba):</span>
                <span className="text-zinc-300 font-bold">{massRigidity.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                value={Math.round(massRigidity * 10)}
                onChange={(e) => setMassRigidity(parseFloat(e.target.value) / 10)}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-zinc-800/60">
              <span className="text-[10px] text-zinc-500 font-mono">Status: {!isRuptured ? "Stable Knot Boundary" : "Fractured / Hadronized"}</span>
              {isRuptured && (
                <button
                  onClick={() => { setIsRuptured(false); setElongation(0.3); }}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-[9px] font-bold rounded border border-zinc-700"
                >
                  Reset Knot
                </button>
              )}
            </div>
          </div>
        )}

        {simMode === 'su3' && (
          <div className="space-y-3.5">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-zinc-400 font-mono">Select Resonant Hadron Configuration:</span>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {(['proton', 'neutron', 'pion', 'omega'] as const).map((had) => (
                  <button
                    key={had}
                    onClick={() => setSelectedHadron(had)}
                    className={`py-1.5 text-[10px] font-mono font-bold rounded border transition-colors ${
                      selectedHadron === had
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    {had.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">Vacuum Compression Ratio:</span>
                <span className="text-purple-400 font-bold">{(compressionRatio * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(compressionRatio * 100)}
                onChange={(e) => setCompressionRatio(parseFloat(e.target.value) / 100)}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>
        )}

        {simMode === 'exclusion' && (
          <div className="space-y-3.5">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">Spinor Node Distance:</span>
                <span className="text-[#60a5fa] font-bold">{nodeDistance} fm</span>
              </div>
              <input
                type="range"
                min="80"
                max="250"
                value={nodeDistance}
                onChange={(e) => setNodeDistance(parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">Spatial Rotation Angle (\u03b8):</span>
                <span className="text-[#34d399] font-bold">{(berryPhaseDiff * 2 * 180 / Math.PI).toFixed(0)}\u00b0</span>
              </div>
              <input
                type="range"
                min="0"
                max="720"
                value={Math.round(berryPhaseDiff * 2 * 180 / Math.PI)}
                onChange={(e) => setBerryPhaseDiff(((parseInt(e.target.value) * Math.PI) / 180) / 2)}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div className="text-[10px] text-zinc-500 font-mono leading-relaxed pt-2 border-t border-zinc-800/60">
              {nodeDistance < 130 && Math.abs((berryPhaseDiff % (2 * Math.PI)) - Math.PI) < 0.8 ? (
                <span className="text-red-400 font-bold">
                  ⚠️ Destructive phase interference detected. Orthogonal spinor phases demand infinite topological deformation energy.
                </span>
              ) : (
                <span>Cores occupy independent spatial metrics unless phase interference demands a deformation barrier.</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
