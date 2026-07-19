# Mechanics of Spatial Vibration IV: Simulation Sandbox

This repository contains the interactive geomechanical simulation sandbox for **"Mechanics of Spatial Vibration IV: Topological Tensor Knots and the Geomechanical Realization of SU(3) Hadronic Symmetry"** (Version 1.0.0).

This computational sandbox is designed to physically and visually demonstrate the subatomic core concepts presented in the paper, utilizing standard web canvas technologies.

## 🌐 Online Access & Interactive Demo
You can run the simulation locally by simply double-clicking the **[index.html](index.html)** file in any web browser (no installation or local server required), or integrate the Next.js React component **`SimulationWidget_V4.tsx`** into your portfolio or research portal.

---

## 📺 Simulation Modes

### 1. Mode A: KNOT & Confinement
* **Description:** Represents hadrons as 3D Trefoil knots formed by non-abelian tensor vortices. Stetching the knot boundary under constant volume (Topological Flux Quantization) drives string tension linearly until rupture.
* **Interactive Parameters:** Topological Elongation ($r$, 0-95%), Geometric Mass Rigidity ($\kappa$, 1.0-3.0). Triggers W/Z Boson Tensor Shockwave upon rupture.

### 2. Mode B: SU(3) Resonance
* **Description:** Mappings of stationary standing-wave eigen-nodes that oscillate in place. Illustrates how abstract SU(3) algebra is isomorphic to coordinate-space resonance patterns when the vacuum is subjected to extreme compression.
* **Interactive Parameters:** Hadron configuration selections (Proton, Neutron, Pion, Omega), Vacuum Compression Ratio (0-100%).

### 3. Mode C: Spinor Exclusion
* **Description:** Demonstrates the 720-degree spinor winding symmetry and Pauli Phase Exclusion. When spinors are brought close under destructive phase difference (odd multiples of $\pi$), it triggers wave cancelation and infinite repulsive pressure.
* **Interactive Parameters:** Inter-Node Distance (80-250 fm), Spatial Rotation Angle ($\theta$, 0-720°).

---

## 🛠️ File Structure
* **`index.html`**: Zero-dependency standalone HTML5 canvas simulation.
* **`main_part4_01.tex`**: LaTeX source code of the manuscript.
* **`main_part4_01.pdf`**: Precompiled PDF version of the paper.
* **`CITATION.cff`**: Academic citation metadata in standard YAML format.
* **`LICENSE`**: MIT License.

---

## 📄 Academic Citation
If you use this simulation model or the ideas from the paper in your research, please cite this repository:
```bibtex
@software{yoo2026spatial4,
  author = {Yoo, Kwang Yong},
  title = {Geomechanical Simulation Sandbox for Spatial Vibration Mechanics IV},
  url = {https://github.com/khanyong/spatial-vibration-series-4},
  doi = {10.5281/zenodo.21438016},
  version = {1.0.0},
  year = {2026}
}
```
