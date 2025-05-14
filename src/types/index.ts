export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;  // Changed from optional to required
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

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  selectedOptions?: {
    [optionName: string]: string[] | string;
  };
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
}

export enum OrderStatus {
  NEW = "new",
  CONFIRMED = "confirmed",
  MAKE = "make",
  READY = "ready",
  DELIVERED = "delivered",
  PAID = "paid",
  CANCELLED = "cancelled",
  PENDING = "pending" // Keep for backward compatibility
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
