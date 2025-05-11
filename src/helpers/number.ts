import _ from "lodash";

export const roundToOneDecimal = (value?: number) => {
  return !_.isNil(value) ? (Math.round(value * 10) / 10).toFixed(1) : "-";
};

export const roundToTwoDecimals = (value?: number) => {
  return !_.isNil(value) ? (Math.round(value * 100) / 100).toFixed(2) : "-";
};

export const addSeparators = (value: number | string) => {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

export const calculateAvg = (values?: number[]) => {
  if (!values?.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
};
