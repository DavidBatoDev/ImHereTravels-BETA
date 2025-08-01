import { Star, Quote } from 'lucide-react';

const Testimonials = () => {
  const testimonials = [
    {
      id: 1,
      name: 'David The Rock',
      location: 'San Francisco, CA',
      rating: 5,
      text: "ImHereTravels made my dream vacation to the Maldives possible! The monthly payment plan was perfect for my budget, and the booking process was seamless.",
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face'
    },
    {
      id: 2,
      name: 'JC GAN',
      location: 'Austin, TX',
      rating: 5,
      text: "Finally took that European adventure I'd been dreaming about. The payment flexibility gave me peace of mind, and the customer service was outstanding throughout.",
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face'
    },
    {
      id: 3,
      name: 'Clark Kent',
      location: 'Portland, OR',
      rating: 5,
      text: "The curated experiences were incredible! Every detail was perfectly planned, and splitting the cost over 12 months made it so much more affordable.",
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face'
    }
  ];

  return (
    <section className="py-20 bg-soft-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            What Our Travelers Say
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real stories from real travelers who've experienced the joy of stress-free booking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div 
              key={testimonial.id}
              className="bg-card p-8 rounded-2xl shadow-card border border-pastel relative group hover:shadow-hover transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Quote icon */}
              <div className="absolute top-6 right-6 text-muted opacity-20">
                <Quote className="h-8 w-8" />
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Testimonial text */}
              <blockquote className="text-foreground leading-relaxed mb-6 relative z-10">
                "{testimonial.text}"
              </blockquote>

              {/* Author info */}
              <div className="flex items-center gap-4">
                <img 
                  src={testimonial.avatar} 
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-muted"
                />
                <div>
                  <div className="font-semibold text-foreground">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.location}</div>
                </div>
              </div>

              {/* Pastel divider */}
              <div className="absolute bottom-0 left-8 right-8 h-0.5 bg-gradient-to-r from-primary via-secondary to-accent opacity-30"></div>
            </div>
          ))}
        </div>

        {/* Additional social proof */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">4.9/5 on Trustpilot</span>
            </div>
            <div className="w-px h-6 bg-border"></div>
            <div className="font-medium">2,500+ Reviews</div>
            <div className="w-px h-6 bg-border"></div>
            <div className="font-medium">98% Satisfaction Rate</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;