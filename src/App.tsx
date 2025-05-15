
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";

// Pages
import Index from "./pages/Index";
import Menu from "./pages/Menu";
import MenuItemDetail from "./pages/MenuItemDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import OrderHistory from "./pages/OrderHistory";
import OrdersDashboard from "./pages/OrdersDashboard";
import Admin from "./pages/Admin";
import AdminMergeAccounts from "./pages/AdminMergeAccounts";
import NotFound from "./pages/NotFound";
import ProductsDashboard from "./pages/ProductsDashboard";
import ProductForm from "./pages/ProductForm";
import CategoriesManager from "./pages/CategoriesManager";
import ProductsByCategory from "./pages/ProductsByCategory";
import CustomerOrderHistory from "./pages/CustomerOrderHistory";

function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <AppProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/menu/category/:categoryId" element={<ProductsByCategory />} />
            <Route path="/menu/item/:itemId" element={<MenuItemDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/order-history" element={<OrderHistory />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/merge-accounts" element={<AdminMergeAccounts />} />
            <Route path="/products-dashboard" element={<ProductsDashboard />} />
            <Route path="/products/new" element={<ProductForm />} />
            <Route path="/products/edit/:productId" element={<ProductForm />} />
            <Route path="/orders-dashboard" element={<OrdersDashboard />} />
            <Route path="/categories-manager" element={<CategoriesManager />} />
            <Route path="/admin/customer-orders/:customerId" element={<CustomerOrderHistory />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppProvider>
      </TooltipProvider>
    </BrowserRouter>
  );
}

export default App;
