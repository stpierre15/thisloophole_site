import { catalog } from '../../data/dealership/catalog.mjs';

const id = process.argv[2];
const car = catalog.find(vehicle => vehicle.id === id);
if (!car) {
  console.error('Usage: node scripts/dealership/render-prompt.mjs <catalog-id>');
  process.exitCode = 1;
} else if ([car.length, car.width, car.height, car.wheelbase].some(value => value == null)) {
  console.error(`${id}: published dimensions are required before rendering.`);
  process.exitCode = 1;
} else {
  const silhouette = car.bodyStyle === 'Sedan' ? 'three-box sedan with a separate trunk' : car.bodyStyle === 'Pickup' ? 'cab and open cargo bed' : car.bodyStyle === 'Minivan' ? 'one-box passenger van' : 'passenger vehicle with a rear cargo compartment';
  console.log(`Create one high-resolution 3/4 front-left studio structural visualization of a real 2026 US-market vehicle's anonymous packaging architecture. No badges, branding, logos, text, license plate, identifiable grille, production headlights, or recognizable OEM styling. Do not create a generic icon or flat silhouette. Preserve the published proportions: length ${car.length} in, width ${car.width} in, height ${car.height} in, wheelbase ${car.wheelbase} in${car.groundClearance != null ? `, ground clearance ${car.groundClearance} in` : ''}. Depict a ${silhouette} with truthful wheel spacing, cabin volume, occupant seating arrangement for ${car.seats ?? 'unspecified'} seats, cargo volume behind the final occupied row${car.powertrain === 'Electric' ? ', a low underfloor battery pack and electric drive units' : car.powertrain === 'Hybrid' ? ', a hybrid powertrain package' : ', a combustion powertrain package'}. Semi-transparent frosted white body volume, graphite mechanical structure, dark tinted cabin, soft shadows on neutral gray seamless background. Same camera, focal length, framing, light, and neutral colors as the rest of the Loophole Dealership series. No image of a completed branded production vehicle.`);
}
