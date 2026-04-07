import ReactGA from "react-ga4";

export const initGA = () => {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID;
  // ✅ Check if ID exists and is a string before initializing
  if (id && typeof id === 'string' && id.startsWith('G-')) {
    try {
      ReactGA.initialize(id);
      console.log("GA Initialized");
    } catch (error) {
      console.error("GA Init Error:", error);
    }
  } else {
    console.warn("Analytics ID missing or invalid. App will run without tracking.");
  }
};

export const trackPage = (path: string) => {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (id && typeof id === 'string' && id.startsWith('G-')) {
    try {
      ReactGA.send({ hitType: "pageview", page: path });
    } catch (error) {
      // Silent fail
    }
  }
};