import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import styles from './App.module.css';
import { LetterRoute } from './routes/LetterRoute';
import { UnavailableScreen } from './routes/StatusScreen';

const DevLetter = import.meta.env.DEV ? lazy(() => import('./dev/DevLetter')) : null;
const DevEnvelope = import.meta.env.DEV ? lazy(() => import('./dev/DevEnvelope')) : null;
const StampCompare = import.meta.env.DEV ? lazy(() => import('./dev/StampCompare')) : null;

function Hello() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>A letter is on its way</h1>
    </main>
  );
}

export function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Hello />} />
        <Route path="/l/:token" element={<LetterRoute />} />
        {DevLetter && <Route path="/dev/letter" element={<DevLetter />} />}
        {DevEnvelope && <Route path="/dev/envelope" element={<DevEnvelope />} />}
        {StampCompare && <Route path="/dev/stamp" element={<StampCompare />} />}
        <Route path="*" element={<UnavailableScreen />} />
      </Routes>
    </Suspense>
  );
}
