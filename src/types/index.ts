export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  addresses: Address[];
  orderHistory: Order[];
}

export interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  available: boolean;
  popular?: boolean;
  allergies?: string[];
  options?: MenuItemOption[];
}

export interface MenuItemOption {
  name: string;
  choices: {
    name: string;
    price: number;
  }[];
  required: boolean;
  multiSelect: boolean;
}

// Define the new SelectedOptionsType
export type SelectedOptionsType = {
  [optionName: string]: string[] | string;
};

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  selectedOptions?: SelectedOptionsType; // MODIFIED to use the named type
  specialInstructions?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  status: OrderStatus;
  total: number;
  createdAt: Date;
  estimatedDeliveryTime?: Date;
  address: Address; 
  paymentMethod: string;
  tip?: number;
  tableNumber?: string; 
}

export enum OrderStatus {
  NEW = "new",
  CONFIRMED = "confirmed",
  MAKE = "make",
  READY = "ready",
  DELIVERED = "delivered",
  PAID = "paid",
  CANCELLED = "cancelled",
}

export interface RestaurantInfo {
  name: string;
  description: string;
  logo: string;
  coverImage: string;
  address: Address;
  phone: string;
  email: string;
  hours: {
    [day: string]: {
      open: string;
      close: string;
    }
  };
  rating: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}
