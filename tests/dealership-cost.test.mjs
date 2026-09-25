import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateFiveYearCost, ownershipScenario } from '../lib/dealership-cost.mjs';
import { blindCar, filterVehicles } from '../lib/dealership-engine.mjs';

const suv={bodyStyle:'SUV',length:200,startingMSRP:50000,powertrain:'Gas',fuelType:'Regular Gasoline',mpgCombined:25};

test('five-year cost includes each ownership component once at 12k miles per year',()=>{
  const estimate=estimateFiveYearCost(suv);
  assert.equal(estimate.annualMiles,12000);
  assert.equal(ownershipScenario.years,5);
  assert.deepEqual(Object.keys(estimate.components),['depreciation','insurance','maintenance','energy','fees','financing']);
  assert.equal(estimate.total,Object.values(estimate.components).reduce((sum,value)=>sum+value,0));
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
});

test('unknown price stays unestimated and missing efficiency uses a labeled class proxy',()=>{
  assert.equal(estimateFiveYearCost({...suv,startingMSRP:null}),null);
  assert.equal(estimateFiveYearCost({...suv,powertrain:'Hydrogen fuel cell'}),null);
  assert.match(estimateFiveYearCost({...suv,mpgCombined:null}).energyBasis,/class fuel proxy/);
});

test('seven-seat blind results carry comparable cost estimates without brand identity',()=>{
  const rows=filterVehicles({seats:'7'}).map(blindCar);
  assert.equal(rows.length,63);
  assert.equal(rows.filter(row=>row.fiveYearCost!=null).length,56);
  assert.ok(rows.every(row=>row.fiveYearCost==null||row.fiveYearCost.total>0));
  const raw=JSON.stringify(rows);
  assert.doesNotMatch(raw,/"make"|"model"|"sourceUrl"/);
});
