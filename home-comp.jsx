import { useEffect, useMemo, useRef, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend, Cell } from "recharts";

const DP = 80000;
const MORTGAGE_RATE_ANNUAL = 0.065;
const MORTGAGE_TERM_MONTHS = 360;
const PI_FACTOR = (() => {
  const monthlyRate = MORTGAGE_RATE_ANNUAL / 12;
  const growth = Math.pow(1 + monthlyRate, MORTGAGE_TERM_MONTHS);
  return (monthlyRate * growth) / (growth - 1);
})();
const MERIDIAN_RANCH_HOA_ANNUAL = 230 * 12;
const CURRENT_YEAR = new Date().getFullYear();
const ADDRESS_BLOCK_REGEX = /(?:^|\n)\s*(\d{3,6}\s+[^\n]+?(?:CO|Colorado)\s+\d{5}(?:-\d{4})?)/g;
const TAX_RATE_BY_ZIP = {
  "80831": 0.0047,
  "80908": 0.0047,
  "80915": 0.0039,
  "80918": 0.0033,
  "80920": 0.0041,
  "80922": 0.0038,
  "80923": 0.0037,
  "80924": 0.0059,
  "80927": 0.0076,
};
const DEFAULT_TAX_RATE = 0.0047;
const SAFETY_SCORING_ENABLED = false;
const SAFETY_INDEX_MAX = 200;
const PLACEHOLDER_TAGS_ENABLED = false;
const EMPTY = "__none__";
const SHOWHORSE_PHOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAJYAlgDASIAAhEBAxEB/8QAGwAAAQUBAQAAAAAAAAAAAAAAAAECAwQFBgf/xAA8EAACAQMBBQgDBwQDAAAAAAAAAQIDEQQSITEFQVEGEyJhcYGRMqGxI0JSYrHB0fAUI+HxM1OS/8QAGAEBAQEBAQAAAAAAAAAAAAAAAAECAwT/xAAhEQEBAAICAgIDAQAAAAAAAAAAAQIRAyESMQQTQVFhIv/aAAwDAQACEQMRAD8A9vREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAERED5zb7V4j0+I/8Aj2+uU1l6Wl9W9Y+r2g9s3F7us6Qe6r0PtL8n0+8vL5q3r7f9v6W1pxp0m2v3F7gL8vwv3v28j+z7r9j9pqj9lV7q7n8M5g3lbH2H6V7fWf6uYv2fW3i8+71MZ6Yw6p3i3n4ebVtZxcm9m2n4Jq9X3o/ZoX6a9v2L5b0Vv7n6e9r8g4tSx6H6t3Lr7e2g7n2l1nCwz3Sx3+9Z9Tz6dTg+2J+R6f1X4O4sYt8mQH4i3m4h8U1dVdV3+R9n2b1V9Vx3Y2m7eV3Q1uV7t2n3nqR3K8a+1b4u1u3V6v1b2r4V3d7M2m3F8R4r9j3Y+K1uJ7cQ2X3t7P6rj9Xf3ZVw2m+R3g0QERAREQERAREQERAREQERAREQERAREQERAREQERAREQERAREQHk9vtXiPT4j/AONb65TWXpaX1b1j6vaD2zcXu6zpB7qvQ+0vyfT7y8vmrevt/2/pbWnGnSba/cXuAvy/C/e/byP7Puv2P2mqP2VXuru fwzmDeVsfYfpXt9Z/q5i/Z9beLz7vUxn pjDqneLefh5tW1nFyb2bafgmr1fej9mhfpr2/YvlvRW/ufp72vyDi1LHo fq3cuvt7aDufaXWcLDPdLHf71n1PPp1OD7Yn5Hp/Vfg7ixi3yZAfiLebiHxTV1V1Xf5H2fZvVX1XHdjabt5XdDW5Xu3afeepHcrxr7Vvi7W7dXq/VvavhXd3szabcXxHiv2Pdj4rW4ntxDZfe3s/quP1d/dlX Dab5HeDRAREQERAREQERAREQERAREQERAREQERAREQERAREQERAREQERH//Z";
const CANDELABRA_PHOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAJiA4ADASIAAhEBAxEB/8QAGwAAAQUBAQAAAAAAAAAAAAAAAAECAwQFBgf/xAA8EAACAQMBBQgDBwQDAAAAAAAAAQIDEQQSITEFQVEGEyJhcYGRMqGxI0JSYrHB0fAUI+HxM1OS/8QAGAEBAQEBAQAAAAAAAAAAAAAAAAECAwT/xAAhEQEBAAICAgIDAQAAAAAAAAAAAQIRAyESMQQTQVFhIv/aAAwDAQACEQMRAD8A9vREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAERED5zb7V4j0+I/8Aj2+uU1l6Wl9W9Y+r2g9s3F7us6Qe6r0PtL8n0+8vL5q3r7f9v6W1pxp0m2v3F7gL8vwv3v28j+z7r9j9pqj9lV7q7n8M5g3lbH2H6V7fWf6uYv2fW3i8+71MZ6Yw6p3i3n4ebVtZxcm9m2n4Jq9X3o/ZoX6a9v2L5b0Vv7n6e9r8g4tSx6H6t3Lr7e2g7n2l1nCwz3Sx3+9Z9Tz6dTg+2J+R6f1X4O4sYt8mQH4i3m4h8U1dVdV3+R9n2b1V9Vx3Y2m7eV3Q1uV7t2n3nqR3K8a+1b4u1u3V6v1b2r4V3d7M2m3F8R4r9j3Y+K1uJ7cQ2X3t7P6rj9Xf3ZVw2m+R3g0QERAREQERAREQERAREQERAREQERAREQERAREQERAREQERAREQHk9vtXiPT4j/AONb65TWXpaX1b1j6vaD2zcXu6zpB7qvQ+0vyfT7y8vmrevt/2/pbWnGnSba/cXuAvy/C/e/byP7Puv2P2mqP2VXuru fwzmDeVsfYfpXt9Z/q5i/Z9beLz7vUxn pjDqneLefh5tW1nFyb2bafgmr1fej9mhfpr2/YvlvRW/ufp72vyDi1LHo fq3cuvt7aDufaXWcLDPdLHf71n1PPp1OD7Yn5Hp/Vfg7ixi3yZAfiLebiHxTV1V1Xf5H2fZvVX1XHdjabt5XdDW5Xu3afeepHcrxr7Vvi7W7dXq/VvavhXd3szabcXxHiv2Pdj4rW4ntxDZfe3s/quP1d/dlX Dab5HeDRAREQERAREQERAREQERAREQERAREQERAREQERAREQERAREQERH//Z";
const DOM_ROLL_DATE_KEY = "homeComp.domRollDate.v1";

// Raw weighting points (normalized into EFFECTIVE_W below).
const RAW_WEIGHT_POINTS = { rating: 0.28, monthlyPayment: 0.18, safety: 0.14, sizeValue: 0.20, lot: 0.05, kitchen: 0.05, yard: 0.10, ageScore: 0.05 };
const EFFECTIVE_W = (() => {
  const entries = Object.entries(RAW_WEIGHT_POINTS).map(([key, weight]) => [key, (!SAFETY_SCORING_ENABLED && key === "safety") ? 0 : weight]);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= 0) return Object.fromEntries(entries.map(([key]) => [key, 0]));
  return Object.fromEntries(entries.map(([key, weight]) => [key, weight / total]));
})();
const WEIGHTS = [
  ["rating","Combined Rating",EFFECTIVE_W.rating],["monthlyPayment","Monthly Payment",EFFECTIVE_W.monthlyPayment],["safety",SAFETY_SCORING_ENABLED ? "Safety" : "Safety (Disabled)",EFFECTIVE_W.safety],["sizeValue","Size",EFFECTIVE_W.sizeValue],
  ["lot","Lot",EFFECTIVE_W.lot],["kitchen","Kitchen",EFFECTIVE_W.kitchen],["yard","Yard",EFFECTIVE_W.yard],
  ["ageScore","Age",EFFECTIVE_W.ageScore],
];
const RADAR = [["rating","Rating"],["monthlyPayment","Mo Pmt"],["sizeValue","Sqft"],["lot","Lot"],["kitchen","Kitchen"],["yard","Yard"],["ageScore","Age"], ...(!SAFETY_SCORING_ENABLED ? [] : [["safety","Safety"]])];
const fmtUsd = (n, digits = 0) => Number.isFinite(n)
  ? `$${n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
  : null;
const CARD_FIELDS = (h) => {
  const ageYears = Number.isFinite(h?.built) ? Math.max(0, CURRENT_YEAR - h.built) : null;
  const rows = [
    // Raw values used by weighted scoring factors.
    ["Price", fmtUsd(h?.price, 0)],
    ["Sqft", Number.isFinite(h?.sqft) ? h.sqft.toLocaleString() : null],
    ["Lot Sqft", Number.isFinite(h?.lotSqft) ? h.lotSqft.toLocaleString() : null],
    ["Kitchen", h?.kitchenSize ?? null],
    ["Yard", h?.yardCondition ?? null],
    ["Greg", Number.isFinite(h?.greg) ? `${h.greg}/10` : null],
    ["Bre", Number.isFinite(h?.bre) ? `${h.bre}/10` : null],
    ["Year Built", Number.isFinite(h?.built) ? String(h.built) : null],
    ["Home Age", Number.isFinite(ageYears) ? `${ageYears} yrs` : null],
    ["HOA (Annual)", fmtUsd(h?.hoa, 0)],
    ["Tax (Annual)", fmtUsd(h?.tax, 2)],
    // Monthly payment calculation components.
    ["P&I", fmtUsd(h?.piMo, 0)],
    ["Tax/Mo", fmtUsd(h?.taxMo, 0)],
    ["HOA/Mo", fmtUsd(h?.hoaMo, 0)],
    ["Monthly Total", fmtUsd(h?.totalMo, 0)],
  ];
  if (SAFETY_SCORING_ENABLED) {
    rows.push(
      ["Assault Index", Number.isFinite(h?.safetyAssaultIndex) ? String(h.safetyAssaultIndex) : null],
      ["Burglary Index", Number.isFinite(h?.safetyBurglaryIndex) ? String(h.safetyBurglaryIndex) : null],
      ["Larceny/Theft Index", Number.isFinite(h?.safetyLarcenyTheftIndex) ? String(h.safetyLarcenyTheftIndex) : null],
      ["Vehicle Theft Index", Number.isFinite(h?.safetyVehicleTheftIndex) ? String(h.safetyVehicleTheftIndex) : null]
    );
  }
  return rows.filter(([, value]) => value != null && value !== "" && value !== "N/A" && value !== "—");
};
const COMPARE_ROWS = [
  ["Weighted Score","weightedTotal"],
  ["Combined Rating Score","rating"],
  ["Monthly Payment Score","monthlyPayment"],
  ...(!SAFETY_SCORING_ENABLED ? [] : [["Safety Score","safety"]]),
  ["Size Score","sizeValue"],
  ["Lot Score","lot"],
  ["Kitchen Score","kitchen"],
  ["Yard Score","yard"],
  ["Age Score","ageScore"],
  ["Monthly $","totalMo"],
  ["Greg","greg"],
  ["Bre","bre"],
];
const BAR_ROWS = [["Rating","rating"],["Monthly","monthlyPayment"],["Size","sizeValue"],["Lot","lot"],["Kitchen","kitchen"],["Yard","yard"],["Age","ageScore"], ...(!SAFETY_SCORING_ENABLED ? [] : [["Safety","safety"]])];
const COLORS = ["#22c55e","#22c55e","#3b82f6","#3b82f6","#3b82f6","#f59e0b","#f59e0b","#f59e0b","#f97316","#ef4444","#8b5cf6","#14b8a6"];
const NO_PHOTO_STYLE = { margin: "-16px -16px 12px -16px", borderTopLeftRadius: 16, borderTopRightRadius: 16, background: "linear-gradient(135deg,#1e293b,#0f172a)", height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontWeight: 700, letterSpacing: 1 };
const IMG_WRAP_STYLE = { margin: "-16px -16px 12px -16px", borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: "hidden", background: "#0f172a" };

const homesRaw = [
  { name:"8091 Parsonage Lane", short:"8091 Parsonage", status:"Considering", photo:"https://www.compass.com/m/9ada19d681290ef7e9420f4760e9e2f463348c3c_img_0_a01d9/origin.webp", price:479000, sqft:2204, lotSqft:7153, built:2006, hoa:0, tax:2400, dom:44, greg:6, bre:6, kitchenSize:"Medium", yardCondition:"Good", aestheticsRating:0, neighborhood:72, safetyNeighborhood:"Claremont Ranch", safetyGrade:"A+", safetyAssaultIndex:9, safetyBurglaryIndex:53, safetyLarcenyTheftIndex:18, safetyVehicleTheftIndex:39, tags:["Kitchen medium","Yard good","Neighborhood 72","Safety: Claremont Ranch"] },
  { name:"6229 Dancing Water Drive", short:"6229 Dancing", status:"Ruled Out", photo:"https://property-images.realgeeks.com/coppa/6648478bdd4fa582896eb38b1306e4ec.jpg", price:485000, sqft:2792, lotSqft:7300, built:2014, hoa:0, tax:3582, dom:34, greg:6.5, bre:5, kitchenSize:"Large", yardCondition:"Good", aestheticsRating:0, neighborhood:60, safetyNeighborhood:"Fountain Valley Ranch (Fountain proxy)", safetyGrade:"A", safetyAssaultIndex:35, safetyBurglaryIndex:68, safetyLarcenyTheftIndex:55, safetyVehicleTheftIndex:94, tags:["DQ: Fountain safety concern","Kitchen large","Yard good","Neighborhood 60","Safety proxy: Fountain"] },
  { name:"10012 Emerald Vista Drive", short:"10012 Emerald", status:"Ruled Out", photo:"https://images-listings.century21.com/CO_PPAR/42/28/13/7/_P/4228137_P00.jpg?format=webp&quality=70&width=1200", price:507000, sqft:3004, lotSqft:8070, built:2018, hoa:2772, tax:3369, dom:86, greg:8.5, bre:8, kitchenSize:"Large", yardCondition:"Excellent", aestheticsRating:0, neighborhood:95, tags:["Kitchen large","Yard excellent","Neighborhood 95","Hot tub","Solar","Community pool"] },
  { name:"12726 Morning Breeze Way", short:"12726 Morning", status:"Considering", photo:"https://photos.zillowstatic.com/fp/6fc114e66c86ddf60ff5c1e544130e60-cc_ft_960.jpg", price:484900, sqft:2416, lotSqft:6799, built:2018, hoa:91, tax:3503, dom:12, greg:5, bre:4, kitchenSize:"Large", yardCondition:"Poor", aestheticsRating:0, neighborhood:85, safetyNeighborhood:"Falcon / Woodmen Hills area (proxy)", safetyGrade:"A", safetyAssaultIndex:41, safetyBurglaryIndex:103, safetyLarcenyTheftIndex:41, safetyVehicleTheftIndex:53, tags:["Kitchen large","Yard poor","Artificial turf","Neighborhood 85","Safety proxy: Falcon / Woodmen Hills"] },
  { name:"10135 Kings Canyon Drive", short:"10135 Kings", status:"Considering", photo:"https://ppar-photos.s3.amazonaws.com/photos/4081318-1.jpg", price:510000, sqft:3109, lotSqft:6454, built:2003, hoa:2820, tax:3254, dom:99, greg:9, bre:8.5, kitchenSize:"Large", yardCondition:"Excellent", aestheticsRating:0, neighborhood:90, safetyNeighborhood:"Meridian Ranch", safetyGrade:"A+", safetyAssaultIndex:11, safetyBurglaryIndex:16, safetyLarcenyTheftIndex:9, safetyVehicleTheftIndex:18, tags:["Kitchen large","Yard excellent","Neighborhood 90","Safety: Meridian Ranch"] },
  { name:"9403 St George Road", short:"9403 St George", status:"Sold", photo:"https://photos.zillowstatic.com/fp/100c606b4a052f5b818d59fdea87d793-cc_ft_960.jpg", price:515000, sqft:3552, lotSqft:7444, built:2006, hoa:2340, tax:2361, dom:36, greg:7, bre:6, kitchenSize:"Large", yardCondition:"Excellent", aestheticsRating:0, neighborhood:80, safetyNeighborhood:"Woodmen Hills (proxy stats)", safetyGrade:"A", safetyAssaultIndex:41, safetyBurglaryIndex:103, safetyLarcenyTheftIndex:41, safetyVehicleTheftIndex:53, tags:["Pending","Kitchen large","Yard excellent","Neighborhood 80","Firepit","Washer/dryer","Safety proxy: Woodmen Hills"] },
  { name:"4195 Greens Drive", short:"4195 Greens", status:"Considering", photo:"https://cdn02.deltamediagroup.com/listing_photos/active/18463/184628534/1.jpg?hash=68d62892a6d9468f2baf3bc5adbf52a4", price:520000, sqft:2842, lotSqft:6971, built:2001, hoa:3600, tax:1433, dom:19, greg:6.5, bre:5.5, kitchenSize:"Gourmet", yardCondition:"Fair", aestheticsRating:0, neighborhood:65, safetyNeighborhood:"Springs Ranch", safetyGrade:"A+", safetyAssaultIndex:14, safetyBurglaryIndex:46, safetyLarcenyTheftIndex:67, safetyVehicleTheftIndex:53, tags:["Kitchen gourmet","Yard fair","Neighborhood 65","Golf access","Community pool","Safety: Springs Ranch"] },
  { name:"9534 Feathergrass Drive", short:"9534 Feather", status:"Considering", photo:"https://cdn02.deltamediagroup.com/listing_photos/active/18406/184055125/1.jpg?hash=35304503ab84dabc4b869e41dc6a5d6b", price:515000, sqft:2647, lotSqft:4956, built:2023, hoa:400, tax:4554, dom:46, greg:4, bre:4, kitchenSize:"Large", yardCondition:"Good", aestheticsRating:0, neighborhood:75, safetyNeighborhood:"Banning Lewis Ranch", safetyGrade:"A", safetyAssaultIndex:120, safetyBurglaryIndex:58, safetyLarcenyTheftIndex:31, safetyVehicleTheftIndex:144, tags:["Kitchen large","Yard good","Neighborhood 75","Solar","HOA unconfirmed","Safety: Banning Lewis Ranch"] },
  { name:"765 Piros Drive", short:"765 Piros", status:"Considering", photo:"https://www.compass.com/m/666cae37c59317f19fdfc172c7b3d09c2c6823a6_img_0_31458/origin.webp", price:525000, sqft:2960, lotSqft:7000, built:1995, hoa:304, tax:1812.3, dom:9, greg:6.5, bre:8, kitchenSize:"Large", yardCondition:"Good", aestheticsRating:0, neighborhood:80, safetyNeighborhood:"Springs Ranch proxy", safetyGrade:"A+", safetyAssaultIndex:14, safetyBurglaryIndex:46, safetyLarcenyTheftIndex:67, safetyVehicleTheftIndex:53, tags:["Greenhouse","Shed","Gas fireplace","Mountain views","Office with French doors","Composite deck","Safety proxy: Springs Ranch"] },
  { name:"6709 Showhorse Court", short:"6709 Showhorse", status:"Considering", photo:"https://photos.zillowstatic.com/fp/fdd3f94aaed7d7d174e54fb6c1fc0d87-cc_ft_768.webp", price:499900, sqft:3440, lotSqft:7635, built:2000, hoa:3600, tax:2003.52, dom:47, greg:6.5, bre:7.5, kitchenSize:"Large", yardCondition:"Good", aestheticsRating:0, neighborhood:70, safetyNeighborhood:"Springs Ranch / Island at Springs Ranch", safetyGrade:"A+", safetyAssaultIndex:14, safetyBurglaryIndex:46, safetyLarcenyTheftIndex:67, safetyVehicleTheftIndex:53, tags:["Pikes Peak views","Finished basement","Wet bar","HOA includes lawn care","Exterior paint every 7–8 years","Snow removal","Trash","Safety: Springs Ranch"] },
  { name:"7352 Candelabra Drive", short:"7352 Candelabra", status:"Ruled Out", photo:CANDELABRA_PHOTO, price:519500, sqft:3093, lotSqft:8726, built:2005, hoa:0, tax:4450.34, dom:5, greg:8, bre:7.5, kitchenSize:"Large", yardCondition:"Good", aestheticsRating:0, neighborhood:70, safetyNeighborhood:"Widefield", safetyGrade:"A+", safetyAssaultIndex:21, safetyBurglaryIndex:72, safetyLarcenyTheftIndex:31, safetyVehicleTheftIndex:56, tags:["Safety: Widefield"] },
];

const IMPORT_UNFORMATTED_DATA = String.raw`
6380 Tenderfoot Drive Colorado Springs, CO 80923-7436
MLS #3917272
For Sale
$550,000
Price per Sq Ft.: $213
Size: 2,584 sqft
Lot Size Area: 6,541.00 sqft
Year Built: 2010
Days on OneHome: 16
HOA Fee: $225 Annually
Annual Taxes: $2,635.22
Subdivision: Indigo Ranch at Stetson Ridge

