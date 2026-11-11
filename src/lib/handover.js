export const HANDOVER_OPTIONS = [
  {
    value: "local_pickup",
    label: "Local pickup — coordinate a meeting",
  },
  {
    value: "seller_delivery",
    label: "Self-arranged delivery by the seller",
  },
  {
    value: "seller_choice",
    label: "Seller chooses pickup or delivery",
  },
  {
    value: "custom",
    label: "Custom arrangement",
  },
];

export const getHandoverLabel = (value) =>
  HANDOVER_OPTIONS.find((option) => option.value === value)?.label ||
  "Not selected";
