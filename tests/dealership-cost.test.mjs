import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateFiveYearCost, ownershipScenario } from '../lib/dealership-cost.mjs';
import { blindCar, filterVehicles } from '../lib/dealership-engine.mjs';
import { catalog } from '../data/dealership/catalog.mjs';

const suv={bodyStyle:'SUV',length:200,startingMSRP:50000,powertrain:'Gas',fuelType:'Regular Gasoline',mpgCombined:25};

test('five-year cost includes each ownership component once at 12k miles per year',()=>{
  const estimate=estimateFiveYearCost(suv);
  assert.equal(estimate.annualMiles,12000);
  assert.equal(ownershipScenario.years,5);
  assert.deepEqual(Object.keys(estimate.components),['depreciation','insurance','maintenance','energy','fees','financing']);
  assert.equal(estimate.total,Object.values(estimate.components).reduce((sum,value)=>sum+value,0));
  assert.equal(estimate.totalMiles,60000);
  assert.equal(estimate.costPerMile,Number((estimate.total/60000).toFixed(2)));
  assert.equal(estimate.operatingPerMile,Number(((estimate.components.maintenance+estimate.components.energy)/60000).toFixed(2)));
  assert.ok(estimate.total>50000&&estimate.total<100000);
  assert.equal(estimate.components.depreciation,26500);
  assert.equal(estimate.components.energy,10000);
});

test('energy changes with EPA efficiency and fuel type, without treating MSRP as a recurring expense',()=>{
  const regular=estimateFiveYearCost(suv);
  const efficient=estimateFiveYearCost({...suv,mpgCombined:30});
  const premium=estimateFiveYearCost({...suv,fuelType:'Premium Gasoline'});
  const electric=estimateFiveYearCost({...suv,powertrain:'Electric',fuelType:'Electricity',mpgCombined:null,mpgeCombined:90});
  assert.ok(efficient.components.energy<regular.components.energy);
  assert.ok(premium.components.energy>regular.components.energy);
  assert.ok(electric.components.energy<regular.components.energy);
  assert.ok(electric.components.depreciation>regular.components.depreciation);
});

test('unknown price uses clearly labeled AAA class costs and missing efficiency uses a labeled proxy',()=>{
  const classEstimate=estimateFiveYearCost({...suv,startingMSRP:null});
  assert.equal(classEstimate.priceBasisType,'class');
  assert.match(classEstimate.priceBasis,/AAA class ownership/);
  assert.ok(classEstimate.total>0);
  const electricClass=estimateFiveYearCost({...suv,startingMSRP:null,powertrain:'Electric',mpgCombined:null,mpgeCombined:90});
  assert.ok(electricClass.components.depreciation>classEstimate.components.depreciation);
  assert.match(estimateFiveYearCost({...suv,powertrain:'Hydrogen fuel cell'}).energyBasis,/actual hydrogen price/);
  assert.match(estimateFiveYearCost({...suv,mpgCombined:null}).energyBasis,/class fuel proxy/);
});

test('every catalog configuration and seven-seat blind result has a labeled estimate',()=>{
  const all=catalog.map(estimateFiveYearCost);
  assert.equal(all.length,423);
  assert.ok(all.every(estimate=>estimate.total>0&&estimate.costPerMile>0));
  assert.equal(all.filter(estimate=>estimate.priceBasisType==='class').length,408);
  const allFilterRows=filterVehicles({}).map(blindCar);
  assert.equal(allFilterRows.length,332);
  assert.ok(allFilterRows.every(row=>row.fiveYearCost.total>0));
  const rows=filterVehicles({seats:'7'}).map(blindCar);
  assert.equal(rows.length,63);
  assert.equal(rows.filter(row=>row.fiveYearCost.priceBasisType==='class').length,7);
  assert.ok(rows.every(row=>row.fiveYearCost.total>0));
  const raw=JSON.stringify(rows);
  assert.doesNotMatch(raw,/"(?:make|model|sourceUrl)":/);
});
