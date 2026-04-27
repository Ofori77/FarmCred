"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "twi" | "fr";

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    theme: "Theme",
    language: "Language",
    logout: "Logout",
    logoutDevice: "Log out on this device",
    light: "Light",
    english: "English",
    twi: "Twi",
    french: "French",
    general_settings: "General Settings",
    appearance: "Appearance",
    dark_mode: "Dark Mode",
    select_language: "Select Language",
    export_data: "Export Data",
    export_investment_data_csv: "Export Investment Data (CSV)",
    search_placeholder: "Search...",
    all: "All",
    region: "Region",
    trust_score: "Trust Score",
    trust_above_60: "Above 60",
    trust_below_60: "Below 60",
    crops: "Crops",
    loading_farmers: "Loading available farmers...",
    error_loading_farmers: "Failed to load available farmers",
    no_farmers_available: "No farmers available",
    farmer_id: "Farmer ID",
    name: "Name",
    produce: "Produce",
    phone_number: "Phone Number",
    investment_status: "Investment Status",
    action: "Action",
    no_investment: "No investment",
    view_details: "View Details",
    invest_in_farmer: "Invest in Farmer",
    are_you_sure_you_want_to_invest_in: "Are you sure you want to invest in",
    yes: "Yes",
    no: "No",
    farmer_profile: "Farmer Profile",
    loading_detailed_profile: "Loading detailed profile...",
    full_name: "Full Name",
    phone: "Phone",
    account_ID: "Account ID",
    national_ID: "National ID",
    date_of_birth: "Date of Birth",
    home_address: "Home Address",
    country: "Country",
    trust_level: "Trust Level",
    stars: "stars",
    total_income_12mo: "Total Income (12mo)",
    transactions: "Transactions",
    transfers: "Transfers",
    loans: "Loans",
    basic_profile_information_displayed: "Basic profile information displayed.",
    detailed_transaction_and_loan_history_available:
      "Detailed transaction and loan history available upon full profile load.",
    close: "Close",
    welcome: "Welcome,",
    investments: "My Investments",
    settings: "Settings",
    notifications: "Notifications",
    notifications_settings: "Notifications",
    my_account: "My Account",
    get_help: "Get Help",
    browse_farmers: "Browse Farmers",
    reviews: "Reviews",
    visibility_to_investors: "Visibility To Investors",
    make_profile_visible: "Make Profile Visible"
    // Add more keys as needed
  },
  twi: {
    theme: "Tema",
    language: "Kasa",
    logout: "Pue",
    logoutDevice: "Pue wɔ saa fon yi so",
    light: "Kɛse",
    dark_mode: "Tuntum",
    english: "Borɔfo",
    twi: "Twi",
    french: "Frɛnkye",
    general_settings: "Ntotoho Titiriw",
    appearance: "Nhwɛso",
    select_language: "Paw Kasa",
    export_data: "Tua Data",
    export_investment_data_csv: "Tua Sika Gu So (CSV)",
    search_placeholder: "Hwehwɛ...",
    all: "Nyinara",
    region: "Mantam",
    trust_score: "Gyidi Nkyerɛkyerɛmu",
    trust_above_60: "Soro 60",
    trust_below_60: "Sɛe 60",
    crops: "Amoa",
    loading_farmers: "Retreting wɔn a wɔyɛ mmerɛ sofo no...",
    error_loading_farmers: "Ɛnkɔ yiye wɔ mmerɛ sofo no ho",
    no_farmers_available: "Nni mmerɛ sofo",
    farmer_id: "Sofo ID",
    name: "Din",
    produce: "Amoa",
    phone_number: "Fɔn nɔma",
    investment_status: "Sika Gu So Status",
    action: "Nwoma",
    no_investment: "Sika nni ho",
    view_details: "Hwɛ Nsɛm Foforɔ",
    invest_in_farmer: "Gu Sika Gu So Ma Sofo No",
    are_you_sure_you_want_to_invest_in:
      "So wugye di sɛ wopɛ sɛ wode wo sika hyɛ mu",
    yes: "Aane",
    no: "Daabi",
    farmer_profile: "Aponofo Ho Nsɛm",
    loading_detailed_profile: "Retɔ farmer ho nsɛm kɛse...",
    full_name: "Din a ɛwɔ ho nyinaa",
    phone: "Fɔn Nɔma",
    account_ID: "Akawnt ID",
    national_ID: "Omanfo ID",
    date_of_birth: "Awo da",
    home_address: "Fie Fie",
    country: "Ɔman",
    trust_level: "Gyedi Nnivɔ",
    stars: "nsoromma",
    total_income_12mo: "Sika a wanya mfeɛ baako mu",
    transactions: "Nwomaso",
    transfers: "Sika fam",
    loans: "Ka (Sika a wabo)",
    basic_profile_information_displayed: "Yɛda ho nsɛm titiriw adi",
    detailed_transaction_and_loan_history_available:
      "Nsɛm kɛse fa nwomaso ne ka ho bɛda ho akyiri.",
    close: "To Mu",
    welcome: "Akwaaba,",
    investments: "M’agyapadeɛ",
    settings: "Ntɛntɛyɛmu",
    notifications: "Nkrataa",
    notifications_settings: "Nkrataa",
    my_account: "Me akawnt",
    get_help: "Mmoa",
    browse_farmers: "Hwehwɛ Nnɔbaefoɔ",
    reviews: "Nsɛnhyɛsoɔ",
    // Add more keys as needed
  },
  fr: {
    theme: "Thème",
    language: "Langue",
    logout: "Déconnexion",
    logoutDevice: "Déconnexion sur cet appareil",
    light: "Clair",
    dark: "Sombre",
    english: "Anglais",
    twi: "Twi",
    french: "Français",
    general_settings: "Paramètres Généraux",
    appearance: "Apparence",
    dark_mode: "Mode Sombre",
    select_language: "Choisir la langue",
    export_data: "Exporter les données",
    export_investment_data_csv: "Exporter les données d’investissement (CSV)",
    search_placeholder: "Rechercher...",
    all: "Tous",
    region: "Région",
    trust_score: "Score de confiance",
    trust_above_60: "Plus de 60",
    trust_below_60: "Moins de 60",
    crops: "Cultures",
    loading_farmers: "Chargement des agriculteurs disponibles...",
    error_loading_farmers: "Échec du chargement des agriculteurs",
    no_farmers_available: "Aucun agriculteur disponible",
    farmer_id: "ID de l'agriculteur",
    name: "Nom",
    produce: "Produits",
    phone_number: "Numéro de téléphone",
    investment_status: "Statut d'investissement",
    action: "Action",
    no_investment: "Aucun investissement",
    view_details: "Voir les détails",
    invest_in_farmer: "Investir dans l'agriculteur",
    are_you_sure_you_want_to_invest_in:
      "Êtes-vous sûr de vouloir investir dans",
    yes: "Oui",
    no: "Non",
    farmer_profile: "Profil de l’agriculteur",
    loading_detailed_profile: "Chargement du profil détaillé...",
    full_name: "Nom complet",
    phone: "Téléphone",
    account_ID: "Identifiant de compte",
    national_ID: "Carte d’identité nationale",
    date_of_birth: "Date de naissance",
    home_address: "Adresse domicile",
    country: "Pays",
    trust_level: "Niveau de confiance",
    stars: "étoiles",
    total_income_12mo: "Revenu total (12 mois)",
    transactions: "Transactions",
    transfers: "Transferts",
    loans: "Prêts",
    basic_profile_information_displayed: "Informations de base affichées",
    detailed_transaction_and_loan_history_available:
      "L’historique détaillé sera affiché après chargement du profil complet",
    close: "Fermer",
    welcome: "Bienvenue,",
    investments: "Mes investissements",
    settings: "Paramètres",
    notifications: "Notifications",
    notifications_settings: "Notifications",
    my_account: "Mon compte",
    get_help: "Obtenir de l'aide",
    browse_farmers: "Parcourir les agriculteurs",
    reviews: "Avis",
    // Add more keys as needed
  },
};

const LanguageContext = createContext<LanguageContextProps | undefined>(
  undefined
);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("en");

  const t = (key: string) => translations[language][key] || key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context)
    throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};
