// The chosen system: Editorial. See DESIGN.md.
// Newsreader for headings, Public Sans for body, IBM Plex Mono for anything
// numeric or metadata. None of Inter, DM Sans, Poppins, Montserrat or Geist.

import { Newsreader, Public_Sans, IBM_Plex_Mono } from 'next/font/google'

export const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})

export const publicSans = Public_Sans({
  variable: '--font-public-sans',
  subsets: ['latin'],
  display: 'swap',
})

export const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
})

export const fontVariables = [
  newsreader.variable,
  publicSans.variable,
  plexMono.variable,
].join(' ')
