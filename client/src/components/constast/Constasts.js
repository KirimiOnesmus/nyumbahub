export const UNIT_TYPES = [
  { key: "single", label: "Single" },
  { key: "bedsitter", label: "Bedsitter" },
  { key: "studio", label: "Studio" },
  { key: "shop", label: "Shop" },
  { key: "oneBedroom", label: "1 Bedroom" },
  { key: "twoBedroom", label: "2 Bedroom" },
  { key: "threeBedroom", label: "3 Bedroom" },
  { key: "fourBedroomPlus", label: "4+ Bedroom" },
];

export const UNIT_TYPE_LABELS = UNIT_TYPES.reduce((acc, t) => {
  acc[t.key] = t.label;
  return acc;
}, {});

export const formatCurrency = (value) =>
  `KES ${Number(value).toLocaleString("en-KE")}`;

export const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
