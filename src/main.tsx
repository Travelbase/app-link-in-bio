import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Amigo frames the editor under Content. Without a portal sign-in the frame lands on a login
// page that refuses to be framed, so saying "running" is how Amigo tells the two apart and
// shows its sign-in notice. Only a fact about this app, so any parent may hear it.
if (window.parent !== window) window.parent.postMessage({ type: "link-in-bio:ready" }, "*");
