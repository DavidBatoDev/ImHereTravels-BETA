import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Newsletter = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Welcome aboard! ✈️",
        description: "You'll be the first to know about exclusive deals and new destinations.",
      });
      setEmail('');
      setIsLoading(false);
    }, 1000);
  };

  return (
    <section className="py-20 bg-soft-white">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card p-8 md:p-12 rounded-2xl shadow-card border border-seafoam-green text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-seafoam-green/20 rounded-full mb-6">
              <Mail className="h-8 w-8 text-secondary" />
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Never Miss a Deal
            </h2>
            
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Get exclusive access to flash sales, new destinations, and travel tips. 
              Plus, receive a <span className="font-semibold text-secondary">$50 credit</span> when you sign up!
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 border-seafoam-green focus:border-secondary h-12"
                />
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground h-12 px-6 whitespace-nowrap"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Subscribing...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Subscribe
                    </div>
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                By subscribing, you agree to receive marketing emails. Unsubscribe anytime.
              </p>
            </form>

            {/* Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-muted">
              <div className="text-center">
                <div className="text-sm font-medium text-foreground">Exclusive Deals</div>
                <div className="text-xs text-muted-foreground">Up to 40% off</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-foreground">Early Access</div>
                <div className="text-xs text-muted-foreground">New destinations</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-foreground">Travel Tips</div>
                <div className="text-xs text-muted-foreground">Expert advice</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;