import React, { useEffect, useRef, useState } from 'react';
import { createSession, recordStage, summarize, readHistory, saveSession, reportTopics, HISTORY_KEY } from './learning.js';
import './learning.css';

export function useLearning(brand, step, title, reviewing, completed) {
  const root = useRef(null);
  const session = useRef(null);
  if (!session.current) session.current = createSession(brand);
  const [storageError, setStorageError] = useState('');
  const [version, setVersion] = useState(0);
  const [, refreshSummary] = useState(0);
  useEffect(() => {
    // The previous stage's cleanup has now recorded its final elapsed time.
    refreshSummary((value) => value + 1);
    if (reviewing || completed) return;
    const recording = session.current;
    const revisit = recording.stages.some((item) => item.step === step);
    recordStage(recording, step, title, 0, 0, revisit);
    let start = document.hidden ? null : performance.now();
    function flush() {
      if (start !== null) recordStage(recording, step, title, performance.now() - start);
      start = null;
    }
    function visibility() { flush(); if (!document.hidden) start = performance.now(); }
    document.addEventListener('visibilitychange', visibility);
    return () => { flush(); document.removeEventListener('visibilitychange', visibility); };
  }, [step, title, reviewing, completed, version]);
  useEffect(() => {
    if (!completed) return;
    session.current.completedAt ??= new Date().toISOString();
    try { saveSession(localStorage, session.current); }
    catch { setStorageError('이 브라우저에 기록을 저장하지 못했어요. 현재 결과는 아래에서 볼 수 있어요.'); }
  }, [completed]);
  return {
    root, session: session.current, storageError, version,
    help: () => recordStage(session.current, step, title, 0, 1),
    reset: () => { session.current = createSession(brand); setVersion((value) => value + 1); setStorageError(''); },
  };
}

