import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, MapPin, Users, Search } from 'lucide-react';
import heroBackground from '@/assets/hero-background.jpg';

const Hero = () => {
  const [searchData, setSearchData] = useState({
    destination: '',
    checkIn: '',
    checkOut: '',
    guests: ''
  });

  const handleSearch = () => {
    console.log('Search:', searchData);
  };

  return (
    <section id="home" className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Background with gradient overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        <div className="absolute inset-0 gradient-hero opacity-70"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
              Dream Destinations,
              <br />
              <span className="text-accent">Easy Payments</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Reserve your perfect getaway today and pay in bite-size monthly installments. 
              Stress-free booking, unforgettable adventures.
            </p>
          </div>

          {/* Search Bar */}
          <div className="bg-card/95 backdrop-blur-sm p-6 rounded-2xl shadow-soft border border-pastel max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Destination */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Where to?
                </label>
                <Input
                  placeholder="Search destinations"
                  value={searchData.destination}
                  onChange={(e) => setSearchData({...searchData, destination: e.target.value})}
                  className="border-pastel focus:border-primary"
                />
              </div>

              {/* Check-in */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-secondary" />
                  Check-in
                </label>
                <Input
                  type="date"
                  value={searchData.checkIn}
                  onChange={(e) => setSearchData({...searchData, checkIn: e.target.value})}
                  className="border-pastel focus:border-secondary"
                />
              </div>

              {/* Check-out */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-secondary" />
                  Check-out
                </label>
                <Input
                  type="date"
                  value={searchData.checkOut}
                  onChange={(e) => setSearchData({...searchData, checkOut: e.target.value})}
                  className="border-pastel focus:border-secondary"
                />
              </div>

              {/* Guests */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent" />
                  Guests
                </label>
                <Input
                  type="number"
                  placeholder="2"
                  min="1"
                  value={searchData.guests}
                  onChange={(e) => setSearchData({...searchData, guests: e.target.value})}
                  className="border-pastel focus:border-accent"
                />
              </div>
            </div>

            <Button 
              onClick={handleSearch}
              className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 h-auto"
              size="lg"
            >
              <Search className="h-5 w-5 mr-2" />
              Search Adventures
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;