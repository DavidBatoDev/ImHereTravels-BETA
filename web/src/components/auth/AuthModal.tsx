import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LoginForm } from "./LoginForm";
import { SignUpForm } from "./SignUpForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

type AuthMode = "login" | "signup" | "forgot-password";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: AuthMode;
}

export const AuthModal = ({
  isOpen,
  onClose,
  defaultMode = "login",
}: AuthModalProps) => {
  const [mode, setMode] = useState<AuthMode>(defaultMode);

  const handleClose = () => {
    onClose();
    // Reset to login mode when modal closes
    setTimeout(() => setMode("login"), 200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md border-0 p-0">
        {mode === "login" && (
          <LoginForm
            onToggleMode={() => setMode("signup")}
            onForgotPassword={() => setMode("forgot-password")}
          />
        )}

        {mode === "signup" && (
          <SignUpForm onToggleMode={() => setMode("login")} />
        )}

        {mode === "forgot-password" && (
          <ForgotPasswordForm onBack={() => setMode("login")} />
        )}
      </DialogContent>
    </Dialog>
  );
};
