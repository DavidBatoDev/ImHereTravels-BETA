import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth/AuthModal";
import { UserMenu } from "@/components/auth/UserMenu";
import { Menu, X } from "lucide-react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const navItems = [
    { label: "Home", href: "#home", active: true },
    { label: "Destinations", href: "#destinations" },
    { label: "Book Now", href: "#book" },
    ...(user ? [{ label: "Dashboard", href: "/dashboard" }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-pastel">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="font-semibold text-xl tracking-tight">
            <span className="text-primary">ImHere</span>
            <span className="text-foreground">Travels</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <nav className="flex items-center space-x-8">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href.startsWith("/") ? undefined : item.href}
                  onClick={
                    item.href.startsWith("/")
                      ? () => navigate(item.href)
                      : undefined
                  }
                  className={`text-sm font-medium transition-colors relative py-2 cursor-pointer ${
                    item.active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                  {item.active && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </a>
              ))}
            </nav>

            {/* Auth Section */}
            {user ? (
              <UserMenu />
            ) : (
              <Button onClick={() => setIsAuthModalOpen(true)}>Sign In</Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-pastel">
            <nav className="flex flex-col space-y-3">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href.startsWith("/") ? undefined : item.href}
                  onClick={() => {
                    if (item.href.startsWith("/")) {
                      navigate(item.href);
                    }
                    setIsMenuOpen(false);
                  }}
                  className={`text-sm font-medium py-2 cursor-pointer ${
                    item.active
                      ? "text-foreground border-l-2 border-primary pl-3"
                      : "text-muted-foreground hover:text-foreground pl-3"
                  }`}
                >
                  {item.label}
                </a>
              ))}

              {/* Mobile Auth */}
              {user ? (
                <div className="pl-3 pt-2 border-t border-pastel mt-3">
                  <UserMenu />
                </div>
              ) : (
                <Button
                  className="mx-3 mt-3"
                  onClick={() => {
                    setIsAuthModalOpen(true);
                    setIsMenuOpen(false);
                  }}
                >
                  Sign In
                </Button>
              )}
            </nav>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </header>
  );
};

export default Header;
