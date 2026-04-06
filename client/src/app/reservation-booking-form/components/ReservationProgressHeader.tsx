import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

type ReservationProgressHeaderProps = {
  step: number;
  completedSteps: number[];
  canPreviewStep3: boolean;
  progressValue: number;
  stepDescription: string;
  howItWorksExpanded: boolean;
  onToggleHowItWorks: () => void;
  onGoStep1: () => void;
  onGoStep2: () => void;
  onGoStep3: () => void;
};

export default function ReservationProgressHeader({
  step,
  completedSteps,
  canPreviewStep3,
  progressValue,
  stepDescription,
  howItWorksExpanded,
  onToggleHowItWorks,
  onGoStep1,
  onGoStep2,
  onGoStep3,
}: ReservationProgressHeaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Keep SSR and first client render identical to avoid hydration mismatches.
  const reducedMotion = hasMounted ? Boolean(prefersReducedMotion) : false;

  return (
    <div className="mb-1 lg:mb-0">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <h2
            id="reservation-form-title"
            className="text-2xl sm:text-3xl font-hk-grotesk font-bold text-white mb-1"
          >
            Reserve your tour spot
          </h2>
          <div className="min-h-[46px] sm:min-h-[52px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={`step-copy-${step}-${stepDescription}`}
                initial={
                  reducedMotion
                    ? { opacity: 1, y: 0, filter: "blur(0px)" }
                    : { opacity: 0, y: 10, filter: "blur(4px)" }
                }
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={
                  reducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: -10, filter: "blur(4px)" }
                }
                transition={{
                  duration: reducedMotion ? 0 : 0.36,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="text-sm sm:text-base text-white/90 mb-0.5 leading-relaxed font-medium"
              >
                {stepDescription}
              </motion.p>
            </AnimatePresence>
          </div>
          <p className="text-xs sm:text-sm text-white/80 flex items-center gap-1 font-medium">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Takes about 3-5 minutes
          </p>
        </div>
      </div>

      <div className="relative w-full bg-white/20 backdrop-blur-sm rounded-full h-2.5 overflow-hidden shadow-inner border border-white/40">
        <motion.div
          key={`step-progress-flash-${step}`}
          className="pointer-events-none absolute inset-0 rounded-full"
          initial={{ opacity: reducedMotion ? 0 : 0.85, scaleX: 0.94 }}
          animate={{ opacity: 0, scaleX: 1.06 }}
          transition={{
            duration: reducedMotion ? 0 : 0.68,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0) 100%)",
          }}
        />

        <motion.div
          className="h-full bg-white rounded-full shadow-lg relative overflow-hidden"
          initial={false}
          animate={{ width: `${progressValue}%` }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 150, damping: 18, mass: 0.82 }
          }
        >
          <motion.div
            className="absolute inset-0 opacity-45"
            style={{
              backgroundImage:
                "repeating-linear-gradient(120deg, rgba(239,51,64,0) 0px, rgba(239,51,64,0) 10px, rgba(239,51,64,0.22) 10px, rgba(239,51,64,0.22) 16px)",
            }}
            animate={
              reducedMotion
                ? { opacity: 0, backgroundPosition: "0px 0px" }
                : { opacity: 0.45, backgroundPosition: ["0px 0px", "64px 0px"] }
            }
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 2.35, repeat: Infinity, ease: "linear" }
            }
          />

          <motion.div
            className="absolute inset-0 rounded-full"
            animate={
              reducedMotion
                ? { opacity: 0.55, scale: 1 }
                : {
                    opacity: [0.42, 0.98, 0.42],
                    scale: [1, 1.04, 1],
                    filter: [
                      "saturate(1) brightness(1)",
                      "saturate(1.2) brightness(1.12)",
                      "saturate(1) brightness(1)",
                    ],
                  }
            }
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 2.1, repeat: Infinity, ease: "easeInOut" }
            }
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.42), transparent 62%)",
            }}
          />
          <motion.div
            className="absolute inset-y-0 -left-1/2 w-1/2"
            animate={
              reducedMotion
                ? { opacity: 0, x: "0%" }
                : { opacity: 1, x: ["-120%", "315%"] }
            }
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 2.45, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }
            }
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(239,51,64,0) 0%, rgba(239,51,64,0.56) 48%, rgba(239,51,64,0) 100%)",
            }}
          />
        </motion.div>

        <motion.div
          className="pointer-events-none absolute inset-0 rounded-full border border-white/45"
          animate={reducedMotion ? { opacity: 0.35 } : { opacity: [0.28, 0.72, 0.28] }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
          }
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3 text-sm">
        <button
          type="button"
          onClick={onGoStep1}
          className="flex items-center gap-1.5 sm:gap-2 transition-all duration-200 hover:opacity-80 cursor-pointer group"
        >
          <div
            className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 ${
              step === 1
                ? "bg-white text-[#EF3340] shadow-lg scale-110 ring-2 ring-white/50"
                : completedSteps.includes(1)
                  ? "bg-white/30 text-white shadow-md group-hover:scale-105 ring-2 ring-white/20"
                  : "bg-white/20 text-white/90 group-hover:scale-105"
            }`}
          >
            {completedSteps.includes(1) && step !== 1 ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              "1"
            )}
          </div>
          <div
            className={`hidden sm:block font-semibold ${
              step === 1
                ? "text-white"
                : "text-white/75"
            }`}
          >
            Personal & Booking
          </div>
          <div
            className={`sm:hidden font-semibold ${
              step === 1
                ? "text-white"
                : "text-white/75"
            }`}
          >
            Personal
          </div>
        </button>

        <button
          type="button"
          onClick={onGoStep2}
          disabled={!completedSteps.includes(1)}
          className={`flex items-center gap-1.5 sm:gap-2 transition-all duration-200 group ${
            !completedSteps.includes(1)
              ? "opacity-50 cursor-not-allowed"
              : "hover:opacity-80 cursor-pointer"
          }`}
        >
          <div
            className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 ${
              step === 2
                ? "bg-white text-[#EF3340] shadow-lg scale-110 ring-2 ring-white/50"
                : completedSteps.includes(2)
                  ? "bg-white/30 text-white shadow-md group-hover:scale-105 ring-2 ring-white/20"
                  : step === 1
                    ? "bg-white/20 text-white/75"
                    : "bg-white/20 text-white/90 group-hover:scale-105"
            }`}
          >
            {completedSteps.includes(2) && step !== 2 ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              "2"
            )}
          </div>
          <div
            className={`font-semibold ${
              step === 2
                ? "text-white"
                : "text-white/75"
            }`}
          >
            Payment
          </div>
        </button>

        <button
          type="button"
          onClick={onGoStep3}
          disabled={!canPreviewStep3}
          className={`flex items-center gap-1.5 sm:gap-2 transition-all duration-200 group ${
            !canPreviewStep3
              ? "opacity-50 cursor-not-allowed"
              : "hover:opacity-80 cursor-pointer"
          }`}
        >
          <div
            className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 ${
              step === 3
                ? "bg-white text-[#EF3340] shadow-lg scale-110 ring-2 ring-white/50"
                : !canPreviewStep3
                  ? "bg-white/20 text-white/75"
                  : "bg-white/20 text-white/90 group-hover:scale-105"
            }`}
          >
            3
          </div>
          <div
            className={`hidden sm:block font-semibold ${
              step === 3
                ? "text-white"
                : "text-white/75"
            }`}
          >
            Payment plan
          </div>
          <div
            className={`sm:hidden font-semibold ${
              step === 3
                ? "text-white"
                : "text-white/75"
            }`}
          >
            Plan
          </div>
        </button>
      </div>

      {/* <div className="mt-6 rounded-2xl bg-card border border-sunglow-yellow/20 dark:border-crimson-red/30 shadow-lg dark:shadow-xl overflow-hidden transition-all duration-300 hover:border-crimson-red hover:shadow-crimson-red/20 hover:shadow-xl">
        <button
          onClick={onToggleHowItWorks}
          className="w-full p-6 flex items-center gap-4 hover:bg-muted/50 dark:hover:bg-white/5 transition-colors duration-200"
        >
          <div className="p-3 rounded-xl bg-crimson-red/10 flex-shrink-0 shadow-sm">
            <svg
              className="w-5 h-5 text-crimson-red"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <h4 className="font-bold text-foreground text-lg">How it works</h4>
            <AnimatePresence mode="wait">
              {!howItWorksExpanded && (
                <motion.p
                  key="subtitle"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm text-foreground/70 font-medium mt-0.5"
                >
                  {stepDescription}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <motion.svg
            animate={{ rotate: howItWorksExpanded ? 180 : 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="w-5 h-5 text-foreground/70 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </motion.svg>
        </button>

        <AnimatePresence initial={false}>
          {howItWorksExpanded && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: "hidden" }}
            >
              <motion.div
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                exit={{ y: -20 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="px-6 pb-6 pt-2"
              >
                <ul className="text-sm text-foreground/90 space-y-2.5">
                  {[
                    "Fill in your personal details and select your tour name",
                    "Pay a small reservation fee to secure your spot",
                    "Pick a payment plan from a list of available options for your tour date",
                  ].map((text, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ x: -20, opacity: 0, scale: 0.95 }}
                      animate={{ x: 0, opacity: 1, scale: 1 }}
                      exit={{ x: -20, opacity: 0, scale: 0.95 }}
                      transition={{
                        duration: 0.4,
                        delay: idx * 0.1,
                        ease: [0.4, 0, 0.2, 1],
                      }}
                      className="flex items-center gap-3"
                    >
                      <motion.span
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: -180 }}
                        transition={{
                          duration: 0.5,
                          delay: idx * 0.1 + 0.1,
                          ease: [0.68, -0.55, 0.265, 1.55],
                        }}
                        className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-crimson-red to-crimson-red/90 text-white text-xs font-bold flex items-center justify-center shadow-sm"
                      >
                        {idx + 1}
                      </motion.span>
                      <span className="text-foreground/90">{text}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div> */}
    </div>
  );
}
