/**
 * Application constants for Point Cloud Annotator
 */

// Point Cloud Configuration
export const POINT_CLOUD = {
    NUM_POINTS: 100000,
    POINT_SIZE: 0.12,
} as const;

// Annotation Marker Configuration
export const ANNOTATION_MARKER = {
    SIZE: 0.08,
    SEGMENTS: 16,
    COLOR_DEFAULT: 0x00bfff,
    COLOR_SELECTED: 0xff00ff,
    EMISSIVE_INTENSITY: 0.5,
    OPACITY: 0.6,
    SCALE_SELECTED: 2.0,
    SCALE_DEFAULT: 1,
} as const;

// Camera Configuration
export const CAMERA = {
    FOV: 60,
    NEAR: 0.1,
    FAR: 1000,
    POSITION: { x: 8, y: 5, z: 8 },
    MIN_DISTANCE: 1,
    MAX_DISTANCE: 100,
    DAMPING_FACTOR: 0.05,
} as const;

// Scene Configuration
export const SCENE = {
    BACKGROUND_COLOR: 0x1a1a2e,
    GRID_SIZE: 20,
    GRID_DIVISIONS: 20,
    GRID_COLOR_CENTER: 0x444444,
    GRID_COLOR_GRID: 0x333333,
} as const;

// Light Configuration
export const LIGHTS = {
    AMBIENT_INTENSITY: 0.6,
    DIRECTIONAL_INTENSITY: 0.8,
    DIRECTIONAL_POSITION: { x: 10, y: 10, z: 10 },
} as const;

// Storage Configuration
export const STORAGE = {
    KEY: 'point-cloud-annotations',
    MAX_TEXT_BYTES: 256,
    VERSION: 1,
} as const;
