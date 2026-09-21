import { amazonSearch, amazonOfferListings } from './amazon-data.mjs';
import { identityId, infer } from '../.generated/circular/identity.mjs';

export class AmazonCatalogProvider {
  id='amazon-data';
  sandbox=false;
  constructor(key=process.env.RAINFOREST_API_KEY){this.key=key;this.configured=Boolean(key);}
  async identify(product){
    const matches=await amazonSearch(product.productName,{key:this.key});
    const match=matches[0];if(!match)return null;
    const guessed=infer(match.title);
    const resolved={...product,productName:match.title,brand:guessed.brand||product.brand,model:guessed.model||product.model,category:guessed.category==='other'?product.category:guessed.category,imageUrl:match.image,sourceUrl:match.url,retailerSku:match.asin,identityBasis:'metadata',identificationNote:'Matched to the strongest Amazon catalog result for your search. Confirm the model before relying on the comparison.',updatedAt:new Date().toISOString()};
    resolved.id=identityId(resolved);return resolved;
  }
  async search({product}){
    if(!product.sourceUrl)return [];
    return amazonOfferListings(product.sourceUrl,{key:this.key});
  }
}
