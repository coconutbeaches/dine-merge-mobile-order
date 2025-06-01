
export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
  menuItem?: {
    id: string;
    name: string;
    description: string;
    price: number;
    image: string;
    category: string;
    available: boolean;
    popular?: boolean;
    allergies?: string[];
  };
  selectedOptions?: {
    [optionName: string]: string[] | string;
  };
  specialInstructions?: string;
}
