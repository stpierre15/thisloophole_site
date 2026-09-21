export type Condition = 'new' | 'used' | 'refurbished' | 'open_box';
export type MatchLevel = 'EXACT PRODUCT' | 'STRONG MATCH' | 'SIMILAR ALTERNATIVE';
export interface ProductIdentity {
 id: string; productName: string; brand: string | null; model: string | null;
 mpn: string | null; gtin: string | null; category: string; newPrice: number | null;
 currency: 'USD'; imageUrl: string | null; sourceUrl: string | null;
 attributes: Record<string,string>; priceBasis: 'user' | 'retailer' | 'demo' | 'unknown';
 createdAt: string; updatedAt: string;
 identityBasis?: 'user' | 'metadata' | 'url'; identificationNote?: string;
 retailerSku?: string | null;
}
export interface CandidateListing {
 id: string; provider: string; providerListingId: string; title: string;
 price: number; shippingPrice: number | null; totalPrice: number | null; currency: 'USD';
 condition: Condition; conditionText: string; sellerName: string | null;
 imageUrl: string | null; destinationUrl: string | null; brand: string | null;
 model: string | null; mpn: string | null; gtin: string | null; attributes: Record<string,string>;
 category: string; fetchedAt: string; available: boolean; demo: boolean;
 conditionDescription: string | null; returns: string | null; warranty: string | null;
 previousModel: boolean;
}
export interface RankedListing extends CandidateListing {
 matchLevel: MatchLevel; confidence: 'HIGH' | 'MEDIUM'; matchReasons: string[];
 savings: number | null; percentSavings: number | null; tradeoffs: string[];
}
export interface ModelRelationship {
 currentModel: string; previousModel: string; brand: string; category: string;
 notes: string; sourceUrl: string;
}
export interface ProductSearchInput { product: ProductIdentity; previous?: ModelRelationship; postalCode?: string; }
export interface CircularProductProvider {
 id: string; configured: boolean; sandbox: boolean;
 identify?(product: ProductIdentity): Promise<ProductIdentity | null>;
 search(input: ProductSearchInput): Promise<CandidateListing[]>;
 getListing?(id: string, postalCode?: string): Promise<CandidateListing | null>;
}
export interface SearchRequest {
 query?: string; url?: string; productName?: string; brand?: string; model?: string;
 newPrice?: number | null; attributes?: Record<string,string>; postalCode?: string;
 includePrevious?: boolean; demoId?: string;
}
export interface ComparisonResult {
 id: string; sourceProduct: ProductIdentity; candidates: RankedListing[];
 bestUsedOption: RankedListing | null; bestRefurbishedOption: RankedListing | null;
 bestValueOption: RankedListing | null; estimatedSavings: number | null;
 percentSavings: number | null; verdict: 'LOOPHOLE FOUND' | 'NEW ACTUALLY WINS THIS ONE' | 'COMPARE THE TERMS' | 'NO PRICE BASELINE' | 'NOTHING GOOD RIGHT NOW' | 'PROVIDER UNAVAILABLE' | 'LIVE SEARCH NOT CONNECTED';
 take: string; mode: 'live' | 'demo' | 'unconfigured' | 'sandbox'; providerStatus: string;
 previousModel: ModelRelationship | null; fetchedAt: string; expiresAt: number;
 cacheHit: boolean; request: SearchRequest; warnings: string[];
}
export interface Store { get(key:string): Promise<any>; set(key:string,value:unknown): Promise<void>; }
export interface ProviderConfig { clientId?: string; clientSecret?: string; environment?: string; }
