'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { LyricPlayer, BackgroundRender, type LyricPlayerRef } from "@applemusic-like-lyrics/react";
import type { LyricLine, OptimizeLyricOptions } from "@applemusic-like-lyrics/core";
import "@applemusic-like-lyrics/core/style.css";

import {
  coverForTexture,
  durationMsOf,
  fetchLyricLines,
  type AppleMusicPlaylist,
  type AppleMusicSong,
} from "./lrc";
import {
  CloseIcon,
  PauseIcon,
  PlayIcon,
  RepeatIcon,
  ShuffleIcon,
  SkipBackIcon,
  SkipForwardIcon,
  VolumeIcon,
} from "./icons";
import ProgressBar from "./ProgressBar";
import UpNextPanel from "./UpNextPanel";
import { cn } from "@/lib/utils";

interface MusicEngine {
  playlist: AppleMusicSong[];
  currentIndex: number;
  isPlaying: boolean;
  isShuffle: boolean;
  repeatMode: "all" | "one" | "off";
  activePlaylistId?: string;
  audio: HTMLAudioElement;
  loadSong: (index: number, autoPlay?: boolean) => void;
  togglePlay: () => void;
  prevSong: () => void;
  nextSong: (auto?: boolean) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  reorderPlaylist: (fromIndex: number, toIndex: number) => void;
}

interface AppleMusicPlayerProps {
  list: AppleMusicSong[];
  playlists: AppleMusicPlaylist[];
  playlistCounts: Record<string, number>;
  playlistSongs: Record<string, AppleMusicSong[]>;
  onClose?: () => void;
}

const FALLBACK_COVER = "/favicon.svg";

/* 以下对象必须以「模块级常量」形式定义：
 * amll-react 的 LyricPlayer 内部 effect 依赖这些 props 的引用，
 * 若在组件内每次渲染新建对象字面量，会反复触发 setLyricLines()/重设弹簧，
 * 导致歌词布局被持续重建，产生疯狂抖动。 */

const LYRIC_OPTIMIZE_OPTIONS: OptimizeLyricOptions = {
  normalizeSpaces: true,
  resetLineTimestamps: true,
  cleanUnintentionalOverlaps: true,
  tryAdvanceStartTime: true,
};

const LYRIC_STYLE = {
  "--amll-lp-color": "var(--am-lp-fg)",
  "--amll-lp-font-size": "clamp(28px, min(3.2vw, 5.6vh), 72px)",
} as CSSProperties;

const POS_X_SPRING = { mass: 1, damping: 20, stiffness: 140, soft: false };
const POS_Y_SPRING = { mass: 1, damping: 16, stiffness: 120, soft: false };
const SCALE_SPRING = { mass: 1, damping: 14, stiffness: 110, soft: false };

/* 已唱行两段式：先变暗滑到上方，停顿这么久之后再渐渐淡出 */
const LYRIC_FADE_HOLD_MS = 600;

/* Apple 歌词按钮的字形（来自 music.apple.com 的 lyrics-button） */
const LYRIC_GLYPH_PATH =
  "M17.347 62.821c1.254 0 2.21-.572 3.705-1.933L31.78 51.26h18.443C58.943 51.26 64 46.13 64 37.504V14.956C64 6.33 58.944 1.179 50.223 1.179H13.777C5.057 1.179 0 6.322 0 14.956v22.548C0 46.137 5.27 51.26 13.456 51.26h.994v8.327c0 1.97 1.095 3.235 2.897 3.235zm-.108-39.64c0-3.71 2.79-6.37 6.53-6.37 4.18 0 6.89 3.383 6.89 7.694 0 7.102-5.871 11.086-9.19 11.086-.917 0-1.596-.593-1.596-1.43 0-.742.387-1.242 1.403-1.474 2.4-.587 4.629-2.31 5.53-4.606h-.407c-.823.983-2.108 1.318-3.512 1.318-3.417 0-5.648-2.669-5.648-6.217zm16.387 0c0-3.71 2.77-6.37 6.508-6.37 4.18 0 6.912 3.383 6.912 7.694 0 7.102-5.871 11.086-9.179 11.086-.928 0-1.617-.593-1.617-1.43 0-.742.39-1.242 1.392-1.474 2.436-.587 4.654-2.31 5.551-4.606h-.407c-.823.983-2.108 1.318-3.523 1.318-3.405 0-5.637-2.669-5.637-6.217z";

