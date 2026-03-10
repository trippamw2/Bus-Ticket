import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import Footer from "@/components/Footer";

const Index = () => (
  <div className="min-h-screen flex flex-col">
    <HeroSection />
    <FeaturesSection />
    <div className="flex-1" />
    <Footer />
  </div>
);

export default Index;
