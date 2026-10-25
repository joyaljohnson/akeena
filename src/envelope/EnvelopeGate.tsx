import { useState, type ReactNode } from 'react';
import { EnvelopeScene, type UnlockResult } from './EnvelopeScene';

type EnvelopeGateProps = {
  unlock: (pin: string) => Promise<UnlockResult>;
  fontId: string;
  initialLockedUntil?: string;
  onOpened?: () => void;
  onSealTap?: () => void;
  /** Rendered after the envelope has opened. */
  children: ReactNode;
};

/** Shows the envelope until it has opened, then hands over to the letter with a fade. */
export function EnvelopeGate({
  unlock,
  fontId,
  initialLockedUntil,
  onOpened,
  onSealTap,
  children,
}: EnvelopeGateProps) {
  const [opened, setOpened] = useState(false);
  if (!opened) {
    return (
      <EnvelopeScene
        unlock={unlock}
        fontId={fontId}
        initialLockedUntil={initialLockedUntil}
        onSealTap={onSealTap}
        onOpened={() => {
          setOpened(true);
          onOpened?.();
        }}
      />
    );
  }
  return (
    <div className="fade-in" style={{ height: '100%' }}>
      {children}
    </div>
  );
}
