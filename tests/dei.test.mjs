import test from 'node:test';
import assert from 'node:assert/strict';
import { OPTIONS, WEIGHTS, allocateHousehold, estimatedOpportunityIndex, validateHousehold } from '../assets/dei/model.mjs';
import { generateAllocatedPortrait } from '../assets/dei/portrait.mjs';

const household = {
  income: '$125,000–$250,000', wealth: '$250K–$1M', zip: '60614',
  parent1Education: "Bachelor's", parent2Education: "Master's",
  parent1FamilyEducation: 'High school', parent2FamilyEducation: "Bachelor's",
  parent1Identity: 'Asian', parent2Identity: 'White',
  parent1Profession: 'Engineering / technology', parent2Profession: 'Teacher / public service',
  ownership: 'Own with mortgage', privateSchool: 'No', selectiveEducation: 'No',
  legacy: 'Possibly', inheritance: 'Under 10%',
};

test('fictional allocation is deterministic and all weights total 100', () => {
  assert.equal(Object.values(WEIGHTS).reduce((sum, value) => sum + value, 0), 100);
  assert.deepEqual(allocateHousehold(household), allocateHousehold({...household}));
  const result = allocateHousehold(household);
  assert.equal(result.adjustments.length, 5);
  assert.equal(new Set(result.adjustments.map(row => row.label)).size, 5);
});

test('all identity pairs leave every economic outcome, name, and adjustment unchanged', () => {
  const {representation: _representation, ...baseline} = allocateHousehold(household);
  for (const parent1Identity of OPTIONS.identity) for (const parent2Identity of OPTIONS.identity) {
    const {representation, ...profile} = allocateHousehold({...household, parent1Identity, parent2Identity});
    assert.deepEqual(profile, baseline);
    const entered = [parent1Identity, parent2Identity].filter(identity => identity !== 'Prefer not to answer');
    for (const identity of entered) assert.ok(representation.includes(identity));
    if (!entered.length) assert.equal(representation, 'Self-identification deferred · no identity assigned');
    assert.ok(!representation.includes('Prefer not to answer'));
  }
});

test('multiple economic dimensions independently influence the score', () => {
  const baseline = allocateHousehold(household).score;
  for (const change of [
    {income: 'Over $1,000,000'}, {wealth: '$20M+'},
    {parent1Education: 'Doctorate', parent2Education: 'Doctorate'},
    {parent1FamilyEducation: 'Doctorate', parent2FamilyEducation: 'Doctorate'},
    {ownership: 'Family-owned / inherited property'}, {inheritance: 'More than 50%'},
    {privateSchool: 'Yes'}, {selectiveEducation: 'Yes'}, {legacy: 'Yes'},
    {parent1Profession: 'Executive / founder', parent2Profession: 'Executive / founder'},
  ]) assert.ok(allocateHousehold({...household, ...change}).score > baseline, JSON.stringify(change));
});

test('score and opportunity stay bounded across extreme households and demo ZIPs', () => {
  const lower = {...household, income: OPTIONS.income[0], wealth: OPTIONS.wealth[0],
    parent1Education: OPTIONS.education[0], parent2Education: OPTIONS.education[0],
    parent1FamilyEducation: OPTIONS.education[0], parent2FamilyEducation: OPTIONS.education[0],
    ownership: 'Rent', inheritance: 'None', legacy: 'No', privateSchool: 'No', selectiveEducation: 'No',
    parent1Profession: 'Unemployed', parent2Profession: 'Unemployed'};
  const upper = {...household, income: OPTIONS.income.at(-1), wealth: OPTIONS.wealth.at(-1),
    parent1Education: 'Doctorate', parent2Education: 'Doctorate',
    parent1FamilyEducation: 'Doctorate', parent2FamilyEducation: 'Doctorate',
    ownership: 'Family-owned / inherited property', inheritance: 'More than 50%', legacy: 'Yes',
    privateSchool: 'Yes', selectiveEducation: 'Yes', parent1Profession: 'Executive / founder', parent2Profession: 'Executive / founder'};
  for (let index = 0; index < 250; index++) {
    const zip = String(index * 397).padStart(5, '0');
    const opportunity = estimatedOpportunityIndex(zip);
    assert.ok(opportunity >= 0 && opportunity <= 100);
    assert.equal(opportunity, estimatedOpportunityIndex(zip));
    assert.ok(allocateHousehold({...lower, zip}).score <= 5);
    assert.ok(allocateHousehold({...upper, zip}).score >= 95);
  }
});

test('validation rejects missing fields, unknown categories, and malformed ZIPs', () => {
  for (const field of Object.keys(household)) {
    const incomplete = {...household};
    delete incomplete[field];
    assert.throws(() => validateHousehold(incomplete));
  }
  for (const zip of ['1234', '123456', 'ABCDE', '12 45', '12345\n']) assert.throws(() => allocateHousehold({...household, zip}));
  assert.throws(() => allocateHousehold({...household, parent1Identity: 'Inferred from photograph'}));
  assert.throws(() => allocateHousehold({...household, income: '<script>alert(1)</script>'}));
  assert.equal(validateHousehold({...household, unexpected: 'discard me'}).unexpected, undefined);
});

test('withheld economic answers are explicit neutral demo values', () => {
  const result = allocateHousehold({...household, legacy: 'We prefer not to answer', inheritance: 'Prefer not to answer'});
  assert.equal(result.components.legacy, 50);
  assert.equal(result.components.inheritance, 50);
});

test('portrait adapter resolves a placeholder without inspecting parent references', async () => {
  const images = new Proxy([], {get() { throw new Error('Parent images must not be inspected in V1'); }});
  const result = await generateAllocatedPortrait(allocateHousehold(household), images);
  assert.equal(result.state, 'placeholder');
  assert.equal(result.src, '/assets/dei/infant.svg');
  assert.equal(result.message, 'Visual allocation unavailable in public beta.');
});
