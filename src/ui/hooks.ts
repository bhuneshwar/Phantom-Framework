import { motion, AnimatePresence, useAnimation, Variants } from 'framer-motion';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { SpectralEvent, IEventHub } from '../core/types';

/**
 * Eerie Animation Hooks - Framer Motion integration for spooky UI effects
 * Provides reactive animations that respond to spectral events
 */

export interface SpectralAnimationConfig {
  intensity: number; // 0-1 scale
  hauntProbability: number; // 0-1 chance of spontaneous animations
  pulseOnEvents: boolean;
  glitchOnErrors: boolean;
  fadeOnHaunts: boolean;
}

export interface HauntedElementProps {
  hauntLevel: number;
  isActive: boolean;
  lastActivity: number;
  glitchIntensity: number;
}

/**
 * Hook for spectral pulse animations triggered by events
 */
export function useSpectralPulse(
  eventHub: IEventHub,
  eventTypes: string[] = ['spectral_event'],
  config: Partial<SpectralAnimationConfig> = {}
) {
  const controls = useAnimation();
  const [pulseCount, setPulseCount] = useState(0);
  const [hauntLevel, setHauntLevel] = useState(0);
  
  const animConfig: SpectralAnimationConfig = {
    intensity: 0.5,
    hauntProbability: 0.1,
    pulseOnEvents: true,
    glitchOnErrors: false,
    fadeOnHaunts: true,
    ...config,
  };

  useEffect(() => {
    const subscription = eventHub.subscribe((event: SpectralEvent) => {
      if (eventTypes.includes(event.type)) {
        setPulseCount(prev => prev + 1);
        
        // Update haunt level based on event metadata
        if (event.metadata?.haunted) {
          setHauntLevel(prev => Math.min(1.0, prev + (event.metadata?.intensity || 0.1)));
        }

        // Trigger pulse animation
        if (animConfig.pulseOnEvents) {
          const intensity = event.metadata?.intensity || animConfig.intensity;
          
          controls.start({
            scale: [1, 1 + intensity * 0.3, 1],
            opacity: [1, 0.7 + intensity * 0.3, 1],
            filter: [
              'brightness(1) hue-rotate(0deg)',
              `brightness(${1 + intensity * 0.5}) hue-rotate(${intensity * 180}deg)`,
              'brightness(1) hue-rotate(0deg)',
            ],
            transition: {
              duration: 0.6,
              ease: 'easeInOut',
            },
          });
        }

        // Random haunt animation
        if (Math.random() < animConfig.hauntProbability) {
          setTimeout(() => {
            controls.start({
              x: [0, -2, 2, -1, 1, 0],
              y: [0, 1, -1, 0.5, -0.5, 0],
              transition: {
                duration: 0.4,
                ease: 'easeInOut',
              },
            });
          }, Math.random() * 2000);
        }
      }
    });

    // Decay haunt level over time
    const decayInterval = setInterval(() => {
      setHauntLevel(prev => Math.max(0, prev * 0.95));
    }, 1000);

    return () => {
      subscription?.unsubscribe?.();
      clearInterval(decayInterval);
    };
  }, [eventHub, eventTypes, animConfig, controls]);

  return {
    controls,
    pulseCount,
    hauntLevel,
    animate: controls.start,
  };
}

/**
 * Hook for ghostly fade animations
 */
export function useGhostlyFade(
  trigger: boolean,
  hauntLevel: number = 0,
  duration: number = 0.8
) {
  const controls = useAnimation();
  
  useEffect(() => {
    if (trigger) {
      const fadeIntensity = 0.3 + hauntLevel * 0.4;
      
      controls.start({
        opacity: [1, fadeIntensity, 1],
        filter: [
          'blur(0px) grayscale(0%)',
          `blur(${hauntLevel * 2}px) grayscale(${hauntLevel * 50}%)`,
          'blur(0px) grayscale(0%)',
        ],
        transition: {
          duration,
          ease: 'easeInOut',
        },
      });
    }
  }, [trigger, hauntLevel, duration, controls]);

  return controls;
}

