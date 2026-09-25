// A comparison scenario, not a model-specific insurance or resale quote.
// AAA 2026 Your Driving Costs studies 5 years / 75,000 miles. Its category
// operating and ownership figures are annual averages for five popular models.
// Sources and the derivation of the 12k-mile depreciation proxy are in
// data/dealership/ownership-cost-method.md.
export const ownershipScenario = Object.freeze({
  years:5,
  annualMiles:12000,
  regularGasPerGallon:4.152,
  premiumGasPerGallon:5.06,
  dieselPerGallon:5.07,
  electricityPerKwh:0.18,
  depreciationShare:0.53,
  financeAnnualPerDollar:1184/39376,
  priceAnchor:39376,
});

const categoryCosts=Object.freeze({
  smallSedan:{label:'Small sedan',maintenancePerMile:.111,annualInsurance:1623,annualFees:512,annualDepreciation:2745,depreciationReductionAt10k:318,annualFinance:736,defaultEnergyPerMile:.1319},
  mediumSedan:{label:'Medium sedan',maintenancePerMile:.1142,annualInsurance:1788,annualFees:675,annualDepreciation:3664,depreciationReductionAt10k:394,annualFinance:961,defaultEnergyPerMile:.117},
  subcompactSuv:{label:'Subcompact SUV',maintenancePerMile:.1162,annualInsurance:2169,annualFees:587,annualDepreciation:3075,depreciationReductionAt10k:318,annualFinance:861,defaultEnergyPerMile:.1545},
  compactSuv:{label:'Compact SUV',maintenancePerMile:.1206,annualInsurance:2294,annualFees:741,annualDepreciation:3998,depreciationReductionAt10k:414,annualFinance:1063,defaultEnergyPerMile:.1176},
  mediumSuv:{label:'Medium SUV',maintenancePerMile:.1216,annualInsurance:2469,annualFees:867,annualDepreciation:4913,depreciationReductionAt10k:419,annualFinance:1304,defaultEnergyPerMile:.2046},
  midsizePickup:{label:'Midsize pickup',maintenancePerMile:.1126,annualInsurance:1867,annualFees:830,annualDepreciation:4040,depreciationReductionAt10k:426,annualFinance:1220,defaultEnergyPerMile:.2296},
  halfTonPickup:{label:'Half-ton pickup',maintenancePerMile:.1182,annualInsurance:2134,annualFees:1078,annualDepreciation:6248,depreciationReductionAt10k:513,annualFinance:1637,defaultEnergyPerMile:.2387},
});

// AAA's separate EV/hybrid comparison covers these four classes. Use its
// powertrain-specific ownership figures where available, but retain the
// general category as the fallback for classes outside that comparison.
const powertrainCosts=Object.freeze({
  mediumSedan:{gasDepreciation:3330,Electric:{annualDepreciation:6786,annualInsurance:2070,annualFees:1051,annualFinance:1441,maintenancePerMile:1602/15000,defaultEnergyPerMile:712.5/15000},Hybrid:{annualDepreciation:3739,annualInsurance:1706,annualFees:689,annualFinance:1016,maintenancePerMile:1619/15000,defaultEnergyPerMile:1436/15000}},
  compactSuv:{gasDepreciation:3568,Electric:{annualDepreciation:5298,annualInsurance:2277,annualFees:931,annualFinance:1208,maintenancePerMile:1402/15000,defaultEnergyPerMile:771/15000},Hybrid:{annualDepreciation:3845,annualInsurance:2294,annualFees:739,annualFinance:1087,maintenancePerMile:1506/15000,defaultEnergyPerMile:1731/15000}},
  mediumSuv:{gasDepreciation:5052,Electric:{annualDepreciation:7077,annualInsurance:2070,annualFees:1052,annualFinance:1440,maintenancePerMile:1784/15000,defaultEnergyPerMile:909/15000},Hybrid:{annualDepreciation:4822,annualInsurance:2534,annualFees:940,annualFinance:1412,maintenancePerMile:1902/15000,defaultEnergyPerMile:2087/15000}},
  pickup:{gasDepreciation:6446,Electric:{annualDepreciation:8624,annualInsurance:2294,annualFees:1507,annualFinance:2149,maintenancePerMile:1618/15000,defaultEnergyPerMile:1222/15000},Hybrid:{annualDepreciation:6370,annualInsurance:2178,annualFees:1148,annualFinance:1730,maintenancePerMile:1539/15000,defaultEnergyPerMile:3153/15000}},
});

