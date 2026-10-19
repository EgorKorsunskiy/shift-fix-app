import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@/i18n";
import { Providers } from "@/app/providers";
import { AppRouter } from "@/app/router";
import "./index.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Providers>
        <AppRouter />
      </Providers>
    </StrictMode>,
  );
}
