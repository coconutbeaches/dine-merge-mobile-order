
import { MenuItem, RestaurantInfo, Category, OrderStatus } from '../types';

export const restaurantInfo: RestaurantInfo = {
  name: "Bella Cucina",
  description: "Authentic Italian cuisine with a modern twist",
  logo: "/placeholder.svg",
  coverImage: "/placeholder.svg",
  address: {
    id: "rest-address-1",
    street: "123 Main Street",
    city: "Foodville",
    state: "NY",
    zipCode: "10001",
    isDefault: true
  },
  phone: "(555) 123-4567",
  email: "info@bellacucina.com",
  hours: {
    monday: { open: "11:00", close: "22:00" },
    tuesday: { open: "11:00", close: "22:00" },
    wednesday: { open: "11:00", close: "22:00" },
    thursday: { open: "11:00", close: "22:00" },
    friday: { open: "11:00", close: "23:00" },
    saturday: { open: "11:00", close: "23:00" },
    sunday: { open: "12:00", close: "21:00" }
  },
  rating: 4.7
};

export const categories: Category[] = [
  {
    id: "cat-1",
    name: "Appetizers",
    description: "Start your meal with these delicious options"
  },
  {
    id: "cat-2",
    name: "Pasta",
    description: "Handmade pasta with authentic Italian sauces"
  },
  {
    id: "cat-3",
    name: "Pizza",
    description: "Wood-fired pizzas with premium toppings"
  },
  {
    id: "cat-4",
    name: "Main Courses",
    description: "Hearty Italian classics"
  },
  {
    id: "cat-5",
    name: "Desserts",
    description: "Sweet treats to end your meal"
  },
  {
    id: "cat-6",
    name: "Drinks",
    description: "Beverages to complement your food"
  }
];

export const menuItems: MenuItem[] = [
  // Appetizers
  {
    id: "item-1",
    name: "Bruschetta",
    description: "Toasted bread topped with diced tomatoes, fresh basil, garlic, and olive oil",
    price: 8.99,
    image: "/placeholder.svg",
    category: "cat-1",
    available: true,
    popular: true
  },
  {
    id: "item-2",
    name: "Caprese Salad",
    description: "Fresh mozzarella, tomatoes, and basil drizzled with balsamic glaze",
    price: 10.99,
    image: "/placeholder.svg",
    category: "cat-1",
    available: true,
    allergies: ["dairy"]
  },

  // Pasta
  {
    id: "item-3",
    name: "Spaghetti Carbonara",
    description: "Classic carbonara with pancetta, egg, parmesan, and black pepper",
    price: 15.99,
    image: "/placeholder.svg",
    category: "cat-2",
    available: true,
    popular: true,
    allergies: ["dairy", "eggs", "gluten"],
    options: [
      {
        name: "Pasta Type",
        choices: [
          { name: "Spaghetti", price: 0 },
          { name: "Fettuccine", price: 0 },
          { name: "Gluten-Free", price: 2 }
        ],
        required: true,
        multiSelect: false
      }
    ]
  },
  {
    id: "item-4",
    name: "Fettuccine Alfredo",
    description: "Fettuccine pasta in a rich and creamy parmesan sauce",
    price: 14.99,
    image: "/placeholder.svg",
    category: "cat-2",
    available: true,
    allergies: ["dairy", "gluten"],
    options: [
      {
        name: "Protein Add-ons",
        choices: [
          { name: "Grilled Chicken", price: 4 },
          { name: "Shrimp", price: 5 },
          { name: "None", price: 0 }
        ],
        required: true,
        multiSelect: false
      }
    ]
  },

  // Pizza
  {
    id: "item-5",
    name: "Margherita Pizza",
    description: "Classic pizza with tomato sauce, mozzarella, and fresh basil",
    price: 13.99,
    image: "/placeholder.svg",
    category: "cat-3",
    available: true,
    popular: true,
    allergies: ["dairy", "gluten"],
    options: [
      {
        name: "Size",
        choices: [
          { name: "10\"", price: 0 },
          { name: "14\"", price: 4 },
          { name: "16\"", price: 6 }
        ],
        required: true,
        multiSelect: false
      },
      {
        name: "Crust",
        choices: [
          { name: "Thin", price: 0 },
          { name: "Regular", price: 0 },
          { name: "Deep Dish", price: 2 }
        ],
        required: true,
        multiSelect: false
      }
    ]
  },

  // Main Courses
  {
    id: "item-6",
    name: "Chicken Parmigiana",
    description: "Breaded chicken topped with marinara sauce and melted mozzarella, served with pasta",
    price: 18.99,
    image: "/placeholder.svg",
    category: "cat-4",
    available: true,
    allergies: ["dairy", "gluten"]
  },

  // Desserts
  {
    id: "item-7",
    name: "Tiramisu",
    description: "Classic Italian dessert with layers of coffee-soaked ladyfingers and mascarpone cream",
    price: 7.99,
    image: "/placeholder.svg",
    category: "cat-5",
    available: true,
    popular: true,
    allergies: ["dairy", "eggs", "gluten"]
  },

  // Drinks
  {
    id: "item-8",
    name: "Italian Soda",
    description: "Refreshing soda with your choice of syrup flavor",
    price: 3.99,
    image: "/placeholder.svg",
    category: "cat-6",
    available: true,
    options: [
      {
        name: "Flavor",
        choices: [
          { name: "Cherry", price: 0 },
          { name: "Raspberry", price: 0 },
          { name: "Vanilla", price: 0 },
          { name: "Blood Orange", price: 0 }
        ],
        required: true,
        multiSelect: false
      },
      {
        name: "Size",
        choices: [
          { name: "Regular", price: 0 },
          { name: "Large", price: 1 }
        ],
        required: true,
        multiSelect: false
      }
    ]
  }
];

// Removed mock users and mock orders
