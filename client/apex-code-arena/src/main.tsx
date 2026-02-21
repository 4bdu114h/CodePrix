import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply theme immediately to avoid flash
const storedTheme = localStorage.getItem("theme");
if (storedTheme === "dark" || storedTheme === "light") {
  document.documentElement.classList.add(storedTheme);
} else {
  document.documentElement.classList.add("light");
}

createRoot(document.getElementById("root")!).render(<App />);
