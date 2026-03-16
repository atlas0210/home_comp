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
      { key: "masterBedSqft", label: "Master Bed Sqft", type: "number" },
      { key: "built", label: "Year Built", type: "number" },
      { key: "dom", label: "Days On Market", type: "number" },
    ],
  },
  {
    title: "Costs",
    fields: [{ key: "hoa", label: "HOA (Monthly, auto-converts)", type: "number" }],
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

const DEFAULT_EDITABLE_KEYS = [
  "name",
  "short",
  "status",
  "photo",
  "price",
  "pricePerSqft",
  "sqft",
  "masterBedSqft",
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

const PLACEHOLDER_FIELD_LABELS = {
  price: 'Price',
  sqft: 'Sqft',
  masterBedSqft: 'Master Bed Sqft',
  lotSqft: 'Lot Sqft',
  built: 'Year Built',
  dom: 'Days on Market',
  hoa: 'HOA (Monthly Input)',
  tax: 'Annual Taxes',
  greg: 'Greg Rating',
  bre: 'Bre Rating',
  kitchenSize: 'Kitchen Size',
  yardCondition: 'Yard Condition',
  safetyAssaultIndex: 'Assault Index',
  safetyBurglaryIndex: 'Burglary Index',
  safetyLarcenyTheftIndex: 'Larceny/Theft Index',
  safetyVehicleTheftIndex: 'Vehicle Theft Index',
};

export {
  EDIT_GROUPS,
  DEFAULT_EDITABLE_KEYS,
  STATUS_VALUES,
  KITCHEN_VALUES,
  YARD_VALUES,
  PLACEHOLDER_FIELD_LABELS,
};
