
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import HomePage from "./HomePage";
import IntroPage from "./IntroPage";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is authenticated, show the home page
  // If not authenticated, show intro page
  return user ? <HomePage /> : <IntroPage />;
};

export default Index;
