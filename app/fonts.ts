// Roboto, which is what hbku.edu.qa serves for headings, body and everything
// else. See DESIGN.md. It replaces the three voice system the site had before,
// Newsreader for headings, Public Sans for body and IBM Plex Mono for anything
// numeric, and that flattening is deliberate rather than accidental: matching
// the university is worth more here than the register the three voices carried.
//
// Roboto is under the Apache licence, so next/font/google self hosts it and
// nothing has to be bought or loaded from a third party.

import { Roboto } from 'next/font/google'

export const roboto = Roboto({
  variable: '--font-roboto',
  subsets: ['latin'],
  // 300 and 500 are what the university site uses for its lighter and medium
  // weights. 700 carries the headings.
  weight: ['300', '400', '500', '700'],
  display: 'swap',
})

export const fontVariables = roboto.variable
