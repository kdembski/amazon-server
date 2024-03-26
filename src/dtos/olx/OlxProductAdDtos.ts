export type OlxProductAdCreateDto =
  | OlxProductAdCreateDtoWithProductId
  | OlxProductAdCreateDtoWithoutProductId;

type OlxProductAdCreateDtoWithProductId = {
  productId: number;
  adId: number;
};

type OlxProductAdCreateDtoWithoutProductId = {
  productBrand: string;
  productModel: string;
  adId: number;
};

export const isOlxProductAdCreateDtoWithProductId = (
  dto: OlxProductAdCreateDto
): dto is OlxProductAdCreateDtoWithProductId =>
  !!(dto as OlxProductAdCreateDtoWithProductId).productId;

export interface OlxProductAdUpdateDto {
  productId: number;
  adId: number;
}
