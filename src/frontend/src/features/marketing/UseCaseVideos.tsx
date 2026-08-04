"use client";

import { useEffect, useRef, useState } from "react";
import { USE_CASES, type UseCase } from "./use-cases";

function VideoPanel({
  useCase,
  active,
  onActivate,
}: {
  useCase: UseCase;
  active: boolean;
  onActivate: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (active) {
      void el.play().catch(() => undefined);
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [active]);

  return (
    <article
      className={`lf-video-panel ${active ? "lf-video-panel--active" : ""}`}
      onMouseEnter={onActivate}
      onFocus={onActivate}
    >
      <button
        type="button"
        className="lf-video-panel__meta text-left"
        onClick={onActivate}
        aria-pressed={active}
      >
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--accent)]">
          {useCase.eyebrow}
        </p>
        <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--brand-ink)] sm:text-3xl">
          {useCase.title}
        </h3>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--brand-steel)]">
          {useCase.summary}
        </p>
        <p className="mt-4 text-sm font-medium text-[var(--text)]">
          {useCase.outcome}
        </p>
      </button>
      <div className="lf-video-panel__stage">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          src={useCase.videoSrc}
          poster={useCase.posterSrc}
          muted
          loop
          playsInline
          controls={active}
          preload="metadata"
        />
      </div>
    </article>
  );
}

export function UseCaseVideos() {
  const [activeId, setActiveId] = useState(USE_CASES[0]?.id ?? "");

  return (
    <section id="videos" className="lf-section lf-section--videos scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
            Use case videos
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[var(--brand-ink)] sm:text-5xl">
            Watch LogiForge work the floor
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[var(--brand-steel)]">
            Three short demos from a live tenant — AI command, inbound receive,
            and outbound proof.
          </p>
        </div>

        <div className="mt-12 space-y-6">
          {USE_CASES.map((useCase) => (
            <VideoPanel
              key={useCase.id}
              useCase={useCase}
              active={activeId === useCase.id}
              onActivate={() => setActiveId(useCase.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
