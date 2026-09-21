import type { Dealer,Vehicle,VehicleListingInput,VehicleSearchInput } from './schema.mjs';
const iso=(now:number,days:number)=>new Date(now-days*86400000).toISOString();
const dealer=(id:string,name:string,city:string,state:string,zip:string):Dealer=>({id,name,address:null,city,state,zip,lat:null,lng:null,source:'DEMO'});
const vehicle=(id:string,year:number,make:string,model:string,trim:string,vin:string):Vehicle=>({id,vin,year,make,model,trim,drivetrain:'4WD',bodyClass:'Sport Utility Vehicle',engine:null,fuelType:'Gasoline',manufacturer:make});
export function demoInventory(now=Date.now()):VehicleListingInput[]{
 const rows:Array<[string,number,string,string,string,string,number,number,string,Dealer,number[],number[]]>= [
  ['land-cruiser-1',2025,'Toyota','Land Cruiser','Land Cruiser Premium','DEMO0000000000001',7840,64850,'demo://land-cruiser-1',dealer('demo-austin-motor','Capitol Motor Co.','Austin','TX','78701'),[83,55,33,0],[68000,68000,66900,64850]],
  ['land-cruiser-2',2025,'Toyota','Land Cruiser','Land Cruiser','DEMO0000000000002',6210,68300,'demo://land-cruiser-2',dealer('demo-hill-country','Hill Country Auto','Round Rock','TX','78664'),[42,0],[68900,68300]],
  ['land-cruiser-3',2024,'Toyota','Land Cruiser','1958','DEMO0000000000003',12120,65990,'demo://land-cruiser-3',dealer('demo-lone-star','Lone Star Imports','San Marcos','TX','78666'),[31,0],[65990,65990]],
  ['land-cruiser-4',2025,'Toyota','Land Cruiser','Land Cruiser','DEMO0000000000004',4100,70150,'demo://land-cruiser-4',dealer('demo-lakeway','Lakeway Motors','Lakeway','TX','78734'),[18,0],[70150,70150]],
  ['rav4-1',2024,'Toyota','RAV4','XLE','DEMO0000000000005',18650,29250,'demo://rav4-1',dealer('demo-austin-motor','Capitol Motor Co.','Austin','TX','78701'),[67,20,0],[31900,30400,29250]],
  ['crv-1',2024,'Honda','CR-V','EX-L','DEMO0000000000006',14200,31750,'demo://crv-1',dealer('demo-hill-country','Hill Country Auto','Round Rock','TX','78664'),[24,0],[32490,31750]]
 ];
 return rows.map(([id,year,make,model,trim,vin,mileage,price,url,d,days,prices])=>{const observed=days.map((n,i)=>({observedAt:iso(now,n),price:prices[i],mileage}));return {provider:'demo',providerListingId:id,vehicle:vehicle('vehicle-'+id,year,make,model,trim,vin),dealer:d,url,imageUrl:null,mileage,currentPrice:price,firstObservedAt:observed[0].observedAt,observedAt:iso(now,0),active:true,demo:true,seededObservations:observed};});
}
export class DemoInventoryProvider {
 id='demo';configured=true;demo=true;
 constructor(private now=()=>Date.now()){}
 async searchVehicles(input:VehicleSearchInput){const q=(v:string)=>v.trim().toLowerCase();return demoInventory(this.now()).filter(x=>q(x.vehicle.make)===q(input.make)&&q(x.vehicle.model).includes(q(input.model))&&(!input.yearMin||x.vehicle.year>=input.yearMin)&&(!input.yearMax||x.vehicle.year<=input.yearMax)&&(!input.maxPrice||x.currentPrice<=input.maxPrice));}
 async getVehicle(id:string){return demoInventory(this.now()).find(x=>x.providerListingId===id)||null;}
}
