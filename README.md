# Point Cloud Annotator

## Acceptance Criteria
- [x] I can see the point cloud loaded in the Potree viewer when I access the page.
- [x] I can use my mouse to click on any point on the point cloud and add an annotation.
- [x] I can input and save a text string (up to 256 bytes) for that annotation.
- [x] I can delete an existing annotation.
- [x] All annotations are successfully re-loaded when I refresh the page.

---

## Table of Contents
1. [Technical Choices & Architecture](#1-technical-choices--architecture)
2. [Instructions to Run](#2-instructions-to-run-v3---aws)
3. [Deployed Applications](#3-deployed-applications)
4. [Code Quality](#4-code-quality)
5. [Problem-Solving Approach](#5-problem-solving-approach)
6. [Use of AI Tools](#6-use-of-ai-tools)

---

## 1. Technical Choices & Architecture

### Frontend Stack
The **Point Cloud Annotator** is built with **React 19**, **TypeScript**, and **Three.js**. The frontend design remains consistent across all versions, featuring a dark-themed glassmorphism UI. A storage abstraction layer (`src/services/storage.ts`) allows seamless switching between backends via environment variables.

### Potree / Three.js Implementation
The 3D visualization uses **potree-core** (the official Potree library) integrated with **Three.js**:

| Feature | Implementation |
|---------|----------------|
| **Point Cloud Data** | Official **Potree Lion (lion_takanawa)** dataset from [potree.github.io](https://potree.github.io/potree/examples/lion.html) |
| **Rendering** | `potree-core` with LOD (Level of Detail) for efficient rendering of 1M+ points |
| **Camera Controls** | `OrbitControls` with damping for smooth rotation, zoom (scroll), and pan (right-click) |
| **Annotation Markers** | `THREE.SphereGeometry` meshes with emissive `MeshPhongMaterial` for glow effect |
| **Click Detection** | `Potree.pick()` for precise point-picking on the cloud; `THREE.Raycaster` for marker selection |
| **Scene Composition** | GridHelper, ambient + directional lighting, responsive canvas resize handling |

The lion point cloud is the famous **Tokyo Takanawa lion statue**, a high-quality 3D scan used in official Potree demonstrations.

### Backend Evolution

| Version | Stack | Persistence | Commit |
|---------|-------|-------------|--------|
| **V1** | localStorage | Browser-local | [`7b137f7`](https://github.com/varunveeraa/UnleashLive/commit/7b137f7e569c34ff3921e65efb3f0297061f9ebe) |
| **V2a** | Netlify Functions + In-Memory JSON | ❌ Lost on cold start | [`d57a128`](https://github.com/varunveeraa/UnleashLive/commit/d57a1285920f9caf43ad23c993816ce32ba449bc) |
| **V2b** | Netlify Functions + Blobs | ⚠️ Payment tier required | [`fdb4f9b`](https://github.com/varunveeraa/UnleashLive/commit/fdb4f9b06331b00b1d79200f6cba86c7d06c3fee) |
| **V3** | AWS (API Gateway + Lambda + DynamoDB) | ✅ Full persistence | `latest` |

**V3 (AWS Cloud-Native)** is the final submission implementing "Tier 3" requirements:
- **Frontend**: Hosted on **AWS S3** (Static Website Hosting).
- **Backend**: **AWS API Gateway** (HTTP API) triggering **AWS Lambda** (Node.js 20.x, bundled with esbuild).
- **Database**: **AWS DynamoDB** (on-demand capacity) for low-latency annotation storage.
- **Infrastructure**: Fully provisioned via **Terraform** (`terraform/` directory).

---

## 2. Instructions to Run (V3 - AWS)

### Prerequisites
- Node.js (v20+)
- npm

### Installation
```bash
git clone https://github.com/varunveeraa/UnleashLive.git
cd UnleashLive
npm install
```

### Run Locally (Connected to AWS Backend)
1.  Create a `.env` file in the project root:
    ```env
    VITE_STORAGE_PROVIDER=api
    VITE_API_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
    ```
    *(Replace with your API Gateway URL from Terraform output)*

2.  Start the development server:
    ```bash
    npm run dev
    ```

3.  Open [http://localhost:5173](http://localhost:5173). Annotations are fetched from and saved to DynamoDB.

---

## 3. Deployed Applications

| Version | Link | Notes |
|---------|------|-------|
| **V2 (Netlify)** | [point-cloud-annotator.netlify.app](https://point-cloud-annotator.netlify.app/) | Partial persistence (in-memory) |
| **V3 (AWS S3)** | [point-cloud-annotator-frontend-v3.s3-website-us-east-1.amazonaws.com](http://point-cloud-annotator-frontend-v3.s3-website-us-east-1.amazonaws.com/) | ✅ Full persistence |

---

## 4. Code Quality

Code quality is verified after every version development to ensure adherence to software engineering best practices:

- **ESLint**: 0 errors across all TypeScript files
- **Type Safety**: Strict TypeScript with no `any` types
- **React Patterns**: Proper hooks usage, cleanup functions, memoization
- **Security**: Input validation on both frontend and backend (256-byte text limit)
- **Documentation**: Comprehensive `CODE_QUALITY.md` with checklists and standards

See [`CODE_QUALITY.md`](./CODE_QUALITY.md) for the full quality audit.

---

## 5. Problem-Solving Approach

### Potree / 3D Integration
The main challenge was integrating Three.js rendering with React's declarative paradigm:
- **Refs over State**: Used `useRef` for Three.js objects (scene, camera, renderer) to avoid re-renders on every frame.
- **Cleanup**: Proper disposal of WebGL resources and event listeners in `useEffect` cleanup functions.
- **Raycasting**: Implemented priority-based hit detection — annotation markers are checked before the point cloud to enable click-to-select.

### UI/3D State Management
- **Single Source of Truth**: Annotations live in the `useAnnotations` hook, synced to both the 3D markers and the sidebar panel.
- **Storage Abstraction**: The `storage.ts` service abstracts persistence, allowing the same UI to work with localStorage (V1) or REST APIs (V2/V3) via a single environment variable.
- **Optimistic Updates**: UI updates immediately on user action; backend sync happens asynchronously.

### Architecture Decisions
- **Tier Progression**: Started with a working V1 (localStorage) to ensure core functionality, then incrementally added deployment tiers. This ensured a "simple, working solution" was always available.
- **Infrastructure as Code**: Chose Terraform over manual AWS console setup for reproducibility and version control.

---

## 6. Use of AI Tools

This project was developed with the assistance of **Antigravity AI Coding Agent**, a customized AI-powered development environment configured with MCP servers and custom rules to ensure adherence to software engineering best practices.

### Models Used
| Model | Use Case |
|-------|----------|
| **Claude Opus 4.5** | Critical logic, core functionality, Three.js integration, Lambda handlers |
| **Gemini 3 Pro (High)** | Debugging, documentation, code review, README drafting |

### How AI Was Leveraged
- **Boilerplate Acceleration**: Terraform configs, Lambda handlers, TypeScript interfaces
- **3D Debugging**: Three.js raycasting, buffer geometry, WebGL resource cleanup
- **Quality Assurance**: Code review, best practices enforcement, ESLint/TypeScript validation
- **Documentation**: README structure, CODE_QUALITY.md, inline comments

Antigravity's custom configuration ensured **efficient credit utilization** and **consistent code quality** across the entire development lifecycle. All AI-generated code was reviewed, tested, and adapted to fit the project architecture.

---

## Project Structure
```
UnleashLive/
├── src/                 # React Frontend (components, services, types)
├── aws/handlers/        # Lambda Functions (TypeScript, bundled with esbuild)
├── terraform/           # Infrastructure as Code (API Gateway, Lambda, DynamoDB, S3)
└── package.json
```

## License
MIT