function costProfile(car,categoryKey){
  const category=categoryCosts[categoryKey];
  const kind=car.powertrain==='Electric'?'Electric':['Hybrid','Plug-in hybrid'].includes(car.powertrain)?'Hybrid':null;
  const lookupKey=categoryKey==='smallSedan'?'mediumSedan':categoryKey==='subcompactSuv'?'compactSuv':['midsizePickup','halfTonPickup'].includes(categoryKey)?'pickup':categoryKey;
  const comparison=powertrainCosts[lookupKey];
  if(!kind||!comparison)return {...category,depreciationMultiplier:1,powertrainProxy:false};
  return {...category,...comparison[kind],depreciationMultiplier:comparison[kind].annualDepreciation/comparison.gasDepreciation,powertrainProxy:true};
}

function categoryFor(car){
  const body=car.bodyStyle;
  if(body==='Pickup'||body==='Truck')return car.length!=null&&car.length<215?'midsizePickup':'halfTonPickup';
  if(['Sedan','Hatchback','Wagon','Coupe'].includes(body))return car.length!=null&&car.length<185?'smallSedan':'mediumSedan';
  if(body==='Minivan'||body==='Van')return 'mediumSuv';
  if(body==='SUV')return car.length!=null&&car.length<180?'subcompactSuv':car.length!=null&&car.length<195?'compactSuv':'mediumSuv';
  return 'mediumSuv';
}

function energyPerMile(car,category){
  const s=ownershipScenario;
  if(car.powertrain==='Electric'){
    if(car.mpgeCombined>0)return {rate:33.7/car.mpgeCombined*s.electricityPerKwh,basis:'EPA MPGe and national home electricity assumption'};
    return {rate:category.defaultEnergyPerMile,basis:'AAA EV class energy proxy; model MPGe unavailable'};
  }
  if(car.powertrain==='Plug-in hybrid')return {rate:category.defaultEnergyPerMile,basis:'AAA hybrid class energy proxy; charging share unknown'};
  if(car.powertrain==='Hydrogen fuel cell'||car.powertrain==='Plug-in fuel cell')return {rate:category.defaultEnergyPerMile,basis:'AAA class fuel proxy only; actual hydrogen price and fueling mix unavailable'};
  const fuelPrice=car.fuelType==='Diesel'?s.dieselPerGallon:car.fuelType==='Premium Gasoline'?s.premiumGasPerGallon:s.regularGasPerGallon;
  if(car.mpgCombined>0)return {rate:fuelPrice/car.mpgCombined,basis:'EPA combined MPG and national fuel-price assumption'};
  if(car.powertrain==='Hybrid')return {rate:category.defaultEnergyPerMile,basis:'AAA hybrid class energy proxy; model MPG unavailable'};
  return {rate:category.defaultEnergyPerMile*(fuelPrice/s.regularGasPerGallon),basis:'AAA vehicle-class fuel proxy; model MPG unavailable'};
}

const dollars=value=>Math.round(value/100)*100;

export function estimateFiveYearCost(car){
  const price=car.startingMSRP;
  const categoryKey=categoryFor(car);
  const category=costProfile(car,categoryKey);
  const energy=energyPerMile(car,category);
  const s=ownershipScenario;
  const miles=s.years*s.annualMiles;
  const hasPrice=Number.isFinite(price)&&price>0;
  const priceRatio=hasPrice?price/s.priceAnchor:1;
  const components={
    depreciation:dollars(hasPrice?price*Math.min(.85,s.depreciationShare*category.depreciationMultiplier):(category.annualDepreciation-category.depreciationReductionAt10k*.6)*s.years),
    insurance:dollars(category.annualInsurance*s.years*(hasPrice?Math.max(.7,Math.min(1.8,Math.sqrt(priceRatio))):1)),
    maintenance:dollars(category.maintenancePerMile*miles),
    energy:dollars(energy.rate*miles),
    fees:dollars(category.annualFees*s.years*(hasPrice?.5+.5*Math.max(.5,Math.min(2.5,priceRatio)):1)),
    financing:dollars((hasPrice?s.financeAnnualPerDollar*price:category.annualFinance)*s.years),
  };
  const total=Object.values(components).reduce((sum,value)=>sum+value,0);
  return {
    total,
    components,
    annualMiles:s.annualMiles,
    totalMiles:miles,
    costPerMile:Number((total/miles).toFixed(2)),
    operatingPerMile:Number(((components.maintenance+components.energy)/miles).toFixed(2)),
    category:(car.bodyStyle==='Minivan'||car.bodyStyle==='Van'?'Medium SUV proxy for minivan / van':category.label)+(category.powertrainProxy?' · '+(car.powertrain==='Electric'?'EV':'hybrid')+' benchmark':''),
    energyBasis:energy.basis,
    priceBasis:hasPrice?car.priceIsModelBase?'published model starting MSRP':'listed starting MSRP':'AAA class ownership averages; model MSRP unavailable',
    priceBasisType:hasPrice?'model':'class',
    estimated:true,
  };
}
