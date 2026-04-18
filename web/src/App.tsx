import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AddFundsPage from "./pages/AddFundsPage";
import SendMoneyPage from "./pages/SendMoneyPage";
import HistoryPage from "./pages/HistoryPage";
import GroupsPage from "./pages/GroupsPage";
import NotFound from "./pages/NotFound";
import RecurringPage from "./pages/RecurringPage";
import PaymentLinksPage, { PayLinkPage } from "./pages/PaymentLinksPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/add-funds" element={<AddFundsPage />} />
            <Route path="/send" element={<SendMoneyPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/recurring" element={<RecurringPage />} />
            <Route path="/links" element={<PaymentLinksPage />} />
            <Route path="/pay/:token" element={<PayLinkPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
