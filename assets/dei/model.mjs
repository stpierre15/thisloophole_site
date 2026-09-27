// @ts-check

export const OPTIONS = {
  income: ['Under $40,000', '$40,000–$75,000', '$75,000–$125,000', '$125,000–$250,000', '$250,000–$500,000', '$500,000–$1,000,000', 'Over $1,000,000'],
  wealth: ['Negative', '$0–$50K', '$50K–$250K', '$250K–$1M', '$1M–$5M', '$5M–$20M', '$20M+'],
  education: ['Did not finish high school', 'High school', 'Some college', "Bachelor's", "Master's", 'Professional degree', 'Doctorate'],
  identity: ['American Indian or Alaska Native', 'Asian', 'Black or African American', 'Hispanic or Latino', 'Middle Eastern or North African', 'Native Hawaiian or Pacific Islander', 'White', 'Multiracial', 'Another identity', 'Prefer not to answer'],
  ownership: ['Rent', 'Own with mortgage', 'Own outright', 'Family-owned / inherited property', 'Other'],
  yesNo: ['Yes', 'No'],
  legacy: ['No', 'Possibly', 'Yes', 'We prefer not to answer'],
  inheritance: ['None', 'Under 10%', '10–25%', '25–50%', 'More than 50%', 'Prefer not to answer'],
  profession: ['Student', 'Unemployed', 'Service / hourly work', 'Skilled trade', 'Teacher / public service', 'Healthcare', 'Engineering / technology', 'Finance', 'Law', 'Consulting', 'Executive / founder', 'Creative', 'Other'],
};

/** @typedef {{income:string, wealth:string, zip:string, parent1Education:string, parent2Education:string, parent1FamilyEducation:string, parent2FamilyEducation:string, parent1Identity:string, parent2Identity:string, parent1Profession:string, parent2Profession:string, ownership:string, privateSchool:string, selectiveEducation:string, legacy:string, inheritance:string}} Household */
/** @typedef {{label:string, value:string}} Adjustment */

const FIELDS = {
  income: 'income', wealth: 'wealth', ownership: 'ownership', inheritance: 'inheritance',
  parent1Education: 'education', parent2Education: 'education',
  parent1FamilyEducation: 'education', parent2FamilyEducation: 'education',
  parent1Identity: 'identity', parent2Identity: 'identity',
  parent1Profession: 'profession', parent2Profession: 'profession',
  privateSchool: 'yesNo', selectiveEducation: 'yesNo', legacy: 'legacy',
};

/** Explicit fictional weights. These are invented, not empirically derived. */
export const WEIGHTS = {
  income: 17, wealth: 20, education: 12, familyEducation: 8, ownership: 7,
  inheritance: 7, privateSchool: 4, selectiveEducation: 7, legacy: 7,
  profession: 6, neighborhood: 5,
};

/** @param {Record<string, unknown>} values @returns {Household} */
export function validateHousehold(values) {
  const clean = {};
  for (const [field, optionSet] of Object.entries(FIELDS)) {
    if (typeof values[field] !== 'string' || !OPTIONS[optionSet].includes(values[field])) {
      throw new Error('Complete all household fields using the available options.');
    }
    clean[field] = values[field];
  }
  if (typeof values.zip !== 'string' || !/^[0-9]{5}$/.test(values.zip)) {
    throw new Error('Enter a five-digit ZIP code.');
  }
  clean.zip = values.zip;
  return /** @type {Household} */ (clean);
}

/** @param {string} value */
function hash(value) {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
}

/** Demo only: the hash has no relationship to geography, census data, or opportunity.
 * @param {string} zip */
export function estimatedOpportunityIndex(zip) {
  if (!/^[0-9]{5}$/.test(zip)) throw new Error('Enter a five-digit ZIP code.');
  return hash('fictional-neighborhood:' + zip) % 101;
}

/** @param {string[]} options @param {string} value */
const ladder = (options, value) => options.indexOf(value) / (options.length - 1) * 100;
/** @param {number} a @param {number} b */
const average = (a, b) => (a + b) / 2;

/**
 * This algorithm is fictional satire and does not represent an actual DEI framework or social-science model.
 * Identity and photographs never affect the household score, financial allocations, education, name,
 * profession, or adjustments. Only explicitly entered identities appear in the representation field.
 * Unknown economic answers use neutral demo values, never inferred identity-based values.
 * @param {Household} values
 */
