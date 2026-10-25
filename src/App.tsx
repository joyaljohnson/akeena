import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import styles from './App.module.css';

const StampCompare = import.meta.env.DEV ? lazy(() => import('./dev/StampCompare')) : null;

function Hello() {
  return (
    <main className={styles.page}>
      <p className={styles.label}>Phase 1</p>
      <h1 className={styles.title}>A letter is on its way</h1>
    </main>
  );
}

export function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Hello />} />
        {StampCompare && <Route path="/dev/stamp" element={<StampCompare />} />}
      </Routes>
    </Suspense>
  );
}
