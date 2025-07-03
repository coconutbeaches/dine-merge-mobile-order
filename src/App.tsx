import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppContextProvider from "./context/AppContextProvider";
import ScrollToTop from "./components/layout/ScrollToTop";
import AuthRedirect from "./components/AuthRedirect";

// Pages
import Index from "./pages/Index";
import MenuItemDetail from "./pages/MenuItemDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword"; 
import ResetPassword from "./pages/ResetPassword";   
import Profile from "./pages/Profile";
import OrderHistory from "./pages/OrderHistory";
import OrdersDashboard from "./pages/OrdersDashboard";
import OrdersOverTime from "./pages/OrdersOverTime";
import OrdersOverTimeChart from "./pages/admin/analytics/OrdersOverTimeChart";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import ProductsDashboard from "./pages/ProductsDashboard";
import ProductForm from "./pages/ProductForm";
import CategoriesManager from "./pages/CategoriesManager";
import ProductsByCategory from "./pages/ProductsByCategory";
import CustomerOrderHistory from "./pages/CustomerOrderHistory";
import ProtectedAdminRoute from "./components/layout/ProtectedAdminRoute"; 
import AdminOrderDetail from "./pages/AdminOrderDetail";
import CustomersDashboard from "./pages/CustomersDashboard";
import ProductOrders from './pages/admin/ProductOrders';
import Register from './pages/Register';

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <TooltipProvider>
        <AppContextProvider>
          <Toaster />
          <Sonner />
          <AuthRedirect>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/menu" element={<Index />} />
            <Route path="/menu/category/:categoryId" element={<ProductsByCategory />} />
            <Route path="/menu/item/:id" element={<MenuItemDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-confirmation" element={<OrderConfirmation />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/order-history" element={<OrderHistory />} />
              <Route path="/register" element={<Register />} />

            {/* Admin Protected Routes */}
            <Route element={<ProtectedAdminRoute />}>
              <Route path="/admin" element={<Admin />} />
              <Route path="/orders-dashboard" element={<OrdersDashboard />} />
              <Route path="/products-dashboard" element={<ProductsDashboard />} />
              <Route path="/products/new" element={<ProductForm />} />
              <Route path="/products/edit/:id" element={<ProductForm />} />
              <Route path="/admin/analytics/orders-over-time" element={<OrdersOverTimeChart />} />
              <Route path="/admin/orders/:orderId" element={<AdminOrderDetail />} />
              <Route path="/categories-manager" element={<CategoriesManager />} />
              <Route path="/admin/customer-orders/:customerId" element={<CustomerOrderHistory />} />
              <Route path="/customers-dashboard" element={<CustomersDashboard />} />
              <Route path="/admin/product-orders/:productId" element={<ProductOrders />} />
            </Route>

            <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthRedirect>
        </AppContextProvider>
      </TooltipProvider>
    </BrowserRouter>
  );
}

export default App;
