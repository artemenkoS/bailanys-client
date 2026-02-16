import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getFullscreenPreviewSize, getPreviewAspectRatio } from '../utils/previewSizing';

interface ResizablePreviewOptions {
  enabled: boolean;
  videoRef?: RefObject<HTMLVideoElement | null>;
}

const MIN_WIDTH_REM = 14;
const MIN_HEIGHT_REM = 8.5;
const MAX_HEIGHT_REM = 22;
const VIEWPORT_PADDING_PX = 40;
const FULLSCREEN_PADDING_PX = 16;

const getRootFontSize = () => {
  const value = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(value) && value > 0 ? value : 16;
};

export const useResizablePreview = ({ enabled, videoRef }: ResizablePreviewOptions) => {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const cardPaddingRef = useRef(0);
  const cardExtrasHeightRef = useRef(0);
  const lastSizeRef = useRef<{ width: number; height: number } | null>(null);
  const [isFullscreenState, setIsFullscreenState] = useState(false);
  const isFullscreen = enabled && isFullscreenState;

  const applyScreenSize = useCallback(
    (width: number, height: number, options?: { syncCardWidth?: boolean; trackSize?: boolean }) => {
      const syncCardWidth = options?.syncCardWidth ?? true;
      const trackSize = options?.trackSize ?? true;
      if (trackSize) {
        lastSizeRef.current = { width, height };
      }
      if (previewRef.current) {
        previewRef.current.style.setProperty('--screen-width', `${width}px`);
        previewRef.current.style.setProperty('--screen-height', `${height}px`);
      }
      if (cardRef.current) {
        if (!syncCardWidth) return;
        const padding = cardPaddingRef.current;
        if (padding > 0) {
          cardRef.current.style.setProperty('--call-card-width', `${width + padding}px`);
        } else {
          cardRef.current.style.removeProperty('--call-card-width');
        }
      }
    },
    []
  );

  const clearScreenSize = useCallback(() => {
    if (previewRef.current) {
      previewRef.current.style.removeProperty('--screen-width');
      previewRef.current.style.removeProperty('--screen-height');
    }
    if (cardRef.current) {
      cardRef.current.style.removeProperty('--call-card-width');
    }
    lastSizeRef.current = null;
  }, []);

  const refreshCardPadding = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    const style = getComputedStyle(card);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const borderLeft = parseFloat(style.borderLeftWidth) || 0;
    const borderRight = parseFloat(style.borderRightWidth) || 0;
    cardPaddingRef.current = paddingLeft + paddingRight + borderLeft + borderRight;
  }, []);

  const getAspectRatio = useCallback(() => {
    const preview = previewRef.current;
    const video = videoRef?.current ?? preview?.querySelector('video');
    return getPreviewAspectRatio({
      video: video instanceof HTMLVideoElement ? video : null,
      preview,
    });
  }, [videoRef]);

  const getFullscreenSize = useCallback((ratio: number) => {
    return getFullscreenPreviewSize({
      ratio,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      padding: FULLSCREEN_PADDING_PX,
      horizontalInset: cardPaddingRef.current,
      verticalInset: cardExtrasHeightRef.current,
    });
  }, []);

  const handleResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (isFullscreen) return;
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
      const ratio = getAspectRatio();
      const minWidthBase = MIN_WIDTH_REM * rootFontSize;
      const minHeightBase = MIN_HEIGHT_REM * rootFontSize;
      const minWidth = Math.max(minWidthBase, minHeightBase * ratio);
      const maxHeightBase = MAX_HEIGHT_REM * rootFontSize;
      const maxWidthBase = Math.max(minWidth, window.innerWidth - VIEWPORT_PADDING_PX - cardPaddingRef.current);
      const maxWidth = Math.max(minWidth, Math.min(maxWidthBase, maxHeightBase * ratio));
      const startX = event.clientX;
      const startY = event.clientY;
      const startWidth = rect.width;
      const startHeight = rect.height;

      const handleMove = (moveEvent: PointerEvent) => {
        const widthFromX = startWidth + (startX - moveEvent.clientX);
        const widthFromY = (startHeight + (startY - moveEvent.clientY)) * ratio;
        const primaryWidth =
          Math.abs(widthFromX - startWidth) >= Math.abs(widthFromY - startWidth) ? widthFromX : widthFromY;
        const nextWidth = Math.min(maxWidth, Math.max(minWidth, primaryWidth));
        const nextHeight = nextWidth / ratio;
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
    [applyScreenSize, getAspectRatio, isFullscreen, refreshCardPadding]
  );

  const toggleFullscreen = useCallback(() => {
    const preview = previewRef.current;
    if (!preview) return;
    const card = cardRef.current;
    if (card && cardPaddingRef.current === 0) {
      refreshCardPadding();
    }
    const rect = preview.getBoundingClientRect();
    cardExtrasHeightRef.current = card ? Math.max(0, card.getBoundingClientRect().height - rect.height) : 0;
    const ratio = getAspectRatio();
    const nextIsFullscreen = !isFullscreenState;
    if (nextIsFullscreen) {
      lastSizeRef.current = { width: rect.width, height: rect.height };
      const { width, height } = getFullscreenSize(ratio);
      applyScreenSize(width, height, { trackSize: false });
      setIsFullscreenState(true);
      return;
    }
    cardExtrasHeightRef.current = 0;
    const lastSize = lastSizeRef.current;
    if (lastSize) {
      applyScreenSize(lastSize.width, lastSize.height, { trackSize: false });
    } else {
      applyScreenSize(rect.width, rect.height, { trackSize: true });
    }
    setIsFullscreenState(false);
  }, [applyScreenSize, getAspectRatio, getFullscreenSize, isFullscreenState, refreshCardPadding]);

  useEffect(() => {
    if (!enabled) {
      cardExtrasHeightRef.current = 0;
      clearScreenSize();
      return;
    }
    refreshCardPadding();
    if (previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect();
      applyScreenSize(rect.width, rect.height);
    }
  }, [applyScreenSize, clearScreenSize, enabled, refreshCardPadding]);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleResize = () => {
      const ratio = getAspectRatio();
      const { width, height } = getFullscreenSize(ratio);
      applyScreenSize(width, height, { trackSize: false });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [applyScreenSize, getAspectRatio, getFullscreenSize, isFullscreen]);

  return {
    previewRef,
    cardRef,
    handleResizeStart,
    isFullscreen,
    toggleFullscreen,
  };
};
