import { AmazonCountryRouteCreateDto } from "@/modules/marketplaces/amazon/dtos/AmazonCountryRouteDtos";
import { AmazonCountryRouteValidator } from "@/modules/marketplaces/amazon/services/AmazonCountryRouteValidator";
import { ToCreateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { Prisma } from "@prisma/client";

export class AmazonCountryRouteCreateMapper
  implements
    ToCreateInputMapperI<
      AmazonCountryRouteCreateDto,
      Prisma.AmazonCountryRouteUncheckedCreateInput
    >
{
  private validator;

  constructor(validator = new AmazonCountryRouteValidator()) {
    this.validator = validator;
  }

  toCreateInput(dto: AmazonCountryRouteCreateDto) {
    return {
      countryId: this.validator.validateCountryId(dto.countryId),
      priority: this.validator.validatePriority(dto.priority),
      proxyType: this.validator.validateProxyType(dto.proxyType),
      pdpSource: this.validator.validatePdpSource(dto.pdpSource),
      maxAttempts: this.validator.validateMaxAttempts(dto.maxAttempts),
      createdAt: new Date(Date.now()),
      updatedAt: new Date(Date.now()),
    };
  }
}