export function allocateHousehold(values) {
  const data = validateHousehold(values);
  const opportunity = estimatedOpportunityIndex(data.zip);
  const professionValues = [15, 0, 20, 42, 40, 60, 70, 85, 80, 80, 100, 40, 50];
  const components = {
    income: ladder(OPTIONS.income, data.income),
    wealth: ladder(OPTIONS.wealth, data.wealth),
    education: average(ladder(OPTIONS.education, data.parent1Education), ladder(OPTIONS.education, data.parent2Education)),
    familyEducation: average(ladder(OPTIONS.education, data.parent1FamilyEducation), ladder(OPTIONS.education, data.parent2FamilyEducation)),
    ownership: [0, 55, 85, 100, 50][OPTIONS.ownership.indexOf(data.ownership)],
    inheritance: [0, 20, 45, 70, 100, 50][OPTIONS.inheritance.indexOf(data.inheritance)],
    privateSchool: data.privateSchool === 'Yes' ? 100 : 0,
    selectiveEducation: data.selectiveEducation === 'Yes' ? 100 : 0,
    legacy: [0, 50, 100, 50][OPTIONS.legacy.indexOf(data.legacy)],
    profession: average(professionValues[OPTIONS.profession.indexOf(data.parent1Profession)], professionValues[OPTIONS.profession.indexOf(data.parent2Profession)]),
    neighborhood: opportunity,
  };
  const score = Math.max(0, Math.min(100, Math.round(Object.entries(WEIGHTS).reduce((total, [key, weight]) => total + components[key] * weight / 100, 0))));
  // Canonical economic seed: changing an identity cannot alter non-demographic results.
  const seed = hash(Object.keys(FIELDS).filter(key => !key.endsWith('Identity')).map(key => data[key]).join('|') + '|' + data.zip);
  const choose = (items, offset = 0) => items[hash(seed + ':' + offset) % items.length];
  const names = ['Alex', 'Avery', 'Cameron', 'Casey', 'Ellis', 'Finley', 'Jamie', 'Jordan', 'Morgan', 'Quinn', 'Reese', 'Riley', 'Robin', 'Rowan', 'Sam', 'Taylor'];
  const high = score >= 67;
  const low = score < 34;
  const trajectory = high
    ? choose(['First-generation college student', 'Working-class household', 'Wealth-building household'], 1)
    : low
      ? choose(['Upper-middle opportunity track', 'High social mobility pathway', 'Multi-generational professional class'], 1)
      : choose(['Wealth-building household', 'High social mobility pathway', 'Upper-middle opportunity track'], 1);
  const education = high
    ? choose(['Public-school pathway', 'Vocational / technical pathway', 'First-generation university pathway'], 2)
    : low
      ? choose(['Selective university access', 'Graduate education pathway'], 2)
      : choose(['Public-school pathway', 'Graduate education pathway', 'First-generation university pathway'], 2);
  const support = high ? choose([0, 8400, 18400], 3) : low ? choose([65000, 98000, 124000], 3) : choose([24000, 38600, 52000], 3);
  const identities = [...new Set([data.parent1Identity, data.parent2Identity].filter(value => value !== 'Prefer not to answer'))];
  const representation = identities.length ? identities.join(' / ') + ' · self-identified parent record' : 'Self-identification deferred · no identity assigned';
  /** @type {Adjustment[]} */
  const candidates = [
    {label: 'CREDIT SCORE AT BIRTH', value: 'PENDING'},
    {label: 'FAMILY SKIING EXPERIENCE', value: high ? '−2 TRIPS/YEAR' : '+1 TRIP/YEAR'},
    {label: 'LINKEDIN CONNECTIONS AT AGE 18', value: String(high ? 17 + seed % 84 : 411 + seed % 400)},
    {label: 'NETWORKING ADVANTAGE', value: high ? 'REDUCED ' + (35 + seed % 29) + '%' : 'PROVISIONALLY EXPANDED'},
    {label: 'FAMILY CABIN ACCESS', value: components.wealth >= 66 ? 'REVOKED' : 'WAITLISTED'},
    {label: 'SUMMER INTERNSHIP ACCESS', value: high ? 'REMOVED' : 'PREAUTHORIZED'},
    {label: 'PRIVATE SCHOOL ALLOCATION', value: data.privateSchool === 'Yes' ? 'DENIED' : 'LOTTERY ENTRY ISSUED'},
    {label: 'LEGACY ADMISSION ACCESS', value: data.legacy === 'Yes' || data.selectiveEducation === 'Yes' ? 'DISABLED' : 'APPLICATION EXPEDITED'},
    {label: 'CONSULTING RECRUITER CONTACT', value: high ? 'DEFERRED UNTIL AGE 30' : 'PREAUTHORIZED'},
    {label: 'TRUST FUND DISBURSEMENT', value: components.inheritance >= 70 ? 'REDIRECTED' : 'ADMINISTRATIVELY PENDING'},
  ];
  // Seeded shuffle gives variety without changing an allocation on resubmission.
  const adjustments = candidates.map((item, index) => ({item, rank: hash(seed + ':adjustment:' + index)}))
    .sort((a, b) => a.rank - b.rank).slice(0, 5).map(({item}) => item);
  return {
    score, opportunity, components,
    reduction: 61 + seed % 29,
    name: choose(names, 4), trajectory, education,
    neighborhood: high ? 'LOWER-MIDDLE OPPORTUNITY BAND' : low ? 'HIGH OPPORTUNITY BAND' : 'MIDDLE OPPORTUNITY BAND',
    wealth: support ? '$' + support.toLocaleString('en-US') + ' projected household family support' : 'No inherited financial support allocated',
    access: high ? 'Limited legacy access' : low ? 'Extensive professional-network access' : 'Moderate professional-network access',
    representation, adjustments,
  };
}
