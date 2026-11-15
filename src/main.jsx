import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import artwork from './artwork.js';
import './styles.css';

const kiosks = ['카페 주문', '햄버거 주문', '영화표 구매'];

function App() {
  const [screen, setScreen] = useState('home');
  const [kiosk, setKiosk] = useState('');
  const heading = useRef(null);

  useEffect(() => {
    if (screen !== 'home') heading.current.focus();
  }, [screen]);

  return (
    <main className={`panel panel--${screen}`}>
      {screen === 'home' ? (
        <>
          <h1>AI 키오스크<br />체험</h1>
          <img className="hero" src={artwork[0]} alt="" />
          <button className="primary" onClick={() => setScreen('choose')}>
            체험 시작하기 <span className="arrow" aria-hidden="true" />
          </button>
          <p className="notice">실제 결제는 없습니다</p>
        </>
      ) : screen === 'choose' ? (
        <>
          <h1 ref={heading} tabIndex={-1}>어떤 키오스크를<br />연습할까요?</h1>
          <ul className="choices">
            {kiosks.map((label, index) => (
              <li key={label}>
                <button className="choice" onClick={() => {
                  setKiosk(label);
                  setScreen('selected');
                }}>
                  <img src={artwork[index + 1]} alt="" />
                  <span>{label}</span>
                  <span className="arrow" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <button className="back" onClick={() => setScreen('home')}>처음으로</button>
        </>
      ) : (
        <>
          <h1 ref={heading} tabIndex={-1}>{kiosk}</h1>
          <p className="notice">체험 화면은 준비 중이에요</p>
          <button className="primary" onClick={() => setScreen('choose')}>다른 키오스크 고르기</button>
        </>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
