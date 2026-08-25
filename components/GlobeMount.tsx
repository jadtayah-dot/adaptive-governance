'use client'

import dynamic from 'next/dynamic'

import type { GlobeProps } from './Globe'

/*
  The globe touches window, WebGL and ResizeObserver, so it must not be
  prerendered. next/dynamic with ssr false is only allowed inside a Client
  Component in this version of Next, which is the only reason this wrapper
  exists. See node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md.

  The loading state renders nothing. The globe well is asserted to be empty in
  tests/homepage.py, and a spinner or a word here would both break that and add
  copy outside content/.
*/
const Globe = dynamic(() => import('./Globe'), {
  ssr: false,
  loading: () => null,
})

export default function GlobeMount(props: GlobeProps) {
  return <Globe {...props} />
}
