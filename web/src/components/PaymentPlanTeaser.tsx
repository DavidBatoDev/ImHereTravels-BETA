import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Calculator, DollarSign, Clock } from 'lucide-react';

const PaymentPlanTeaser = () => {
  const [tripCost, setTripCost] = useState(2000);
  const [months, setMonths] = useState([12]);

  const monthlyPayment = Math.round(tripCost / months[0]);
  const totalWithInterest = Math.round(tripCost * 1.05); // 5% total interest
  const interestAmount = totalWithInterest - tripCost;

  return (
    <section id="payment-plan" className="py-20 bg-accent/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Payment Plan Calculator
            </h2>
            <p className="text-lg text-muted-foreground">
              See how affordable your dream trip can be with our flexible payment plans.
            </p>
          </div>

          <div className="bg-card p-8 rounded-2xl shadow-card border border-seafoam-green">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Calculator Inputs */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <Calculator className="h-6 w-6 text-secondary" />
                  <h3 className="text-xl font-semibold text-foreground">
                    Customize Your Plan
                  </h3>
                </div>

                {/* Trip Cost Input */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    Total Trip Cost
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={tripCost}
                      onChange={(e) => setTripCost(Number(e.target.value))}
                      className="pl-10 border-seafoam-green focus:border-secondary"
                      min="500"
                      max="10000"
                      step="100"
                    />
                  </div>
                </div>

                {/* Payment Term Slider */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    Payment Term: {months[0]} months
                  </label>
                  <Slider
                    value={months}
                    onValueChange={setMonths}
                    max={24}
                    min={6}
                    step={3}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>6 months</span>
                    <span>24 months</span>
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="bg-seafoam-green/20 p-6 rounded-xl space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="h-6 w-6 text-secondary" />
                  <h3 className="text-xl font-semibold text-foreground">
                    Your Monthly Plan
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-card rounded-lg">
                    <span className="text-muted-foreground">Monthly Payment</span>
                    <span className="text-2xl font-bold text-secondary">
                      ${monthlyPayment}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-card rounded-lg">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="text-lg font-semibold text-foreground">
                      ${totalWithInterest}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-card rounded-lg">
                    <span className="text-muted-foreground">Interest</span>
                    <span className="text-sm text-accent">
                      ${interestAmount} ({((interestAmount / tripCost) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-seafoam-green">
                  <Button className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                    Start Planning
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PaymentPlanTeaser;