import {
  useCallback,
  useEffect,
  useId,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export type DeckSlide = {
  id: string;
  title: string;
  content: ReactNode;
};

type Props = {
  slides: DeckSlide[];
  initialSlideId?: string;
  onExit?: () => void;
  exitLabel?: string;
  onEscape?: () => void;
};

export function Deck({
  slides,
  initialSlideId,
  onExit,
  exitLabel = "Exit",
  onEscape,
}: Props) {
  const outlineId = useId();
  const initialIndex = Math.max(
    0,
    initialSlideId ? slides.findIndex((slide) => slide.id === initialSlideId) : 0,
  );
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex((current) => {
      if (slides.length === 0) return 0;
      return Math.min(current, slides.length - 1);
    });
  }, [slides.length]);

  const goTo = useCallback(
    (next: number) => {
      if (slides.length === 0) return;
      setIndex(Math.max(0, Math.min(slides.length - 1, next)));
    },
    [slides.length],
  );

  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent | globalThis.KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        goNext();
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        goPrev();
      } else if (event.key === "Escape" && onEscape) {
        event.preventDefault();
        onEscape();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, onEscape]);

  if (slides.length === 0) {
    return null;
  }

  const active = slides[index];
  const atStart = index === 0;
  const atEnd = index === slides.length - 1;

  return (
    <div className="deck">
      <aside className="deck-outline" aria-labelledby={outlineId}>
        <div className="deck-outline-top">
          {onExit && (
            <button type="button" className="deck-exit" onClick={onExit}>
              ← {exitLabel}
            </button>
          )}
          <p id={outlineId} className="deck-outline-label">
            Outline
          </p>
        </div>
        <nav className="deck-outline-nav" aria-label="Presentation outline">
          <ol>
            {slides.map((slide, slideIndex) => (
              <li key={slide.id}>
                <button
                  type="button"
                  className={
                    slideIndex === index
                      ? "deck-outline-item is-active"
                      : "deck-outline-item"
                  }
                  onClick={() => goTo(slideIndex)}
                  aria-current={slideIndex === index ? "step" : undefined}
                >
                  <span className="deck-outline-num">{slideIndex + 1}</span>
                  <span className="deck-outline-title">{slide.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </aside>

      <div className="deck-stage">
        <div key={active.id} className="deck-slide" role="group" aria-label={active.title}>
          {active.content}
        </div>

        <footer className="deck-nav">
          <button
            type="button"
            className="btn deck-nav-btn"
            onClick={goPrev}
            disabled={atStart}
          >
            ← Previous
          </button>
          <p className="deck-progress">
            Slide {index + 1} of {slides.length}
          </p>
          <button
            type="button"
            className="btn btn-primary deck-nav-btn"
            onClick={goNext}
            disabled={atEnd}
          >
            Next →
          </button>
        </footer>
      </div>
    </div>
  );
}
