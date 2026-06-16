import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ReleaseInfo {
  version: string;
  name: string;
  published_at: string;
  html_url: string;
}

interface VersionsState {
  atmos: ReleaseInfo | null;
  hekate: ReleaseInfo | null;
  setAtmos: (r: ReleaseInfo | null) => void;
  setHekate: (r: ReleaseInfo | null) => void;
}

export const useVersionsStore = create<VersionsState>()(
  persist(
    (set) => ({
      atmos: null,
      hekate: null,
      setAtmos: (atmos) => set({ atmos }),
      setHekate: (hekate) => set({ hekate }),
    }),
    { name: "opennx-versions" },
  ),
);
