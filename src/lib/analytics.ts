import ReactGA from "react-ga4";

export const initGA = () => {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (id) {
    ReactGA.initialize(id);
  } else {
    console.warn("GA ID missing or invalid");
  }
};

export const trackPage = (path: string) => {
  if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
    ReactGA.send({ hitType: "pageview", page: path });
  }
};

export const trackEvent = (action: string, category: string, label?: string) => {
  ReactGA.event({
    action,
    category,
    label,
  });
};
