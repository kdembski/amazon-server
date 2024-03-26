import {
  OlxProductAdCreateDto,
  isOlxProductAdCreateDtoWithProductId,
} from "@/dtos/olx/OlxProductAdDtos";
import { ToCreateInputMapperI } from "@/interfaces/crud/CRUDMapper";
import { OlxProductCreateMapper } from "@/mappers/olx/OlxProductCreateMapper";
import { Prisma } from "@prisma/client";

export class OlxProductAdCreateMapper
  implements
    ToCreateInputMapperI<OlxProductAdCreateDto, Prisma.OlxProductAdCreateInput>
{
  toCreateInput(dto: OlxProductAdCreateDto) {
    const productMapper = new OlxProductCreateMapper();

    // Shared input for both with and without productId cases
    const shared = {
      ad: { connect: { id: dto.adId } },
      createdAt: new Date(Date.now()),
      updatedAt: new Date(Date.now()),
    };

    // Mapping from dto with productId
    if (isOlxProductAdCreateDtoWithProductId(dto)) {
      return {
        product: { connect: { id: dto.productId } },
        ...shared,
      };
    }

    // Mapping from dto with productBrand and productModel
    return {
      product: {
        connectOrCreate: {
          where: {
            brand_model: { brand: dto.productBrand, model: dto.productModel },
          },
          create: productMapper.toCreateInput({
            brand: dto.productBrand,
            model: dto.productModel,
          }),
        },
      },
      ...shared,
    };
  }
}
