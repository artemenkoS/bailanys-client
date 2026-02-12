import type { PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useRef } from 'react';

interface ResizablePreviewOptions {
  enabled: boolean;
}

const MIN_WIDTH_REM = 14;
const MIN_HEIGHT_REM = 8.5;
const MAX_HEIGHT_REM = 22;
const VIEWPORT_PADDING_PX = 40;

const getRootFontSize = () => {
  const value = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(value) && value > 0 ? value : 16;
};

export const useResizablePreview = ({ enabled }: ResizablePreviewOptions) => {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const cardPaddingRef = useRef(0);

  const applyScreenSize = useCallback((width: number, height: number) => {
    if (previewRef.current) {
      previewRef.current.style.setProperty('--screen-width', `${width}px`);
      previewRef.current.style.setProperty('--screen-height', `${height}px`);
    }
    if (cardRef.current) {
      const padding = cardPaddingRef.current;
      if (padding > 0) {
        cardRef.current.style.setProperty('--call-card-width', `${width + padding}px`);
      } else {
        cardRef.current.style.removeProperty('--call-card-width');
      }
    }
  }, []);

  const clearScreenSize = useCallback(() => {
    if (previewRef.current) {
      previewRef.current.style.removeProperty('--screen-width');
      previewRef.current.style.removeProperty('--screen-height');
    }
    if (cardRef.current) {
      cardRef.current.style.removeProperty('--call-card-width');
    }
  }, []);

  const refreshCardPadding = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    const style = getComputedStyle(card);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    cardPaddingRef.current = paddingLeft + paddingRight;
  }, []);

  const handleResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const preview = previewRef.current;
      if (!preview) return;
      const handleEl = event.currentTarget;
      const card = cardRef.current;
      if (card && cardPaddingRef.current === 0) {
        refreshCardPadding();
      }
      card?.setAttribute('data-resizing', 'true');

      const rect = preview.getBoundingClientRect();
      const rootFontSize = getRootFontSize();
      const minWidth = MIN_WIDTH_REM * rootFontSize;
      const minHeight = MIN_HEIGHT_REM * rootFontSize;
      const maxHeight = MAX_HEIGHT_REM * rootFontSize;
      const maxWidth = Math.max(minWidth, window.innerWidth - VIEWPORT_PADDING_PX - cardPaddingRef.current);
      const startX = event.clientX;
      const startY = event.clientY;
      const startWidth = rect.width;
      const startHeight = rect.height;

      const handleMove = (moveEvent: PointerEvent) => {
        const nextWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + (startX - moveEvent.clientX)));
        const nextHeight = Math.min(maxHeight, Math.max(minHeight, startHeight + (startY - moveEvent.clientY)));
        applyScreenSize(nextWidth, nextHeight);
      };

      const handleUp = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleUp);
        card?.removeAttribute('data-resizing');
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleUp);
      handleEl.setPointerCapture?.(event.pointerId);
    },
    [applyScreenSize, refreshCardPadding]
  );

  useEffect(() => {
    if (!enabled) {
      clearScreenSize();
      return;
    }
    refreshCardPadding();
    if (previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect();
      applyScreenSize(rect.width, rect.height);
    }
  }, [applyScreenSize, clearScreenSize, enabled, refreshCardPadding]);

  return {
    previewRef,
    cardRef,
    handleResizeStart,
  };
};
