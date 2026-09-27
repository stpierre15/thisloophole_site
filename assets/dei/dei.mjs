// @ts-check
import { OPTIONS, allocateHousehold } from './model.mjs';
import { generateAllocatedPortrait } from './portrait.mjs';

/** @template {HTMLElement} T @param {string} id @returns {T} */
const element = id => /** @type {T} */ (document.getElementById(id));
const form = /** @type {HTMLFormElement} */ (element('allocation-form'));
const screens = ['intro', 'application', 'analysis', 'results'];
const steps = [...document.querySelectorAll('.form-step')];
/** @type {(string|null)[]} */
const parentImages = [null, null];
const imageRevisions = [0, 0];
let currentStep = 0;
let processing = false;
let session = 0;

for (const select of document.querySelectorAll('select[data-options]')) {
  const control = /** @type {HTMLSelectElement} */ (select);
  control.add(new Option('Select a response', ''));
  for (const text of OPTIONS[control.dataset.options]) control.add(new Option(text, text));
}

/** @param {string} screen @param {string} heading */
function showScreen(screen, heading) {
  for (const id of screens) element(id).hidden = id !== screen;
  window.scrollTo({top: 0, behavior: 'auto'});
  element(heading).focus({preventScroll: true});
}

function showStep() {
  for (let index = 0; index < steps.length; index++) {
    /** @type {HTMLFieldSetElement} */ (steps[index]).hidden = index !== currentStep;
    // Native validation must ignore controls in other steps, which remain in memory.
    /** @type {HTMLFieldSetElement} */ (steps[index]).disabled = index !== currentStep;
    const item = document.querySelectorAll('.stepper li')[index];
    if (index === currentStep) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  }
  element('step-count').textContent = 'STEP 0' + (currentStep + 1) + ' OF 03';
  element('back').textContent = currentStep ? '← PREVIOUS' : '← INTRODUCTION';
  element('next').textContent = currentStep === 2 ? 'SUBMIT FOR ALLOCATION →' : 'CONTINUE →';
  element('form-error').textContent = '';
}

function clearSession() {
  session++;
  processing = false;
  form.reset();
  currentStep = 0;
  parentImages.fill(null);
  for (let index = 0; index < 2; index++) {
    imageRevisions[index]++;
    const prefix = 'parent' + (index + 1);
    const input = /** @type {HTMLInputElement} */ (element(prefix + '-image'));
    input.value = '';
    input.setCustomValidity('');
    input.removeAttribute('aria-invalid');
    const preview = /** @type {HTMLImageElement} */ (element(prefix + '-preview'));
    preview.removeAttribute('src');
    preview.hidden = true;
    element(prefix + '-empty').hidden = false;
    element(prefix + '-photo-error').textContent = '';
  }
  const random = crypto.getRandomValues(new Uint32Array(1))[0];
  const number = 'SEBA-' + String(new Date().getFullYear()).slice(-2) + '-' + String(10000 + random % 90000);
  for (const node of document.querySelectorAll('[data-application-number]')) node.textContent = number;
  for (const id of ['child-name', 'profile-fields', 'adjustments', 'household-score', 'opportunity-score', 'reduction', 'issued-at', 'analysis-log', 'form-error']) element(id).replaceChildren();
  /** @type {HTMLButtonElement} */ (element('next')).disabled = false;
  /** @type {HTMLButtonElement} */ (element('begin')).disabled = false;
  showStep();
  for (const id of screens) element(id).hidden = id !== 'intro';
}

/** @param {File} file @returns {Promise<string>} */
function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('The photograph could not be read. Choose another image.'));
    reader.readAsDataURL(file);
  });
}

for (let index = 0; index < 2; index++) {
  const prefix = 'parent' + (index + 1);
  const input = /** @type {HTMLInputElement} */ (element(prefix + '-image'));
  input.addEventListener('change', async () => {
    const revision = ++imageRevisions[index];
    const file = input.files?.[0];
    const preview = /** @type {HTMLImageElement} */ (element(prefix + '-preview'));
    parentImages[index] = null;
    preview.removeAttribute('src');
    preview.hidden = true;
    element(prefix + '-empty').hidden = false;
    element(prefix + '-photo-error').textContent = '';
    input.setCustomValidity('');
    input.removeAttribute('aria-invalid');
    if (!file) return;
    input.setCustomValidity('Wait for the local photograph preview to finish.');
    try {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('Choose a JPEG, PNG, WebP or GIF image. For HEIC, export a JPEG first.');
      if (file.size > 10 * 1024 * 1024) throw new Error('This image is larger than 10 MB. Choose a smaller image.');
      element(prefix + '-photo-error').textContent = 'Reading locally…';
      const source = await readImage(file);
      const image = new Image();
      image.src = source;
      await image.decode();
      if (revision !== imageRevisions[index]) return;
      parentImages[index] = source;
      preview.src = source;
      preview.hidden = false;
      element(prefix + '-empty').hidden = true;
      element(prefix + '-photo-error').textContent = 'LOCAL REFERENCE ACCEPTED';
      input.setCustomValidity('');
    } catch (error) {
      if (revision !== imageRevisions[index]) return;
      const message = error instanceof Error && error.name !== 'EncodingError' ? error.message : 'This file is not a readable image. Choose another photograph.';
      input.setCustomValidity(message);
      input.setAttribute('aria-invalid', 'true');
      element(prefix + '-photo-error').textContent = message;
      return;
    }
    input.removeAttribute('aria-invalid');
  });
}