9095 Vanderwood Road Colorado Springs, CO 80908-5657
MLS #5994546
For Sale
$550,000
Price per Sq Ft.: $168
Size: 3,277 sqft
Lot Size Area: 5,567.00 sqft
Year Built: 2016
Days on OneHome: 34
HOA Fee: $326 Annually
Annual Taxes: $3,648.7
Subdivision: Trails At Forest Meadows

9416 Wolf Pack Terrace Colorado Springs, CO 80920-7678
MLS #6172323
For Sale
$550,000
Price per Sq Ft.: $219
Size: 2,506 sqft
Lot Size Area: 6,566.00 sqft
Year Built: 2003
Days on OneHome: 38
Annual Taxes: $2,124.83
Subdivision: Gatehouse Village At Briargate

8375 Winding Passage Drive Colorado Springs, CO 80924-8115
MLS #8202865
For Sale
$550,000
Price per Sq Ft.: $215
Size: 2,555 sqft
Lot Size Area: 7,037.00 sqft
Year Built: 2004
Days on OneHome: 92
HOA Fee: $35 Monthly
Annual Taxes: $3,072.28
Subdivision: Westcreek At Wolf Ranch

7660 Bullet Road Peyton, CO 80831
MLS #3822228
For Sale
$550,000
Price per Sq Ft.: $179
Size: 3,071 sqft
Lot Size Area: 26,400.00 sqft
Year Built: 1999
Days on OneHome: 134
Annual Taxes: $2,708.85
Subdivision: Woodmen Hills

7527 Colorado Tech Drive Colorado Springs, CO 80915-2037
MLS #6303123
For Sale
$549,999
Price per Sq Ft.: $163
Size: 3,367 sqft
Lot Size Area: 5,653.00 sqft
Year Built: 2014
Days on OneHome: 1
HOA Fee: $472 Annually
Annual Taxes: $2,407.55
Subdivision: Wilshire

6241 Donahue Drive Colorado Springs, CO 80923-7665
MLS #9020481
For Sale
$545,000
Price per Sq Ft.: $177
Size: 3,084 sqft
Lot Size Area: 5,500.00 sqft
Year Built: 2014
Days on OneHome: 27
Annual Taxes: $3,053.75
Subdivision: Dublin North

9729 Porch Swing Lane Peyton, CO 80831-4611
MLS #8141032
For Sale
$545,000
Price per Sq Ft.: $171
Size: 3,178 sqft
Lot Size Area: 7,726.00 sqft
Year Built: 2020
Days on OneHome: 34
HOA Fee: $120 Annually
Annual Taxes: $4,126.3
Subdivision: Windingwalk At Meridian Ranch

7160 Red Cardinal Loop Colorado Springs, CO 80908
MLS #9617623
For Sale
$545,000
Price per Sq Ft.: $184
Size: 2,968 sqft
Lot Size Area: 0.16 acres
Year Built: 2013
Days on OneHome: 55
HOA Fee: $70 Quarterly
Annual Taxes: $3,360.87
Subdivision: Forest Meadows

9962 Hidden Ranch Court Peyton, CO 80831-6530
MLS #1957788
For Sale
$544,999
Price per Sq Ft.: $213
Size: 2,556 sqft
Lot Size Area: 7,026.00 sqft
Year Built: 2022
Days on OneHome: 84
HOA Fee: $70 Monthly
Annual Taxes: $3,901.81
Subdivision: Stonebridge At Meridian Ranch

8014 Noble Fir Court Colorado Springs, CO 80927-4040
MLS #5252348
For Sale
$540,000
Price per Sq Ft.: $185
Size: 2,923 sqft
Lot Size Area: 4,842.00 sqft
Year Built: 2008
Days on OneHome: 29
Annual Taxes: $4,000.91
Subdivision: Banning Lewis Ranch

6731 Granite Peak Drive Colorado Springs, CO 80923
MLS #5703873
For Sale
$540,000
Price per Sq Ft.: $149
Size: 3,621 sqft
Lot Size Area: 0.22 acres
Year Built: 2000
Days on OneHome: 56
Annual Taxes: $1,892
Subdivision: Antelope Creek

5236 Stone Fence Drive Colorado Springs, CO 80922-3643
MLS #9798133
For Sale
$535,750
Price per Sq Ft.: $183
Size: 2,927 sqft
Lot Size Area: 10,005.00 sqft
Year Built: 2003
Days on OneHome: 3
Annual Taxes: $2,036.37
Subdivision: Stetson Ridge South

8261 Cypress Wood Drive Colorado Springs, CO 80927-4072
MLS #7099195
For Sale
$535,000
Price per Sq Ft.: $202
Size: 2,645 sqft
Lot Size Area: 3,200.00 sqft
Year Built: 2015
Days on OneHome: 6
Annual Taxes: $3,445.86
Subdivision: Banning Lewis Ranch

9222 Pacific Crest Drive Colorado Springs, CO 80927-4166
MLS #1506020
For Sale
$535,000
Price per Sq Ft.: $214
Size: 2,497 sqft
Lot Size Area: 4,500.00 sqft
Year Built: 2017
Days on OneHome: 21
Annual Taxes: $2,983.06
Subdivision: Banning Lewis Ranch

13256 Park Meadows Drive Peyton, CO 80831-4150
MLS #4495204
For Sale
$535,000
Price per Sq Ft.: $185
Size: 2,892 sqft
Lot Size Area: 6,768.00 sqft
Year Built: 2016
Days on OneHome: 94
HOA Fee: $210 Monthly
Annual Taxes: $3,263.41
Subdivision: Meridian Ranch

7784 Frigid Air Point Colorado Springs, CO 80908
MLS #4539098
For Sale
$530,000
Price per Sq Ft.: $180
Size: 2,943 sqft
Lot Size Area: 6,903.00 sqft
Year Built: 2022
Days on OneHome: 37
HOA Fee: $143 Monthly
Annual Taxes: $3,091.9
Subdivision: The Nook at Shiloh Mesa

5002 Sand Ripples Lane Colorado Springs, CO 80922-3566
MLS #1217348
For Sale
$530,000
Price per Sq Ft.: $172
Size: 3,083 sqft
Lot Size Area: 7,133.00 sqft
Year Built: 2003
Days on OneHome: 169
Annual Taxes: $1,902.78
Subdivision: Willowind at Stetson Hills

14020 Nichlas Court Colorado Springs, CO 80921-3307
MLS #3921720
For Sale
$529,900
Price per Sq Ft.: $171
Size: 3,102 sqft
Lot Size Area: 6,158.00 sqft
Year Built: 1995
Days on OneHome: 9
HOA Fee: $100 Monthly
Annual Taxes: $2,715.6
Subdivision: Muirfield

7713 Blue Vail Way Colorado Springs, CO 80922-6309
MLS #6334289
For Sale
$527,000
Price per Sq Ft.: $202
Size: 2,611 sqft
Lot Size Area: 15.00 acres
Year Built: 2006
HOA Fee: $462 Annually
Annual Taxes: $2,369.71
Subdivision: Eastview Estates

10247 Hidden Park Way Peyton, CO 80831-8353
MLS #9271246
For Sale
$530,000
Price per Sq Ft.: $185
Size: 2,871 sqft
Lot Size Area: 6,949.00 sqft
Year Built: 2017
Days on OneHome: 5
HOA Fee: $100 Annually
Annual Taxes: $3,072.22
Subdivision: Meridian Ranch

5860 Drifter Street Colorado Springs, CO 80918-5250
MLS #5900154
For Sale
$550,000
Price per Sq Ft.: $186
Size: 2,962 sqft
Lot Size Area: 7,425.00 sqft
Year Built: 1998
Days on OneHome: --
HOA Fee: $485 Annually
Annual Taxes: $1,882.9
Subdivision: Sierra Ridge

4735 Seton Place Colorado Springs, CO 80918-5230
MLS #1627467
For Sale
$550,000
Price per Sq Ft.: $190
Size: 2,892 sqft
Lot Size Area: 8,322.00 sqft
Year Built: 1996
Days on OneHome: 7
Annual Taxes: $1,992
Subdivision: Sierra Ridge

7662 Camille Court Colorado Springs, CO 80908-4715
MLS #1196446
For Sale
$499,900
Price per Sq Ft.: $158
Size: 3,162 sqft
Lot Size Area: 7,127.00 sqft
Year Built: 2016
Days on OneHome: --
HOA Fee: $130 Quarterly
Annual Taxes: $2,589.62
Subdivision: Forest Meadows

