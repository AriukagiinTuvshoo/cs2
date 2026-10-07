import { compoundMap } from './compound.js';
import { downtownMap } from './downtown.js';
import { highwayMap } from './highway.js';
import { officeMap } from './office.js';
import { vaultMap } from './vault.js';
import { yardMap } from './yard.js';
import { rangeMap } from './range.js';

export function getMap(id) {
  switch (id) {
    case 'compound': return compoundMap();
    case 'downtown': return downtownMap();
    case 'highway': return highwayMap();
    case 'office': return officeMap();
    case 'vault': return vaultMap();
    case 'yard': return yardMap();
    case 'range': return rangeMap();
    default: throw new Error(`Unknown map ${id}`);
  }
}
