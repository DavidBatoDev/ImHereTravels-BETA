import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  const socialIcons = [
    { icon: Facebook, href: '#', color: 'text-primary' },
    { icon: Twitter, href: '#', color: 'text-sky-blue' },
    { icon: Instagram, href: '#', color: 'text-accent' },
    { icon: Linkedin, href: '#', color: 'text-secondary' }
  ];

  const quickLinks = [
    'How It Works',
    'Destinations',
    'Payment Plans',
    'Travel Insurance',
    'Gift Cards'
  ];

  const supportLinks = [
    'Help Center',
    'Contact Us',
    'Track Your Trip',
    'Manage Booking',
    'Travel Updates'
  ];

  const legalLinks = [
    'Privacy Policy',
    'Terms of Service',
    'Cookie Policy',
    'Refund Policy'
  ];

  return (
    <footer className="bg-soft-white border-t border-muted">
      <div className="container mx-auto px-4">
        {/* Main footer content */}
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company info */}
            <div className="space-y-6">
              <div>
                <div className="font-bold text-2xl tracking-tight mb-3">
                  <span className="text-primary">ImHere</span>
                  <span className="text-foreground">Travels</span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Making dream destinations accessible through flexible payment plans. 
                  Travel now, pay comfortably over time.
                </p>
              </div>

              {/* Contact info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 text-primary" />
                  hello@imheretravels.com
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 text-secondary" />
                  1-800-TRAVELS
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-accent" />
                  NCR National Capital Region, Philippines
                </div>
              </div>

              {/* Social icons */}
              <div className="flex items-center gap-4">
                {socialIcons.map((social, index) => (
                  <a
                    key={index}
                    href={social.href}
                    className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors ${social.color} hover:scale-110 transform transition-transform duration-200`}
                  >
                    <social.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-foreground mb-6">Quick Links</h4>
              <ul className="space-y-3">
                {quickLinks.map((link) => (
                  <li key={link}>
                    <a 
                      href="#" 
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold text-foreground mb-6">Support</h4>
              <ul className="space-y-3">
                {supportLinks.map((link) => (
                  <li key={link}>
                    <a 
                      href="#" 
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter signup */}
            <div>
              <h4 className="font-semibold text-foreground mb-6">Stay Updated</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Get travel inspiration and exclusive deals delivered to your inbox.
              </p>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Your email"
                  className="w-full px-4 py-2 text-sm border border-muted rounded-lg focus:outline-none focus:border-primary bg-card"
                />
                <button className="w-full bg-primary text-primary-foreground py-2 text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-muted">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              © 2024 ImHereTravels. All rights reserved.
            </div>
            
            <div className="flex items-center gap-6">
              {legalLinks.map((link, index) => (
                <a
                  key={link}
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;