export default function LearningAssistant({ learning, step, title, guide, context, reviewing = false, completed = false }) {
  const [open, setOpen] = useState(false);
  const [inspect, setInspect] = useState(false);
  const [idle, setIdle] = useState(false);
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState('');
  const [button, setButton] = useState('');
  const controller = useRef(null);
  const highlight = useRef(null);
  const panel = useRef(null);
  const trigger = useRef(null);
  const contextKey = JSON.stringify(context);
  const summary = summarize(learning.session);
  const fallback = reviewing || completed
    ? `지금까지 ${learning.session.stages.length}개 단계를 연습했고 도움말을 ${summary.helps}번 요청했어요. ${summary.recommendation ? `다음에는 ‘${summary.recommendation}’ 단계를 한 번 더 연습해 보세요.` : ''}`
    : guide;
  function clearHighlight() { highlight.current?.classList.remove('learning-highlight'); highlight.current = null; }
  useEffect(() => {
    controller.current?.abort(); controller.current = null;
    setAnswer(''); setStatus(''); clearHighlight();
  }, [contextKey]);
  useEffect(() => {
    setOpen(false); setInspect(false); setIdle(false); setAnswer(''); setStatus(''); setButton('');
    return () => { controller.current?.abort(); controller.current = null; clearHighlight(); };
  }, [step, learning.version]);
  useEffect(() => {
    if (reviewing || completed) return;
    let timer;
    const root = learning.root.current;
    function schedule() {
      clearTimeout(timer);
      setIdle(false);
      if (!document.hidden) timer = setTimeout(() => setIdle(true), 30000);
    }
    schedule();
    root?.addEventListener('pointerdown', schedule);
    root?.addEventListener('keydown', schedule);
    document.addEventListener('visibilitychange', schedule);
    return () => { clearTimeout(timer); root?.removeEventListener('pointerdown', schedule); root?.removeEventListener('keydown', schedule); document.removeEventListener('visibilitychange', schedule); };
  }, [step, reviewing, completed, learning.version]);
  useEffect(() => {
    if (!inspect) return;
    const root = learning.root.current;
    function explain(event) {
      const target = event.target.closest('button');
      if (!target || target.closest('.learning-assistant')) return;
      event.preventDefault(); event.stopPropagation();
      const label = (target.getAttribute('aria-label') || target.textContent).trim().slice(0, 200);
      setButton(label); setInspect(false); setOpen(true); setAnswer(''); setStatus('');
    }
    root?.addEventListener('click', explain, true);
    return () => root?.removeEventListener('click', explain, true);
  }, [inspect]);
  useEffect(() => { if (open) panel.current?.focus(); }, [open]);

  async function request() {
    controller.current?.abort();
    const requestController = new AbortController();
    controller.current = requestController;
    const timer = setTimeout(() => requestController.abort(), 20000);
    setStatus('loading'); setAnswer('');
    const controls = [...(learning.root.current?.querySelectorAll('button:not(:disabled)') ?? [])]
      .filter((node) => !node.closest('.learning-assistant'))
      .slice(0, 40).map((node) => (node.getAttribute('aria-label') || node.textContent).trim().slice(0, 150));
    try {
      const response = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: requestController.signal,
        body: JSON.stringify({ kind: reviewing || completed ? 'feedback' : 'help', brand: learning.session.brand,
          title, guide, ...(button ? { button } : {}),
          context: JSON.stringify({ selections: context, controls, stages: learning.session.stages }).slice(0, 10000) }),
      });
      const result = await response.json();
      if (!response.ok || typeof result.answer !== 'string' || !result.answer.trim()) throw new Error(result.error || 'unavailable');
      if (controller.current !== requestController) return;
      setAnswer(result.answer); setStatus('success');
    } catch (error) {
      if (controller.current !== requestController) return;
      setStatus(error.message === 'unconfigured' ? 'unconfigured' : 'error');
    } finally { clearTimeout(timer); }
  }
  function close() {
    controller.current?.abort(); controller.current = null;
    setOpen(false); setInspect(false); setStatus(''); trigger.current?.focus();
  }
  function follow() {
    close();
    const root = learning.root.current;
    const next = root?.querySelector('.frame-footer .shop-button:not(.secondary):not(:disabled), .primary:not(:disabled)');
    const choices = root?.querySelector('.menu-grid, .temperature-options, .large-counter, .payment-options, .bag-options, .scan-products, .goods-list, .choices, .ticket-list, .seats');
    clearHighlight();
    const target = next || choices;
    if (target) {
      highlight.current = target; target.classList.add('learning-highlight');
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      (target.matches('button') ? target : target.querySelector('button:not(:disabled)'))?.focus();
    }
    setOpen(false);
  }
  const resultView = reviewing || completed;
  return <aside className="learning-assistant" aria-label="학습 도우미">
    {resultView && <section className="learning-summary">
      <h2>오늘의 학습 리포트</h2>
      <div className="learning-stats"><span><b>{summary.seconds}초</b>화면에서 연습</span><span><b>{summary.helps}회</b>도움 요청</span></div>
      {summary.longest && <p>가장 오래 연습한 단계: {summary.longest.title} ({Math.round(summary.longest.ms / 1000)}초)</p>}
      <p>{fallback}</p>
      <p className="learning-note">시간은 화면이 보이는 동안만 기록해요. 오래 걸려도 괜찮아요.</p>
      {learning.storageError && <p role="status">{learning.storageError}</p>}
    </section>}
    {idle && !open && !resultView && <p role="status">천천히 해도 괜찮아요. 막히면 도움말을 눌러보세요.</p>}
    <button ref={trigger} className="learning-toggle" aria-expanded={open} onClick={() => { if (open) close(); else { setOpen(true); setIdle(false); if (!resultView) learning.help(); } }}>
      <span aria-hidden="true">🤖</span> {resultView ? 'AI 학습 피드백' : 'AI에게 물어보기'}
    </button>
    {inspect && <p role="status">궁금한 버튼을 눌러주세요. 설명할 버튼만 선택되며 주문은 바뀌지 않아요. <button onClick={() => setInspect(false)}>설명 선택 취소</button></p>}
    {open && <section ref={panel} tabIndex={-1} className="learning-panel" aria-label={resultView ? '학습 피드백' : '현재 화면 도움말'} onKeyDown={(event) => { if (event.key === 'Escape') close(); }}>
      <div className="learning-heading"><h2>{resultView ? '연습을 돌아봐요' : '차근차근 도와드려요'}</h2><button aria-label="도움말 닫기" onClick={close}>×</button></div>
      {button && <p className="learning-question">‘{button}’ 버튼은 무엇인가요?</p>}
      <p className="learning-answer" aria-live="polite">{status === 'loading' ? 'AI가 설명을 준비하고 있어요…' : answer || fallback}</p>
      <p className="learning-note">{status === 'success' ? 'AI가 생성한 설명이에요. 실제 화면과 함께 확인해 주세요.' : status === 'unconfigured' ? 'AI 연결을 준비 중이에요. 지금은 기본 안내를 보여드려요.' : status === 'error' ? 'AI에 연결하지 못했어요. 기본 안내로 계속 연습할 수 있어요.' : '기본 안내'}</p>
      <p className="learning-note">AI 설명을 요청하면 현재 선택과 연습 기록을 OpenAI에 전송해요. 이름이나 카드 정보는 입력하지 않아요.</p>
      <button disabled={status === 'loading'} onClick={request}>{status === 'error' ? 'AI 다시 요청하기' : 'AI 설명 요청하기'}</button>
      {!resultView && <div className="learning-actions"><button onClick={() => { close(); setInspect(true); }}>궁금한 버튼 고르기</button><button onClick={follow}>같이 따라해보기</button></div>}
    </section>}
  </aside>;
}

export function LearningReport({ onBack }) {
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const [history, setHistory] = useState(() => { try { return readHistory(localStorage); } catch { return []; } });
  const [error, setError] = useState('');
  const topics = reportTopics(history);
  return <section className="learning-report"><h1 ref={heading} tabIndex={-1}>나의 학습 리포트</h1>
    <p>이 브라우저에서 완료한 최근 20회 연습을 모았어요.</p>
    {history.length ? <><h2>완료한 연습 {history.length}회</h2>
      {topics.length > 0 && <><h2>다시 연습하면 좋은 단계</h2><ul>{topics.map((topic) => <li key={topic.title}>{topic.title}<small>도움 {topic.help}회 · 재방문 {topic.revisits}회</small></li>)}</ul></>}
      <ul>{history.map((row) => { const result = summarize(row); return <li key={row.id}><strong>{row.brand}</strong><small>{new Date(row.completedAt).toLocaleString('ko-KR')} · {result.seconds}초 · 도움 {result.helps}회</small><p>추천 연습: {result.recommendation}</p></li>; })}</ul>
      <button onClick={() => { if (!window.confirm('이 브라우저의 학습 기록을 모두 삭제할까요?')) return; try { localStorage.removeItem(HISTORY_KEY); setHistory([]); setError(''); } catch { setError('기록을 삭제하지 못했어요. 브라우저 저장 설정을 확인해 주세요.'); } }}>학습 기록 삭제</button>
    </> : <p>아직 완료한 연습이 없어요. 연습을 끝내면 기록이 생겨요.</p>}
    {error && <p role="alert">{error}</p>}
    <button className="back" onClick={onBack}>처음으로</button>
  </section>;
}
