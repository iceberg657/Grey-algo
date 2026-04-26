
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  TrendingUp, 
  Shield, 
  ChevronRight, 
  Check, 
  Layout, 
  MousePointer2, 
  BarChart3,
  Cpu
} from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: () => void;
  userName?: string;
}

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to the Future of Trading',
    description: 'GreyAlpha uses advanced neural networks to find market inefficiencies before they happen.',
    icon: <Cpu className="w-12 h-12 text-emerald-400" />,
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2832&auto=format&fit=crop'
  },
  {
    id: 'profile',
    title: 'Personalize Your Neural Engine',
    description: 'Tell us your trading style so we can tune the signal sensitivity to your specific goals.',
    icon: <Zap className="w-12 h-12 text-yellow-400" />,
    options: [
      { id: 'scalper', label: 'Scalper', desc: '1-5 min charts, high frequency', icon: <TrendingUp className="w-4 h-4" /> },
      { id: 'daytrader', label: 'Day Trader', desc: '15m-1h charts, daily targets', icon: <BarChart3 className="w-4 h-4" /> },
      { id: 'swing', label: 'Swing Trader', desc: '4h-Daily charts, multi-day holds', icon: <Layout className="w-4 h-4" /> }
    ]
  },
  {
    id: 'safety',
    title: 'Risk-First Mentality',
    description: 'Every recommendation includes a precise Stop Loss and Take Profit calculated by our volatility engine.',
    icon: <Shield className="w-12 h-12 text-blue-400" />,
    image: 'https://images.unsplash.com/photo-1642388691910-332906df0e87?q=80&w=2670&auto=format&fit=crop'
  },
  {
    id: 'final',
    title: 'Your Dashboard is Ready',
    description: 'You are now connected to the GreyAlpha neural link. Start generating high-probability signals immediately.',
    icon: <Check className="w-12 h-12 text-emerald-500" />,
    image: 'https://images.unsplash.com/photo-1611974714451-b844ca944d18?q=80&w=2670&auto=format&fit=crop'
  }
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, userName }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const step = steps[currentStep];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        layout
        className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row"
      >
        {/* Left Side: Visual Content */}
        <div className="w-full md:w-1/2 relative bg-slate-800 min-h-[300px] md:min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0"
            >
              {step.image ? (
                <>
                  <img 
                    src={step.image} 
                    alt="Illustration" 
                    className="w-full h-full object-cover opacity-60 mix-blend-overlay"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800/50">
                   <div className="relative">
                      <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
                      {step.icon}
                   </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="absolute bottom-8 left-8 right-8">
            <div className="flex gap-2">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-emerald-400' : 'w-2 bg-white/20'}`} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Informational Content */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-between">
          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
              >
                <div className="mb-6 inline-flex p-3 bg-slate-800 rounded-2xl border border-white/5">
                  {step.icon}
                </div>
                <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
                  {currentStep === 0 && userName ? `Hi ${userName}, ` : ''}{step.title}
                </h2>
                <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                  {step.description}
                </p>

                {step.options && (
                  <div className="space-y-3 mb-8">
                    {step.options.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setSelectedStyle(opt.id)}
                        className={`w-full p-4 rounded-2xl border transition-all flex items-start gap-4 text-left ${
                          selectedStyle === opt.id 
                            ? 'bg-emerald-500/10 border-emerald-500 text-white' 
                            : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-white/10 hover:bg-slate-800'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${selectedStyle === opt.id ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                          {opt.icon}
                        </div>
                        <div>
                          <div className="font-bold">{opt.label}</div>
                          <div className="text-xs opacity-60 text-slate-500">{opt.desc}</div>
                        </div>
                        {selectedStyle === opt.id && (
                          <div className="ml-auto">
                            <Check className="w-5 h-5 text-emerald-400" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between mt-8">
            <button
              onClick={onComplete}
              className="text-slate-500 text-sm font-medium hover:text-white transition-colors"
            >
              Skip Intro
            </button>
            <button
              onClick={handleNext}
              disabled={step.id === 'profile' && !selectedStyle}
              className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all ${
                step.id === 'profile' && !selectedStyle 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
              }`}
            >
              {currentStep === steps.length - 1 ? 'Go to Terminal' : 'Proceed'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
