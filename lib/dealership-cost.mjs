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
  smallSedan:{label:'Small sedan',maintenancePerMile:.111,annualInsurance:1623,annualFees:512,defaultEnergyPerMile:.1319},
  mediumSedan:{label:'Medium sedan',maintenancePerMile:.1142,annualInsurance:1788,annualFees:675,defaultEnergyPerMile:.117},
  subcompactSuv:{label:'Subcompact SUV',maintenancePerMile:.1162,annualInsurance:2169,annualFees:587,defaultEnergyPerMile:.1545},
  compactSuv:{label:'Compact SUV',maintenancePerMile:.1206,annualInsurance:2294,annualFees:741,defaultEnergyPerMile:.1176},
  mediumSuv:{label:'Medium SUV',maintenancePerMile:.1216,annualInsurance:2469,annualFees:867,defaultEnergyPerMile:.2046},
  midsizePickup:{label:'Midsize pickup',maintenancePerMile:.1126,annualInsurance:1867,annualFees:830,defaultEnergyPerMile:.2296},
  halfTonPickup:{label:'Half-ton pickup',maintenancePerMile:.1182,annualInsurance:2134,annualFees:1078,defaultEnergyPerMile:.2387},
});

function categoryFor(car){
  const body=car.bodyStyle;
  if(body==='Pickup'||body==='Truck')return car.length!=null&&car.length<215?'midsizePickup':'halfTonPickup';
  if(['Sedan','Hatchback','Wagon','Coupe'].includes(body))return car.length!=null&&car.length<185?'smallSedan':'mediumSedan';
  if(body==='Minivan'||body==='Van')return 'mediumSuv';
  if(body==='SUV')return car.length!=null&&car.length<180?'subcompactSuv':car.length!=null&&car.length<195?'compactSuv':'mediumSuv';
  return null;
}

function energyPerMile(car,category){
  const s=ownershipScenario;
  if(car.powertrain==='Electric'){
    if(car.mpgeCombined>0)return {rate:33.7/car.mpgeCombined*s.electricityPerKwh,basis:'EPA MPGe and national home electricity assumption'};
    return {rate:909/15000,basis:'AAA medium-SUV EV class proxy; model MPGe unavailable'};
  }
  if(car.powertrain==='Plug-in hybrid')return {rate:2087/15000,basis:'AAA medium-SUV hybrid proxy; charging share unknown'};
  if(car.powertrain==='Hydrogen fuel cell'||car.powertrain==='Plug-in fuel cell')return null;
  const fuelPrice=car.fuelType==='Diesel'?s.dieselPerGallon:car.fuelType==='Premium Gasoline'?s.premiumGasPerGallon:s.regularGasPerGallon;
  if(car.mpgCombined>0)return {rate:fuelPrice/car.mpgCombined,basis:'EPA combined MPG and national fuel-price assumption'};
  if(car.powertrain==='Hybrid')return {rate:2087/15000,basis:'AAA medium-SUV hybrid class proxy; model MPG unavailable'};
  return {rate:category.defaultEnergyPerMile*(fuelPrice/s.regularGasPerGallon),basis:'AAA vehicle-class fuel proxy; model MPG unavailable'};
}

const dollars=value=>Math.round(value/100)*100;

export function estimateFiveYearCost(car){
  const price=car.startingMSRP;
  const categoryKey=categoryFor(car);
  if(!Number.isFinite(price)||price<=0||!categoryKey)return null;
  const category=categoryCosts[categoryKey];
  const energy=energyPerMile(car,category);
  if(!energy)return null;
  const s=ownershipScenario;
  const miles=s.years*s.annualMiles;
  const priceRatio=price/s.priceAnchor;
  const components={
    depreciation:dollars(price*s.depreciationShare),
    insurance:dollars(category.annualInsurance*s.years*Math.max(.7,Math.min(1.8,Math.sqrt(priceRatio)))),
    maintenance:dollars(category.maintenancePerMile*miles),
    energy:dollars(energy.rate*miles),
    fees:dollars(category.annualFees*s.years*(.5+.5*Math.max(.5,Math.min(2.5,priceRatio)))),
    financing:dollars(s.financeAnnualPerDollar*price*s.years),
  };
  return {
    total:Object.values(components).reduce((sum,value)=>sum+value,0),
    components,
    annualMiles:s.annualMiles,
    category:car.bodyStyle==='Minivan'||car.bodyStyle==='Van'?'Medium SUV proxy for minivan / van':category.label,
    energyBasis:energy.basis,
    priceBasis:car.priceIsModelBase?'published model starting MSRP':'listed starting MSRP',
    estimated:true,
  };
}
