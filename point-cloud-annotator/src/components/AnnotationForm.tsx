import { useState, useEffect, useRef, useMemo } from 'react';

interface AnnotationFormProps {
    position: { x: number; y: number; z: number } | null;
    onSave: (text: string) => void;
    onCancel: () => void;
}

const MAX_BYTES = 256;

export function AnnotationForm({ position, onSave, onCancel }: AnnotationFormProps) {
    const [text, setText] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Calculate byte count using useMemo instead of useEffect + setState
    const byteCount = useMemo(() => {
        const encoder = new TextEncoder();
        return encoder.encode(text).length;
    }, [text]);

    useEffect(() => {
        if (position && inputRef.current) {
            inputRef.current.focus();
        }
    }, [position]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onSave(text.trim());
            setText('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel();
        } else if (e.key === 'Enter' && e.ctrlKey) {
            handleSubmit(e);
        }
    };

    if (!position) return null;

    const isOverLimit = byteCount > MAX_BYTES;

    return (
        <div className="annotation-form-overlay" onClick={onCancel}>
            <div className="annotation-form" onClick={e => e.stopPropagation()}>
                <div className="form-header">
                    <h3>✨ New Annotation</h3>
                    <button className="close-btn" onClick={onCancel}>×</button>
                </div>

                <div className="form-position">
                    <span>Position:</span>
                    <code>
                        X: {position.x.toFixed(3)}, Y: {position.y.toFixed(3)}, Z: {position.z.toFixed(3)}
                    </code>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="annotation-text">Annotation Text</label>
                        <textarea
                            ref={inputRef}
                            id="annotation-text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter your annotation (max 256 bytes)..."
                            rows={4}
                            className={isOverLimit ? 'error' : ''}
                        />
                        <div className={`byte-counter ${isOverLimit ? 'error' : ''}`}>
                            {byteCount} / {MAX_BYTES} bytes
                            {isOverLimit && <span className="error-text"> (exceeds limit)</span>}
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={onCancel}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={!text.trim() || isOverLimit}
                        >
                            Save Annotation
                        </button>
                    </div>

                    <div className="form-hint">
                        Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to save, <kbd>Esc</kbd> to cancel
                    </div>
                </form>
            </div>
        </div>
    );
}
