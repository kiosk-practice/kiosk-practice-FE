import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import artwork from './artwork.js';
import './styles.css';

import { kiosks } from './kiosks.js';
import Practice from './Practice.jsx';
import { CafePractice, DaisoPractice } from './ShopPractice.jsx';
import { LearningReport } from './LearningAssistant.jsx';

function App() {
  const [screen, setScreen] = useState('home');
  const [kiosk, setKiosk] = useState('');
  const heading = useRef(null);

  useEffect(() => {
    heading.current?.focus();
  }, [screen]);

  return (
    <main className={`panel panel--${screen}${screen === 'selected' && (kiosk === 0 || kiosk === 3) ? ' panel--shop' : ''}`}>
      {screen === 'home' ? (
        <>
          <h1>AI 키오스크<br />체험</h1>
          <img className="hero" src={artwork[0]} alt="" />
          <button className="primary" onClick={() => setScreen('choose')}>
            체험 시작하기 <span className="arrow" aria-hidden="true" />
          </button>
          <p className="notice">실제 결제는 없습니다</p>
          <button className="back" onClick={() => setScreen('report')}>나의 학습 리포트</button>
        </>
      ) : screen === 'report' ? <LearningReport onBack={() => setScreen('home')} /> : screen === 'choose' ? (
        <>
          <h1 ref={heading} tabIndex={-1}>어떤 키오스크를<br />연습할까요?</h1>
          <ul className="choices">
            {kiosks.map(({ label, brand }, index) => (
              <li key={label}>
                <button className="choice" onClick={() => {
                  setKiosk(index);
                  setScreen('selected');
                }}>
                  {artwork[index + 1] ? <img src={artwork[index + 1]} alt="" /> : <span className="market-icon" aria-hidden="true">🛒</span>}
                  <span>{label}<small>{brand}</small></span>
                  <span className="arrow" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <button className="back" onClick={() => setScreen('home')}>처음으로</button>
        </>
      ) : (
        kiosk === 0 || kiosk === 3 ? React.createElement(kiosk === 0 ? CafePractice : DaisoPractice, {
          onExit: () => setScreen('choose'), onHome: () => setScreen('home'),
        }) : <Practice kiosk={kiosk} onExit={() => setScreen('choose')} />
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);

