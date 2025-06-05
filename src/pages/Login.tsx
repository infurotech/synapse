import React, { useState } from 'react';
import {
  IonContent,
  IonPage,
  IonButton,
  IonIcon,
  IonText,
  IonCard,
  IonCardContent,
  IonLoading,
} from '@ionic/react';
import { fingerPrint, flash, chevronForward } from 'ionicons/icons';
import { motion } from 'framer-motion';
import { useHistory } from 'react-router-dom';
import './Login.css';

const Login: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showBiometric, setShowBiometric] = useState(true);
  const history = useHistory();

  const handleBiometricLogin = async () => {
    setIsLoading(true);
    
    // Simulate biometric authentication delay
    setTimeout(() => {
      setIsLoading(false);
      history.push('/dashboard');
    }, 2000);
  };

  return (
    <IonPage>
      <IonContent fullscreen className="login-content">
        <div className="login-container">
          {/* Animated Geometric Elements */}
          <div className="geometric-elements">
            <motion.div
              className="geometric-circle circle-1"
              animate={{
                rotate: [0, 360],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear",
              }}
            />
            <motion.div
              className="geometric-circle circle-2"
              animate={{
                rotate: [360, 0],
                scale: [1.1, 1, 1.1],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </div>

          {/* Main Content */}
          <div className="main-content">
            {/* Header Section */}
            <motion.div
              className="login-header"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="app-logo">
                <motion.div
                  className="logo-circle"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <motion.div
                    animate={{
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <img src="logo-white.png" alt="Synapse Logo" className="logo-icon" />
                  </motion.div>
                </motion.div>
              </div>
              <motion.h1
                className="app-title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                Synapse
              </motion.h1>
            </motion.div>

            {/* Biometric Section */}
            {showBiometric && (
              <motion.div
                className="biometric-section"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <IonCard className="biometric-card">
                  <IonCardContent>
                    <div className="biometric-content">
                      <motion.div
                        className="biometric-icon-container"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <IonButton
                          fill="clear"
                          className="biometric-button"
                          onClick={handleBiometricLogin}
                        >
                          <motion.div
                            animate={{
                              scale: [1, 1.03, 1],
                              opacity: [0.9, 1, 0.9],
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                          >
                            <IonIcon icon={fingerPrint} className="biometric-icon" />
                          </motion.div>
                        </IonButton>
                        
                        {/* Ripple Effect */}
                        <motion.div
                          className="ripple-effect"
                          animate={{
                            scale: [0.98, 1.2],
                            opacity: [0.08, 0],
                          }}
                          transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeOut",
                          }}
                        />
                      </motion.div>
                      
                      <IonText className="biometric-text">
                        <h3>Touch to authenticate</h3>
                      </IonText>
                    </div>
                  </IonCardContent>
                </IonCard>
              </motion.div>
            )}

            {/* Footer Section */}
            <motion.div
              className="login-footer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.2 }}
            >
              <IonText className="footer-text">
                <p>AI-Powered Personal Assistant</p>
                <p className="version-text">v1.0.0</p>
              </IonText>
            </motion.div>
          </div>

          {/* Decorative Elements */}
          <div className="background-elements">
            <motion.div
              className="floating-orb orb-1"
              animate={{
                y: [0, -20, 0],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="floating-orb orb-2"
              animate={{
                y: [0, 20, 0],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
            />
          </div>
        </div>

        <IonLoading
          isOpen={isLoading}
          onDidDismiss={() => setIsLoading(false)}
          message="Authenticating..."
          spinner="crescent"
          cssClass="loading-spinner"
        />
      </IonContent>
    </IonPage>
  );
};

export default Login; 