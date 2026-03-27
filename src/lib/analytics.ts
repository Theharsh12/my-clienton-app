import ReactGA from "react-ga4";
export const initGA = () => {
  ReactGA.initialize(import.meta.env.VITE_GA_MEASUREMENT_ID);
};

export const trackPage = (path: string) => {
  ReactGA.send({ hitType: "pageview", page: path });
};

export const trackEvent = (action: string, category: string, label?: string) => {
  ReactGA.event({
    action,
    category,
    label,
  });
};