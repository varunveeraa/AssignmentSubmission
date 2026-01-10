import type { Annotation } from '../types/annotation';

interface AnnotationPanelProps {
    annotations: Annotation[];
    selectedAnnotation: string | null;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    isLoading?: boolean;
}

export function AnnotationPanel({
    annotations,
    selectedAnnotation,
    onSelect,
    onDelete,
    isLoading = false,
}: AnnotationPanelProps) {
    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    const truncateText = (text: string, maxLength: number = 50) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    return (
        <div className="annotation-panel">
            <div className="panel-header">
                <h2>📍 Annotations</h2>
                <span className="annotation-count">{annotations.length}</span>
            </div>

            <div className="annotation-list">
                {isLoading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Loading annotations...</p>
                    </div>
                ) : annotations.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🎯</div>
                        <p>No annotations yet</p>
                        <span>Click on the point cloud to add your first annotation</span>
                    </div>
                ) : (
                    annotations.map(annotation => (
                        <div
                            key={annotation.id}
                            className={`annotation-item ${selectedAnnotation === annotation.id ? 'selected' : ''}`}
                            onClick={() => onSelect(annotation.id)}
                        >
                            <div className="annotation-content">
                                <div className="annotation-text">
                                    {truncateText(annotation.text) || <em className="no-text">No text</em>}
                                </div>
                                <div className="annotation-meta">
                                    <span className="annotation-coords">
                                        ({annotation.position.x.toFixed(2)}, {annotation.position.y.toFixed(2)}, {annotation.position.z.toFixed(2)})
                                    </span>
                                    <span className="annotation-date">
                                        {formatDate(annotation.createdAt)}
                                    </span>
                                </div>
                            </div>
                            <button
                                className="delete-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(annotation.id);
                                }}
                                title="Delete annotation"
                            >
                                🗑️
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
