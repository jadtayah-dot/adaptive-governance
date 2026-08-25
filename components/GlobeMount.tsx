'use client'

import dynamic from 'next/dynamic'

/*
  The globe touches window, WebGL and ResizeObserver, so it must not be
  prerendered. next/dynamic with ssr false is only allowed inside a Client
  Component in this version of Next, which is the only reason this wrapper
  exists. See node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md.

  The loading state renders nothing. The globe block is asserted to be empty in
  tests/homepage.py, and a spinner or a word here would both break that and add
  copy outside content/.
*/
const Globe = dynamic(() => import('./Globe'), {
  ssr: false,
  loading: () => null,
})

export default function GlobeMount() {
  return <Globe />
}
