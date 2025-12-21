


export interface ProductSide { 
  id: string;
  name: string;
  imageUrl: string;
}

export interface ProductConfig {
  productId: string;
  sides: ProductSide[];
}