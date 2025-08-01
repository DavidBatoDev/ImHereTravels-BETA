import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'How do the monthly payment plans work?',
      answer: 'You can split your trip cost into 6-24 monthly payments with competitive rates. Simply choose your preferred term during booking, and we\'ll handle the rest. No hidden fees, just transparent pricing.'
    },
    {
      question: 'Is there a credit check required?',
      answer: 'We perform a soft credit check that won\'t affect your credit score. This helps us offer you the best payment terms available. Most travelers are approved instantly.'
    },
    {
      question: 'What happens if I need to cancel my trip?',
      answer: 'We understand plans change. You can cancel up to 48 hours before departure with our flexible cancellation policy. Refunds are processed according to our terms, and any remaining payments are adjusted accordingly.'
    },
    {
      question: 'Are there any additional fees?',
      answer: 'We believe in transparent pricing. The only additional cost is a small financing fee (typically 3-8% APR) spread across your payment term. No hidden charges, no surprises.'
    },
    {
      question: 'Can I pay off my trip early?',
      answer: 'Absolutely! You can pay off your remaining balance at any time with no early payment penalties. This can also reduce your total interest paid.'
    },
    {
      question: 'What if I miss a payment?',
      answer: 'We\'ll send you friendly reminders before any payment is due. If you miss a payment, contact our support team immediately. We offer grace periods and can work with you to adjust your payment schedule.'
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about our payment plans and booking process.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="bg-card rounded-xl shadow-card border border-pastel overflow-hidden"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-muted/30 transition-colors duration-200"
                >
                  <h3 className="font-semibold text-foreground pr-4">
                    {faq.question}
                  </h3>
                  <ChevronDown 
                    className={`h-5 w-5 text-primary transition-transform duration-300 flex-shrink-0 ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                
                {openIndex === index && (
                  <div className="px-6 pb-5 animate-fade-in">
                    <div className="pt-2 border-t border-muted">
                      <p className="text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              Still have questions?
            </p>
            <button className="text-primary hover:text-primary/80 font-medium transition-colors">
              Contact our support team →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;