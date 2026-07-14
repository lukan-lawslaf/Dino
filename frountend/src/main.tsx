import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";

import { ThemeProvider } from "./lib/theme";
import { AuthProvider } from "./lib/auth";
import Landing from "./pages/Landing";
import Encyclopedia from "./pages/Encyclopedia";
import Detail from "./pages/Detail";
import Compare from "./pages/Compare";
import News from "./pages/News";

const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/encyclopedia", element: <Encyclopedia /> },
  { path: "/dinosaurs/:name", element: <Detail /> },
  { path: "/compare", element: <Compare /> },
  { path: "/news", element: <News /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
