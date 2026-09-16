export interface PriceGapOffer {
 model: string; store: string; title: string; variant: string; price: number;
 currency: 'USD'; acceptsOrders: boolean; barcode: string; url: string;
 evidenceUrl: string; observedAt: string; condition: 'new'; deliveryNote: string;
}
export interface PriceGapEntry {
 id: string; model: string; name: string; brand: string; variant: string;
 quantity: number; barcode: string; reviewedAt: string; note: string;
 offers: PriceGapOffer[];
}
