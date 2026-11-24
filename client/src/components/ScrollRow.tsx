import { useRef, useState, useEffect } from 'react';

const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
  </svg>
);

const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
  </svg>
);

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onTitleClick?: () => void;
}

export default function ScrollRow({ title, subtitle, children, onTitleClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeft(scrollLeft > 0);
    setShowRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  useEffect(() => {
    const timer = setTimeout(checkScroll, 100);
    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScroll);
    };
  }, [children]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = direction === 'left' ? -current.offsetWidth : current.offsetWidth;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const showArrows = showLeft || showRight;

  return (
    <section className="section scroll-row-section">
      <div className="scroll-row-header">
        <div className="scroll-row-heading">
          <h2
            onClick={onTitleClick}
            className={onTitleClick ? 'clickable-title' : ''}
          >
            {title}
          </h2>
          {subtitle && <p className="scroll-row-subtitle">{subtitle}</p>}
        </div>
        {showArrows && (
          <div className="scroll-row-arrows">
            {showLeft && <button onClick={() => scroll('left')}><IconChevronLeft /></button>}
            {showRight && <button onClick={() => scroll('right')}><IconChevronRight /></button>}
          </div>
        )}
      </div>
      <div className="scroll-row-content" ref={scrollRef} onScroll={checkScroll}>
        {children}
      </div>
    </section>
  );
}