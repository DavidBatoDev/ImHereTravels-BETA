import { Check, Shield, Clock, Heart, Star, Headphones } from 'lucide-react';

const WhyChooseUs = () => {
  const features = [
    {
      icon: Check,
      title: 'Instant Booking Confirmation',
      description: 'Secure your dream trip immediately with instant confirmation and protection.'
    },
    {
      icon: Shield,
      title: 'Safe & Secure Payments',
      description: 'Bank-level security and fraud protection for all your transactions.'
    },
    {
      icon: Clock,
      title: 'Flexible Payment Terms',
      description: 'Choose from 6 to 24 months with competitive rates and no hidden fees.'
    },
    {
      icon: Heart,
      title: 'Curated Experiences',
      description: 'Hand-picked destinations and experiences by our travel experts.'
    },
    {
      icon: Headphones,
      title: '24/7 Customer Support',
      description: 'Round-the-clock assistance for all your travel needs and questions.'
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Choose ImHereTravels?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We've designed every aspect of our service to make travel planning effortless and affordable.
            </p>
          </div>

          <div className="space-y-6">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="flex items-start gap-6 p-6 bg-card rounded-xl shadow-card border border-pastel hover:shadow-hover transition-all duration-300 group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex-shrink-0 w-12 h-12 bg-seafoam-green/20 rounded-lg flex items-center justify-center group-hover:bg-seafoam-green/30 transition-colors duration-300">
                  <feature.icon className="h-6 w-6 text-secondary" />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="flex-shrink-0 text-secondary opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                  <Check className="h-5 w-5" />
                </div>
              </div>
            ))}
          </div>

          {/* Trust indicators */}
          <div className="mt-16 text-center">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-primary">50K+</div>
                <div className="text-sm text-muted-foreground">Happy Travelers</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-secondary">4.9★</div>
                <div className="text-sm text-muted-foreground">Average Rating</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-accent">200+</div>
                <div className="text-sm text-muted-foreground">Destinations</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-primary">24/7</div>
                <div className="text-sm text-muted-foreground">Support</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;