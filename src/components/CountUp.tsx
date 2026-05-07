import React, { useEffect, useRef } from 'react';
import { animate, useMotionValue, useTransform, motion } from 'motion/react';

interface CountUpProps {
  value: number;
  duration?: number;
  formatter?: (value: number) => string;
}

export const CountUp: React.FC<CountUpProps> = ({ 
  value, 
  duration = 1.5, 
  formatter = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => formatter(latest));
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) {
        animate(count, value, { duration: duration * 0.8, ease: "easeOut" });
        return;
    }

    const controls = animate(count, value, { 
      duration, 
      ease: [0.16, 1, 0.3, 1], // Custom ultra-smooth easeOutQuint
      onComplete: () => { hasAnimated.current = true; }
    });

    return () => controls.stop();
  }, [value, duration, count]);

  return <motion.span className="metric-value">{rounded}</motion.span>;
};
