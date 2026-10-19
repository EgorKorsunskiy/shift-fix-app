import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import fr from "./fr.json";
import nl from "./nl.json";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      nl: { translation: nl },
      fr: { translation: fr },
    },
    fallbackLng: "en",
    supportedLngs: ["nl", "fr", "en"],
    load: "languageOnly",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "shiftfix.lang",
      caches: ["localStorage"],
    },
  });

export default i18n;
