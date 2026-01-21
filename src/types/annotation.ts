export interface Annotation {
    id: string;
    sceneId: string;
    position: {
        x: number;
        y: number;
        z: number;
    };
    text: string;
    createdAt: number;
}

export interface AnnotationStore {
    annotations: Annotation[];
    version: number;
}
