import React, { useEffect, useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { motion } from 'framer-motion';
import './SplashScreen.css';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const loadingSteps = [
    'Initializing AI Engine...',
    'Loading Vector Database...',
    'Preparing RAG Pipeline...',
    'Ready to Assist!'
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentStep < loadingSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        setTimeout(onFinish, 800);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentStep, onFinish]);

  return (
    <IonPage>
      <IonContent fullscreen className="splash-content">
        <div className="splash-container">
          {/* Background Elements */}
          <div className="splash-background">
            <div className="floating-orb orb-1"></div>
            <div className="floating-orb orb-2"></div>
            <div className="floating-orb orb-3"></div>
            <div className="neural-network">
              {[...Array(20)].map((_, i) => (
                <div key={i} className={`neural-dot dot-${i}`}></div>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="splash-main">
            {/* Logo Animation */}
            <motion.div
              className="splash-logo-container"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                duration: 1, 
                ease: "easeOut",
                type: "spring",
                stiffness: 100
              }}
            >
              <motion.img
                src="logo-white.png"
                alt="Synapse Logo"
                className="splash-logo"
                animate={{
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Pulse Effect */}
              <motion.div
                className="logo-pulse"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0, 0.3]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </motion.div>

            {/* App Name */}
            <motion.div
              className="splash-title-container"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <h1 className="splash-title">Synapse</h1>
              <p className="splash-subtitle">AI-Powered Personal Assistant</p>
            </motion.div>

            {/* Loading Progress */}
            <motion.div
              className="splash-loading"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 1 }}
            >
              <div className="loading-text">
                <motion.span
                  key={currentStep}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  {loadingSteps[currentStep]}
                </motion.span>
              </div>
              
              <div className="loading-bar">
                <motion.div
                  className="loading-progress"
                  initial={{ width: "0%" }}
                  animate={{ width: `${((currentStep + 1) / loadingSteps.length) * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              
              <div className="loading-dots">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="loading-dot"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.3, 1, 0.3]
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <motion.div
            className="splash-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.5 }}
          >
            <p>Connect your thoughts, amplify your productivity</p>
            <div className="version-info">v1.0.0</div>
          </motion.div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SplashScreen; 