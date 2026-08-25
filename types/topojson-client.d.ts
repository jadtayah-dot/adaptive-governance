/*
  topojson-client ships no type declarations and the DefinitelyTyped package was
  not on the approved install list, so the two shapes this project uses are
  declared here. Extend this file rather than widening any call site to any.
*/
declare module 'topojson-client' {
  interface TopologyObject {
    type: string
    geometries?: unknown[]
    [key: string]: unknown
  }

  interface Topology {
    type: 'Topology'
    objects: Record<string, TopologyObject>
    arcs: unknown[]
    transform?: unknown
  }

  interface TopoFeature {
    type: 'Feature'
    id?: string | number
    properties: Record<string, unknown>
    geometry: unknown
  }

  interface TopoFeatureCollection {
    type: 'FeatureCollection'
    features: TopoFeature[]
  }

  export function feature(
    topology: Topology,
    object: TopologyObject | string,
  ): TopoFeature | TopoFeatureCollection

  export function mesh(topology: Topology, object?: TopologyObject | string): unknown
}
