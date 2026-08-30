/* Design philosophy: «Тихая типография» — editorial modernism, warm paper, ink graphite, Psalm Blue. Keep copy calm, exact, and operator-first. */
import type { ReactNode } from "react";
import { ArrowDown, ArrowRight, Check, Download, ExternalLink, Languages, ListChecks, MonitorPlay, Search, ShieldCheck } from "lucide-react";

const heroImage = "/manus-storage/bible-lookup-hero_adc1d585.png";
const workflowImage = "/manus-storage/bible-lookup-workflow_01c76c80.png";
const planImage = "/manus-storage/bible-lookup-plan_94c9ed01.png";
const markImage = "/manus-storage/bible-lookup-mark_01ff1c84.png";

const features = [
  {
    icon: Search,
    number: "01",
    title: "Ищите по ссылке или словам",
    text: "Найдите место по привычной ссылке или фразе — база работает офлайн и не требует ручного пролистывания.",
  },
  {
    icon: ListChecks,
    number: "02",
    title: "Соберите план заранее",
    text: "Сложите порядок чтений в список и оставьте на служение только понятные кнопки вывода.",
  },
  {
    icon: MonitorPlay,
    number: "03",
    title: "Выводите одним нажатием",
    text: "Отправьте найденное место в LyricDisplay как единый блок на активные Output и Stage.",
  },
];

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="section-label"><span className="section-rule" />{children}</p>;
}

