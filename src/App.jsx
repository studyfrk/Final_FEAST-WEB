import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/home" element={<Home />} />
        <Route path="/requests" element={<AidRequests />} />
        <Route path="/aid-requests" element={<AidRequests />} />
        
        {/* Separate routes for the screens */}
        <Route path="/events" element={<CharityEvents />} />
        <Route path="/charity-events" element={<CharityEvents />} /> {/* Added this to match Home.jsx redirects */}
        <Route path="/messages" element={<FEASTMessages />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/appguide" element={<AppGuide />} />
        <Route path="/contactus" element={<ContactUs />} />
        <Route path="/helpfaq" element={<HelpFAQ />} />
        <Route path="/terms" element={<TermsConditions />} />
        <Route path="/notif" element={<NotificationsPage />} />

        {/* Admin Routes with Nested Layout */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="requests" replace />} />
          
          <Route path="requests" element={<RequestPage />} /> 
          <Route path="events" element={<EventsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="logout" element={<SignIn />} />
          <Route path="faqm"  element={<FAQManagement/>} />
          <Route path="logs" element={<Logs />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="funds" element={<DonationFunds />} />
          <Route path="items" element={<DonationItems />} />
        </Route>

        {/* Fallback for undefined routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;