/**
 * Hook for spectral glitch effects on errors
 */
export function useSpectralGlitch(
  eventHub: IEventHub,
  errorTypes: string[] = ['ghostly_crash', 'spectral_disturbance']
) {
  const controls = useAnimation();
  const [glitchCount, setGlitchCount] = useState(0);
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    const subscription = eventHub.subscribe((event: SpectralEvent) => {
      if (errorTypes.includes(event.type)) {
        setGlitchCount(prev => prev + 1);
        setIsGlitching(true);
        
        const intensity = event.metadata?.intensity || 0.5;
        
        // Glitch animation sequence
        controls.start({
          x: [0, -intensity * 10, intensity * 8, -intensity * 6, 0],
          y: [0, intensity * 5, -intensity * 7, intensity * 3, 0],
          scaleX: [1, 1 + intensity * 0.1, 1 - intensity * 0.05, 1],
          scaleY: [1, 1 - intensity * 0.05, 1 + intensity * 0.1, 1],
          filter: [
            'hue-rotate(0deg) saturate(1) contrast(1)',
            `hue-rotate(${intensity * 180}deg) saturate(${1 + intensity}) contrast(${1 + intensity * 0.5})`,
            `hue-rotate(${-intensity * 90}deg) saturate(${1 + intensity * 0.5}) contrast(${1 + intensity})`,
            'hue-rotate(0deg) saturate(1) contrast(1)',
          ],
          transition: {
            duration: 0.3,
            ease: 'easeInOut',
          },
        }).then(() => {
          setIsGlitching(false);
        });
      }
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [eventHub, errorTypes, controls]);

  return {
    controls,
    glitchCount,
    isGlitching,
  };
}

/**
 * Hook for haunted element state management
 */
export function useHauntedElement(
  eventHub: IEventHub,
  elementId: string
): HauntedElementProps {
  const [hauntLevel, setHauntLevel] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [glitchIntensity, setGlitchIntensity] = useState(0);

  useEffect(() => {
    const subscription = eventHub.subscribe((event: SpectralEvent) => {
      // Update activity
      setLastActivity(Date.now());
      setIsActive(true);
      
      // Update haunt level based on event
      if (event.metadata?.haunted) {
        const intensity = event.metadata.intensity || 0.1;
        setHauntLevel(prev => Math.min(1.0, prev + intensity));
      }
      
      // Update glitch intensity for error events
      if (event.type.includes('error') || event.type.includes('crash')) {
        setGlitchIntensity(prev => Math.min(1.0, prev + 0.2));
      }
    });

    // Decay effects over time
    const decayInterval = setInterval(() => {
      const now = Date.now();
      
      // Decay haunt level
      setHauntLevel(prev => Math.max(0, prev * 0.98));
      
      // Decay glitch intensity
      setGlitchIntensity(prev => Math.max(0, prev * 0.95));
      
      // Check if element is still active
      setIsActive(prev => {
        if (prev && now - lastActivity > 5000) { // 5 seconds of inactivity
          return false;
        }
        return prev;
      });
    }, 100);

    return () => {
      subscription?.unsubscribe?.();
      clearInterval(decayInterval);
    };
  }, [eventHub, elementId, lastActivity]);

  return {
    hauntLevel,
    isActive,
    lastActivity,
    glitchIntensity,
  };
}

/**
 * Spectral animation variants for common effects
 */
export const spectralVariants: { [key: string]: Variants } = {
  hauntedPulse: {
    idle: {
      scale: 1,
      opacity: 1,
      filter: 'brightness(1) hue-rotate(0deg)',
    },
    haunted: {
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
      filter: [
        'brightness(1) hue-rotate(0deg)',
        'brightness(1.2) hue-rotate(45deg)',
        'brightness(1) hue-rotate(0deg)',
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  },
  
  ghostlyFade: {
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
    },
    hidden: {
      opacity: 0,
      y: -20,
      filter: 'blur(2px)',
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  },
  
  spectralGlitch: {
    normal: {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      filter: 'hue-rotate(0deg) saturate(1)',
    },
    glitch: {
      x: [-2, 2, -1, 1, 0],
      y: [1, -1, 0.5, -0.5, 0],
      scaleX: [1, 1.02, 0.98, 1],
      scaleY: [1, 0.98, 1.02, 1],
      filter: [
        'hue-rotate(0deg) saturate(1)',
        'hue-rotate(90deg) saturate(1.5)',
        'hue-rotate(-45deg) saturate(1.2)',
        'hue-rotate(0deg) saturate(1)',
      ],
      transition: {
        duration: 0.2,
        ease: 'easeInOut',
      },
    },
  },
  
  etherealFloat: {
    floating: {
      y: [-5, 5, -5],
      x: [-2, 2, -2],
      rotate: [-1, 1, -1],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  },
};

/**
 * Higher-order component for haunted elements
 */
export function withSpectralEffects<P extends object>(
  Component: React.ComponentType<P>,
  eventHub: IEventHub,
  config: Partial<SpectralAnimationConfig> = {}
) {
  return function SpectralComponent(props: P) {
    const { controls, hauntLevel } = useSpectralPulse(eventHub, undefined, config);
    const glitchControls = useSpectralGlitch(eventHub);
    
    return (
      <motion.div
        animate={controls}
        style={{
          filter: `hue-rotate(${hauntLevel * 30}deg) brightness(${1 + hauntLevel * 0.2})`,
        }}
      >
        <motion.div animate={glitchControls.controls}>
          <Component {...props} />
        </motion.div>
      </motion.div>
    );
  };
}

/**
 * Spectral loading spinner component
 */
export function SpectralSpinner({ 
  size = 40, 
  hauntLevel = 0,
  isVisible = true 
}: {
  size?: number;
  hauntLevel?: number;
  isVisible?: boolean;
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            rotate: 360,
            filter: `hue-rotate(${hauntLevel * 180}deg) brightness(${1 + hauntLevel * 0.5})`,
          }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{
            rotate: {
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            },
            opacity: { duration: 0.3 },
            scale: { duration: 0.3 },
          }}
          style={{
            width: size,
            height: size,
            border: `2px solid rgba(138, 43, 226, ${0.3 + hauntLevel * 0.4})`,
            borderTop: `2px solid rgba(138, 43, 226, ${0.8 + hauntLevel * 0.2})`,
            borderRadius: '50%',
          }}
        />
      )}
    </AnimatePresence>
  );
}

