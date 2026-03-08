import { FaqSection } from "@/components/landing/faq-section";
import { FeatureCards } from "@/components/landing/feature-cards";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingFooter } from "@/components/landing/landing-footer";
import { SocialProof } from "@/components/landing/social-proof";

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <FeatureCards />
      <HowItWorks />
      <FaqSection />
      <SocialProof />
      <LandingFooter />
    </>
  );
}
