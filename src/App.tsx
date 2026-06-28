import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const Prospects = lazy(() => import("./prospects"));
const AddProspect = lazy(() => import("./AddProspect"));

const Loader = () => (
  <div
    className="min-h-screen flex items-center justify-center"
    style={{ background: "linear-gradient(150deg, #020d18 0%, #041e30 55%, #061a0e 100%)" }}
  >
    <div className="w-12 h-12 border-4 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<Prospects />} />
          <Route path="/register" element={<AddProspect />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
