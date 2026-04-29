import { BrowserRouter, Routes, Route } from "react-router-dom";
import SignIn from "./pages/SignIn";
import CampaignPage from "./pages/CampaignPage";
import SignUp from "./pages/SignUp";
import ResetPassword from "./pages/ResetPassword";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import AidRequestPage from './pages/AidRequestPage';
import CreateRequestPage from './pages/CreateRequestPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SignIn />} />
        <Route path="/campaigns" element={<CampaignPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/requests" element={<AidRequestPage />} />
        <Route path="/create-request" element={<CreateRequestPage />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/reset" element={<ResetPassword />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;