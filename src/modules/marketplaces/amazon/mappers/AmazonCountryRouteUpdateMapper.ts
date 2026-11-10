import { AmazonCountryRouteUpdateDto } from "@/modules/marketplaces/amazon/dtos/AmazonCountryRouteDtos";
import { AmazonCountryRouteValidator } from "@/modules/marketplaces/amazon/services/AmazonCountryRouteValidator";
import { ToUpdateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { Prisma } from "@prisma/client";

export class AmazonCountryRouteUpdateMapper
  implements
    ToUpdateInputMapperI<
      AmazonCountryRouteUpdateDto,
      Prisma.AmazonCountryRouteUncheckedUpdateInput
    >
{
  private validator;

  constructor(validator = new AmazonCountryRouteValidator()) {
    this.validator = validator;
  }

  toUpdateInput(dto: AmazonCountryRouteUpdateDto) {
    return {
      priority: this.validator.validatePriority(dto.priority),
      proxyType: this.validator.validateProxyType(dto.proxyType),
      pdpSource: this.validator.validatePdpSource(dto.pdpSource),
      maxAttempts: this.validator.validateMaxAttempts(dto.maxAttempts),
      updatedAt: new Date(Date.now()),
    };
  }
}
