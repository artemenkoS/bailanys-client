export interface PreviewAspectRatioOptions {
  video?: HTMLVideoElement | null;
  preview?: HTMLElement | null;
  fallback?: number;
}

export const getPreviewAspectRatio = ({ video, preview, fallback = 16 / 9 }: PreviewAspectRatioOptions) => {
  const videoWidth = video?.videoWidth ?? 0;
  const videoHeight = video?.videoHeight ?? 0;
  if (videoWidth > 0 && videoHeight > 0) return videoWidth / videoHeight;
  if (preview) {
    const rect = preview.getBoundingClientRect();
    if (rect.height > 0) return rect.width / rect.height;
  }
  return fallback;
};

export interface FullscreenPreviewSizeOptions {
  ratio: number;
  viewportWidth: number;
  viewportHeight: number;
  padding: number;
  horizontalInset?: number;
  verticalInset?: number;
}

export const getFullscreenPreviewSize = ({
  ratio,
  viewportWidth,
  viewportHeight,
  padding,
  horizontalInset = 0,
  verticalInset = 0,
}: FullscreenPreviewSizeOptions) => {
  const safeRatio = ratio > 0 ? ratio : 16 / 9;
  const maxWidth = Math.max(0, viewportWidth - padding * 2 - horizontalInset);
  const maxHeight = Math.max(0, viewportHeight - padding * 2 - verticalInset);
  if (maxWidth === 0 || maxHeight === 0) return { width: 0, height: 0 };
  let width = maxWidth;
  let height = width / safeRatio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * safeRatio;
  }
  return { width, height };
};
