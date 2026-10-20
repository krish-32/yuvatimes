import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import ProductItems from "./pages/ProductItems";
import Pos from "./pages/POS";
import Sales from "./pages/Sales";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import NetworkStatus from "./components/NetworkStatus";
import ToastContainer from "./components/ToastContainer";
import FloatingCartBar from "./components/FloatingCartBar";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/queryClient";

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <NetworkStatus />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="inventory" element={<ErrorBoundary><Inventory /></ErrorBoundary>} />
              <Route path="inventory/products/:id" element={<ErrorBoundary><ProductItems /></ErrorBoundary>} />
              <Route path="pos" element={<ErrorBoundary><Pos /></ErrorBoundary>} />
              <Route path="sales" element={<ErrorBoundary><Sales /></ErrorBoundary>} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          <FloatingCartBar />
        </BrowserRouter>
        <ToastContainer />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
