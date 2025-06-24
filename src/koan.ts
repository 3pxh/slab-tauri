import { Slab } from './slab';

export interface Koan {
  test: (slab: Slab) => boolean;
  examples: string[];
  codes: string[];
}

export const evenRows: Koan = {
  test: (slab: Slab) => slab.length % 2 === 0,
  examples: [
    "d",
    "dwadsd",
    "dwadsdsswdsd",
    "dwdadwdwd",
    "dwdsdwdwd",
    "dsdsd"
  ],
  codes: [
    "dsdwd",
    "dsdsdsdsd",
    "adsdsdsdsdsswd",
  ],
}; 