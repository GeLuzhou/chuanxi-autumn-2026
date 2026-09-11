import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import TripApp from "./app/trip-app";
import "./app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode><TripApp signedIn={false} /></StrictMode>,
);
