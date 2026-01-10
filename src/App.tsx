import { useState, useCallback } from 'react';
import { PotreeViewer } from './components/PotreeViewer';
import { AnnotationPanel } from './components/AnnotationPanel';
import { AnnotationForm } from './components/AnnotationForm';
import { useAnnotations } from './hooks/useAnnotations';
import { getStorageMode } from './services/storage';
import './App.css';

function App() {
  const {
    annotations,
    selectedAnnotation,
    isLoading,
    error,
    createAnnotation,
    deleteAnnotation,
    selectAnnotation,
  } = useAnnotations();

  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number; z: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const storageMode = getStorageMode();

  const handlePointClick = useCallback((position: { x: number; y: number; z: number }) => {
    setPendingPosition(position);
  }, []);

  const handleAnnotationClick = useCallback((id: string) => {
    selectAnnotation(selectedAnnotation === id ? null : id);
  }, [selectAnnotation, selectedAnnotation]);

  const handleSaveAnnotation = useCallback(async (text: string) => {
    if (pendingPosition) {
      try {
        setIsSaving(true);
        await createAnnotation(pendingPosition, text);
        setPendingPosition(null);
      } catch (err) {
        console.error('Failed to save annotation:', err);
        // Keep the form open on error
      } finally {
        setIsSaving(false);
      }
    }
  }, [pendingPosition, createAnnotation]);

  const handleCancelAnnotation = useCallback(() => {
    setPendingPosition(null);
  }, []);

  const handleDeleteAnnotation = useCallback(async (id: string) => {
    try {
      await deleteAnnotation(id);
    } catch (err) {
      console.error('Failed to delete annotation:', err);
    }
  }, [deleteAnnotation]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🦁 Point Cloud Annotator</h1>
          <span className="header-subtitle">3D Annotation Tool</span>
        </div>
        <div className="header-badge">
          <span className="badge">{storageMode.badge}</span>
          <span className="storage-indicator">{storageMode.label}</span>
        </div>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          ⚠️ {error}
        </div>
      )}

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
          isLoading={isLoading}
        />
      </main>

      <AnnotationForm
        position={pendingPosition}
        onSave={handleSaveAnnotation}
        onCancel={handleCancelAnnotation}
        isSaving={isSaving}
      />
    </div>
  );
}

export default App;
