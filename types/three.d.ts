/*
  three ships no type declarations and @types/three is not on the approved
  install list in PRODUCT.md, so the surface this project actually touches is
  declared here. Same approach as types/topojson-client.d.ts: extend this file
  rather than widening a call site to any.

  react-globe.gl's own declarations import Scene, Camera, WebGLRenderer, Light,
  Material, Texture and Object3D from this module, so those names have to exist
  here even where this project never constructs one.
*/
declare module 'three' {
  export type ColorRepresentation = string | number

  export class Vector3 {
    x: number
    y: number
    z: number
    set(x: number, y: number, z: number): this
    setScalar(value: number): this
  }

  export class Object3D {
    readonly position: Vector3
    readonly scale: Vector3
    visible: boolean
    renderOrder: number
    add(...objects: Object3D[]): this
    remove(...objects: Object3D[]): this
  }

  export class Scene extends Object3D {}
  export class Camera extends Object3D {}

  /**
   * globe.gl frames by field of view, so the sphere's size on screen is decided
   * by the camera rather than by the canvas. react-globe.gl types `camera()` as
   * the base class, so reading the angle back means casting to this.
   */
  export class PerspectiveCamera extends Camera {
    fov: number
    aspect: number
    updateProjectionMatrix(): void
  }
  export class Light extends Object3D {}

  export class WebGLRenderer {}
  export class Texture {}

  export class Color {
    constructor(color?: ColorRepresentation)
    set(color: ColorRepresentation): this
  }

  export class Material {
    transparent: boolean
    opacity: number
    depthWrite: boolean
    dispose(): void
  }

  export class BufferAttribute {}


  export class Float32BufferAttribute extends BufferAttribute {
    constructor(array: number[] | Float32Array, itemSize: number)
  }

  export class BufferGeometry {
    setAttribute(name: string, attribute: BufferAttribute): this
    dispose(): void
  }

  export class SphereGeometry extends BufferGeometry {
    constructor(radius?: number, widthSegments?: number, heightSegments?: number)
  }

  export interface MeshBasicMaterialParameters {
    color?: ColorRepresentation
    wireframe?: boolean
    transparent?: boolean
    opacity?: number
    depthWrite?: boolean
  }

  export class MeshBasicMaterial extends Material {
    constructor(parameters?: MeshBasicMaterialParameters)
    color: Color
    wireframe: boolean
  }

  export class Mesh extends Object3D {
    constructor(geometry?: BufferGeometry, material?: Material)
    geometry: BufferGeometry
    material: Material
  }

  export interface LineBasicMaterialParameters {
    color?: ColorRepresentation
    transparent?: boolean
    opacity?: number
    depthWrite?: boolean
  }

  export class LineBasicMaterial extends Material {
    constructor(parameters?: LineBasicMaterialParameters)
    color: Color
  }

  export class LineSegments extends Object3D {
    constructor(geometry?: BufferGeometry, material?: Material)
    geometry: BufferGeometry
    material: Material
  }

  export class Group extends Object3D {}
}
