import { Star, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import tropicalImage from '@/assets/destination-tropical.jpg';
import mountainsImage from '@/assets/destination-mountains.jpg';
import cityImage from '@/assets/destination-city.jpg';

const DestinationGrid = () => {
  const destinations = [
    {
      id: 1,
      name: 'Tropical Paradise',
      location: 'Maldives',
      image: tropicalImage,
      price: 2499,
      monthlyPrice: 208,
      rating: 4.9,
      reviews: 324,
      description: 'Crystal clear waters and pristine white beaches await you in this slice of paradise.'
    },
    {
      id: 2,
      name: 'Mountain Retreat',
      location: 'Swiss Alps',
      image: mountainsImage,
      price: 1899,
      monthlyPrice: 158,
      rating: 4.8,
      reviews: 257,
      description: 'Breathtaking alpine views and cozy chalets in the heart of the Swiss mountains.'
    },
    {
      id: 3,
      name: 'Historic Charm',
      location: 'Prague, Czech Republic',
      image: cityImage,
      price: 1299,
      monthlyPrice: 108,
      rating: 4.7,
      reviews: 412,
      description: 'Explore medieval architecture and rich culture in this enchanting European city.'
    }
  ];

  return (
    <section id="destinations" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Popular Destinations
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover our most loved getaways, each offering unique experiences and easy payment plans.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {destinations.map((destination, index) => (
            <div 
              key={destination.id}
              className="bg-card rounded-2xl shadow-card border border-pastel overflow-hidden group hover:shadow-hover hover:-translate-y-1 transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Image */}
              <div className="relative overflow-hidden">
                <img 
                  src={destination.image} 
                  alt={destination.name}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4 bg-card/90 backdrop-blur-sm px-3 py-1 rounded-full">
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{destination.rating}</span>
                    <span className="text-muted-foreground">({destination.reviews})</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{destination.location}</span>
                </div>

                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {destination.name}
                </h3>

                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {destination.description}
                </p>

                {/* Pricing */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-foreground">
                      ${destination.price}
                    </span>
                    <span className="text-muted-foreground">total</span>
                  </div>
                  <div className="bg-secondary/20 p-3 rounded-lg">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">${destination.monthlyPrice}/month</span>
                      <span className="text-muted-foreground"> for 12 months</span>
                    </p>
                  </div>
                </div>

                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  Book Now
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button variant="outline" size="lg" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            View All Destinations
          </Button>
        </div>
      </div>
    </section>
  );
};

export default DestinationGrid;