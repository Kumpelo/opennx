import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import Dashboard from "@/pages/Dashboard";
import PayloadManager from "@/pages/PayloadManager";
import Updater from "@/pages/Updater";
import SdManager from "@/pages/SdManager";
import Configurations from "@/pages/Configurations";
import Doctor from "@/pages/Doctor";
import Backups from "@/pages/Backups";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto bg-background">
          <div className="flex w-full flex-col gap-5 p-5">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/updates" element={<Updater />} />
              <Route path="/updater" element={<Updater />} />
              <Route path="/payloads" element={<PayloadManager />} />
              <Route path="/configurations" element={<Configurations />} />
              <Route path="/doctor" element={<Doctor />} />
              <Route path="/backups" element={<Backups />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/sd" element={<SdManager />} />
            </Routes>
          </div>
        </main>
      </div>
      <Toaster richColors position="top-right" theme="dark" />
    </div>
  );
}
