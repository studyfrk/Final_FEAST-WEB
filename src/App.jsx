import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ResetPassword from "./pages/ResetPassword";
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";
import AdminLayout from "./components/AdminLayout"; 
import RequestPage from "./pages/RequestPage"; 
import UsersPage from "./pages/UsersPage";
import EventsPage from "./pages/EventsPage"; 
import MessagesPage from "./pages/MessagesPage";
import ForgotPassword from "./pages/ForgotPassword";
import AboutUs from "./pages/AboutUs";

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/reset" element={<ResetPassword />} />
        <Route path="/home" element={<Home />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/about" element={<AboutUs />} />

        {/* Admin Routes with Nested Layout */}
        <Route path="/admin" element={<AdminLayout />}>
          {/* Automatically redirect /admin to /admin/overview */}
          <Route index element={<Navigate to="overview" replace />} />
          
          <Route path="overview" element={<div>Overview Content</div>} />
          <Route path="requests" element={<RequestPage />} /> 
          <Route path="events" element={<EventsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="logout" element={<SignIn />} />

          
          <Route path="p1" element={<div>Placeholder 1 Content</div>} />
          <Route path="p2" element={<div>Placeholder 2 Content</div>} />
          <Route path="reports" element={<div>Reports & Logs Content</div>} />
        </Route>

        {/* Fallback for undefined routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;