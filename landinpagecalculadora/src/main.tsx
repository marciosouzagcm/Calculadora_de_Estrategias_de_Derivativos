import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// O main.tsx deve apenas montar a aplicação no DOM
createRoot(document.getElementById("root")!).render(<App />);