/* 隐藏歌词时显示的图标（Apple 歌词按钮） */
const LYRIC_CLOSED_GLYPH_PATH =
  "m9.67 13.982-2.43 2.474c-.472.471-.79.675-1.145.675-.479 0-.623-.314-.623-1.012v-2.137H5.26c-1.406 0-1.915-.146-2.429-.42a2.88 2.88 0 0 1-1.192-1.192c-.274-.514-.421-1.024-.421-2.429V6.464c0-1.405.147-1.915.421-2.428a2.87 2.87 0 0 1 1.192-1.192c.514-.275 1.023-.421 2.429-.421h7.68c1.406 0 1.915.146 2.429.421a2.86 2.86 0 0 1 1.192 1.192c.274.513.421 1.023.421 2.428v3.477c0 1.405-.147 1.915-.421 2.429a2.87 2.87 0 0 1-1.192 1.192c-.514.274-1.023.42-2.429.42zm-.974-.957c.257-.261.608-.408.974-.408h3.27c1.076 0 1.426-.068 1.785-.26q.412-.22.631-.632c.192-.358.26-.709.26-1.784V6.464c0-1.075-.068-1.426-.26-1.784a1.5 1.5 0 0 0-.631-.631c-.359-.192-.709-.26-1.785-.26H5.26c-1.075 0-1.425.068-1.785.26a1.5 1.5 0 0 0-.631.631c-.192.358-.26.709-.26 1.784v3.477c0 1.075.068 1.426.26 1.784q.22.413.631.632c.36.192.71.26 1.785.26h.212c.754 0 1.365.611 1.365 1.365v.934zM5.422 8.01c0-.821.67-1.383 1.554-1.383.976 0 1.599.726 1.599 1.634 0 1.73-1.46 2.084-2.242 2.084-.222 0-.381-.148-.381-.329 0-.173.084-.294.372-.364.502-.12 1.005.028 1.274-.491h-.056c-.185.208-.483.242-.771.242-.837 0-1.349-.614-1.349-1.393m4.204 0c0-.821.669-1.383 1.553-1.383.976 0 1.6.726 1.6 1.634 0 1.73-1.46 2.084-2.242 2.084-.223 0-.381-.148-.381-.329 0-.173.084-.294.372-.364.502-.12 1.004.028 1.274-.491h-.056c-.186.208-.483.242-.772.242-.837 0-1.348-.614-1.348-1.393";

function getEngine(): MusicEngine | undefined {
  return (window as unknown as { globalMusicPlayer?: MusicEngine }).globalMusicPlayer;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const min = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${min}:${s.toString().padStart(2, "0")}`;
}

export default function AppleMusicPlayer({
  list,
  playlists,
  onClose,
}: AppleMusicPlayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lyricPlayerRef = useRef<LyricPlayerRef>(null);

  const lastTimeRef = useRef(-1);
  const lastDurationRef = useRef(-1);
  const songKeyRef = useRef<string>("");
  const lyricReqRef = useRef<AbortController | null>(null);
  const draggingRef = useRef(false);
  const playingRefCurrentRef = useRef(false);
  const indexRefCurrentRef = useRef(0);
  const lastSentTimeRef = useRef(-1);
  const lyricScrollSnapRef = useRef<number | null>(null);
  const lyricsBeforeQueueRef = useRef(true);

  const [index, setIndex] = useState(0);
  const [song, setSong] = useState<AppleMusicSong>(list[0] ?? {
    url: "",
    cover: "",
    title: "",
    artist: "",
  });
  const [songs, setSongs] = useState<AppleMusicSong[]>(list);
  const [playlistId, setPlaylistId] = useState("all");
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"all" | "one" | "off">("all");
  const [volume, setVolume] = useState(1);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [lyricLines, setLyricLines] = useState<LyricLine[] | null>(null);
  const [lyricsState, setLyricsState] = useState<"idle" | "loading" | "ready" | "none">("idle");

  const [queueOpen, setQueueOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showLyrics, setShowLyrics] = useState(true);

  const loadLyricsFor = useCallback(async (current: AppleMusicSong) => {
    lyricReqRef.current?.abort();
    const controller = new AbortController();
    lyricReqRef.current = controller;

    if (!current.url && !current.lrc) {
      setLyricLines(null);
      setLyricsState("none");
      return;
    }

    setLyricLines(null);
    setLyricsState("loading");

    const lines = await fetchLyricLines(current, controller.signal);
    if (controller.signal.aborted) return;
    const currentSong = getEngine()?.playlist[getEngine()?.currentIndex ?? -1];
    if (currentSong?.url !== current.url && currentSong?.lrc !== current.lrc) return;

    if (lines && lines.length > 0) {
      setLyricLines(lines);
      setLyricsState("ready");
    } else {
      setLyricLines(null);
      setLyricsState("none");
    }
  }, []);

  /** 当引擎的歌曲改变时同步 UI 状态 */
  const syncSong = useCallback(
    (eng: MusicEngine) => {
      const current = eng.playlist[eng.currentIndex];
      if (!current) return;
      setIndex(eng.currentIndex);
      setSong(current);
      const key = current.url || current.lrc || `${current.title}-${current.artist}`;
      if (key !== songKeyRef.current) {
        songKeyRef.current = key;
        void loadLyricsFor(current);
      }
      setShuffle(eng.isShuffle);
      setRepeat(eng.repeatMode);
      setPlaying(!eng.audio.paused);
      setPlaylistId(eng.activePlaylistId ?? "all");
    },
    [loadLyricsFor],
  );

  useEffect(() => {
    const eng = getEngine();
    if (eng) {
      setSongs(eng.playlist.length > 0 ? eng.playlist : list);
      setPlaylistId(eng.activePlaylistId ?? "all");
      setVolume(eng.audio.volume);
      syncSong(eng);
    }

    let raf = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const engine = getEngine();
      if (!engine || !engine.audio) return;

      const audio = engine.audio;

      // 同步歌曲变化（用于 client:only 初始挂载及事件兜底）
      if (songKeyRef.current === "") {
        syncSong(engine);
      }

      // 逐帧推进 AMLL 歌词动画（仅在毫秒变化时推进，避免无意义的重复写入）
      const amll = lyricPlayerRef.current?.lyricPlayer;
      if (amll) {
        const ms = Math.round(Math.max(0, audio.currentTime) * 1000);
        if (ms !== lastSentTimeRef.current) {
          lastSentTimeRef.current = ms;
          amll.setCurrentTime(ms);
        }

        // 已唱行两段式淡出：core 会自动把已唱行先变暗(.2)滑到上方并保持可见；
        // 这里在行唱完停顿 LYRIC_FADE_HOLD_MS 之后给该行加类，让 CSS 强制淡出（!important 压过行内 opacity）
        const groups = (amll as unknown as {
          currentLyricGroups?: { element: HTMLElement; endTime: number }[];
        }).currentLyricGroups;
        if (Array.isArray(groups)) {
          for (const g of groups) {
            if (g && g.element && Number.isFinite(g.endTime)) {
              g.element.classList.toggle(
                "am-lyric-fade-out",
                ms >= g.endTime + LYRIC_FADE_HOLD_MS,
              );
            }
          }
        }
      }

      // 节流更新播放时间显示
      if (Math.abs(audio.currentTime - lastTimeRef.current) >= 0.25) {
        lastTimeRef.current = audio.currentTime;
        setTime(audio.currentTime);
      }
      const dur = audio.duration;
      if (Number.isFinite(dur) && Math.abs(dur - lastDurationRef.current) >= 1) {
        lastDurationRef.current = dur;
        setDuration(dur);
      }

      // 播放状态兜底
      const nowPlaying = !audio.paused;
      if (nowPlaying !== playingRefCurrentRef.current) {
        playingRefCurrentRef.current = nowPlaying;
        setPlaying(nowPlaying);
      }
      if (engine.currentIndex !== indexRefCurrentRef.current) {
        indexRefCurrentRef.current = engine.currentIndex;
        syncSong(engine);
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [list, syncSong]);

  useEffect(() => {
    const eng = getEngine();
    if (eng) {
      playingRefCurrentRef.current = !eng.audio.paused;
      indexRefCurrentRef.current = eng.currentIndex;
    }
    return () => {
      lyricReqRef.current?.abort();
    };
  }, []);

  // 全屏占满整个视口：锁定页面滚动、隐藏站点导航栏/迷你播放器等浏览器外壳元素
  useEffect(() => {
    const body = document.body;
    body.classList.add("am-fullscreen-open");
    return () => {
      body.classList.remove("am-fullscreen-open");
    };
  }, []);

  // 引擎事件监听（快速响应）
  useEffect(() => {
    const onSongChange = () => {
      const eng = getEngine();
      if (eng) syncSong(eng);
    };
    const onPlayChange = () => {
      const eng = getEngine();
      if (eng) {
        setPlaying(!eng.audio.paused);
        setPlaylistId(eng.activePlaylistId ?? "all");
        setShuffle(eng.isShuffle);
        setRepeat(eng.repeatMode);
      }
    };
    const onControlChange = () => {
      const eng = getEngine();
      if (eng) {
        syncSong(eng);
        setSongs([...eng.playlist]);
      }
    };
    window.addEventListener("ryuchan:music:songchange", onSongChange);
    window.addEventListener("ryuchan:music:playchange", onPlayChange);
    window.addEventListener("ryuchan:music:controlchange", onControlChange);
    return () => {
      window.removeEventListener("ryuchan:music:songchange", onSongChange);
      window.removeEventListener("ryuchan:music:playchange", onPlayChange);
      window.removeEventListener("ryuchan:music:controlchange", onControlChange);
    };
  }, [syncSong]);

  // 用户拖动/滚动歌词后，空闲一段时间自动回弹对齐到当前高亮歌词行
  useEffect(() => {
    const el = lyricPlayerRef.current?.wrapperEl;
    if (!el) return;
    const clear = () => {
      if (lyricScrollSnapRef.current !== null) {
        window.clearTimeout(lyricScrollSnapRef.current);
        lyricScrollSnapRef.current = null;
      }
    };
    const schedule = (delay: number) => {
      clear();
      lyricScrollSnapRef.current = window.setTimeout(() => {
        lyricScrollSnapRef.current = null;
        const amll = lyricPlayerRef.current?.lyricPlayer;
        if (amll) amll.setCurrentTime(amll.getCurrentTime(), true);
      }, delay);
    };
    const onWheel = () => schedule(1400);
    const onTouchMove = () => schedule(1400);
    const onTouchEnd = () => schedule(2000);
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      clear();
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const togglePlay = useCallback(() => {
    getEngine()?.togglePlay();
  }, []);

  const seekTo = useCallback((sec: number) => {
    const eng = getEngine();
    if (!eng?.audio || !Number.isFinite(sec)) return;
    eng.audio.currentTime = Math.max(0, sec);
    lyricPlayerRef.current?.lyricPlayer?.setCurrentTime(Math.max(0, Math.round(sec * 1000)), true);
    setTime(sec);
  }, []);

  const selectSong = useCallback((idx: number) => {
    getEngine()?.loadSong(idx, true);
  }, []);

  const reorderPlaylist = useCallback((fromIndex: number, toIndex: number) => {
    const eng = getEngine();
    if (!eng || fromIndex === toIndex) return;
    eng.reorderPlaylist(fromIndex, toIndex);
    setSongs([...eng.playlist]);
    setIndex(eng.currentIndex);
  }, []);

  const toggleShuffle = useCallback(() => {
    const eng = getEngine();
    if (!eng) return;
    eng.toggleShuffle();
    setShuffle(eng.isShuffle);
    setRepeat(eng.repeatMode);
  }, []);

  const toggleRepeat = useCallback(() => {
    const eng = getEngine();
    if (!eng) return;
    eng.toggleRepeat();
    setShuffle(eng.isShuffle);
    setRepeat(eng.repeatMode);
  }, []);

  const handleLyricClick = useCallback(
    (startTime: number) => {
      if (Number.isFinite(startTime)) seekTo(startTime / 1000);
    },
    [seekTo],
  );

  const handleLyricLineClick = useCallback(
    (e: { line: { getLine: () => { startTime: number } } }) => {
      handleLyricClick(e.line.getLine().startTime);
    },
    [handleLyricClick],
  );

  const progress = duration > 0 ? time / duration : 0;
  const fallbackDuration = duration > 0 ? duration : (durationMsOf(song) / 1000);
  const displayDuration = fallbackDuration > 0 ? fallbackDuration : 0;
  const playlistName = playlists.find((playlist) => playlist.id === playlistId)?.name
    ?? playlists.find((playlist) => playlist.id === "all")?.name
    ?? "全部音乐";

  const restoreLyricsAfterQueue = useCallback(() => {
    setQueueOpen(false);
    setShowLyrics(lyricsBeforeQueueRef.current);
  }, []);

  return createPortal(
    <div
      ref={rootRef}
      className="am-player-root fixed inset-0 z-[999] flex min-h-[100dvh] flex-col overflow-hidden bg-black"
    >
      {/* ====== 背景层：Apple「转盘」流体画布 ====== */}
      <div className="dt-platter pointer-events-none absolute inset-0">
        <BackgroundRender
          album={coverForTexture(song.cover || FALLBACK_COVER)}
          playing={playing}
          flowSpeed={2}
          fps={20}
          renderScale={0.35}
          hasLyric={lyricsState === "ready"}
        />
      </div>
      {/* 前景可读性渐变 */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/50" />

      {/* ====== 顶栏：Apple 把关闭按钮固定在左上角 ====== */}
      <button
        type="button"
        onClick={onClose}
        title="关闭"
        aria-label="关闭"
        className="absolute left-5 top-5 z-20 grid h-9 w-9 place-items-center rounded-full text-[var(--am-fg)]/70 transition-colors hover:bg-white/10 hover:text-[var(--am-fg)] lg:h-8 lg:w-8"
      >
        <CloseIcon className="h-[18px] w-[18px]" />
      </button>
      <div className="am-view-toggle absolute bottom-[calc(12px+env(safe-area-inset-bottom))] left-1/2 z-20 flex -translate-x-1/2 items-center gap-6 md:bottom-5 md:left-auto md:right-5 md:translate-x-0 md:gap-2 lg:bottom-5 lg:right-5">
        <button
          type="button"
          data-testid="lyrics-button"
          aria-label="歌词"
          aria-pressed={showLyrics}
          title={showLyrics ? "隐藏歌词" : "显示歌词"}
          onClick={() => {
            if (queueOpen) {
              restoreLyricsAfterQueue();
            } else {
              setShowLyrics((v) => !v);
            }
          }}
          className={cn(
            "grid h-11 w-11 place-items-center rounded-full transition-colors md:h-10 md:w-10 lg:h-10 lg:w-10",
            showLyrics
              ? "bg-white/15 text-[var(--am-fg)]"
              : "text-[var(--am-fg)]/70 hover:bg-white/10 hover:text-[var(--am-fg)]",
          )}
        >
          {showLyrics ? (
            <svg
              data-testid="invertible-mask-svg"
              className="pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 36 36"
              width={36}
              height={36}
              role="presentation"
            >
              <mask data-testid="invertible-mask" id="am-lyrics-mask">
                <rect width="100%" height="100%" fill="white" />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 64 64"
                  width={24}
                  height={24}
                  x={6}
                  y={6}
                  fill="black"
                >
                  <path d={LYRIC_GLYPH_PATH} />
                </svg>
              </mask>
              <rect data-testid="invertible-mask-rect" width="100%" height="100%" rx="18" fill="currentColor" mask="url(#am-lyrics-mask)" />
            </svg>
          ) : (
            <svg
              data-testid="lyrics-glyph"
              className="pointer-events-none h-[26px] w-[26px]"
              xmlns="http://www.w3.org/2000/svg"
              xmlSpace="preserve"
              fillRule="evenodd"
              strokeLinejoin="round"
              strokeMiterlimit={2}
              clipRule="evenodd"
              viewBox="0 0 18 18"
              role="presentation"
            >
              <path fill="currentColor" d={LYRIC_CLOSED_GLYPH_PATH} />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            if (queueOpen) {
              restoreLyricsAfterQueue();
              return;
            }
            lyricsBeforeQueueRef.current = showLyrics;
            setShowLyrics(false);
            setQueueOpen(true);
          }}
          aria-label="待播清单"
          aria-expanded={queueOpen}
          data-testid="up-next-button"
          className={cn(
            "grid h-11 w-11 place-items-center rounded-full transition-colors lg:h-10 lg:w-10",
            queueOpen
              ? "bg-white/15 text-white"
              : "text-white/80 hover:bg-white/10 hover:text-white",
          )}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 18 18">
            <path fill="currentColor" d="M2.634 5.537a.906.906 0 1 0 0-1.813.906.906 0 1 0 0 1.813m3.192-.325h9.865a.576.576 0 0 0 .585-.578.58.58 0 0 0-.585-.585H5.826a.574.574 0 0 0-.585.585c0 .325.253.578.585.578M2.634 9.906c.506 0 .91-.404.91-.91a.906.906 0 0 0-.91-.91.906.906 0 0 0-.91.91c0 .506.405.91.91.91m3.192-.325h9.865a.582.582 0 1 0 0-1.162H5.826a.57.57 0 0 0-.585.577c0 .325.253.585.585.585m-3.192 4.694a.91.91 0 1 0-.001-1.82.91.91 0 0 0 0 1.82zm3.192-.332h9.865a.576.576 0 0 0 .585-.577.58.58 0 0 0-.585-.585H5.826a.574.574 0 0 0-.585.585c0 .324.253.577.585.577" />
          </svg>
        </button>
      </div>

      {/* ====== 主体：controls | lyrics 两列网格（参考 Apple 全屏歌词弹层） ====== */}
      <div
        className={cn(
          "am-player-grid relative z-10 mx-auto flex-1",
          !showLyrics && !queueOpen && "am-player-no-lyrics",
          showLyrics && !queueOpen && "am-player-with-lyrics",
          queueOpen && "am-player-with-queue",
        )}
      >
        {/* 左列：artwork / metadata / scrubber / transport / volume */}
        <section className="am-controls-col">
          {/* 封面 + radiosity 光晕 */}
          <div className="am-artwork relative">
            <div className="absolute -inset-x-24 -inset-y-16" aria-hidden>
              <div
                className="h-full w-full"
                style={{
                  background:
                    "radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,0.16), transparent 70%)",
                  filter: "blur(32px)",
                }}
              />
            </div>
            <img
              src={song.cover || FALLBACK_COVER}
              alt={song.title || "cover"}
              data-paused={!playing}
              className="am-artwork-cover relative aspect-square w-full object-cover ring-1 ring-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]"
              draggable={false}
            />
          </div>

          {/* 歌曲信息 */}
          <div className="am-meta mt-0.5 w-full text-center">
            <h2 className="truncate text-xl font-extrabold tracking-tight md:text-2xl lg:text-[28px]">
              {song.title || "Unknown Title"}
            </h2>
            <p className="mt-1 truncate text-sm font-semibold text-[var(--am-fg)]/60">
              {song.album
                ? `${song.artist || "Unknown Artist"} — ${song.album}`
                : (song.artist || "Unknown Artist")}
            </p>
          </div>

          {/* 进度条（独立一行） + 时长信息（进度条下方一行，两端对齐） */}
          <div className="am-scrubber w-full">
            <ProgressBar
              value={progress}
              onSeekStart={() => {
                draggingRef.current = true;
              }}
              onSeek={(r) => {
                const eng = getEngine();
                const dur = Number(eng?.audio?.duration) || 0;
                if (eng?.audio && dur > 0) {
                  const t = r * dur;
                  eng.audio.currentTime = t;
                  setTime(t);
                  lyricPlayerRef.current?.lyricPlayer?.setCurrentTime(Math.max(0, Math.round(t * 1000)), true);
                }
              }}
              onSeekEnd={() => {
                draggingRef.current = false;
              }}
            />
            <div className="mt-1.5 flex items-center justify-between text-[11px] font-bold text-[var(--am-fg)]/80 tabular-nums">
              <span>{formatTime(time)}</span>
              <span>
                {displayDuration > 0 && time <= displayDuration
                  ? `-${formatTime(displayDuration - time)}`
                  : (displayDuration > 0 ? formatTime(displayDuration) : song.duration || "--:--")}
              </span>
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="am-transport flex items-center gap-5 md:gap-6">
            <button
              type="button"
              onClick={toggleShuffle}
              aria-label="随机播放"
              aria-pressed={shuffle}
              className={cn(
                "grid h-9 w-16 place-items-center rounded-full transition-[background-color,color,transform] duration-150 hover:scale-105 active:scale-95",
                shuffle
                  ? "text-white drop-shadow-[0_0_18px_rgba(255,255,255,1)]"
                  : "text-white/35 hover:text-white/60",
              )}
            >
              <ShuffleIcon className="h-[18px] w-[18px]" />
            </button>

            <button
              type="button"
              onClick={() => getEngine()?.prevSong()}
              aria-label="上一首"
              className="grid h-10 w-10 place-items-center rounded-full transition-transform hover:scale-110 active:scale-95"
            >
              <SkipBackIcon className="h-10 w-11" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "暂停" : "播放"}
              className="grid h-16 w-16 place-items-center transition-transform hover:scale-105 active:scale-95 md:h-[72px] md:w-[72px]"
            >
              {playing ? (
                <PauseIcon className="h-10 w-11 md:h-11 md:w-12" />
              ) : (
                <PlayIcon className="ml-0.5 h-10 w-11 md:h-11 md:w-12" />
              )}
            </button>

            <button
              type="button"
              onClick={() => getEngine()?.nextSong(false)}
              aria-label="下一首"
              className="grid h-10 w-10 place-items-center rounded-full transition-transform hover:scale-110 active:scale-95"
            >
              <SkipForwardIcon className="h-10 w-11" />
            </button>

            <button
              type="button"
              onClick={toggleRepeat}
              aria-label="循环模式"
              aria-pressed={repeat !== "off"}
              className={cn(
                "relative grid h-9 w-16 place-items-center rounded-full transition-[background-color,color,transform] duration-150 hover:scale-105 active:scale-95",
                repeat !== "off"
                  ? "text-white drop-shadow-[0_0_18px_rgba(255,255,255,1)]"
                  : "text-white/35 hover:text-white/60",
              )}
            >
              <RepeatIcon className="h-[18px] w-[18px]" />
              {repeat === "one" && (
                <span className="absolute right-0 top-0 grid h-4 w-4 place-items-center rounded-full bg-[var(--am-fg)] text-[9px] font-black leading-none text-[var(--am-fg-inv)]">
                  1
                </span>
              )}
            </button>
          </div>

          {/* 音量：与上方进度条同宽、同列对齐；轨道与进度条同高 */}
          <div className="am-volume mt-2 flex w-full items-center gap-2">
            <VolumeIcon className="h-4 w-4 shrink-0 opacity-60" />
            <ProgressBar
              className="flex-1"
              value={volume}
              onSeek={(r) => {
                const eng = getEngine();
                if (eng?.audio) {
                  eng.audio.volume = r;
                  setVolume(r);
                }
              }}
            />
          </div>
        </section>

        {/* 右列：待播列表优先，其次显示歌词 */}
        {queueOpen ? (
          <section className="am-queue-col">
            <UpNextPanel
              songs={songs}
              currentIndex={index}
              search={search}
              onSearchChange={setSearch}
              onSelectSong={selectSong}
              onReorder={reorderPlaylist}
              onClose={restoreLyricsAfterQueue}
              playlistName={playlistName}
              className="am-queue-panel h-full w-full"
            />
          </section>
        ) : showLyrics && (
          <section className="am-lyrics-col">
          <div className="am-lyrics-inner h-full w-full">
            <LyricPlayer
              ref={lyricPlayerRef}
              lyricLines={lyricLines ?? undefined}
              playing={playing}
              alignPosition={0.4}
              wordFadeWidth={0.6}
              enableSpring
              enableBlur
              enableScale
              linePosYSpringParams={POS_Y_SPRING}
              linePosXSpringParams={POS_X_SPRING}
              lineScaleSpringParams={SCALE_SPRING}
              onLyricLineClick={handleLyricLineClick}
              optimizeOptions={LYRIC_OPTIMIZE_OPTIONS}
              className="h-full w-full px-4 lg:px-8"
              style={LYRIC_STYLE}
            />

            {/* 歌词占位状态 */}
            {lyricsState !== "ready" && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 px-6 text-center">
                  <div
                    className={cn(
                      "text-sm font-bold tracking-wide opacity-70",
                      lyricsState === "loading" && "animate-pulse",
                    )}
                  >
                    {lyricsState === "loading" && "正在加载歌词…"}
                    {lyricsState === "none" && "纯音乐，请您欣赏"}
                    {lyricsState === "idle" && "暂无歌词"}
                  </div>
                </div>
              </div>
            )}
          </div>
          </section>
        )}
      </div>
      </div>,
    document.body,
  );
}