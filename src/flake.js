import fid from '@brecert/flakeid';

const FlakeId = fid.default;

const flake = new FlakeId({
  mid : 42,
  timeOffset : (2013-1970)*31536000*1000 
});

/**
 * Generates a Flake ID.
 *
 * @return {string} The generated Flake ID.
 */
export function generateFlakeId() {
  return flake.gen().toString();
}