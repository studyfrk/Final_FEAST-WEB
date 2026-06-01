import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";
import AdminLayout from "./components/AdminLayout"; 
import RequestPage from "./pages/RequestPage"; 
import UsersPage from "./pages/UsersPage";
import EventsPage from "./pages/EventsPage"; 
import ForgotPassword from "./pages/ForgotPassword";
import AboutUs from "./pages/AboutUs";
import AidRequests from "./pages/AidRequests"; 
import CharityEvents from "./pages/CharityEvents";
import AppGuide from "./pages/AppGuide";
import ContactUs from "./pages/ContactUs";
import HelpFAQ from "./pages/HelpFAQ";
import TermsConditions from "./pages/TermsConditions";
import FEASTMessages from "./pages/FEASTMessages";
import FAQManagement from "./pages/FAQManagement";
import NotificationsPage from "./pages/NotificationsPage";
import ReportsPage from "./pages/ReportsPage";
import Logs from "./pages/Logs";
import DonationFunds from "./pages/DonationFunds";
import VerifyEmail from "./pages/VerifyEmail";
import DonationItems from "./pages/DonationItems";
import Announcements from "./pages/Announcements";
import EventDocu from "./pages/EventDocu";

//wrappers
import SingleTabEnforcer from "./components/SingleTabEnforcer";
import PublicRoute from "./components/PublicRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import UserLayout from "./components/UserLayout";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Analytics />
      <SpeedInsights />
      <Routes>
        {/* PUBLIC ROUTES - Entirely outside SingleTabEnforcer */}
        <Route path="/" element={<PublicRoute><SignIn /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
        <Route path="/verify-email" element={<PublicRoute><VerifyEmail /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        
        {/* PROTECTED ROUTE WRAPPER */}
        <Route element={<SingleTabEnforcer><Outlet /></SingleTabEnforcer>}>
          
          {/* Protected User Routes */}
          <Route element={<ProtectedRoute><UserLayout /></ProtectedRoute>}>
            <Route path="/home" element={<Home />} />
            <Route path="/requests" element={<AidRequests />} />
            <Route path="/aid-requests" element={<AidRequests />} />
            <Route path="/events" element={<CharityEvents />} />
            <Route path="/charity-events" element={<CharityEvents />} />
            <Route path="/messages" element={<FEASTMessages />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/appguide" element={<AppGuide />} />
            <Route path="/contactus" element={<ContactUs />} />
            <Route path="/helpfaq" element={<HelpFAQ />} />
            <Route path="/terms" element={<TermsConditions />} />
            <Route path="/notif" element={<NotificationsPage />} />
          </Route>

          {/* Protected Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="users" replace />} />
            <Route path="requests" element={<RequestPage />} /> 
            <Route path="events" element={<EventsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="logout" element={<SignIn />} />
            <Route path="faqm"  element={<FAQManagement/>} />
            <Route path="logs" element={<Logs />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="funds" element={<DonationFunds />} />
            <Route path="items" element={<DonationItems />} />
            <Route path="announcement" element={<Announcements />} />
            <Route path="eventdocu" element={<EventDocu />} />
          </Route>

        </Route>

        {/* Fallback for undefined routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;