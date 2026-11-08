import { Decimal } from "@prisma/client/runtime/library";
import _ from "lodash";

export class NumberFormatter {
  // A missing value is shown as "-"
  static round(value: number | Decimal | undefined, decimals: number) {
    const number = typeof value === "number" ? value : value?.toNumber();
    if (_.isNil(number)) return "-";

    const factor = 10 ** decimals;
    return (Math.round(number * factor) / factor).toFixed(decimals);
  }

  static addSeparators(value: number | string) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }
}
