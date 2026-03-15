import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

interface FeatureCard {
  icon: string;
  title: string;
  description: string;
}

const FEATURE_CARDS: FeatureCard[] = [
  {
    icon: "♪",
    title: "Samples",
    description:
      "Preview all 196 built-in samples with rate and amplitude control.",
  },
  {
    icon: "∿",
    title: "Synths",
    description:
      "Hear real Sonic Pi synths powered by scsynth running in the browser.",
  },
  {
    icon: "⌗",
    title: "FX + Chords + Scales",
    description: "Explore effects chains, chord voicings, and all 130+ scales.",
  },
  {
    icon: "⊞",
    title: "Tools",
    description: "BPM calculator, note reference, and loop sync calculator.",
  },
];

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 60) setScrolled(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="landing">
      {/* ── Section 1: Hero ────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero-bg" aria-hidden="true" />
        <div className="landing-hero-content">
          <div className="landing-logo" aria-hidden="true">
            π
          </div>
          <h1 className="landing-title">Pi Studio</h1>
          <p className="landing-tagline">
            Explore, learn, create with Sonic Pi.
          </p>
          <div className="landing-cta-row">
            <Link className="landing-btn-primary" to="/browser">
              Open Browser →
            </Link>
            <span className="landing-btn-disabled">Studio — coming soon</span>
          </div>
        </div>
        <div
          className={`landing-scroll-indicator${scrolled ? " hidden" : ""}`}
          aria-hidden="true"
        >
          ∨
        </div>
      </section>

      {/* ── Section 2: What is Sonic Pi ───────────────────── */}
      <section className="landing-what">
        <p className="landing-what-text">
          Sonic Pi is a code-based music creation tool by Sam Aaron.
          <br />
          It lets you compose and perform music using simple Ruby code —
          <br />
          live, in real time.{" "}
          <a
            className="landing-link"
            href="https://sonic-pi.net"
            target="_blank"
            rel="noopener noreferrer"
          >
            → sonic-pi.net
          </a>
        </p>
      </section>

      {/* ── Section 3: Browser Features ───────────────────── */}
      <section className="landing-features">
        <h2 className="landing-section-title">
          Everything you need to explore Sonic Pi sounds.
        </h2>
        <div className="landing-cards">
          {FEATURE_CARDS.map((card) => (
            <div className="landing-card" key={card.title}>
              <span className="landing-card-icon" aria-hidden="true">
                {card.icon}
              </span>
              <h3 className="landing-card-title">{card.title}</h3>
              <p className="landing-card-desc">{card.description}</p>
            </div>
          ))}
        </div>
        <div className="landing-features-cta">
          <Link className="landing-btn-primary" to="/browser">
            Open Browser →
          </Link>
        </div>
      </section>

      {/* ── Section 4: Studio Teaser ──────────────────────── */}
      <section className="landing-studio">
        <div className="landing-studio-header">
          <h2 className="landing-section-title landing-studio-title">Studio</h2>
          <span className="landing-badge">coming soon</span>
        </div>
        <p className="landing-studio-lead">Build Sonic Pi code visually.</p>
        <p className="landing-studio-desc">
          Compose live loops, chain synths and FX, arrange patterns —
          <br />
          then export a ready-to-run <code>.rb</code> file directly into Sonic
          Pi.
        </p>
        <p className="landing-studio-hook">
          → No more looking up syntax. Just make music.
        </p>
      </section>

      {/* ── Section 5: Footer ─────────────────────────────── */}
      <footer className="landing-footer">
        <p className="landing-footer-text">
          Pi Studio — built with React, Tone.js and{" "}
          <a
            className="landing-link"
            href="https://github.com/sonic-pi-net/sonic-pi/tree/dev/app/javascript/pi-time"
            target="_blank"
            rel="noopener noreferrer"
          >
            SuperSonic
          </a>
        </p>
        <p className="landing-footer-text">
          Synths powered by SuperSonic — scsynth in the browser by Sam
          Aaron{" "}
        </p>
        <nav className="landing-footer-links" aria-label="External links">
          <a
            className="landing-link"
            href="https://github.com/denisenanni/pi-studio"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            className="landing-link"
            href="https://sonic-pi.net"
            target="_blank"
            rel="noopener noreferrer"
          >
            sonic-pi.net
          </a>
          <a
            className="landing-link"
            href="https://github.com/sonic-pi-net/sonic-pi/tree/dev/app/javascript/pi-time"
            target="_blank"
            rel="noopener noreferrer"
          >
            supersonic demo
          </a>
        </nav>
      </footer>
    </div>
  );
}