export default function Home() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Bible Lookup — на главную">
          <img src={markImage} alt="" className="brand-mark" />
          <span className="brand-lockup"><strong>Bible</strong> Lookup</span>
        </a>
        <nav className="desktop-nav" aria-label="Основная навигация">
          <a href="#how-it-works">Как работает</a>
          <a href="#features">Возможности</a>
          <a href="#license">Переводы</a>
        </nav>
        <div className="header-actions">
          <button className="language-button" type="button" aria-label="Язык сайта">RU <span>⌄</span></button>
          <a className="button button-header" href="#download">Скачать <ArrowRight size={15} /></a>
        </div>
      </header>

      <section className="hero-section" id="top">
        <div className="hero-copy">
          <SectionLabel>ЛОКАЛЬНЫЙ ИНСТРУМЕНТ ДЛЯ СЛУЖЕНИЙ</SectionLabel>
          <h1>От строки Писания<br /><em>до экрана.</em></h1>
          <p className="hero-lead">Bible Lookup помогает быстро найти место, подготовить порядок чтений и передать его в LyricDisplay — без лишнего окна, поиска и паузы.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#download">Скачать для Windows <Download size={17} /></a>
            <a className="text-link" href="#how-it-works">Посмотреть как работает <ArrowDown size={15} /></a>
          </div>
          <div className="hero-proof"><span className="proof-dot" />Офлайн-база <strong>Синодального перевода</strong><span className="proof-divider" />Windows x64</div>
        </div>
        <div className="hero-visual">
          <div className="hero-image-wrap"><img src={heroImage} alt="Библия, закладка и рабочее окно Bible Lookup" /></div>
          <div className="hero-note hero-note-top"><span>01</span>НАЙТИ</div>
          <div className="hero-note hero-note-bottom"><span>03</span>ВЫВЕСТИ</div>
          <div className="hero-caption"><span className="caption-line" />Рабочий процесс без лишних шагов</div>
        </div>
      </section>

      <section className="manifesto-strip" id="how-it-works">
        <div className="manifesto-mark">“</div>
        <p>Подготовьте места заранее.<br /><strong>Во время служения — только следующий шаг.</strong></p>
        <span className="strip-index">01 — 03</span>
      </section>

      <section className="workflow-section section-pad">
        <div className="section-intro">
          <SectionLabel>ТРИ ДЕЙСТВИЯ</SectionLabel>
          <h2>Понятно до первого клика.</h2>
          <p>Инструмент собран вокруг реального ритма служения: найти, подготовить, вывести.</p>
        </div>
        <div className="workflow-layout">
          <div className="workflow-image"><img src={workflowImage} alt="Последовательность от текста к плану и экрану" /><span className="image-index">02 / 03</span></div>
          <div className="workflow-list">
            {features.map(({ icon: Icon, number, title, text }) => (
              <article className="workflow-item" key={number}>
                <div className="item-top"><span className="item-number">{number}</span><Icon size={19} strokeWidth={1.5} /></div>
                <h3>{title}</h3><p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="feature-section section-pad" id="features">
        <div className="feature-copy"><SectionLabel>ПОДГОТОВКА</SectionLabel><h2>Ваш план показа<br /><em>в одном месте.</em></h2><p>Добавляйте места из обычного поиска или полнотекстового поиска в план показа. В релизе 1.4 появился слушатель проповеди с авто-поиском ссылок по речи. Нажмите «Вывести» — порядок уже подготовлен.</p><div className="feature-checks"><span><Check size={14} />Поиск по словам</span><span><Check size={14} />План сохраняется</span><span><Check size={14} />Вывод на Output и Stage</span></div></div>
        <div className="plan-visual"><img src={planImage} alt="План показа Bible Lookup" /><div className="plan-callout"><span className="callout-dot" />ПЛАН ПОКАЗА <strong>готов</strong></div></div>
      </section>

      <section className="license-section section-pad" id="license">
        <div className="license-head"><div><SectionLabel>ПРОЗРАЧНЫЕ ИСТОЧНИКИ</SectionLabel><h2>Тексту можно доверять.</h2></div><ShieldCheck size={32} strokeWidth={1.25} /></div>
        <div className="license-grid">
          <article className="license-card license-card-primary"><div className="license-icon"><ShieldCheck size={19} /></div><div><h3>Синодальный перевод</h3><p>Встроен офлайн для поиска и вывода. Источник и сведения о статусе указаны в приложении и репозитории.</p><a href="https://ebible.org/russyn/copyright.htm" target="_blank" rel="noreferrer">Открыть сведения об источнике <ExternalLink size={13} /></a></div><span className="license-tag">PUBLIC DOMAIN</span></article>
          <article className="license-card"><div className="license-icon"><Languages size={19} /></div><div><h3>Другие переводы</h3><p>Архитектура приложения рассчитана на несколько переводов. Каждый подключаемый текст должен иметь подтверждённое право на распространение.</p><span className="coming-label">ПОДДЕРЖКА РАСШИРЯЕТСЯ</span></div></article>
        </div>
      </section>

      <section className="download-section section-pad" id="download">
        <div className="download-panel"><div className="download-copy"><SectionLabel>ТЕКУЩИЙ РЕЛИЗ</SectionLabel><h2>Сделайте следующий<br /><em>показ спокойнее.</em></h2><p>Портативная версия для Windows x64. Распакуйте архив, подключите LyricDisplay и начните с места Писания. Второй перевод подключается только при наличии разрешения правообладателя.</p><a className="button button-light" href="/manus-storage/Bible-Lookup-LyricDisplay-1.4.0-Windows-x64_987bed76.zip" download>Скачать Bible Lookup <Download size={17} /></a></div><div className="download-meta"><span>v1.4.0</span><span>Windows x64</span><span>326 MB</span></div></div>
      </section>

      <footer className="site-footer"><a className="brand footer-brand" href="#top"><img src={markImage} alt="" className="brand-mark" /><span className="brand-lockup"><strong>Bible</strong> Lookup</span></a><p>Точный инструмент для тех, кто выводит текст на экран.</p><div className="footer-links"><a href="#license">Источники и лицензии</a><a href="https://github.com" target="_blank" rel="noreferrer">GitHub <ExternalLink size={12} /></a></div><span className="footer-year">2026</span></footer>
    </main>
  );
}
