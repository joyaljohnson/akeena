import { motion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { EnvelopeScene, type UnlockResult } from './EnvelopeScene';

type EnvelopeGateProps = {
  unlock: (pin: string) => Promise<UnlockResult>;
  fontId: string;
  /** Rendered after the envelope has opened. */
  children: ReactNode;
};

/** Shows the envelope until it has opened, then hands over to the letter with a fade. */
export function EnvelopeGate({ unlock, fontId, children }: EnvelopeGateProps) {
  const [opened, setOpened] = useState(false);
  if (!opened)
    return <EnvelopeScene unlock={unlock} fontId={fontId} onOpened={() => setOpened(true)} />;
  return (
    <motion.div
      style={{ height: '100%' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}
