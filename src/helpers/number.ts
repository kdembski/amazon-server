export const roundToTwoDecimals = (value: number) =>
  Math.round(value * 100) / 100;

export const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10;

export const addSeparators = (value: number | string) => {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};
