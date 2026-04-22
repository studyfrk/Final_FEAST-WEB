import { Routes, Route } from "react-router-dom";
import SignIn from "./pages/SignIn";
import CampaignPage from "./pages/CampaignPage";
import SignUp from "./pages/SignUp";
import ResetPassword from "./pages/ResetPassword";

function App() {
  return (
    <Routes>
      <Route path="/" element={<SignIn />} />
      <Route path="/campaigns" element={<CampaignPage />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/reset" element={<ResetPassword />} />
    </Routes>
  );
}

export default App;