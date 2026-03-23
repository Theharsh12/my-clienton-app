import { Navigate } from "react-router-dom";

// Root "/" redirects to landing page.
// Auth.tsx handles further redirect to /clients if user is already logged in.
const Index = () => {
  return <Navigate to="/landing" replace />;
};

export default Index;
