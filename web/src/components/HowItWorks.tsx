import { Search, Calendar, CreditCard } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      icon: Search,
      title: 'Find Your Adventure',
      description: 'Browse our curated destinations and find the perfect getaway that matches your dreams and budget.',
      color: 'text-primary'
    },
    {
      icon: Calendar,
      title: 'Book Instantly',
      description: 'Reserve your trip with just a few clicks. No waiting, no complicated processes, just simple booking.',
      color: 'text-secondary'
    },
    {
      icon: CreditCard,
      title: 'Pay Monthly',
      description: 'Split your payment into manageable monthly installments. Travel now, pay comfortably over time.',
      color: 'text-accent'
    }
  ];

  return (
    <section className="py-20 bg-soft-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to your dream vacation. We've made travel booking as easy as it should be.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <div 
              key={step.title}
              className="bg-card p-8 rounded-2xl shadow-card border border-pastel text-center group hover:shadow-hover transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6 ${step.color} group-hover:scale-110 transition-transform duration-300`}>
                <step.icon className="h-8 w-8" />
              </div>
              
              <h3 className="text-xl font-semibold text-foreground mb-4">
                {step.title}
              </h3>
              
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>
              
              {/* Step number */}
              <div className="mt-6 text-sm font-medium text-muted-foreground">
                Step {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;