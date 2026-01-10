import { useState, useCallback } from 'react';
import { PotreeViewer } from './components/PotreeViewer';
import { AnnotationPanel } from './components/AnnotationPanel';
import { AnnotationForm } from './components/AnnotationForm';
import { useAnnotations } from './hooks/useAnnotations';
import './App.css';

function App() {
  const {
    annotations,
    selectedAnnotation,
    createAnnotation,
    deleteAnnotation,
    selectAnnotation,
  } = useAnnotations();

  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number; z: number } | null>(null);

  const handlePointClick = useCallback((position: { x: number; y: number; z: number }) => {
    setPendingPosition(position);
  }, []);

  const handleAnnotationClick = useCallback((id: string) => {
    selectAnnotation(selectedAnnotation === id ? null : id);
  }, [selectAnnotation, selectedAnnotation]);

  const handleSaveAnnotation = useCallback((text: string) => {
    if (pendingPosition) {
      createAnnotation(pendingPosition, text);
      setPendingPosition(null);
    }
  }, [pendingPosition, createAnnotation]);

  const handleCancelAnnotation = useCallback(() => {
    setPendingPosition(null);
  }, []);

  const handleDeleteAnnotation = useCallback((id: string) => {
    deleteAnnotation(id);
  }, [deleteAnnotation]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🦁 Point Cloud Annotator</h1>
          <span className="header-subtitle">3D Annotation Tool</span>
        </div>
        <div className="header-badge">
          <span className="badge">V1</span>
          <span className="storage-indicator">💾 localStorage</span>
        </div>
      </header>

      <main className="app-main">
        <PotreeViewer
          annotations={annotations}
          selectedAnnotation={selectedAnnotation}
          onPointClick={handlePointClick}
          onAnnotationClick={handleAnnotationClick}
        />
        <AnnotationPanel
          annotations={annotations}
          selectedAnnotation={selectedAnnotation}
          onSelect={handleAnnotationClick}
          onDelete={handleDeleteAnnotation}
        />
      </main>

      <AnnotationForm
        position={pendingPosition}
        onSave={handleSaveAnnotation}
        onCancel={handleCancelAnnotation}
      />
    </div>
  );
}

export default App;
