'use client'

import { useEffect, useMemo, useRef, useState } from "react";
import { matchesSongQuery, type AppleMusicSong } from "./lrc";
import { CloseIcon, SearchIcon } from "./icons";
import { cn } from "@/lib/utils";

interface UpNextPanelProps {
  songs: AppleMusicSong[];
  currentIndex: number;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectSong: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onClose: () => void;
  playlistName: string;
  className?: string;
}

export default function UpNextPanel({
  songs,
  currentIndex,
  search,
  onSearchChange,
  onSelectSong,
  onReorder,
  onClose,
  playlistName,
  className,
}: UpNextPanelProps) {
  const filtered = useMemo(() => {
    const entries = songs.map((song, originalIndex) => ({ song, originalIndex }));
    return entries.filter(({ song }) => matchesSongQuery(song, search));
  }, [songs, search]);

  const isCurrentSong = (originalIndex: number) => originalIndex === currentIndex;
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const dragMovedRef = useRef(false);
  const pointerDragRef = useRef<{ fromIndex: number; startX: number; startY: number; startScrollTop: number; active: boolean } | null>(null);

  // 列表（关闭后）重新打开时，自动定位到当前播放的歌曲，避免每次都从第一首开始找
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const current = list.querySelector<HTMLElement>('[data-current="true"]');
    if (!current) return;
    const listRect = list.getBoundingClientRect();
    const itemRect = current.getBoundingClientRect();
    list.scrollTop += itemRect.top + itemRect.height / 2 - (listRect.top + listRect.height / 2);
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLLIElement>, originalIndex: number) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    pointerDragRef.current = {
      fromIndex: originalIndex,
      startX: event.clientX,
      startY: event.clientY,
      startScrollTop: listRef.current?.scrollTop ?? 0,
      active: false,
    };
    dragMovedRef.current = false;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLLIElement>) => {
    const drag = pointerDragRef.current;
    if (!drag) return;
    const deltaY = event.clientY - drag.startY;
    const deltaX = event.clientX - drag.startX;
    if (!drag.active) {
      if (Math.abs(deltaY) < 8 || Math.abs(deltaY) < Math.abs(deltaX)) return;
      drag.active = true;
      dragMovedRef.current = true;
      setDraggingIndex(drag.fromIndex);
    }
    event.preventDefault();
    const list = listRef.current;
    if (list) {
      const bounds = list.getBoundingClientRect();
      const edge = 72;
      if (event.clientY < bounds.top + edge) {
        list.scrollTop -= Math.max(4, (bounds.top + edge - event.clientY) / 3);
      } else if (event.clientY > bounds.bottom - edge) {
        list.scrollTop += Math.max(4, (event.clientY - (bounds.bottom - edge)) / 3);
      }
    }
    setDragOffset(deltaY + (list?.scrollTop ?? drag.startScrollTop) - drag.startScrollTop);
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-drag-index]");
    const targetIndex = Number(target?.dataset.dragIndex);
    if (Number.isInteger(targetIndex)) setDragOverIndex(targetIndex);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLLIElement>) => {
    const drag = pointerDragRef.current;
    pointerDragRef.current = null;
    if (drag?.active && dragOverIndex !== null && drag.fromIndex !== dragOverIndex) {
      onReorder(drag.fromIndex, dragOverIndex);
    }
    setDraggingIndex(null);
    setDragOverIndex(null);
    setDragOffset(0);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLLIElement>, originalIndex: number) => {
    const touch = event.touches[0];
    pointerDragRef.current = {
      fromIndex: originalIndex,
      startX: touch.clientX,
      startY: touch.clientY,
      startScrollTop: listRef.current?.scrollTop ?? 0,
      active: false,
    };
    dragMovedRef.current = false;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLLIElement>) => {
    const drag = pointerDragRef.current;
    if (!drag) return;
    const touch = event.touches[0];
    const deltaY = touch.clientY - drag.startY;
    const deltaX = touch.clientX - drag.startX;
    if (!drag.active) {
      if (Math.abs(deltaY) < 8 || Math.abs(deltaY) < Math.abs(deltaX)) return;
      drag.active = true;
      dragMovedRef.current = true;
      setDraggingIndex(drag.fromIndex);
    }
    event.preventDefault();
    updateDragPosition(touch.clientX, touch.clientY, deltaY, drag);
  };

  const handleTouchEnd = () => {
    const drag = pointerDragRef.current;
    pointerDragRef.current = null;
    if (drag?.active && dragOverIndex !== null && drag.fromIndex !== dragOverIndex) {
      onReorder(drag.fromIndex, dragOverIndex);
    }
    setDraggingIndex(null);
    setDragOverIndex(null);
    setDragOffset(0);
  };

  const updateDragPosition = (
    clientX: number,
    clientY: number,
    deltaY: number,
    drag: { startScrollTop: number },
  ) => {
    const list = listRef.current;
    if (list) {
      const bounds = list.getBoundingClientRect();
      const edge = 72;
      if (clientY < bounds.top + edge) {
        list.scrollTop -= Math.max(4, (bounds.top + edge - clientY) / 3);
      } else if (clientY > bounds.bottom - edge) {
        list.scrollTop += Math.max(4, (clientY - (bounds.bottom - edge)) / 3);
      }
    }
    setDragOffset(deltaY + (list?.scrollTop ?? drag.startScrollTop) - drag.startScrollTop);
    const target = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>("[data-drag-index]");
    const targetIndex = Number(target?.dataset.dragIndex);
    if (Number.isInteger(targetIndex)) setDragOverIndex(targetIndex);
  };

  const itemShift = (originalIndex: number) => {
    if (originalIndex === draggingIndex) return dragOffset;
    if (draggingIndex === null || dragOverIndex === null) return 0;
    const rowStep = 76;
    if (draggingIndex < dragOverIndex && originalIndex > draggingIndex && originalIndex <= dragOverIndex) return -rowStep;
    if (draggingIndex > dragOverIndex && originalIndex >= dragOverIndex && originalIndex < draggingIndex) return rowStep;
    return 0;
  };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-3xl border border-white/15 bg-black/60 text-white shadow-2xl backdrop-blur-2xl",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2 px-5 pt-5 pb-3">
        <div>
          <h2 className="text-base font-extrabold tracking-wide">继续播放</h2>
          <p className="mt-0.5 text-[11px] text-white/45">来自{playlistName} · {songs.length} 首</p>
        </div>
        <button
          type="button"
          aria-label="关闭播放列表"
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </header>

      {/* 搜索 */}
      <div className="shrink-0 px-5 pb-3">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2">
          <SearchIcon className="h-3.5 w-3.5 shrink-0 text-white/50" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索歌曲、歌手"
            autoComplete="off"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
          />
        </div>
      </div>

      {/* 歌曲列表 */}
      <div ref={listRef} className="am-queue-list custom-music-scroll flex-1 overflow-y-auto px-3 pb-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-white/40">
            没有找到匹配的歌曲
          </div>
        ) : (
          <ul className="space-y-1">
            {filtered.map(({ song, originalIndex }) => {
              const isActive = isCurrentSong(originalIndex);
              return (
                <li
                  key={`${song.url}-${originalIndex}`}
                  data-drag-index={originalIndex}
                  data-current={isActive ? "true" : "false"}
                  onPointerDown={(event) => handlePointerDown(event, originalIndex)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onTouchStart={(event) => handleTouchStart(event, originalIndex)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                  style={{
                    transform: `translateY(${itemShift(originalIndex)}px)`,
                    transition: draggingIndex === null ? "transform 180ms ease" : "transform 120ms ease",
                    touchAction: "pan-y",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (dragMovedRef.current) {
                        dragMovedRef.current = false;
                        return;
                      }
                      onSelectSong(originalIndex);
                    }}
                    className={cn(
                      "group flex w-full items-center gap-3.5 rounded-xl border-b border-white/10 px-2.5 py-3.5 text-left transition-colors",
                      isActive
                        ? "bg-white/10"
                        : "hover:bg-white/5",
                    )}
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white/10">
                      {song.cover ? (
                        <img
                          src={song.cover}
                          alt=""
                          aria-hidden
                          className="h-full w-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-lg text-white/25">♫</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-base font-semibold leading-tight", isActive ? "text-white" : "text-white/85")}>
                        {song.title || "Unknown Title"}
                      </p>
                      <p className="mt-1 truncate text-sm text-white/45">
                        {song.artist || "Unknown Artist"}
                      </p>
                    </div>
                    <span className="flex w-5 shrink-0 cursor-grab flex-col gap-1 opacity-35 active:cursor-grabbing" aria-hidden>
                      <span className="h-px w-4 bg-current" />
                      <span className="h-px w-4 bg-current" />
                      <span className="h-px w-4 bg-current" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}