import React, { useEffect, useRef, useState } from 'react';
import { kiosks, products, seatLabels, isAdjacentPair } from './kiosks.js';

const won = (price) => price.toLocaleString('ko-KR') + '원';

export default function Practice({ kiosk, onExit }) {
  const scenario = kiosks[kiosk];
  const { brand, mission, steps, total } = scenario;
  const [step, setStep] = useState(0);
  const [order, setOrder] = useState({});
  const [retry, setRetry] = useState(false);
  const heading = useRef(null);
  const payment = steps.length;
  const review = payment + 1;
  const done = review + 1;
  const market = kiosk === 3;
  const burger = kiosk === 1;
  const cinema = kiosk === 2;
  const current = steps[step];
  const value = order[step];
  const scans = order[0] ?? [];
  const quantities = order[1] ?? [];
  const seats = order[3] ?? [];
  const seatCount = cinema ? parseInt(order[2], 10) : 0;
  const single = burger && order[2] === '단품';
  const changes = steps.flatMap(({ target, title }, i) => {
    if (!target || (single && i > 2) || !order[i] || target === order[i]) return [];
    return [{ step: i, title, picked: order[i], target }];
  });
  if (cinema && seatCount === 2 && !isAdjacentPair(seats)) {
    changes.push({ step: 3, title: steps[3].title, picked: seats.join(', '), target: '같은 줄, 같은 통로 쪽의 이웃한 두 좌석' });
  }
  if (market) {
    products.forEach(({ name }, i) => {
      if (quantities[i] !== undefined && quantities[i] !== 1) {
        changes.push({ step: 1, title: name, picked: quantities[i] + '개', target: '1개' });
      }
    });
  }
  changes.sort((a, b) => a.step - b.step);
  const issue = changes[0];

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  function select(nextValue) {
    setOrder((previous) => ({ ...previous, [step]: nextValue }));
  }

  function scan(index) {
    const nextScans = [...scans, index];
    const nextQuantities = [...(order[1] ?? [0, 0, 0])];
    nextQuantities[index] = index === 1 ? 2 : 1;
    setOrder({ ...order, 0: nextScans, 1: nextQuantities });
  }

  function advance() {
    if (retry) {
      setRetry(false);
      if ((cinema && seats.length !== seatCount) || (burger && !single && !order[5])) {
        setStep(3);
        return;
      }
      setStep(review);
      return;
    }
    setStep(single && step === 2 ? payment : step + 1);
  }

  const canAdvance = market && step === 0 ? scans.length === products.length :
    cinema && step === 3 ? seats.length === seatCount :
    market && step === 1 ? quantities.some((quantity) => quantity > 0) : Boolean(value);
  const title = current?.title ?? (step === payment ? '장바구니와 결제' :
    step === review ? (market ? '연습 영수증' : '내 주문 돌아보기') : '잘했어요!');
  const help = current?.help ?? (step === payment ?
    '주문 내용을 확인한 뒤 카드 넣기 연습을 눌러요. 카드나 개인정보는 필요 없어요.' :
    'AI 해설 예시에서 미션과 다른 선택을 보고 해당 단계만 다시 연습할 수 있어요.');
  const orderLines = steps.flatMap(({ options }, i) =>
    options && order[i] && !(single && i > 2) ? [order[i]] : []);
  if (cinema && seats.length) orderLines.push(seats.join(', '));

  return (
    <>
      <header className="practice-header">
        <strong>{brand}</strong>
        {step < done && <span>진행 {step + 1} / {review + 1}</span>}
      </header>
      {step < done && <p className="mission"><strong>미션</strong> {mission}</p>}
      {step === done && <div className="success-icon" aria-hidden="true">✓</div>}
      <h1 ref={heading} tabIndex={-1}>{title}</h1>

      {current?.options && (
        <div className="choices" role="group" aria-label={title}>
          {current.options.map((option, i) => (
            <button key={option} className="option" aria-pressed={value === option} onClick={() => select(option)}>
              {current.icons && <span aria-hidden="true">{current.icons[i]}</span>}
              <span>{option}{current.prices && <small>{won(current.prices[i])}</small>}</span>
              {value === option && <span className="selection-mark" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}

      {cinema && step === 3 && (
        <>
          <p className="screen-label">스크린</p>
          <div className="seats" role="group" aria-label="좌석 배치">
            {seatLabels.map((seat) => (
              <button key={seat} className="option" aria-pressed={seats.includes(seat)}
                disabled={seat === 'B4' || (!seats.includes(seat) && seats.length >= seatCount)}
                aria-label={seat === 'B4' ? 'B4 예매된 좌석' : seat}
                onClick={() => select(seats.includes(seat) ? seats.filter((item) => item !== seat) : [...seats, seat])}>
                {seat}
              </button>
            ))}
          </div>
          <p role="status">선택 {seats.length} / {seatCount}석</p>
        </>
      )}

      {market && step === 0 && (
        <div className="choices">
          {products.map(({ name, icon, price }, i) => (
            <button key={name} className="option" disabled={scans.includes(i)} onClick={() => scan(i)}>
              <span aria-hidden="true">{icon}</span>
              <span>{name}<small>{won(price)}</small></span>
              <span className="scan-label">{scans.includes(i) ? '스캔됨' : '스캔'}</span>
            </button>
          ))}
          <p role="status">실물 상품 {scans.length} / {products.length}개 스캔</p>
        </div>
      )}

      {market && step === 1 && (
        <div className="choices">
          {products.map(({ name, icon }, i) => (
            <section key={name} className="summary scan-row">
              <strong><span aria-hidden="true">{icon} </span>{name}</strong>
              <span>실물 1개</span>
              <div className="counter">
                <button aria-label={name + ' 스캔 수량 줄이기'} disabled={quantities[i] === 0}
                  onClick={() => select(quantities.map((quantity, index) => index === i ? quantity - 1 : quantity))}>−</button>
                <span aria-live="polite">스캔 {quantities[i]}개</span>
                <button aria-label={name + ' 스캔 수량 늘리기'} disabled={quantities[i] === 2}
                  onClick={() => select(quantities.map((quantity, index) => index === i ? quantity + 1 : quantity))}>+</button>
              </div>
            </section>
          ))}
        </div>
      )}

      {(step === payment || step === review || step === done) && (
        <section className="summary" aria-label={step === payment ? '장바구니' : '주문 내역'}>
          {step === review && <strong>연습 {cinema ? '예매' : '주문'}번호 027</strong>}
          {market && products.map(({ name, price }, i) => quantities[i] > 0 && (
            <div className="receipt-line" key={name}><span>{name} × {quantities[i]}</span><span>{won(price * quantities[i])}</span></div>
          ))}
          <p>{orderLines.join(' · ')}{market && order[2] === '봉투 1장' && ' (100원)'}</p>
          <strong>합계 {won(total(order))}</strong>
        </section>
      )}

      {step === payment && (
        <div className="payment-guide">
          <div className="card-reader" aria-hidden="true"><span>💳</span></div>
          <p>카드의 칩이 단말기 슬롯을 향하도록 넣어요.</p>
          <p className="notice">실제 결제는 없습니다</p>
        </div>
      )}
      {step === review && issue && (
        <section className="mission feedback">
          <h2>AI 해설 예시</h2>
          <p>{issue.title}에서 <strong>{issue.picked}</strong>을(를) 골랐어요.</p>
          <p>미션에 맞게 <strong>{issue.target}</strong>을(를) 골라 보세요.</p>
        </section>
      )}
      {step === done && <p className="success-banner">✓ 미션을 완료했어요</p>}

      {step < done && (
        <details className="help" key={step}>
          <summary>이 화면이 헷갈려요</summary>
          <p>{help}</p>
        </details>
      )}
      {step < payment && <button className="primary" disabled={!canAdvance} onClick={advance}>{retry ? '선택 수정하기' : '다음'}</button>}
      {step === payment && <button className="primary" onClick={() => setStep(review)}>카드 넣기 연습</button>}
      {step === review && (
        <button className="primary" onClick={() => {
          if (issue) {
            setRetry(order);
            setStep(issue.step);
          } else {
            setStep(done);
          }
        }}>{issue ? '이 단계 다시 연습하기' : '완료하기'}</button>
      )}
      <button className="back" onClick={() => {
        if (retry) {
          setOrder(retry);
          setRetry(false);
          setStep(review);
        } else if (step > 0 && step <= payment) {
          setStep(single && step === payment ? 2 : step - 1);
        } else {
          onExit();
        }
      }}>{retry ? '수정 취소' : step > 0 && step <= payment ? '이전 단계' : '다른 키오스크 연습하기'}</button>
    </>
  );
}

