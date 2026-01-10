# 🦁 Point Cloud Annotator

A web-based 3D point cloud annotation tool built with React, TypeScript, and Three.js.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **3D Point Cloud Visualization**: Interactive 3D viewer with orbit controls
- **Annotation System**: Click on any point to create annotations
- **Text Annotations**: Attach text notes (max 256 bytes) to any point
- **Persistent Storage**: Annotations persist across page refreshes via localStorage
- **Modern UI**: Sleek dark theme with glassmorphism effects

## 📸 Screenshot

![Point Cloud Annotator](docs/screenshot.png)

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 19 + TypeScript |
| Build Tool | Vite 7 |
| 3D Rendering | Three.js |
| Styling | Modern CSS (Custom Properties, Glassmorphism) |
| Persistence | Browser localStorage (V1) |

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd point-cloud-annotator

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

## 📖 Usage

1. **View Point Cloud**: Use mouse to navigate the 3D scene
   - **Left-click + drag**: Rotate view
   - **Right-click + drag**: Pan view
   - **Scroll**: Zoom in/out

2. **Create Annotation**: Click on any point in the point cloud
   - A form will appear to enter annotation text
   - Maximum 256 bytes for annotation text
   - Press `Ctrl + Enter` to save quickly

3. **View Annotations**: All annotations appear in the right panel
   - Click on an annotation to highlight it in 3D view

4. **Delete Annotation**: 
   - Click the 🗑️ button next to any annotation
   - Or click on the annotation marker in 3D view

## 📁 Project Structure

```
point-cloud-annotator/
├── src/
│   ├── components/
│   │   ├── PotreeViewer.tsx    # 3D viewer with Three.js
│   │   ├── AnnotationPanel.tsx # Sidebar annotation list
│   │   └── AnnotationForm.tsx  # Create annotation modal
│   ├── hooks/
│   │   └── useAnnotations.ts   # Annotation state management
│   ├── services/
│   │   └── storage.ts          # localStorage persistence
│   ├── types/
│   │   └── annotation.ts       # TypeScript interfaces
│   ├── App.tsx                 # Main application component
│   ├── App.css                 # Styles
│   └── main.tsx                # Entry point
├── index.html
├── package.json
├── vite.config.ts
└── README.md
```

## 🔧 Technical Choices

### Why Three.js instead of Potree directly?

For V1, I chose to create a sample point cloud with Three.js to:
1. **Simplify setup**: No need for external point cloud conversion tools
2. **Faster development**: Focus on core annotation functionality
3. **Easier testing**: Self-contained sample data

In V2/V3, this can be extended to load real LAZ files using Potree or potree-loader.

### Why localStorage?

For V1 (Tier 1 persistence), localStorage provides:
- Zero configuration required
- Works offline
- Simple API for JSON data
- Sufficient for single-user annotation workflow

## 🗺️ Roadmap

### V2 - Netlify Deployment (Planned)
- [ ] Netlify Functions (serverless API)
- [ ] Netlify Blobs (NoSQL key-value storage)
- [ ] Same REST API as V3
- [ ] Easy transition to AWS

### V3 - AWS Serverless (Planned)
- [ ] AWS API Gateway + Lambda
- [ ] DynamoDB (NoSQL key-value)
- [ ] S3 static hosting
- [ ] CloudFront CDN
- [ ] Infrastructure as Code (Terraform)

## 📝 Acceptance Criteria

- [x] Point cloud visible in viewer on page load
- [x] Click on any point to add annotation
- [x] Input and save text (max 256 bytes) for annotations
- [x] Delete existing annotations
- [x] Annotations reload on page refresh

## 📄 License

MIT License - feel free to use this project as you wish!

---

Built with ❤️ for Unleash Live Skills Assessment
