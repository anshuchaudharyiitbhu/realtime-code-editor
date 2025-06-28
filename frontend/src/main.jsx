import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; // Don't forget this

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <>
    {/* <ToastContainer> */}
    <App />
    <ToastContainer/>
    </>
  </StrictMode>
);
