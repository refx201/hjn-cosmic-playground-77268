import { useNavigate } from "react-router-dom";
import { DatabaseHeroCarousel } from "@/components/DatabaseHeroCarousel";
import { SEOHead } from "@/components/SEOHead";
import { StatBoxesSection } from "@/components/home/StatBoxesSection";
import { CustomerTestimonials } from "@/components/CustomerTestimonials";

const Index = () => {
  const navigate = useNavigate();
  return (
    <>
      <SEOHead page="home" />
      <main>
        <DatabaseHeroCarousel onNavigate={(path) => navigate(`/${path}`)} />
        <StatBoxesSection />
        <CustomerTestimonials />
      </main>
    </>
  );
};

export default Index;