/**
 * Haunted text component with typing effect
 */
export function HauntedText({ 
  text, 
  hauntLevel = 0,
  typingSpeed = 50,
  glitchProbability = 0.1 
}: {
  text: string;
  hauntLevel?: number;
  typingSpeed?: number;
  glitchProbability?: number;
}) {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        // Random glitch chance
        if (Math.random() < glitchProbability + hauntLevel * 0.1) {
          setIsGlitching(true);
          const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
          const glitchChar = glitchChars[Math.floor(Math.random() * glitchChars.length)];
          
          setDisplayText(prev => prev + glitchChar);
          
          setTimeout(() => {
            setDisplayText(prev => prev.slice(0, -1) + text[currentIndex]);
            setCurrentIndex(prev => prev + 1);
            setIsGlitching(false);
          }, 100);
        } else {
          setDisplayText(prev => prev + text[currentIndex]);
          setCurrentIndex(prev => prev + 1);
        }
      }, typingSpeed + Math.random() * typingSpeed * hauntLevel);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, typingSpeed, glitchProbability, hauntLevel]);

  return (
    <motion.span
      animate={{
        filter: isGlitching 
          ? `hue-rotate(${Math.random() * 360}deg) saturate(2)`
          : `hue-rotate(${hauntLevel * 60}deg) saturate(${1 + hauntLevel * 0.5})`,
      }}
      transition={{ duration: 0.1 }}
    >
      {displayText}
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        |
      </motion.span>
    </motion.span>
  );
}