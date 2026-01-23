declare module 'potree-core' {
    import * as THREE from 'three';

    export class Potree {
        constructor();
        pointBudget: number;
        loadPointCloud(
            fileName: string,
            baseUrl: string
        ): Promise<PointCloudOctree>;
        updatePointClouds(
            pointClouds: PointCloudOctree[],
            camera: THREE.Camera,
            renderer: THREE.WebGLRenderer
        ): void;
    }

    export class PointCloudOctree extends THREE.Object3D {
        material: PointCloudMaterial;
        boundingBox: THREE.Box3;
        boundingSphere: THREE.Sphere;
        pcoGeometry: {
            root: any;
        };
    }

    export class PointCloudMaterial extends THREE.Material {
        size: number;
        pointSizeType: number;
        pointColorType: number;
        shape: number;
        activeAttributeName: string;
    }

    export enum PointSizeType {
        FIXED = 0,
        ATTENUATED = 1,
        ADAPTIVE = 2
    }

    export enum PointShape {
        SQUARE = 0,
        CIRCLE = 1,
        PARABOLOID = 2
    }

    export enum PointColorType {
        RGB = 0,
        COLOR = 1,
        DEPTH = 2,
        HEIGHT = 3,
        ELEVATION = 3,
        INTENSITY = 4,
        INTENSITY_GRADIENT = 5,
        LOD = 6,
        LEVEL_OF_DETAIL = 6,
        POINT_INDEX = 7,
        CLASSIFICATION = 8,
        RETURN_NUMBER = 9,
        SOURCE = 10,
        NORMAL = 11,
        PHONG = 12,
        RGB_HEIGHT = 13,
        COMPOSITE = 50
    }
}
