// NFD leaves ł as a base letter, so it is mapped by hand.
export const normalizeSearchText = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replaceAll("ł", "l");
