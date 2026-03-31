import { createRoot } from "react-dom/client";

const el = document.getElementById("root");

if (!el) {
  console.error("ROOT NOT FOUND");
} else {
  console.log("ROOT FOUND");
}

createRoot(el!).render(<h1>TEST WORKING</h1>);