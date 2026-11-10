// NFD leaves ł as a base letter, so it is mapped by hand.
export const normalizeSearchText = (value: string) => {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replaceAll("ł", "l");
};
