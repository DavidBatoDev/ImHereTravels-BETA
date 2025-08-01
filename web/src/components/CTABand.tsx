import { Button } from '@/components/ui/button';
import { ArrowRight, Plane } from 'lucide-react';

const CTABand = () => {
  return (
    <section id="book" className="py-16 bg-primary">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6">
            <Plane className="h-8 w-8 text-white" />
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready for Your Next Adventure?
          </h2>
          
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Don't let budget constraints hold you back. Start planning your dream getaway today 
            with flexible payment options that work for your lifestyle.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg"
              className="bg-white text-primary hover:bg-white/95 h-14 px-8 text-lg font-semibold shadow-lg"
            >
              <ArrowRight className="h-5 w-5 mr-2" />
              Start Booking Now
            </Button>
            
            <Button 
              variant="ghost"
              size="lg"
              className="text-white border-white hover:bg-white/10 h-14 px-8 text-lg"
            >
              Explore Destinations
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 pt-8 border-t border-white/20">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">0%</div>
              <div className="text-sm text-white/80">Down Payment</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">5 min</div>
              <div className="text-sm text-white/80">Approval Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">24/7</div>
              <div className="text-sm text-white/80">Support</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">100%</div>
              <div className="text-sm text-white/80">Secure</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTABand;