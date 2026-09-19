'use client'

import { useEffect, useState } from "react";
import type { AppleMusicPlaylist, AppleMusicSong } from "./lrc";
import AppleMusicPlayer from "./AppleMusicPlayer";

interface EngineLike {
  playlist: AppleMusicSong[];
  currentIndex: number;
  loadSong: (index: number, autoPlay?: boolean) => void;
  /** 播放列表顺序被替换后，让页面内的列表重新按新顺序渲染 */
  renderPlaylistList?: () => void;
}

interface MusicFullscreenLauncherProps {
  list: AppleMusicSong[];
  playlists: AppleMusicPlaylist[];
  playlistCounts: Record<string, number>;
  playlistSongs: Record<string, AppleMusicSong[]>;
}

function getEngine(): EngineLike | undefined {
  return (window as unknown as { globalMusicPlayer?: EngineLike }).globalMusicPlayer;
}

export default function MusicFullscreenLauncher({
  list,
  playlists,
  playlistCounts,
  playlistSongs,
}: MusicFullscreenLauncherProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ index?: number }>).detail;
      let index = typeof detail?.index === "number" ? detail.index : -1;
      const eng = getEngine();
      if (eng) {
        if (index < 0 || index >= list.length) {
          const current = eng.playlist[eng.currentIndex];
          const match = current ? list.findIndex((s) => s.url === current.url) : -1;
          index = match >= 0 ? match : 0;
        }
        eng.playlist = list;
        eng.loadSong(index, true);
        // 列表顺序被替换，页面内列表需要同步，否则点击列表项会播到错误的歌曲
        eng.renderPlaylistList?.();
      }
      setOpen(true);
    };
    window.addEventListener("ryuchan:music:open-fullscreen", onOpen);
    return () => window.removeEventListener("ryuchan:music:open-fullscreen", onOpen);
  }, [list]);

  if (!open) return null;

  return (
    <AppleMusicPlayer
      onClose={() => setOpen(false)}
      list={list}
      playlists={playlists}
      playlistCounts={playlistCounts}
      playlistSongs={playlistSongs}
    />
  );
}