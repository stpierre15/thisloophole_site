// @ts-check

/**
 * Future portrait adapter. V1 does not inspect, serialize, persist, or upload parent images.
 * A future implementation can replace this function after a separate consent/privacy design.
 * @param {ReturnType<typeof import('./model.mjs').allocateHousehold>} _profile
 * @param {(string|null)[]} _parentImages In-memory local previews only.
 * @returns {Promise<{state:'placeholder', src:string, message:string}>}
 */
export async function generateAllocatedPortrait(_profile, _parentImages) {
  return {
    state: 'placeholder',
    src: '/assets/dei/infant.svg',
    message: 'Visual allocation unavailable in public beta.',
  };
}
