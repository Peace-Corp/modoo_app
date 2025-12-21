


export interface ProductSide { 
  id: string;
  name: string;
  imageUrl: string;
  printArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  }
}

export interface ProductConfig {
  productId: string;
  sides: ProductSide[];
}