element('begin').addEventListener('click', () => {
  showStep();
  showScreen('application', 'application-title');
});

element('back').addEventListener('click', () => {
  if (currentStep === 0) { showScreen('intro', 'intro-title'); return; }
  currentStep--;
  showStep();
  showScreen('application', 'application-title');
});

/** @param {HTMLElement} target @param {{label:string,value:string}[]} rows */
function renderRows(target, rows) {
  target.replaceChildren(...rows.map(({label, value}) => {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    row.append(term, description);
    return row;
  }));
}

/** @param {ReturnType<typeof allocateHousehold>} profile @param {number} activeSession */
async function displayResults(profile, activeSession) {
  const portrait = await generateAllocatedPortrait(profile, parentImages);
  if (activeSession !== session) return;
  element('household-score').textContent = String(profile.score);
  element('opportunity-score').textContent = String(profile.opportunity);
  element('child-name').textContent = profile.name;
  element('reduction').textContent = String(profile.reduction);
  const issued = new Date();
  const time = /** @type {HTMLTimeElement} */ (element('issued-at'));
  time.dateTime = issued.toISOString();
  time.textContent = issued.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  renderRows(element('profile-fields'), [
    {label: 'Assigned socioeconomic trajectory', value: profile.trajectory},
    {label: 'Assigned neighborhood opportunity', value: profile.neighborhood},
    {label: 'Assigned educational access', value: profile.education},
    {label: 'Assigned family wealth starting point', value: profile.wealth},
    {label: 'Assigned institutional access', value: profile.access},
    {label: 'Assigned demographic representation', value: profile.representation},
  ]);
  renderRows(element('adjustments'), profile.adjustments);
  /** @type {HTMLImageElement} */ (element('allocated-portrait').querySelector('img')).src = portrait.src;
  element('allocated-portrait').dataset.state = portrait.state;
  element('portrait-status').textContent = portrait.message;
  showScreen('results', 'results-title');
}

const messages = [
  'Calculating intergenerational advantage', 'Measuring educational concentration',
  'Estimating neighborhood opportunity', 'Reviewing inherited capital',
  'Calculating institutional access', 'Normalizing demographic representation',
  'Projecting cultural capital', 'Allocating corrective characteristics',
];

/** @param {ReturnType<typeof allocateHousehold>} profile */
async function analyze(profile) {
  const activeSession = session;
  const progress = /** @type {HTMLProgressElement} */ (element('analysis-progress'));
  const log = element('analysis-log');
  log.replaceChildren();
  progress.value = 0;
  element('progress-percent').textContent = '0%';
  element('analysis-message').textContent = messages[0];
  showScreen('analysis', 'analysis-title');
  const percentages = [8, 19, 31, 44, 59, 73, 88, 100];
  for (let index = 0; index < messages.length; index++) {
    if (activeSession !== session) return;
    element('analysis-message').textContent = messages[index];
    progress.value = percentages[index];
    progress.textContent = percentages[index] + '%';
    element('progress-percent').textContent = percentages[index] + '%';
    if (index) {
      const line = document.createElement('p');
      line.textContent = '✓ ' + messages[index - 1].toUpperCase();
      log.append(line);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (activeSession !== session) return;
  await displayResults(profile, activeSession);
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (processing || !form.reportValidity()) return;
  if (currentStep === 0 && parentImages.some(image => !image)) {
    element('form-error').textContent = 'Both local photograph previews must be accepted before continuing.';
    return;
  }
  if (currentStep < steps.length - 1) {
    currentStep++;
    showStep();
    showScreen('application', 'application-title');
    return;
  }
  try {
    for (const step of steps) /** @type {HTMLFieldSetElement} */ (step).disabled = false;
    const values = Object.fromEntries([...new FormData(form)].filter(([, value]) => typeof value === 'string'));
    const profile = allocateHousehold(/** @type {import('./model.mjs').Household} */ (values));
    processing = true;
    /** @type {HTMLButtonElement} */ (element('next')).disabled = true;
    await analyze(profile);
  } catch (error) {
    showStep();
    showScreen('application', 'application-title');
    element('form-error').textContent = error instanceof Error ? error.message : 'Allocation unavailable. Review the application and submit again.';
  } finally {
    processing = false;
    /** @type {HTMLButtonElement} */ (element('next')).disabled = false;
  }
});

element('print').addEventListener('click', () => window.print());
element('restart').addEventListener('click', () => { clearSession(); showScreen('intro', 'intro-title'); });
// Disable browser-restored form values, including back/forward cache restoration.
window.addEventListener('pageshow', () => clearSession());
window.addEventListener('pagehide', () => clearSession());
clearSession();
