import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import pt from "./locales/pt.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        pt: { translation: pt },
        en: { translation: en },
        es: { translation: es },
        fr: { translation: fr },
      },
      lng: "pt",
      fallbackLng: "pt",
      supportedLngs: ["pt", "en", "es", "fr"],
      interpolation: { escapeValue: false },
    });
}

export default i18n;