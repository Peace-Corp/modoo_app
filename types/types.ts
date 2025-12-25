


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

export interface Product {
  id: string;
  title: string;
  base_price: number;
  configuration: ProductSide[];
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}