4255 Gracewood Drive Colorado Springs, CO 80920-6600
MLS #6832828
For Sale
$545,000
Price per Sq Ft.: $175
Size: 3,119 sqft
Lot Size Area: 4,950.00 sqft
Year Built: 1998
Days on OneHome: --
Annual Taxes: $1,858.09
Subdivision: Woodside At Briargate
`;
const APPLIED_UPDATES_BY_HOME_ID = {
  "imported-mls-1217348": {
    "photo": "https://photos.zillowstatic.com/fp/4f7e5d5681bb4c5eb423702cc9817763-cc_ft_768.webp",
    "lotSqft": 7133,
    "hoa": 1,
    "safetyAssaultIndex": 29,
    "safetyBurglaryIndex": 43,
    "safetyLarcenyTheftIndex": 73,
    "safetyVehicleTheftIndex": 65,
    "kitchenSize": "Large",
    "yardCondition": "Poor",
    "greg": 6,
    "bre": 5.5
  },
  "imported-mls-5703873": {
    "photo": "https://photos.zillowstatic.com/fp/d384490c138682b7d2cf5f009a39a793-cc_ft_768.webp",
    "safetyAssaultIndex": 17,
    "safetyBurglaryIndex": 43,
    "safetyLarcenyTheftIndex": 69,
    "safetyVehicleTheftIndex": 45,
    "lotSqft": 9583.2,
    "yardCondition": "Fair",
    "kitchenSize": "Small",
    "greg": 5.1,
    "bre": 5.1,
    "hoa": 0.1
  },
  "imported-mls-9798133": {
    "photo": "https://m1.cbhomes.com/p/723/9798133/E633205A44524b2/pdl23tp.webp",
    "safetyAssaultIndex": 29,
    "safetyBurglaryIndex": 43,
    "safetyLarcenyTheftIndex": 73,
    "safetyVehicleTheftIndex": 65,
    "greg": 7.5,
    "bre": 7,
    "lotSqft": 10005,
    "kitchenSize": "Large",
    "hoa": 0.1
  },
  "imported-mls-3921720": {
    "photo": "https://photos.zillowstatic.com/fp/e50f9224bf21b296c8dd839bdaeec569-cc_ft_768.webp",
    "safetyAssaultIndex": 44,
    "safetyBurglaryIndex": 16,
    "safetyLarcenyTheftIndex": 7,
    "safetyVehicleTheftIndex": 28,
    "yardCondition": "Poor",
    "status": "Ruled Out"
  },
  "imported-mls-6334289": {
    "photo": "https://photos.zillowstatic.com/fp/988e32754c3777ea63d0ad90115f2427-cc_ft_768.webp",
    "safetyAssaultIndex": 29,
    "safetyBurglaryIndex": 43,
    "safetyLarcenyTheftIndex": 73,
    "safetyVehicleTheftIndex": 65,
    "greg": 8.5,
    "bre": 8,
    "kitchenSize": "Large",
    "lotSqft": 6600,
    "yardCondition": "Excellent",
    "dom": 1
  },
  "imported-mls-6303123": {
    "photo": "https://photos.zillowstatic.com/fp/daf82f01b0b552aa9e427283e0a13975-cc_ft_768.webp",
    "safetyAssaultIndex": 81,
    "safetyBurglaryIndex": 93,
    "safetyLarcenyTheftIndex": 95,
    "safetyVehicleTheftIndex": 103,
    "bre": 8,
    "greg": 8,
    "kitchenSize": "Large",
    "lotSqft": 5653,
    "yardCondition": "Excellent"
  },
  "imported-mls-9020481": {
    "photo": "https://photos.zillowstatic.com/fp/3ea4319389898d77b2818302c3045f1e-cc_ft_768.webp",
    "safetyAssaultIndex": 17,
    "safetyBurglaryIndex": 43,
    "safetyLarcenyTheftIndex": 69,
    "safetyVehicleTheftIndex": 45,
    "greg": 7,
    "kitchenSize": "Gourmet",
    "yardCondition": "Poor",
    "bre": 8,
    "lotSqft": 5500,
    "hoa": 0.1
  },
  "imported-mls-3822228": {
    "photo": "https://photos.zillowstatic.com/fp/a8901e94f5dc1f0d07b26369c9383b4e-cc_ft_768.webp",
    "safetyAssaultIndex": 39,
    "safetyBurglaryIndex": 93,
    "safetyLarcenyTheftIndex": 6,
    "safetyVehicleTheftIndex": 27,
    "greg": 7,
    "bre": 8,
    "lotSqft": 26400,
    "kitchenSize": "Gourmet",
    "hoa": 0.1
  },
  "imported-mls-9617623": {
    "photo": "https://photos.zillowstatic.com/fp/650549673f773fb6eba4dd73bfd4bcd0-cc_ft_768.webp",
    "safetyAssaultIndex": 32,
    "safetyBurglaryIndex": 39,
    "safetyLarcenyTheftIndex": 6,
    "safetyVehicleTheftIndex": 16,
    "kitchenSize": "Large",
    "greg": 7.5,
    "safetyGrade": "A+",
    "bre": 7.5,
    "lotSqft": 6969.6
  },
  "imported-mls-4539098": {
    "photo": "https://photos.zillowstatic.com/fp/0406ecef6e38fdf5e432c00ecea7f925-cc_ft_768.webp",
    "safetyAssaultIndex": 32,
    "safetyBurglaryIndex": 39,
    "safetyLarcenyTheftIndex": 6,
    "safetyVehicleTheftIndex": 16,
    "kitchenSize": "Gourmet",
    "yardCondition": "Poor",
    "greg": 6.5,
    "bre": 7,
    "lotSqft": 6903
  },
  "imported-mls-5252348": {
    "photo": "https://photos.zillowstatic.com/fp/e5b3fa77e284e6e146a1bda01e9af36d-cc_ft_768.webp",
    "safetyAssaultIndex": 119,
    "safetyBurglaryIndex": 58,
    "safetyLarcenyTheftIndex": 31,
    "safetyVehicleTheftIndex": 143,
    "yardCondition": "Poor",
    "status": "Ruled Out"
  },
  "imported-mls-8141032": {
    "photo": "https://photos.zillowstatic.com/fp/57f78ba0a74446b85d75f2e200d0ab02-cc_ft_768.webp",
    "safetyAssaultIndex": 39,
    "safetyBurglaryIndex": 93,
    "safetyLarcenyTheftIndex": 6,
    "safetyVehicleTheftIndex": 27,
    "lotSqft": 7726,
    "bre": 7,
    "greg": 6,
    "kitchenSize": "Gourmet",
    "yardCondition": "Fair"
  },
  "imported-mls-5994546": {
    "photo": "https://photos.zillowstatic.com/fp/d73dbd5febbfa14c16e5ee8c29d131ba-cc_ft_768.webp",
    "safetyAssaultIndex": 32,
    "safetyBurglaryIndex": 39,
    "safetyLarcenyTheftIndex": 6,
    "safetyVehicleTheftIndex": 16,
    "bre": 8,
    "lotSqft": 5567,
    "greg": 7.5,
    "yardCondition": "Fair",
    "kitchenSize": "Large"
  },
  "imported-mls-7099195": {
    "photo": "https://photos.zillowstatic.com/fp/6e64b983593dc9d72d51df095798e29d-cc_ft_768.webp",
    "safetyAssaultIndex": 119,
    "safetyBurglaryIndex": 58,
    "safetyLarcenyTheftIndex": 31,
    "safetyVehicleTheftIndex": 143,
    "lotSqft": 3200,
    "kitchenSize": "Large",
    "greg": 7,
    "bre": 7.5,
    "hoa": 0.1
  },
  "imported-mls-1506020": {
    "photo": "https://photos.zillowstatic.com/fp/3f2b7a9d1615fe35ed59762feac28bf0-cc_ft_768.webp",
    "safetyAssaultIndex": 119,
    "safetyBurglaryIndex": 58,
    "safetyLarcenyTheftIndex": 31,
    "safetyVehicleTheftIndex": 143,
    "lotSqft": 4500,
    "greg": 6.5,
    "bre": 6,
    "kitchenSize": "Large",
    "yardCondition": "Fair",
    "hoa": 0.1
  },
  "imported-mls-6172323": {
    "photo": "https://photos.zillowstatic.com/fp/bcb00ad016484524c4518a4d524b2c3a-cc_ft_768.webp",
    "safetyGrade": "A+",
    "safetyAssaultIndex": 34,
    "safetyBurglaryIndex": 38,
    "safetyLarcenyTheftIndex": 81,
    "safetyVehicleTheftIndex": 62,
    "lotSqft": 6566,
    "greg": 8.5,
    "kitchenSize": "Large",
    "bre": 8,
    "hoa": 0.1
  },
  "imported-mls-3917272": {
    "photo": "https://photos.zillowstatic.com/fp/ba30eb1e84d265737fd1969c37582516-cc_ft_768.webp",
    "safetyGrade": "A+",
    "safetyAssaultIndex": 17,
    "safetyBurglaryIndex": 43,
    "safetyLarcenyTheftIndex": 69,
    "safetyVehicleTheftIndex": 45,
    "lotSqft": 6541,
    "yardCondition": "Excellent",
    "greg": 6.5,
    "kitchenSize": "Large",
    "bre": 7.5
  },
  "imported-mls-4495204": {
    "photo": "https://photos.zillowstatic.com/fp/998a67e0f3e799aaf40b57faeaa26d2f-cc_ft_768.webp",
    "safetyGrade": "A+",
    "safetyAssaultIndex": 39,
    "safetyBurglaryIndex": 93,
    "safetyLarcenyTheftIndex": 6,
    "safetyVehicleTheftIndex": 27,
    "lotSqft": 6768,
    "greg": 8.5,
    "bre": 8.5,
    "kitchenSize": "Large",
    "yardCondition": "Excellent"
  },
  "imported-mls-8202865": {
    "photo": "https://photos.zillowstatic.com/fp/9a9a260e1c23dc6b907a3b7eb381e6cd-sc_1344_896.webp",
    "safetyGrade": "A+",
    "safetyAssaultIndex": 17,
    "safetyBurglaryIndex": 23,
    "safetyLarcenyTheftIndex": 18,
    "safetyVehicleTheftIndex": 24,
    "lotSqft": 7037,
    "greg": 6.5,
    "bre": 6
  },
  "imported-mls-1957788": {
    "photo": "https://photos.zillowstatic.com/fp/fbb76144febf1fd6548a22dc5104c950-cc_ft_768.webp",
    "safetyGrade": "A+",
    "safetyAssaultIndex": 39,
    "safetyBurglaryIndex": 93,
    "safetyLarcenyTheftIndex": 6,
    "safetyVehicleTheftIndex": 27,
    "lotSqft": 7026,
    "bre": 8.5,
    "greg": 8,
    "kitchenSize": "Gourmet",
    "yardCondition": "Excellent"
  },
  "imported-mls-5900154": {
    "photo": "https://photos.zillowstatic.com/fp/26ec4bdc0d474d53235ccdf1dc581340-cc_ft_1152.webp",
    "hoa": 5820,
    "lotSqft": 7425,
    "greg": 9,
    "bre": 8.5,
    "kitchenSize": "Large",
    "yardCondition": "Excellent",
    "dom": 1
  },
  "base-4": {
    "bre": 9,
    "dom": 103
  },
  "base-8": {
    "bre": 6.5
  },
  "imported-mls-9271246": {
    "lotSqft": 6949,
    "bre": 8.5,
    "greg": 7,
    "kitchenSize": "Large",
    "yardCondition": "Excellent",
    "photo": "https://photos.zillowstatic.com/fp/2f052ee2a9c8428b171c1de924612d53-cc_ft_768.webp"
  },
  "imported-mls-6832828": {
    "lotSqft": 4950,
    "dom": 1,
    "hoa": 0.1,
    "bre": 8,
    "kitchenSize": "Large",
    "yardCondition": "Poor",
    "greg": 7.5,
    "photo": "https://photos.zillowstatic.com/fp/adef1e965cdaec161c76af235c8c6cbe-cc_ft_768.webp"
  },
  "imported-mls-1196446": {
    "lotSqft": 7127,
    "bre": 8.75,
    "kitchenSize": "Gourmet",
    "dom": 1,
    "greg": 8.5,
    "photo": "https://photos.zillowstatic.com/fp/46b62c34617fd37782dbfbf641fe9d12-cc_ft_768.webp"
  },
  "imported-mls-1627467": {
    "hoa": 0.1,
    "lotSqft": 8322,
    "yardCondition": "Fair",
    "bre": 7.5,
    "greg": 7.5,
    "photo": "https://photos.zillowstatic.com/fp/a748b00d13b77dee1fe0f25e2ec3042c-cc_ft_768.webp"
  }
};
const DEFAULT_EDITABLE_KEYS = [
  "name",
  "short",
  "status",
  "photo",
  "price",
  "pricePerSqft",
  "sqft",
  "lotSqft",
  "built",
  "dom",
  "hoa",
  "tax",
  "greg",
  "bre",
  "kitchenSize",
  "yardCondition",
  "neighborhood",
  "aestheticsRating",
  "safetyNeighborhood",
  "safetyGrade",
  "safetyAssaultIndex",
  "safetyBurglaryIndex",
  "safetyLarcenyTheftIndex",
  "safetyVehicleTheftIndex",
  "tags",
];
const STATUS_VALUES = new Set(["Considering", "Ruled Out", "Sold"]);
const KITCHEN_VALUES = new Set(["Small", "Medium", "Large", "Gourmet"]);
const YARD_VALUES = new Set(["Poor", "Fair", "Good", "Excellent"]);
const mergeOverrides = (seed, incoming) => {
  const merged = {};
  const apply = (src) => {
    if (!src || typeof src !== "object") return;
    Object.entries(src).forEach(([homeId, values]) => {
      if (!values || typeof values !== "object") return;
      merged[homeId] = { ...(merged[homeId] ?? {}), ...values };
    });
  };
  apply(seed);
  apply(incoming);
  return merged;
};
const PLACEHOLDER_FIELD_LABELS = {
  price: "Price",
  sqft: "Sqft",
  lotSqft: "Lot Sqft",
  built: "Year Built",
  dom: "Days on Market",
  hoa: "HOA (Annual)",
  tax: "Annual Taxes",
  greg: "Greg Rating",
  bre: "Bre Rating",
  kitchenSize: "Kitchen Size",
  yardCondition: "Yard Condition",
  safetyAssaultIndex: "Assault Index",
  safetyBurglaryIndex: "Burglary Index",
  safetyLarcenyTheftIndex: "Larceny/Theft Index",
  safetyVehicleTheftIndex: "Vehicle Theft Index",
};
const placeholderLabel = (fieldKey) => PLACEHOLDER_FIELD_LABELS[fieldKey] ?? fieldKey;
const getMissingFields = (home) => {
  if (home && Object.prototype.hasOwnProperty.call(home, "blankFields")) {
    return Array.isArray(home.blankFields) ? home.blankFields : [];
  }
  const legacy = Array.isArray(home?.placeholderFields) ? home.placeholderFields : [];
  return legacy;
};
const placeholderSummary = (home, limit = 3) => {
  const fields = getMissingFields(home);
  if (!fields.length) return "Complete";
  const labels = fields.slice(0, limit).map(placeholderLabel);
  const extra = fields.length - labels.length;
  return `${labels.join(", ")}${extra > 0 ? ` +${extra} more` : ""}`;
};
const ppsfToPrice = (pricePerSqft, sqft) => (Number.isFinite(pricePerSqft) && Number.isFinite(sqft) && sqft > 0 ? pricePerSqft * sqft : null);
const toNum = (v) => {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  const cleaned = s.replace(/,/g, "").replace(/\$/g, "").replace(/%/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};
const parseLotSqft = (value) => {
  if (value == null) return null;
  const raw = String(value);
  const n = toNum(raw);
  if (n == null) return null;
  if (/acre/i.test(raw)) return Math.round(n * 43560);
  return n;
};
const toDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const parseDateKey = (value) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(year, month - 1, day);
};
const dayDiff = (fromKey, toKey) => {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  if (!from || !to) return 0;
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.max(0, Math.floor((toUtc - fromUtc) / 86400000));
};
const extractZip = (...values) => {
  const combined = values.filter((v) => typeof v === "string" && v.trim()).join(" ");
  if (!combined) return null;
  const stateMatch = combined.match(/(?:\bCO\b|\bColorado\b)\s+(\d{5})(?:-\d{4})?\b/i);
  if (stateMatch?.[1]) return stateMatch[1];
  const matches = [...combined.matchAll(/\b(\d{5})(?:-\d{4})?\b/g)].map((m) => m[1]);
  return matches.length ? matches[matches.length - 1] : null;
};
const pickText = (...vals) => vals.find((v) => typeof v === "string" && v.trim())?.trim() ?? "";
const derivedShort = (name, fallbackIndex) => {
  const s = pickText(name);
  if (!s) return `Home ${fallbackIndex + 1}`;
  const words = s.split(/\s+/).slice(0, 2);
  return words.join(" ");
};
const asStatus = (v) => {
  const s = pickText(v);
  return STATUS_VALUES.has(s) ? s : "Considering";
};
const asKitchen = (v) => {
  const s = pickText(v);
  return KITCHEN_VALUES.has(s) ? s : "Medium";
};
const asYard = (v) => {
  const s = pickText(v);
  return YARD_VALUES.has(s) ? s : "Good";
};
const asTags = (v) => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string") return v.split(",").map((x) => x.trim()).filter(Boolean);
  return [];
};
const slugify = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const fromAnnual = (value, cadence) => {
  const n = toNum(value);
  if (n == null) return null;
  const c = (cadence || "").toLowerCase();
  if (c.startsWith("month")) return n * 12;
  if (c.startsWith("quarter")) return n * 4;
  return n;
};
function normalizeHomeRecord(home, index) {
  const placeholderFields = [];
  const isImported = home?.sourceType === "imported";
  const overrideKeys = Array.isArray(home?._overrideKeys) ? home._overrideKeys : [];
  const hasOverride = (key) => overrideKeys.includes(key);
  const name = pickText(home.name, home.address, home.streetAddress);
  const short = pickText(home.short) || derivedShort(name, index);

  const sqft = toNum(home.sqft ?? home.size ?? home.aboveGradeFinishedArea) ?? 2500;
  if (toNum(home.sqft ?? home.size ?? home.aboveGradeFinishedArea) == null) placeholderFields.push("sqft");

  const parsedLotSqft = parseLotSqft(home.lotSqft ?? home.lotSizeArea ?? home.lotSize);
  const lotSqft = parsedLotSqft ?? 6000;
  if (
    parsedLotSqft == null ||
    (isImported && lotSqft === 6000 && !hasOverride("lotSqft"))
  ) placeholderFields.push("lotSqft");

  const parsedPpsf = toNum(home.pricePerSqft ?? home.ppsf ?? home.price_per_sqft);
  const parsedPrice = toNum(home.price ?? home.listPrice ?? home.list_price) ?? ppsfToPrice(parsedPpsf, sqft) ?? 550000;
  if (toNum(home.price ?? home.listPrice ?? home.list_price) == null && ppsfToPrice(parsedPpsf, sqft) == null) placeholderFields.push("price");

  const built = toNum(home.built ?? home.yearBuilt ?? home.year_built) ?? 2010;
  if (toNum(home.built ?? home.yearBuilt ?? home.year_built) == null) placeholderFields.push("built");

  const dom = toNum(home.dom ?? home.daysOnMarket ?? home.days_on_onehome) ?? 0;
  if (toNum(home.dom ?? home.daysOnMarket ?? home.days_on_onehome) == null) placeholderFields.push("dom");

  const parsedHoa = toNum(home.hoa ?? home.hoaAnnual ?? home.hoa_fee_annual);
  const meridianSignal = [
    pickText(home.safetyNeighborhood, home.subdivision, home.mlsAreaMinor),
    Array.isArray(home.tags) ? home.tags.join(" ") : "",
  ].join(" ");
  const isMeridianRanch = /meridian ranch/i.test(meridianSignal);
  let hoa = parsedHoa ?? 0;
  if (isMeridianRanch && parsedHoa == null) {
    // Realtor-confirmed rule: Meridian Ranch HOA is ~ $230/month.
    hoa = MERIDIAN_RANCH_HOA_ANNUAL;
    placeholderFields.push("hoa");
  }

  const zipCode = extractZip(
    pickText(home.zip, home.zipCode, home.postalCode),
    pickText(home.name, home.address, home.streetAddress)
  );
  const zipTaxRate = zipCode ? TAX_RATE_BY_ZIP[zipCode] : null;
  const appliedTaxRate = Number.isFinite(zipTaxRate) ? zipTaxRate : DEFAULT_TAX_RATE;
  const parsedTax = toNum(home.tax ?? home.annualTax ?? home.annual_taxes);
  const tax = Number.isFinite(parsedTax)
    ? parsedTax
    : Number.isFinite(parsedPrice)
      ? +(parsedPrice * appliedTaxRate).toFixed(2)
      : 3000;

  const parsedGreg = toNum(home.greg);
  const greg = parsedGreg ?? 5;
  if (
    parsedGreg == null ||
    (isImported && greg === 5 && !hasOverride("greg"))
  ) placeholderFields.push("greg");

  const parsedBre = toNum(home.bre);
  const bre = parsedBre ?? 5;
  if (
    parsedBre == null ||
    (isImported && bre === 5 && !hasOverride("bre"))
  ) placeholderFields.push("bre");

  const neighborhood = toNum(home.neighborhood) ?? 70;

  const aestheticsRating = toNum(home.aestheticsRating ?? home.aesthetics) ?? 5;

  const safetyAssaultIndex = toNum(home.safetyAssaultIndex ?? home.assaultIndex);
  if (SAFETY_SCORING_ENABLED && safetyAssaultIndex == null) placeholderFields.push("safetyAssaultIndex");

  const safetyBurglaryIndex = toNum(home.safetyBurglaryIndex ?? home.burglaryIndex);
  if (SAFETY_SCORING_ENABLED && safetyBurglaryIndex == null) placeholderFields.push("safetyBurglaryIndex");

  const safetyLarcenyTheftIndex = toNum(home.safetyLarcenyTheftIndex ?? home.larcenyTheftIndex);
  if (SAFETY_SCORING_ENABLED && safetyLarcenyTheftIndex == null) placeholderFields.push("safetyLarcenyTheftIndex");

  const safetyVehicleTheftIndex = toNum(home.safetyVehicleTheftIndex ?? home.vehicleTheftIndex);
  if (SAFETY_SCORING_ENABLED && safetyVehicleTheftIndex == null) placeholderFields.push("safetyVehicleTheftIndex");

  const status = asStatus(home.status);
  const kitchenSize = asKitchen(home.kitchenSize);
  if (
    !pickText(home.kitchenSize) ||
    (isImported && kitchenSize === "Medium" && !hasOverride("kitchenSize"))
  ) placeholderFields.push("kitchenSize");
  const yardCondition = asYard(home.yardCondition);
  if (
    !pickText(home.yardCondition) ||
    (isImported && yardCondition === "Good" && !hasOverride("yardCondition"))
  ) placeholderFields.push("yardCondition");
  const tags = asTags(home.tags);
  const defaultedFields = [...new Set(placeholderFields)];
  const normalized = {
    ...home,
    name: name || `Imported Home ${index + 1}`,
    short,
    status,
    photo: pickText(home.photo) || null,
    price: parsedPrice,
    sqft,
    lotSqft,
    built,
    dom,
    hoa,
    tax,
    greg,
    bre,
    kitchenSize,
    yardCondition,
    neighborhood,
    aestheticsRating,
    safetyNeighborhood: pickText(home.safetyNeighborhood) || null,
    safetyGrade: pickText(home.safetyGrade) || null,
    safetyAssaultIndex,
    safetyBurglaryIndex,
    safetyLarcenyTheftIndex,
    safetyVehicleTheftIndex,
    tags,
    // Recompute placeholders from current values (including overrides) so they
    // disappear as soon as a field is filled in.
    placeholderFields: PLACEHOLDER_TAGS_ENABLED ? defaultedFields : [],
    defaultedFields,
  };
  const blankTrackKeys = Object.keys(PLACEHOLDER_FIELD_LABELS);
  const hasSeededBlankFields = Array.isArray(home?.blankFields);
  const blankSet = new Set(hasSeededBlankFields ? home.blankFields : []);
  for (const key of blankTrackKeys) {
    if (!SAFETY_SCORING_ENABLED && key.startsWith("safety")) continue;
    const rawValue = home?.[key];
    const isBlank = rawValue == null || (typeof rawValue === "string" && rawValue.trim() === "");
    const explicitOverride = hasOverride(key);
    if (explicitOverride) {
      if (isBlank) blankSet.add(key);
      else blankSet.delete(key);
      continue;
    }
    // First normalization pass (no seeded blanks): derive from raw source.
    if (!hasSeededBlankFields) {
      if (isBlank) blankSet.add(key);
      else blankSet.delete(key);
    }
    // Subsequent passes keep seeded blank flags until user fills them.
  }
  const blankFields = [...blankSet];
  return {
    ...normalized,
    blankFields,
  };
}
function parseUnformattedHomes(rawText) {
  const raw = typeof rawText === "string" ? rawText.trim() : "";
  if (!raw) return { blockCount: 0, homes: [], unknownFieldCount: 0 };

  ADDRESS_BLOCK_REGEX.lastIndex = 0;
  const matches = [...raw.matchAll(ADDRESS_BLOCK_REGEX)];
  if (!matches.length) return { blockCount: 0, homes: [], unknownFieldCount: 0 };

  const blocks = matches.map((m, i) => {
    const start = m.index + m[0].length - m[1].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
    return { address: m[1].trim(), body: raw.slice(start, end) };
  });

  let unknownFieldCount = 0;
  const homes = blocks.map(({ address, body }) => {
    const capture = (re) => (body.match(re)?.[1] ?? "").trim();
    const mls = capture(/MLS\s*#\s*([0-9]+)/i);
    const price = toNum(capture(/For Sale[\s\S]*?\$([0-9,]+(?:\.[0-9]+)?)/i) || capture(/List Price:\s*\$([0-9,]+(?:\.[0-9]+)?)/i));
    const ppsf = toNum(capture(/Price per Sq\s*Ft\.?:\s*\$([0-9,]+(?:\.[0-9]+)?)/i));
    const sqft = toNum(capture(/Size[\s:]*([0-9,]+(?:\.[0-9]+)?)\s*sqft/i) || capture(/Above Grade Finished Area:\s*([0-9,]+(?:\.[0-9]+)?)\s*sqft/i));
    const lotRaw = capture(/Lot Size Area:\s*([0-9,.]+\s*(?:sqft|acres))/i);
    const built = toNum(capture(/Year Built:\s*([0-9]{4})/i));
    const dom = toNum(capture(/Days on OneHome[\s:]*([0-9]+)/i));
    const hoaRaw = capture(/HOA Fee:\s*\$([0-9,]+(?:\.[0-9]+)?)\s*(Monthly|Annually|Quarterly)?/i);
    const hoaCadence = (body.match(/HOA Fee:\s*\$[0-9,]+(?:\.[0-9]+)?\s*(Monthly|Annually|Quarterly)?/i)?.[1] ?? "").trim();
    const tax = toNum(capture(/Annual Taxes:\s*\$([0-9,]+(?:\.[0-9]+)?)/i));
    const neighborhood = capture(/Subdivision:\s*([^\n]+)/i);
    const assaultIndex = toNum(
      capture(/(?:Safety\s*)?(?:Assault|Violent Crime)(?:\s*Index)?\s*[:=]\s*([0-9,]+(?:\.[0-9]+)?)/i) ||
      capture(/(?:safetyAssaultIndex|assaultIndex)\s*[:=]\s*([0-9,]+(?:\.[0-9]+)?)/i)
    );
    const burglaryIndex = toNum(
      capture(/(?:Safety\s*)?Burglary(?:\s*Index)?\s*[:=]\s*([0-9,]+(?:\.[0-9]+)?)/i) ||
      capture(/(?:safetyBurglaryIndex|burglaryIndex)\s*[:=]\s*([0-9,]+(?:\.[0-9]+)?)/i)
    );
    const larcenyTheftIndex = toNum(
      capture(/(?:Safety\s*)?Larceny(?:\s*\/\s*|\s+and\s+)?Theft(?:\s*Index)?\s*[:=]\s*([0-9,]+(?:\.[0-9]+)?)/i) ||
      capture(/(?:safetyLarcenyTheftIndex|larcenyTheftIndex)\s*[:=]\s*([0-9,]+(?:\.[0-9]+)?)/i)
    );
    const vehicleTheftIndex = toNum(
      capture(/(?:Safety\s*)?Vehicle Theft(?:\s*Index)?\s*[:=]\s*([0-9,]+(?:\.[0-9]+)?)/i) ||
      capture(/(?:safetyVehicleTheftIndex|vehicleTheftIndex)\s*[:=]\s*([0-9,]+(?:\.[0-9]+)?)/i)
    );
    const safetyNeighborhood = capture(/Safety (?:Area|Neighborhood):\s*([^\n]+)/i);

    const knownKeySet = new Set([
      "Type", "Year Built", "Lot Size Area", "Parking Spots", "Heating", "Cooling", "HOA Fee", "County/Parish",
      "Subdivision", "Status", "Beds", "Baths", "Full Bathrooms", "Three-Quarter Bathrooms", "Half Bathrooms",
      "Size", "Above Grade Finished Area", "Total Building Area", "Building Area Source", "Stories", "Interior Features",
      "Basement", "% Basement Finished", "Flooring", "Window Features", "Fireplace", "Number of Fireplaces", "Appliances",
      "Rooms Total", "Property Type", "Style", "Lot Features", "Garage/Parking Features", "Exterior Features", "Fencing",
      "Patio and Porch", "View", "Utilities", "Construction Materials", "Roof", "Foundation Details", "Property Attached",
      "Property Condition", "Association Name", "Association Fee Includes", "List Price", "Price per Sq Ft.", "Exclusions",
      "Special Listing Conditions", "Directions", "Listing Terms", "Zoning", "Possession", "Disclosures", "Tax ID",
      "Tax Year", "Annual Taxes", "Tax Legal Description", "Location", "MLS Area Minor", "Postal City", "Elementary Schools",
      "Middle School", "High Schools", "Unified School District"
    ]);
    const fieldLines = body.split("\n").map((line) => line.trim()).filter(Boolean);
    unknownFieldCount += fieldLines
      .map((line) => line.match(/^([A-Za-z0-9\-\/& %\.\(\)]+):\s*/)?.[1])
      .filter((k) => k && !knownKeySet.has(k)).length;

    return normalizeHomeRecord(
      {
        name: address,
        short: derivedShort(address, 0),
        status: "Considering",
        price,
        pricePerSqft: ppsf,
        sqft,
        lotSqft: parseLotSqft(lotRaw),
        built,
        dom,
        hoa: fromAnnual(hoaRaw, hoaCadence),
        tax,
        kitchenSize: "Medium",
        yardCondition: "Good",
        neighborhood: neighborhood ? 70 : null,
        safetyNeighborhood: safetyNeighborhood || neighborhood || null,
        assaultIndex,
        burglaryIndex,
        larcenyTheftIndex,
        vehicleTheftIndex,
        tags: [neighborhood && `Subdivision: ${neighborhood}`].filter(Boolean),
        mlsId: mls || null,
        sourceKey: mls ? `mls-${mls}` : `addr-${slugify(address)}`,
      },
      0
    );
  });

  return { blockCount: blocks.length, homes, unknownFieldCount };
}

function splitImportBlocks(rawText) {
  const raw = typeof rawText === "string" ? rawText.trim() : "";
  if (!raw) return [];
  ADDRESS_BLOCK_REGEX.lastIndex = 0;
  const matches = [...raw.matchAll(ADDRESS_BLOCK_REGEX)];
  if (!matches.length) return [];
  return matches.map((m, i) => {
    const start = m.index + m[0].length - m[1].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
    const block = raw.slice(start, end).trim();
    const mls = block.match(/MLS\s*#\s*([0-9]+)/i)?.[1]?.trim() ?? null;
    const address = m[1].trim();
    const key = (mls ? `mls-${mls}` : `addr-${slugify(address)}`).toLowerCase();
    return { key, block };
  });
}

function mergeImportRawText(embeddedRaw, localRaw) {
  const embedded = splitImportBlocks(embeddedRaw);
  const local = splitImportBlocks(localRaw);
  if (!local.length) return (embeddedRaw || "").trim();
  const merged = new Map();
  for (const item of local) merged.set(item.key, item.block);
  for (const item of embedded) {
    if (!merged.has(item.key)) merged.set(item.key, item.block);
  }
  return [...merged.values()].join("\n\n").trim();
}

function fmt(n) {
  return (n == null ? "?" : "$" + n.toLocaleString());
}
const gradeColor = (s) => s >= 85 ? "#16a34a" : s >= 80 ? "#22c55e" : s >= 75 ? "#84cc16" : s >= 70 ? "#eab308" : s >= 65 ? "#f59e0b" : "#f97316";
const gradeLabel = (s) => s >= 85 ? "A — Excellent" : s >= 80 ? "A-" : s >= 75 ? "B+" : s >= 70 ? "B" : s >= 65 ? "C+" : "C — Fair";
const interp = (v, pts) => {
  if (!Number.isFinite(v)) return 0;
  const a = [...pts].sort((x, y) => x.value - y.value);
  if (v <= a[0].value) return a[0].score;
  if (v >= a[a.length - 1].value) return a[a.length - 1].score;
  for (let i = 0; i < a.length - 1; i++) {
    const l = a[i];
    const r = a[i + 1];
    if (v >= l.value && v <= r.value) {
      const t = (v - l.value) / (r.value - l.value);
      return l.score + (r.score - l.score) * t;
    }
  }
  return a[a.length - 1].score;
};
const quantile = (sorted, q) => {
  if (!Array.isArray(sorted) || !sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  const t = pos - lo;
  return sorted[lo] * (1 - t) + sorted[hi] * t;
};
const buildRangeContext = (values, opts = {}) => {
  const { minSpread = 1 } = opts;
  const nums = (values || []).map((v) => toNum(v)).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!nums.length) return null;
  const p10 = quantile(nums, 0.1);
  const p90 = quantile(nums, 0.9);
  let low = Number.isFinite(p10) ? p10 : nums[0];
  let high = Number.isFinite(p90) ? p90 : nums[nums.length - 1];
  if (high - low < minSpread) {
    low = nums[0];
    high = nums[nums.length - 1];
  }
  if (!Number.isFinite(low) || !Number.isFinite(high) || high - low < minSpread) return null;
  return { low, high, min: nums[0], max: nums[nums.length - 1] };
};
const scoreFromContext = (value, ctx, opts = {}) => {
  const { lowerBetter = false, minScore = 30, maxScore = 100, gamma = 0.9 } = opts;
  const v = toNum(value);
  const low = ctx?.low;
  const high = ctx?.high;
  if (!Number.isFinite(v) || !Number.isFinite(low) || !Number.isFinite(high) || high <= low) return null;
  let t = Math.max(0, Math.min(1, (v - low) / (high - low)));
  if (lowerBetter) t = 1 - t;
  const eased = Math.pow(t, gamma);
  return +(minScore + eased * (maxScore - minScore)).toFixed(1);
};
const scoreSqftLegacy = (s) => interp(s, [{ value: 1200, score: 30 }, { value: 1500, score: 50 }, { value: 2000, score: 70 }, { value: 2500, score: 85 }, { value: 3000, score: 100 }]);
const scoreSqft = (s, ctx) => scoreFromContext(s, ctx, { lowerBetter: false, minScore: 30, maxScore: 100, gamma: 0.88 }) ?? scoreSqftLegacy(s);
const scoreLotLegacy = (s) => interp(s, [{ value: 3000, score: 45 }, { value: 5000, score: 65 }, { value: 7500, score: 85 }, { value: 10000, score: 100 }]);
const scoreLot = (s, ctx) => scoreFromContext(s, ctx, { lowerBetter: false, minScore: 30, maxScore: 100, gamma: 0.9 }) ?? scoreLotLegacy(s);
const scoreKitchen = (k) => k === "Gourmet" ? 100 : k === "Large" ? 73 : k === "Medium" ? 47 : 20;
const scoreYard = (y) => y === "Excellent" ? 100 : y === "Good" ? 71 : y === "Fair" ? 43 : 15;
const scoreAgeLegacy = (yearBuilt) => {
  const built = Number.isFinite(yearBuilt) ? yearBuilt : null;
  if (built == null) return 50;
  const age = Math.max(0, CURRENT_YEAR - built);
  return interp(age, [
    { value: 0, score: 100 },
    { value: 5, score: 95 },
    { value: 10, score: 85 },
    { value: 20, score: 70 },
    { value: 30, score: 55 },
    { value: 40, score: 40 },
    { value: 60, score: 20 },
  ]);
};
const scoreAge = (yearBuilt, ctx) => {
  const built = Number.isFinite(yearBuilt) ? yearBuilt : null;
  if (built == null) return 50;
  const ageYears = Math.max(0, CURRENT_YEAR - built);
  return scoreFromContext(ageYears, ctx, { lowerBetter: true, minScore: 20, maxScore: 100, gamma: 1 }) ?? scoreAgeLegacy(yearBuilt);
};
const scoreCombinedRating = (greg, bre, ctx) => {
  const raw = ((greg + bre) / 20) * 100;
  // Use full observed min/max (not p10/p90) so top-end homes do not clip to
  // the same 100 score when their underlying combined ratings differ.
  const low = Number.isFinite(ctx?.min) ? ctx.min : ctx?.low;
  const high = Number.isFinite(ctx?.max) ? ctx.max : ctx?.high;
  if (!Number.isFinite(low) || !Number.isFinite(high) || high <= low) return raw;
  const t = Math.max(0, Math.min(1, (raw - low) / (high - low)));
  const eased = Math.pow(t, 0.8);
  return +(20 + eased * 80).toFixed(1);
};
const scoreMonthlyPaymentLegacy = (m) => interp(m, [{ value: 2600, score: 100 }, { value: 2750, score: 95 }, { value: 2900, score: 85 }, { value: 3050, score: 72 }, { value: 3200, score: 58 }, { value: 3400, score: 42 }, { value: 3600, score: 25 }]);
const scoreMonthlyPayment = (m, ctx) => scoreFromContext(m, ctx, { lowerBetter: true, minScore: 20, maxScore: 100, gamma: 0.9 }) ?? scoreMonthlyPaymentLegacy(m);
const estimateMonthlyTotal = (h) => {
  const price = toNum(h?.price);
  const hoa = toNum(h?.hoa) ?? 0;
  const tax = toNum(h?.tax) ?? 0;
  if (!Number.isFinite(price)) return null;
  const loan = Math.max(price - DP, 0);
  const piMo = Math.round(loan * PI_FACTOR);
  const hoaMo = Math.round(hoa / 12);
  const taxMo = Math.round(tax / 12);
  return Math.round(piMo + hoaMo + taxMo);
};
const safePct = (v) => {
  if (!Number.isFinite(v)) return null;
  const normalized = 100 * (1 - (v / SAFETY_INDEX_MAX));
  return +Math.max(0, Math.min(100, normalized)).toFixed(1);
};
const scoreSafety = (h) => {
  if (!SAFETY_SCORING_ENABLED) return null;
  const parts = [
    { value: safePct(h.safetyAssaultIndex), weight: 0.55 },
    { value: safePct(h.safetyBurglaryIndex), weight: 0.15 },
    { value: safePct(h.safetyLarcenyTheftIndex), weight: 0.15 },
    { value: safePct(h.safetyVehicleTheftIndex), weight: 0.15 },
  ].filter((x) => x.value != null);
  if (!parts.length) return 50;
  const totalWeight = parts.reduce((sum, x) => sum + x.weight, 0);
  const weighted = parts.reduce((sum, x) => sum + x.value * x.weight, 0) / totalWeight;
  return +weighted.toFixed(1);
};

const calc = (h, opts = {}) => {
  const { scoreContexts } = opts;
  const loan = Math.max(h.price - DP, 0);
  const piMo = Math.round(loan * PI_FACTOR);
  const hoaMo = Math.round((h.hoa ?? 0) / 12);
  const taxMo = Math.round((h.tax ?? 0) / 12);
  const totalMo = Math.round(piMo + hoaMo + taxMo);
  const sqftScore = scoreSqft(h.sqft, scoreContexts?.sqft);
  const vals = {
    rating: scoreCombinedRating(h.greg, h.bre, scoreContexts?.rating),
    monthlyPayment: scoreMonthlyPayment(totalMo, scoreContexts?.monthly),
    // Size factor now uses total sqft only (PPSF excluded).
    sizeValue: sqftScore,
    sqftScore,
    lot: scoreLot(h.lotSqft, scoreContexts?.lot),
    // Keep backward compatibility with legacy manual condition overrides.
    kitchen: h.kitchenOverride ?? h.conditionOverride ?? scoreKitchen(h.kitchenSize),
    yard: scoreYard(h.yardCondition),
    ageScore: scoreAge(h.built, scoreContexts?.age),
    safety: scoreSafety(h) ?? 0,
  };
  const contributions = Object.fromEntries(Object.entries(EFFECTIVE_W).map(([k, w]) => [k, +((vals[k] ?? 0) * w).toFixed(2)]));
  const weightedTotal = +Object.values(contributions).reduce((a, b) => a + b, 0).toFixed(2);
  const pricePerSqft = Number.isFinite(h.price) && Number.isFinite(h.sqft) && h.sqft > 0 ? h.price / h.sqft : null;
  return { ...h, ...vals, piMo, hoaMo, taxMo, totalMo, pricePerSqft, contributions, weightedTotal, grade: gradeLabel(weightedTotal) };
};

function CardMetric({ label, value }) {
  return <div style={{ background: "#0f172a", borderRadius: 10, padding: "8px 10px" }}><div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase" }}>{label}</div><div style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 700 }}>{value}</div></div>;
}

function ScoreBar({ label, value }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 11, color: "#cbd5e1" }}>{label}</span><span style={{ fontSize: 11, color: gradeColor(value), fontWeight: 700 }}>{value.toFixed(1)}</span></div>
      <div style={{ width: "100%", height: 8, background: "#0f172a", borderRadius: 999 }}><div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: 8, background: gradeColor(value), borderRadius: 999 }} /></div>
    </div>
  );
}

export default function App() {
  const LOCAL_STORAGE_KEY = "homeComp.overrides.v3";
  const LOCAL_IMPORT_STORAGE_KEY = "homeComp.importRaw.v2";
  const EDIT_GROUPS = [
    {
      title: "Identity",
      fields: [
        { key: "name", label: "Address / Name", type: "text" },
        { key: "short", label: "Short Name", type: "text" },
        { key: "status", label: "Status", type: "select", options: ["Considering", "Ruled Out", "Sold"] },
        { key: "photo", label: "Photo URL", type: "text" },
      ],
    },
    {
      title: "Core Pricing / Size",
      fields: [
        { key: "price", label: "Price", type: "number" },
        { key: "pricePerSqft", label: "PPSF", type: "number" },
        { key: "sqft", label: "Sqft", type: "number" },
        { key: "lotSqft", label: "Lot Sqft", type: "number" },
        { key: "built", label: "Year Built", type: "number" },
        { key: "dom", label: "Days On Market", type: "number" },
      ],
    },
    {
      title: "Costs",
      fields: [
        { key: "hoa", label: "HOA (Annual)", type: "number" },
      ],
    },
    {
      title: "Ratings / Preferences",
      fields: [
        { key: "greg", label: "Greg (0-10)", type: "number" },
        { key: "bre", label: "Bre (0-10)", type: "number" },
        { key: "kitchenSize", label: "Kitchen Size", type: "select", options: ["Small", "Medium", "Large", "Gourmet"] },
        { key: "yardCondition", label: "Yard Condition", type: "select", options: ["Poor", "Fair", "Good", "Excellent"] },
      ],
    },
    {
      title: "Safety",
      fields: [
        { key: "safetyNeighborhood", label: "Safety Area", type: "text" },
        { key: "safetyGrade", label: "Safety Grade", type: "text" },
        { key: "safetyAssaultIndex", label: "Assault Index", type: "number" },
        { key: "safetyBurglaryIndex", label: "Burglary Index", type: "number" },
        { key: "safetyLarcenyTheftIndex", label: "Larceny/Theft Index", type: "number" },
        { key: "safetyVehicleTheftIndex", label: "Vehicle Theft Index", type: "number" },
      ],
    },
    {
      title: "Tags / Notes",
      fields: [{ key: "tags", label: "Tags", type: "tags" }],
    },
  ];

  const arraysEqual = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);
  const displayFieldValue = (v) => {
    if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
    if (v == null || v === "") return "—";
    return String(v);
  };

  const [importRawText, setImportRawText] = useState(() => {
    if (typeof window === "undefined") return IMPORT_UNFORMATTED_DATA;
    const fromLocal = window.localStorage.getItem(LOCAL_IMPORT_STORAGE_KEY);
    if (fromLocal != null && fromLocal.trim()) return mergeImportRawText(IMPORT_UNFORMATTED_DATA, fromLocal);
    return IMPORT_UNFORMATTED_DATA;
  });
  const imported = useMemo(() => parseUnformattedHomes(importRawText), [importRawText]);
  const sourceHomes = useMemo(() => {
    const baseline = homesRaw.map((h, i) => ({ ...h, homeId: `base-${i}`, sourceType: "base" }));
    const seenImportedIds = new Map();
    const importedHomes = imported.homes.map((h, i) => {
      const baseKey = slugify(h.sourceKey || h.mlsId || h.name || h.short || `idx-${i}`) || `idx-${i}`;
      const count = seenImportedIds.get(baseKey) ?? 0;
      seenImportedIds.set(baseKey, count + 1);
      const uniqueSuffix = count ? `-${count + 1}` : "";
      return { ...h, homeId: `imported-${baseKey}${uniqueSuffix}`, sourceType: "imported" };
    });
    return [...baseline, ...importedHomes];
  }, [imported]);
  const sourceById = useMemo(() => Object.fromEntries(sourceHomes.map((h) => [h.homeId, h])), [sourceHomes]);

  const [overridesByHomeId, setOverridesByHomeId] = useState(() => {
    if (typeof window === "undefined") return mergeOverrides(APPLIED_UPDATES_BY_HOME_ID, {});
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return mergeOverrides(APPLIED_UPDATES_BY_HOME_ID, {});
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object"
        ? mergeOverrides(APPLIED_UPDATES_BY_HOME_ID, parsed)
        : mergeOverrides(APPLIED_UPDATES_BY_HOME_ID, {});
    } catch {
      return mergeOverrides(APPLIED_UPDATES_BY_HOME_ID, {});
    }
  });
  const [tab, setTab] = useState("overview");
  const [compareA, setCompareA] = useState("0");
  const [compareB, setCompareB] = useState("1");
  const [compareC, setCompareC] = useState(EMPTY);
  const [selectedHomeId, setSelectedHomeId] = useState("");
  const [editorQuery, setEditorQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [overviewSortKey, setOverviewSortKey] = useState(null);
  const [overviewSortDir, setOverviewSortDir] = useState(null);
  const [tagDraft, setTagDraft] = useState("");
  const [editorDraftsByHomeId, setEditorDraftsByHomeId] = useState({});
  const [fieldErrorsByHomeId, setFieldErrorsByHomeId] = useState({});
  const [backupNotice, setBackupNotice] = useState("");
  const restoreBackupInputRef = useRef(null);
  const compareSelectionMigratedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!Object.keys(overridesByHomeId).length) {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
        return;
      }
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(overridesByHomeId));
    } catch {
      // Ignore storage write failures (quota/privacy mode) so UI keeps rendering.
    }
  }, [overridesByHomeId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!importRawText?.trim()) {
        window.localStorage.removeItem(LOCAL_IMPORT_STORAGE_KEY);
        return;
      }
      window.localStorage.setItem(LOCAL_IMPORT_STORAGE_KEY, importRawText);
    } catch {
      // Ignore storage write failures (quota/privacy mode) so UI keeps rendering.
    }
  }, [importRawText]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sourceHomes.length) return;
    try {
      const todayKey = toDateKey(new Date());
      const lastRollKey = window.localStorage.getItem(DOM_ROLL_DATE_KEY);
      if (!lastRollKey) {
        window.localStorage.setItem(DOM_ROLL_DATE_KEY, todayKey);
        return;
      }
      const deltaDays = dayDiff(lastRollKey, todayKey);
      if (deltaDays <= 0) return;

      setOverridesByHomeId((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const home of sourceHomes) {
          const current = next[home.homeId] ?? {};
          const currentDom = toNum(
            Object.prototype.hasOwnProperty.call(current, "dom") ? current.dom : home.dom
          );
          if (currentDom == null) continue;
          const updatedDom = currentDom + deltaDays;
          const sourceDom = toNum(home.dom);
          const nextHome = { ...current, dom: updatedDom };
          if (sourceDom != null && updatedDom === sourceDom) delete nextHome.dom;
          const hasAny = Object.keys(nextHome).length > 0;
          const hadAny = Object.keys(current).length > 0;
          if (hasAny) {
            if (!hadAny || nextHome.dom !== current.dom) changed = true;
            next[home.homeId] = nextHome;
          } else if (hadAny) {
            changed = true;
            delete next[home.homeId];
          }
        }
        return changed ? next : prev;
      });

      window.localStorage.setItem(DOM_ROLL_DATE_KEY, todayKey);
    } catch {
      // Ignore storage failures; DOM auto-rollover is non-critical.
    }
  }, [sourceHomes]);

  const preparedHomes = useMemo(
    () => sourceHomes.map((h, i) => {
      const overrides = overridesByHomeId[h.homeId] ?? {};
      return normalizeHomeRecord({ ...h, ...overrides, _overrideKeys: Object.keys(overrides) }, i);
    }),
    [sourceHomes, overridesByHomeId]
  );
  const scoreContexts = useMemo(() => {
    const active = preparedHomes.filter((h) => !["Ruled Out", "Sold"].includes(h.status));
    const scope = active.length ? active : preparedHomes;
    return {
      rating: buildRangeContext(scope.map((h) => {
        const g = toNum(h?.greg);
        const b = toNum(h?.bre);
        if (!Number.isFinite(g) || !Number.isFinite(b)) return null;
        return ((g + b) / 20) * 100;
      }), { minSpread: 6 }),
      monthly: buildRangeContext(scope.map((h) => estimateMonthlyTotal(h)), { minSpread: 120 }),
      sqft: buildRangeContext(scope.map((h) => h?.sqft), { minSpread: 200 }),
      lot: buildRangeContext(scope.map((h) => h?.lotSqft), { minSpread: 500 }),
      age: buildRangeContext(scope.map((h) => {
        const built = toNum(h?.built);
        return Number.isFinite(built) ? Math.max(0, CURRENT_YEAR - built) : null;
      }), { minSpread: 3 }),
    };
  }, [preparedHomes]);
  const allHomes = useMemo(
    () => preparedHomes.map((h) => calc(h, { scoreContexts })).sort((a, b) => b.weightedTotal - a.weightedTotal),
    [preparedHomes, scoreContexts]
  );
  const homes = useMemo(() => allHomes.filter((h) => !["Ruled Out", "Sold"].includes(h.status)), [allHomes]);
  const dataEntryVisibleHomes = useMemo(
    () => (showHidden ? allHomes : allHomes.filter((h) => !["Ruled Out", "Sold"].includes(h.status))),
    [allHomes, showHidden]
  );

  useEffect(() => {
    if (compareSelectionMigratedRef.current) return;
    if (!homes.length) return;
    const mapLegacySelection = (value, fallbackIndex = null) => {
      if (value === EMPTY) return EMPTY;
      if (homes.some((h) => h.homeId === value)) return value;
      const idx = Number(value);
      if (Number.isInteger(idx) && idx >= 0 && idx < homes.length) return homes[idx].homeId;
      if (Number.isInteger(fallbackIndex) && fallbackIndex >= 0 && fallbackIndex < homes.length) return homes[fallbackIndex].homeId;
      return EMPTY;
    };
    setCompareA((prev) => mapLegacySelection(prev, 0));
    setCompareB((prev) => mapLegacySelection(prev, homes.length > 1 ? 1 : 0));
    setCompareC((prev) => mapLegacySelection(prev, null));
    compareSelectionMigratedRef.current = true;
  }, [homes]);

  useEffect(() => {
    if (!allHomes.length) {
      setSelectedHomeId("");
      return;
    }
    const pool = showHidden ? allHomes : dataEntryVisibleHomes;
    if (!pool.length) {
      setSelectedHomeId("");
      return;
    }
    if (!pool.some((h) => h.homeId === selectedHomeId)) setSelectedHomeId(pool[0].homeId);
  }, [allHomes, dataEntryVisibleHomes, selectedHomeId, showHidden]);

  useEffect(() => {
    setTagDraft("");
  }, [selectedHomeId]);

  const importSummary = useMemo(() => {
    const importedPrepared = preparedHomes.slice(homesRaw.length);
    return {
      blockCount: imported.blockCount,
      importedCount: imported.homes.length,
      unknownFieldCount: imported.unknownFieldCount,
      placeholderFieldCount: importedPrepared.reduce((total, h) => total + getMissingFields(h).length, 0),
    };
  }, [imported, preparedHomes]);

  const selectedHome = dataEntryVisibleHomes.find((h) => h.homeId === selectedHomeId) ?? dataEntryVisibleHomes[0] ?? null;
  const selectedSource = selectedHome ? sourceById[selectedHome.homeId] ?? null : null;
  const selectedOverrides = selectedHome ? overridesByHomeId[selectedHome.homeId] ?? {} : {};
  const selectedDrafts = selectedHome ? editorDraftsByHomeId[selectedHome.homeId] ?? {} : {};
  const selectedErrors = selectedHome ? fieldErrorsByHomeId[selectedHome.homeId] ?? {} : {};

  const filteredEditorHomes = useMemo(() => {
    const q = editorQuery.trim().toLowerCase();
    if (!q) return dataEntryVisibleHomes;
    return dataEntryVisibleHomes.filter((h) => [h.name, h.short, h.status, h.homeId].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
  }, [dataEntryVisibleHomes, editorQuery]);

  const visibleEditGroups = useMemo(() => {
    if (!selectedHome || !showMissingOnly) return EDIT_GROUPS;
    const missingSet = new Set(getMissingFields(selectedHome));
    return EDIT_GROUPS.map((group) => ({ ...group, fields: group.fields.filter((f) => f.key === "tags" || missingSet.has(f.key)) })).filter((group) => group.fields.length);
  }, [EDIT_GROUPS, selectedHome, showMissingOnly]);

  const setFieldError = (homeId, field, message) => {
    setFieldErrorsByHomeId((prev) => {
      const homeErrors = { ...(prev[homeId] ?? {}) };
      if (message) homeErrors[field] = message;
      else delete homeErrors[field];
      const next = { ...prev };
      if (Object.keys(homeErrors).length) next[homeId] = homeErrors;
      else delete next[homeId];
      return next;
    });
  };

  const setDraftValue = (homeId, field, value) => {
    setEditorDraftsByHomeId((prev) => {
      const homeDrafts = { ...(prev[homeId] ?? {}) };
      if (value == null) delete homeDrafts[field];
      else homeDrafts[field] = value;
      const next = { ...prev };
      if (Object.keys(homeDrafts).length) next[homeId] = homeDrafts;
      else delete next[homeId];
      return next;
    });
  };

  const updateOverrideField = (homeId, field, nextValue) => {
    const baseValue = sourceById[homeId]?.[field];
    setOverridesByHomeId((prev) => {
      const currentHome = { ...(prev[homeId] ?? {}) };
      const equal = Array.isArray(nextValue) && Array.isArray(baseValue) ? arraysEqual(nextValue, baseValue) : nextValue === baseValue;
      if (equal) delete currentHome[field];
      else currentHome[field] = nextValue;
      const next = { ...prev };
      if (Object.keys(currentHome).length) next[homeId] = currentHome;
      else delete next[homeId];
      return next;
    });
  };

  const onNumericChange = (homeId, field, raw) => {
    setDraftValue(homeId, field, raw);
    const trimmed = raw.trim();
    if (!trimmed) {
      setFieldError(homeId, field, null);
      updateOverrideField(homeId, field, null);
      return;
    }
    const parsed = toNum(trimmed);
    if (parsed == null) {
      setFieldError(homeId, field, "Enter a valid number");
      return;
    }
    setFieldError(homeId, field, null);
    updateOverrideField(homeId, field, parsed);
  };

  const onNumericBlur = (homeId, field) => {
    const hasError = Boolean(fieldErrorsByHomeId[homeId]?.[field]);
    if (!hasError) setDraftValue(homeId, field, null);
  };

  const onTextChange = (homeId, field, raw) => {
    setFieldError(homeId, field, null);
    updateOverrideField(homeId, field, raw.trim() === "" ? null : raw);
  };

  const addTag = () => {
    if (!selectedHome) return;
    const tag = tagDraft.trim();
    if (!tag) return;
    const current = Array.isArray(selectedHome.tags) ? selectedHome.tags : [];
    if (current.includes(tag)) return;
    updateOverrideField(selectedHome.homeId, "tags", [...current, tag]);
    setTagDraft("");
  };

  const removeTag = (tag) => {
    if (!selectedHome) return;
    const current = Array.isArray(selectedHome.tags) ? selectedHome.tags : [];
    updateOverrideField(
      selectedHome.homeId,
      "tags",
      current.filter((x) => x !== tag)
    );
  };

  const resetSelectedHome = () => {
    if (!selectedHome) return;
    const homeId = selectedHome.homeId;
    setOverridesByHomeId((prev) => {
      const next = { ...prev };
      delete next[homeId];
      return next;
    });
    setEditorDraftsByHomeId((prev) => {
      const next = { ...prev };
      delete next[homeId];
      return next;
    });
    setFieldErrorsByHomeId((prev) => {
      const next = { ...prev };
      delete next[homeId];
      return next;
    });
  };

  const resetAllEdits = () => {
    setOverridesByHomeId(mergeOverrides(APPLIED_UPDATES_BY_HOME_ID, {}));
    setEditorDraftsByHomeId({});
    setFieldErrorsByHomeId({});
    if (typeof window !== "undefined") window.localStorage.removeItem(LOCAL_STORAGE_KEY);
  };
  const setSelectedStatus = (nextStatus) => {
    if (!selectedHome) return;
    updateOverrideField(selectedHome.homeId, "status", nextStatus);
  };

  const clearImportText = () => {
    setImportRawText("");
  };
  const restoreEmbeddedImports = () => {
    setImportRawText((prev) => mergeImportRawText(IMPORT_UNFORMATTED_DATA, prev));
  };
  const downloadBackup = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const homesMerged = sourceHomes.map((home) => ({ ...home, ...(overridesByHomeId[home.homeId] ?? {}) }));
    const payload = {
      schemaVersion: 1,
      exportedAt: now.toISOString(),
      counts: {
        baselineHomes: homesRaw.length,
        importedHomes: imported.homes.length,
        totalHomes: homesMerged.length,
      },
      importRawText,
      overridesByHomeId,
      homes: homesMerged,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `home-comp-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
    setBackupNotice(`Backup saved: ${a.download}`);
  };
  const triggerRestoreBackup = () => {
    restoreBackupInputRef.current?.click();
  };
  const onRestoreBackupFile = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const maybeOverrides = parsed?.overridesByHomeId ?? parsed;
      if (!maybeOverrides || typeof maybeOverrides !== "object" || Array.isArray(maybeOverrides)) {
        throw new Error("Backup file does not contain a valid overrides object.");
      }

      setOverridesByHomeId(mergeOverrides(APPLIED_UPDATES_BY_HOME_ID, maybeOverrides));
      if (typeof parsed?.importRawText === "string" && parsed.importRawText.trim()) {
        setImportRawText(mergeImportRawText(IMPORT_UNFORMATTED_DATA, parsed.importRawText));
      }
      setEditorDraftsByHomeId({});
      setFieldErrorsByHomeId({});
      const restoredCount = Object.keys(maybeOverrides).length;
      setBackupNotice(`Restored ${restoredCount} home override record(s) from ${file.name}.`);
    } catch (err) {
      setBackupNotice(`Restore failed: ${err?.message ?? "Invalid JSON backup file."}`);
    } finally {
      if (e?.target) e.target.value = "";
    }
  };

  const pick = (value, fallback) => {
    if (value === EMPTY) return null;
    return homes.find((h) => h.homeId === value) ?? fallback;
  };
  const overviewAddress = (home) => {
    const raw = String(home?.name ?? "").trim();
    if (!raw) return "Unknown Address";
    // Imported rows already include full city/state/zip in most cases.
    if (/,/.test(raw)) return raw;
    // Baseline rows store street only; show full address format in Overview.
    return `${raw}, Colorado Springs, CO`;
  };
  const overviewColumns = [
    { key: "address", label: "Address", align: "left" },
    { key: "totalMo", label: "Monthly $", align: "right" },
    { key: "weightedTotal", label: "Weighted Total", align: "right" },
    { key: "price", label: "Price", align: "right" },
    { key: "sqft", label: "Sqft", align: "right" },
    { key: "lotSqft", label: "Lot Sqft", align: "right" },
    { key: "greg", label: "Greg", align: "right" },
    { key: "bre", label: "Bre", align: "right" },
    { key: "kitchenSize", label: "Kitchen", align: "left" },
    { key: "yardCondition", label: "Yard", align: "left" },
    { key: "built", label: "Built", align: "right" },
    { key: "dom", label: "DOM", align: "right" },
    { key: "hoa", label: "HOA (Annual)", align: "right" },
    { key: "tax", label: "Tax (Annual)", align: "right" },
    ...(SAFETY_SCORING_ENABLED ? [
      { key: "safetyAssaultIndex", label: "Assault Idx", align: "right" },
      { key: "safetyBurglaryIndex", label: "Burglary Idx", align: "right" },
      { key: "safetyLarcenyTheftIndex", label: "Larceny/Theft Idx", align: "right" },
      { key: "safetyVehicleTheftIndex", label: "Vehicle Theft Idx", align: "right" },
    ] : []),
  ];
  const getOverviewSortValue = (home, key) => {
    switch (key) {
      case "address":
        return overviewAddress(home).toLowerCase();
      case "totalMo":
        return home.totalMo;
      case "weightedTotal":
        return home.weightedTotal;
      case "price":
        return home.price;
      case "sqft":
        return home.sqft;
      case "lotSqft":
        return home.lotSqft;
      case "greg":
        return home.greg;
      case "bre":
        return home.bre;
      case "kitchenSize":
        return home.kitchenSize;
      case "yardCondition":
        return home.yardCondition;
      case "built":
        return home.built;
      case "dom":
        return home.dom;
      case "hoa":
        return home.hoa;
      case "tax":
        return home.tax;
      case "safetyAssaultIndex":
        return home.safetyAssaultIndex;
      case "safetyBurglaryIndex":
        return home.safetyBurglaryIndex;
      case "safetyLarcenyTheftIndex":
        return home.safetyLarcenyTheftIndex;
      case "safetyVehicleTheftIndex":
        return home.safetyVehicleTheftIndex;
      default:
        return null;
    }
  };
  const overviewRows = useMemo(() => {
    const rows = [...homes];
    if (!overviewSortKey || !overviewSortDir) return rows;
    rows.sort((a, b) => {
      const va = getOverviewSortValue(a, overviewSortKey);
      const vb = getOverviewSortValue(b, overviewSortKey);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const isNumA = typeof va === "number" && Number.isFinite(va);
      const isNumB = typeof vb === "number" && Number.isFinite(vb);
      if (isNumA && isNumB) {
        const diff = va - vb;
        return overviewSortDir === "asc" ? diff : -diff;
      }
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: "base" });
      return overviewSortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [homes, overviewSortKey, overviewSortDir]);
  const onOverviewSort = (key) => {
    if (overviewSortKey !== key) {
      setOverviewSortKey(key);
      setOverviewSortDir("desc");
      return;
    }
    if (overviewSortDir === "desc") {
      setOverviewSortDir("asc");
      return;
    }
    if (overviewSortDir === "asc") {
      setOverviewSortKey(null);
      setOverviewSortDir(null);
      return;
    }
    setOverviewSortDir("desc");
  };
  const overviewSortIndicator = (key) => {
    if (overviewSortKey !== key || !overviewSortDir) return "";
    return overviewSortDir === "desc" ? " ▼" : " ▲";
  };
  const renderOverviewMetric = (home, key) => {
    switch (key) {
      case "totalMo":
        return fmt(home.totalMo);
      case "weightedTotal":
        return home.weightedTotal?.toFixed(2) ?? "—";
      case "price":
        return fmt(home.price);
      case "sqft":
        return Number.isFinite(home.sqft) ? home.sqft.toLocaleString() : "—";
      case "lotSqft":
        return Number.isFinite(home.lotSqft) ? home.lotSqft.toLocaleString() : "—";
      case "greg":
        return Number.isFinite(home.greg) ? home.greg.toFixed(1) : "—";
      case "bre":
        return Number.isFinite(home.bre) ? home.bre.toFixed(1) : "—";
      case "kitchenSize":
        return home.kitchenSize ?? "—";
      case "yardCondition":
        return home.yardCondition ?? "—";
      case "built":
        return Number.isFinite(home.built) ? String(home.built) : "—";
      case "dom":
        return Number.isFinite(home.dom) ? String(home.dom) : "—";
      case "hoa":
        return Number.isFinite(home.hoa) ? `$${Math.round(home.hoa).toLocaleString()}` : "—";
      case "tax":
        return Number.isFinite(home.tax) ? `$${home.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
      case "safetyAssaultIndex":
        return Number.isFinite(home.safetyAssaultIndex) ? String(home.safetyAssaultIndex) : "—";
      case "safetyBurglaryIndex":
        return Number.isFinite(home.safetyBurglaryIndex) ? String(home.safetyBurglaryIndex) : "—";
      case "safetyLarcenyTheftIndex":
        return Number.isFinite(home.safetyLarcenyTheftIndex) ? String(home.safetyLarcenyTheftIndex) : "—";
      case "safetyVehicleTheftIndex":
        return Number.isFinite(home.safetyVehicleTheftIndex) ? String(home.safetyVehicleTheftIndex) : "—";
      default:
        return "—";
    }
  };

  const a = pick(compareA, homes[0] ?? null);
  const b = pick(compareB, homes[Math.min(1, Math.max(homes.length - 1, 0))] ?? null);
  const c = pick(compareC, null);
  const rawRadarData = RADAR.map(([key, label]) => ({
    subject: label,
    a: a?.[key] ?? null,
    b: b?.[key] ?? null,
    c: c?.[key] ?? null,
  }));
  const weightedRadarData = RADAR.map(([key, label]) => ({
    subject: `${label} (${((EFFECTIVE_W[key] ?? 0) * 100).toFixed(1)}%)`,
    a: a?.contributions?.[key] ?? null,
    b: b?.contributions?.[key] ?? null,
    c: c?.contributions?.[key] ?? null,
  }));
  const renderVal = (key, v) => {
    if (!SAFETY_SCORING_ENABLED && key === "safety") return "N/A";
    return v == null ? "—" : key === "totalMo" ? fmt(Math.round(v)) : typeof v === "number" ? v.toFixed(key === "weightedTotal" ? 2 : 1) : v;
  };
  const weightsSubtitle = SAFETY_SCORING_ENABLED
    ? "Weights are configured as raw points, then normalized to 100%. Size factor uses total sqft only. Monthly Payment includes P&I, tax, and HOA. Safety uses DoorProfit crime indexes only."
    : "Weights are configured as raw points, then normalized to 100%. Size factor uses total sqft only. Safety and crime scoring is temporarily disabled, so remaining factors are re-normalized.";
  const selectStyle = { width: "100%", background: "#0f172a", color: "#f1f5f9", border: "1px solid #334155", borderRadius: 6, padding: "6px 8px", fontSize: 13 };

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", background: "#0f172a", minHeight: "100vh", color: "#e2e8f0", padding: 16 }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc", marginBottom: 4 }}>🏠 Home Comparison Dashboard</h1>
        <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 16 }}>Monthly payment includes P&amp;I, tax, and HOA · Fountain-area homes are excluded for safety concerns · canvas computes all scores</p>
        {importSummary.blockCount > 0 && <div style={{ background: "#111827", border: "1px solid #334155", borderRadius: 8, padding: "8px 10px", marginBottom: 12, fontSize: 12, color: "#cbd5e1" }}>Parsed {importSummary.importedCount} imported home(s) from {importSummary.blockCount} block(s) · flagged {importSummary.unknownFieldCount} unknown field(s) · flagged {importSummary.placeholderFieldCount} blank field(s)</div>}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {["overview", "data-entry", "compare", "cards", "weights"].map((k) => {
            const label = k === "overview" ? "📊 Overview" : k === "data-entry" ? "🛠️ Data Entry" : k === "compare" ? "⚡ Compare" : k === "cards" ? "🏠 Cards" : "⚖️ Weights";
            return <button key={k} onClick={() => setTab(k)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: tab === k ? "#6366f1" : "#1e293b", color: tab === k ? "#fff" : "#94a3b8" }}>{label}</button>;
          })}
        </div>
        {importSummary.blockCount === 0 && (
          <div style={{ background: "#1f2937", border: "1px solid #f59e0b66", borderRadius: 8, padding: "8px 10px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: "#fcd34d" }}>No imported homes are currently loaded.</div>
            <button onClick={() => setTab("data-entry")} style={{ border: "1px solid #334155", background: "#111827", color: "#e2e8f0", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>Open Data Entry</button>
          </div>
        )}

        {tab === "overview" && <div>
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "#f1f5f9" }}>🏆 Rankings</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 1680 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "8px 6px", color: "#94a3b8", width: 42 }}>#</th>
                    {overviewColumns.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => onOverviewSort(col.key)}
                        style={{ textAlign: col.align, padding: "8px 6px", color: overviewSortKey === col.key ? "#e2e8f0" : "#94a3b8", cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" }}
                        title="Click to sort"
                      >
                        {col.label}{overviewSortIndicator(col.key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overviewRows.map((h, i) => {
                    const missingCount = getMissingFields(h).length;
                    return (
                      <tr key={h.homeId}>
                        <td style={{ padding: "10px 6px", color: "#64748b", borderTop: "1px solid #334155", fontWeight: 700, verticalAlign: "top" }}>#{i + 1}</td>
                        {overviewColumns.map((col) => {
                          if (col.key === "address") {
                            return (
                              <td key={col.key} style={{ padding: "10px 6px", borderTop: "1px solid #334155", verticalAlign: "top", minWidth: 320 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{overviewAddress(h)}</div>
                                {missingCount > 0 && (
                                  <div style={{ marginTop: 2, fontSize: 11, color: "#fbbf24" }}>
                                    Missing {missingCount}: {placeholderSummary(h)}
                                  </div>
                                )}
                              </td>
                            );
                          }
                          const value = renderOverviewMetric(h, col.key);
                          const isWeightedTotal = col.key === "weightedTotal";
                          return (
                            <td
                              key={col.key}
                              style={{
                                padding: "10px 6px",
                                textAlign: col.align,
                                borderTop: "1px solid #334155",
                                color: isWeightedTotal ? gradeColor(h.weightedTotal) : "#e2e8f0",
                                fontWeight: isWeightedTotal ? 800 : 500,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {value}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "#f1f5f9" }}>Weighted Score</h2>
            <ResponsiveContainer width="100%" height={260}><BarChart data={overviewRows} margin={{ top: 0, right: 0, bottom: 50, left: 0 }}><XAxis dataKey="short" tick={{ fill: "#94a3b8", fontSize: 11 }} angle={-35} textAnchor="end" interval={0} height={60} /><YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} /><Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} labelStyle={{ color: "#f1f5f9" }} formatter={(v, n) => [n === "weightedTotal" ? Number(v).toFixed(2) : v, n]} /><Bar dataKey="weightedTotal" radius={[4, 4, 0, 0]}>{overviewRows.map((h, i) => <Cell key={h.homeId} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer>
          </div>
        </div>}

        {tab === "data-entry" && <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,340px) 1fr", gap: 12, alignItems: "start" }}>
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 12, maxHeight: "75vh", overflow: "auto" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>Import Data</div>
            <textarea
              value={importRawText}
              onChange={(e) => setImportRawText(e.target.value)}
              placeholder="Paste unformatted listing blocks here. Imports update live."
              style={{ width: "100%", minHeight: 120, resize: "vertical", background: "#0f172a", color: "#f1f5f9", border: "1px solid #334155", borderRadius: 6, padding: "8px 9px", fontSize: 12, marginBottom: 8 }}
            />
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <button onClick={downloadBackup} style={{ border: "1px solid #334155", background: "#111827", color: "#e2e8f0", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>Download Backup</button>
              <button onClick={triggerRestoreBackup} style={{ border: "1px solid #334155", background: "#111827", color: "#e2e8f0", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>Restore Backup JSON</button>
              <input ref={restoreBackupInputRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={onRestoreBackupFile} />
              <button onClick={restoreEmbeddedImports} style={{ border: "1px solid #334155", background: "#111827", color: "#e2e8f0", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>Use Embedded Imports</button>
              <button onClick={clearImportText} style={{ border: "1px solid #7f1d1d", background: "#3f1d1d", color: "#fecaca", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>Clear Imported Data</button>
            </div>
            {backupNotice && (
              <div style={{ marginBottom: 10, fontSize: 11, color: backupNotice.startsWith("Restore failed") ? "#fca5a5" : "#86efac" }}>
                {backupNotice}
              </div>
            )}
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: "#cbd5e1", marginBottom: 10 }}>
              <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
              Show Hidden (Ruled Out / Sold)
            </label>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>
              Active imports: {importSummary.importedCount} home(s) from {importSummary.blockCount} block(s)
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>Homes</div>
            <input value={editorQuery} onChange={(e) => setEditorQuery(e.target.value)} placeholder="Search address, status, or id" style={{ width: "100%", background: "#0f172a", color: "#f1f5f9", border: "1px solid #334155", borderRadius: 6, padding: "7px 8px", fontSize: 12, marginBottom: 10 }} />
            <div style={{ display: "grid", gap: 8 }}>
              {filteredEditorHomes.map((h) => {
                const active = h.homeId === selectedHome?.homeId;
                const missing = getMissingFields(h).length;
                return (
                  <button key={h.homeId} onClick={() => setSelectedHomeId(h.homeId)} style={{ textAlign: "left", padding: 10, borderRadius: 8, border: active ? "1px solid #818cf8" : "1px solid #334155", background: active ? "#0f172a" : "#111827", color: "#f1f5f9", cursor: "pointer" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{h.name}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8" }}><span>{h.status}</span><span>{h.weightedTotal.toFixed(2)}</span></div>
                    <div style={{ fontSize: 11, color: missing ? "#fbbf24" : "#64748b", marginTop: 4 }}>{missing ? `${missing} blank field(s)` : "No blank fields"}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ background: "#1e293b", borderRadius: 12, padding: 16 }}>
            {!selectedHome && <div style={{ color: "#94a3b8", fontSize: 13 }}>No home selected.</div>}
            {selectedHome && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc" }}>{selectedHome.name}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>{selectedHome.homeId} · Weighted {selectedHome.weightedTotal.toFixed(2)} · {selectedHome.status}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button onClick={downloadBackup} style={{ border: "1px solid #334155", background: "#111827", color: "#e2e8f0", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>Save Backup</button>
                    <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: "#cbd5e1" }}>
                      <input type="checkbox" checked={showMissingOnly} onChange={(e) => setShowMissingOnly(e.target.checked)} />
                      Show only blank/missing fields
                    </label>
                    {selectedHome.status === "Considering" && (
                      <button onClick={() => setSelectedStatus("Ruled Out")} style={{ border: "1px solid #7f1d1d", background: "#3f1d1d", color: "#fecaca", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>Rule Out Home</button>
                    )}
                    {selectedHome.status === "Ruled Out" && (
                      <button onClick={() => setSelectedStatus("Considering")} style={{ border: "1px solid #14532d", background: "#052e16", color: "#bbf7d0", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>Restore Home</button>
                    )}
                    <button onClick={resetSelectedHome} style={{ border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>Reset Selected Home</button>
                    <button onClick={resetAllEdits} style={{ border: "1px solid #7f1d1d", background: "#3f1d1d", color: "#fecaca", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>Reset All Local Edits</button>
                  </div>
                </div>

                {visibleEditGroups.length === 0 && <div style={{ fontSize: 13, color: "#94a3b8" }}>No blank fields left on this home.</div>}
                <div style={{ display: "grid", gap: 14 }}>
                  {visibleEditGroups.map((group) => (
                    <div key={group.title} style={{ border: "1px solid #334155", borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 10 }}>{group.title}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
                        {group.fields.map((field) => {
                          const key = field.key;
                          const currentValue = selectedHome[key];
                          const sourceValue = selectedSource?.[key];
                          const overrideValue = selectedOverrides[key];
                          const hasOverride = Object.prototype.hasOwnProperty.call(selectedOverrides, key);
                          const hasPlaceholder = getMissingFields(selectedHome).includes(key);
                          const error = selectedErrors[key];
                          const draftValue = selectedDrafts[key];
                          let inputValue = "";
                          if (field.type === "number") {
                            if (draftValue != null) inputValue = draftValue;
                            else if (hasOverride) inputValue = overrideValue == null ? "" : String(overrideValue);
                            else inputValue = currentValue == null ? "" : String(currentValue);
                          } else {
                            if (hasOverride) inputValue = overrideValue == null ? "" : String(overrideValue);
                            else inputValue = currentValue ?? "";
                          }

                          if (field.type === "tags") {
                            const tags = Array.isArray(selectedHome.tags) ? selectedHome.tags : [];
                            return (
                              <div key={key} style={{ gridColumn: "1 / -1", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: 10 }}>
                                <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 700, marginBottom: 8 }}>Tags</div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                                  {tags.map((tag) => <button key={tag} onClick={() => removeTag(tag)} style={{ fontSize: 11, color: "#cbd5e1", background: "#111827", border: "1px solid #334155", borderRadius: 999, padding: "3px 8px", cursor: "pointer" }}>{tag} ×</button>)}
                                </div>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} placeholder="Add tag/note" style={{ flex: 1, background: "#111827", color: "#f1f5f9", border: "1px solid #334155", borderRadius: 6, padding: "6px 8px", fontSize: 12 }} />
                                  <button onClick={addTag} style={{ border: "1px solid #334155", background: "#1f2937", color: "#e2e8f0", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>Add</button>
                                </div>
                                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>Base: {displayFieldValue(sourceValue)} · Override: {hasOverride ? displayFieldValue(overrideValue) : "—"}</div>
                              </div>
                            );
                          }

                          return (
                            <div key={key} style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: 10 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <label style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 700 }}>{field.label}</label>
                                {hasPlaceholder && <span style={{ fontSize: 10, color: "#fbbf24", border: "1px solid #fbbf2444", borderRadius: 999, padding: "2px 6px" }}>placeholder</span>}
                              </div>
                              {field.type === "select" && (
                                <select value={inputValue} onChange={(e) => onTextChange(selectedHome.homeId, key, e.target.value)} style={{ width: "100%", background: "#111827", color: "#f1f5f9", border: "1px solid #334155", borderRadius: 6, padding: "6px 8px", fontSize: 12 }}>
                                  <option value="">(clear)</option>
                                  {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                                </select>
                              )}
                              {field.type === "number" && (
                                <input value={inputValue} onChange={(e) => onNumericChange(selectedHome.homeId, key, e.target.value)} onBlur={() => onNumericBlur(selectedHome.homeId, key)} style={{ width: "100%", background: "#111827", color: "#f1f5f9", border: error ? "1px solid #ef4444" : "1px solid #334155", borderRadius: 6, padding: "6px 8px", fontSize: 12 }} />
                              )}
                              {field.type === "text" && (
                                <input value={inputValue} onChange={(e) => onTextChange(selectedHome.homeId, key, e.target.value)} style={{ width: "100%", background: "#111827", color: "#f1f5f9", border: "1px solid #334155", borderRadius: 6, padding: "6px 8px", fontSize: 12 }} />
                              )}
                              {error && <div style={{ fontSize: 11, color: "#fca5a5", marginTop: 4 }}>{error}</div>}
                              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>Base: {displayFieldValue(sourceValue)}</div>
                              <div style={{ fontSize: 11, color: "#94a3b8" }}>Override: {hasOverride ? displayFieldValue(overrideValue) : "—"}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>}

        {tab === "compare" && <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginBottom: 12 }}>
            {[["A", compareA, setCompareA, "#6366f1"], ["B", compareB, setCompareB, "#f59e0b"], ["C", compareC, setCompareC, "#22c55e"]].map(([label, val, setter, color]) => {
              const slotHome = pick(val, null);
              const missingCount = slotHome ? getMissingFields(slotHome).length : 0;
              return (
                <div key={label} style={{ background: "#1e293b", borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 12, color, fontWeight: 700, marginBottom: 6 }}>Home {label}</div>
                  <select value={val} onChange={(e) => setter(e.target.value)} style={selectStyle}>
                    <option value={EMPTY}>Blank</option>
                    {homes.map((h) => <option key={h.homeId} value={h.homeId}>{h.name}</option>)}
                  </select>
                  {slotHome && (
                    <div style={{ marginTop: 8, fontSize: 11, color: missingCount ? "#fbbf24" : "#64748b" }}>
                      {missingCount ? `Missing ${missingCount}: ${placeholderSummary(slotHome)}` : "No missing fields"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 12, marginBottom: 12 }}>
            <div style={{ background: "#1e293b", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 700, marginBottom: 4 }}>Raw Score Radar</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>Each axis uses the raw factor score (0-100).</div>
              <ResponsiveContainer width="100%" height={340}>
                <RadarChart data={rawRadarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => {
                      const n = typeof v === "number" ? v : Number(v);
                      return [Number.isFinite(n) ? n.toFixed(2) : "—", "Raw Score"];
                    }}
                    contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                    labelStyle={{ color: "#f1f5f9" }}
                  />
                  {a && <Radar name={a.short} dataKey="a" stroke="#6366f1" fill="#6366f1" fillOpacity={0.16} />}
                  {b && <Radar name={b.short} dataKey="b" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.14} />}
                  {c && <Radar name={c.short} dataKey="c" stroke="#22c55e" fill="#22c55e" fillOpacity={0.12} />}
                  <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: "#1e293b", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 700, marginBottom: 4 }}>Weighted Impact Radar</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>Each axis uses weighted contribution points (score x effective weight).</div>
              <ResponsiveContainer width="100%" height={340}>
                <RadarChart data={weightedRadarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => {
                      const n = typeof v === "number" ? v : Number(v);
                      return [Number.isFinite(n) ? `${n.toFixed(2)} pts` : "—", "Weighted Impact"];
                    }}
                    contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                    labelStyle={{ color: "#f1f5f9" }}
                  />
                  {a && <Radar name={`${a.short} (pts)`} dataKey="a" stroke="#6366f1" fill="#6366f1" fillOpacity={0.16} />}
                  {b && <Radar name={`${b.short} (pts)`} dataKey="b" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.14} />}
                  {c && <Radar name={`${c.short} (pts)`} dataKey="c" stroke="#22c55e" fill="#22c55e" fillOpacity={0.12} />}
                  <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 16, overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr><th style={{ textAlign: "left", padding: "8px 6px", color: "#94a3b8" }}>Metric</th><th style={{ textAlign: "right", padding: "8px 6px", color: "#818cf8" }}>{a?.short ?? "Blank"}</th><th style={{ textAlign: "right", padding: "8px 6px", color: "#fbbf24" }}>{b?.short ?? "Blank"}</th><th style={{ textAlign: "right", padding: "8px 6px", color: "#86efac" }}>{c?.short ?? "Blank"}</th></tr></thead><tbody>{COMPARE_ROWS.map(([label, key]) => { const vals = [a?.[key], b?.[key], c?.[key]]; const nums = vals.filter((v) => typeof v === "number"); const lower = ["totalMo", "pricePerSqft"].includes(key); const best = nums.length ? (lower ? Math.min(...nums) : Math.max(...nums)) : null; return <tr key={label}><td style={{ padding: "8px 6px", color: "#cbd5e1", borderTop: "1px solid #334155" }}>{label}</td>{vals.map((v, i) => { const active = v != null && best != null && v === best; const color = i === 0 ? "#818cf8" : i === 1 ? "#fbbf24" : "#86efac"; return <td key={i} style={{ padding: "8px 6px", textAlign: "right", borderTop: "1px solid #334155", color: active ? color : "#f1f5f9", fontWeight: active ? 700 : 500 }}>{renderVal(key, v)}</td>; })}</tr>; })}</tbody></table></div>
        </div>}

        {tab === "cards" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
            {homes.map((h, i) => {
              const missingFields = getMissingFields(h);
              return (
                <div key={h.homeId} style={{ background: "#1e293b", borderRadius: 16, padding: 16, boxShadow: "0 8px 20px rgba(0,0,0,.25)", border: `1px solid ${gradeColor(h.weightedTotal)}33` }}>
                  {h.photo ? <div style={IMG_WRAP_STYLE}><img src={h.photo} alt={h.name} style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} onError={(e) => { e.currentTarget.style.display = "none"; const fallback = e.currentTarget.parentElement?.nextSibling; if (fallback && fallback.dataset.fallback === "true") fallback.style.display = "flex"; }} /></div> : null}
                  <div data-fallback="true" style={{ ...NO_PHOTO_STYLE, display: h.photo ? "none" : "flex" }}>NO PHOTO</div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>#{i + 1} RANKED</div>
                      <div style={{ fontSize: 16, color: "#f8fafc", fontWeight: 800, lineHeight: 1.2 }}>{h.short}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{h.name}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: gradeColor(h.weightedTotal) }}>{h.weightedTotal.toFixed(2)}</div>
                      <div style={{ fontSize: 11, color: gradeColor(h.weightedTotal), fontWeight: 700 }}>{h.grade}</div>
                    </div>
                  </div>
                  {missingFields.length > 0 && (
                    <div style={{ marginBottom: 10, padding: "7px 9px", borderRadius: 8, background: "#3f2a12", border: "1px solid #f59e0b55", color: "#fbbf24", fontSize: 11 }}>
                      Missing data: {missingFields.length} field(s) ({placeholderSummary(h, 4)})
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>{CARD_FIELDS(h).map(([label, value]) => <CardMetric key={label} label={label} value={value} />)}</div>
                  <div style={{ marginBottom: 10 }}>{BAR_ROWS.map(([label, key]) => <ScoreBar key={label} label={label} value={h[key]} />)}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 8, borderTop: "1px solid #334155" }}>
                    {missingFields.map((fieldKey) => (
                      <span key={`missing-${fieldKey}`} style={{ fontSize: 11, color: "#fbbf24", background: "#3f2a12", border: "1px solid #f59e0b55", borderRadius: 999, padding: "3px 8px" }}>
                        Missing: {placeholderLabel(fieldKey)}
                      </span>
                    ))}
                    {(h.tags || []).map((tag) => <span key={tag} style={{ fontSize: 11, color: "#cbd5e1", background: "#0f172a", border: "1px solid #334155", borderRadius: 999, padding: "3px 8px" }}>{tag}</span>)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "weights" && <div style={{ background: "#1e293b", borderRadius: 12, padding: 16 }}><h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "#f1f5f9" }}>Scoring Weight Distribution</h2><div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>{weightsSubtitle}</div><ResponsiveContainer width="100%" height={340}><BarChart data={WEIGHTS.map(([key, label, weight]) => ({ key, label, percent: +(weight * 100).toFixed(1) }))} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 80 }}><XAxis type="number" domain={[0, 35]} tick={{ fill: "#64748b", fontSize: 11 }} /><YAxis type="category" dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} width={120} /><Tooltip formatter={(v) => [`${v}%`, "Weight"]} contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} labelStyle={{ color: "#f1f5f9" }} /><Bar dataKey="percent" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>}
      </div>
    </div>
  );
}

