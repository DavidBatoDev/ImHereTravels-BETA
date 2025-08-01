import Header from '@/components/Header';
import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import DestinationGrid from '@/components/DestinationGrid';
import PaymentPlanTeaser from '@/components/PaymentPlanTeaser';
import WhyChooseUs from '@/components/WhyChooseUs';
import Testimonials from '@/components/Testimonials';
import FAQ from '@/components/FAQ';
import Newsletter from '@/components/Newsletter';
import CTABand from '@/components/CTABand';
import Footer from '@/components/Footer';
import Chatbot from '@/components/ChatBot';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <DestinationGrid />
        <PaymentPlanTeaser />
        <WhyChooseUs />
        <Testimonials />
        <FAQ />
        <Newsletter />
        <CTABand />
        <Chatbot />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
