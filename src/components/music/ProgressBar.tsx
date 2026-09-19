'use client'

import { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  /** 进度 0~1 */
  value: number;
  /** 拖拽是否可用 */
  disabled?: boolean;
  /** 拖拽开始时触发 */
  onSeekStart?: () => void;
  /** 拖拽/点击调整进度 */
  onSeek?: (ratio: number) => void;
  /** 拖拽结束 */
  onSeekEnd?: () => void;
  /** 紧凑模式（音量条等） */
  compact?: boolean;
  /** 轨道内部的填充颜色，默认跟随当前文字颜色 */
  accent?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * 类 Apple Music 进度条：细轨道 + 悬停显示圆点，支持指针拖拽
 */
export default function ProgressBar({
  value,
  disabled = false,
  onSeekStart,
  onSeek,
  onSeekEnd,
  compact = false,
  accent,
  className,
  ariaLabel,
}: ProgressBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const rounded = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

  const ratioFromClientX = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    onSeekStart?.();
    onSeek?.(ratioFromClientX(e.clientX));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    onSeek?.(ratioFromClientX(e.clientX));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    onSeekEnd?.();
  };

  const height = compact ? "h-1.5" : "h-[5px]";

  return (
    <div
      ref={trackRef}
      aria-label={ariaLabel}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(rounded * 100)}
      className={cn(
        "group relative flex w-full cursor-pointer touch-none items-center select-none",
        disabled && "cursor-default",
        className,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className={cn("w-full rounded-full overflow-hidden", height, "bg-[rgba(128,128,128,0.35)]")}>
        <div
          className={cn("h-full rounded-full transition-[width] duration-100 ease-linear")}
          style={{
            width: `${rounded * 100}%`,
            backgroundColor: accent ?? "currentColor",
          }}
        />
      </div>
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full shadow-md transition-opacity duration-150",
          compact ? "h-2.5 w-2.5" : "h-3 w-3",
          disabled && "hidden",
        )}
        style={{
          left: `${rounded * 100}%`,
          backgroundColor: accent ?? "currentColor",
        }}
      />
    </div>
  );
}