# Five-year ownership comparison

This is a **Loophole scenario estimate**, not AAA's result for a particular
model, an insurance quote, or a prediction of resale value. It compares new
vehicles over five years at 12,000 miles per year using national assumptions.
It includes depreciation, full-coverage insurance, maintenance/repairs/tires,
fuel or home electricity, government fees/taxes, and financing. It does not
add the purchase price again: depreciation is the loss of purchase value.
The displayed total cost per mile is the five-year total divided by 60,000
miles. The optional running cost per mile includes only energy and
maintenance/repairs/tires, and excludes ownership costs such as depreciation.

The primary benchmark is [AAA's 2026 Your Driving Costs brochure](https://newsroom.aaa.com/wp-content/uploads/2026/09/8-YDC-Brochure_2026-1.pdf), with its [methodology and national assumptions](https://newsroom.aaa.com/wp-content/uploads/2026/09/AAA_YDC-Fact-Sheet_2026.pdf). AAA's class figures average five popular vehicles, not every model in this catalog. We use the nearest available class; minivans and vans use its medium-SUV class as a proxy.

AAA reports $4,422 of annual depreciation against a $39,376 weighted MSRP in
its 15,000-mile scenario. That is about 56% over five years. Its 10,000-mile
scenario lowers annual depreciation by $419 on average. Interpolating to
12,000 miles gives roughly 53% of starting MSRP over five years. For electric
and hybrid vehicles, we adjust that share using the ratio of depreciation for
the matching powertrain and gas class in AAA's separate comparison, capped at
85% of MSRP. This remains a broad assumption, not model-specific resale data.

For a vehicle without a listed starting MSRP, the app still gives a clearly
labeled **AAA class estimate**. It uses AAA's 2026 annual class averages for
depreciation, insurance, registration/taxes and finance, plus class maintenance
per mile and model EPA energy efficiency when available. We interpolate AAA's
10,000-mile reduction in depreciation to 12,000 miles. Where AAA's separate
EV/hybrid table has a matching category, we use its powertrain-specific
ownership and maintenance figures. Small sedans, subcompact SUVs, and pickups
use the nearest class in that table. This is the cost of a
representative vehicle in that class, **not the unknown model's own five-year
cost**. Luxury and performance vehicles may differ substantially. The vehicle's
price cell remains “Not published”; we do not invent an MSRP.

Insurance starts with AAA's 2026 annual class average and scales by the square
root of starting MSRP relative to the $39,376 national study MSRP, capped at
0.7–1.8 times the class average. Government fees likewise use the class
average with half fixed and half price-adjusted, capped at 0.5–2.5 times the
national MSRP ratio. These adjustments are **our heuristics** for comparison,
not AAA or insurer quotes. Finance scales AAA's $1,184 annual national average
to starting MSRP; AAA assumes a five-year loan with 15% down. A cash buyer can
subtract the displayed financing component.

Maintenance/repair/tire cost uses AAA's category cents per mile at 60,000
miles. Energy uses EPA combined MPG or MPGe where present and AAA's $4.152
regular gasoline and $0.18/kWh home electricity assumptions. For premium
gasoline, we apply the ratio between the [EIA September 21, 2026 premium price](https://www.eia.gov/dnav/pet/PET_PRI_GND_A_EPMP_PTE_DPGAL_W.htm)
and [regular price](https://www.eia.gov/dnav/pet/PET_PRI_GND_A_EPMR_PTE_DPGAL_W.htm)
to AAA's gasoline benchmark, approximately $5.06/gallon. Diesel uses the
[EIA September 2026 annual forecast](https://www.eia.gov/outlooks/steo/pdf/steo_full.pdf)
of $5.07/gallon. If EPA efficiency is missing, the estimate uses AAA's class
fuel cost and labels it as a proxy. Plug-in hybrids use AAA's hybrid fuel proxy
because charging share is unknown. Hydrogen fuel-cell vehicles use an AAA
gasoline-class energy placeholder so every catalog row has a total. That is
explicitly labeled in the breakdown: actual hydrogen retail fuel cost is not
modeled because a reliable national retail average is unavailable. The
[U.S. Department of Energy's April 2026 alternative-fuel price report](https://afdc.energy.gov/files/u/publication/alternative-fuel-price-report-april-2026)
does not report a separate hydrogen price due to insufficient data.

Starting MSRP can be lower than the seven-seat or other selected configuration.
Taxes, insurance, actual transaction price, fuel prices, financing terms,
maintenance and resale value vary widely. Each component is rounded to $100;
per-mile figures are rounded to cents. The totals are directional comparisons,
not quotes or five-year forecasts.
