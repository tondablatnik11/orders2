"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
// Importy pro práci s datumy a časy
import {
  format,
  isBefore,
  startOfDay,
  differenceInDays,
  getHours,
  subDays,
  startOfMonth,
  endOfMonth,
  isAfter,
  parseISO,
  addDays,
} from "date-fns";
// Importy pro grafy z Recharts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Sector,
  AreaChart,
  Area,
  Brush,
} from "recharts";
// Importy ikon z Lucide React
import {
  FileDown,
  UploadCloud,
  BarChart3,
  TimerReset,
  ClipboardList,
  Globe,
  Sun,
  Moon,
  Lock,
  History,
  Trash2,
  Search,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  XCircle,
  List,
  UserPlus,
  Ticket,
  Send,
  CheckCircle,
  Mail,
  User, // Ikona pro profil
  MessageSquare, // Ikona pro chat
  Save, // Ikona pro uložení
} from "lucide-react";
// Import Supabase Client
import { createClient } from '@supabase/supabase-js';
// Firebase Imports
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  signInAnonymously,
  signInWithCustomToken,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';

// Supabase Configuration
const SUPABASE_URL = "https://ucgiatobbjnqertgtmsw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjZ2lhdG9iYmpucWVydGd0bXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMTg1MjgsImV4cCI6MjA2Njg5NDUyOH0.EgqlPh4VHPsmHEII1snAmJgyZBp8rkf6u5N7SAxA4zs";

// Globální instance Supabase klienta
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Jednoduché Card komponenty pro konzistentní stylování (Tailwind CSS)
const Card = ({ children, className = "" }) => (
  <div className={`p-4 border border-gray-700 rounded-xl mb-4 bg-gray-800 shadow-xl ${className}`}>
    {children}
  </div>
);
const CardContent = ({ children, className = "" }) => (
  <div className={`p-6 space-y-2 ${className}`}>{children}</div>
);

// Pomocná funkce pro parsování datumů (primárně ISO stringů z DB, fallback pro Excel čísla)
const parseExcelDate = (dateInput) => {
  if (typeof dateInput === "number" && typeof window.XLSX !== 'undefined' && typeof window.XLSX.SSF !== 'undefined') {
    try {
      const parsed = window.XLSX.SSF.parse_date_code(dateInput);
      const date = new Date(parsed.y, parsed.m - 1, parsed.d);
      if (!isNaN(date.getTime())) return date;
    } catch (e) {
      console.warn("Failed to parse Excel date number:", dateInput, e);
    }
  } else if (typeof dateInput === "string") {
    // Zkusí parsovat ISO string (z DB)
    try {
      const isoParsed = parseISO(dateInput);
      if (!isNaN(isoParsed.getTime())) return isoParsed;
    } catch (e) {
      // Fallback pro jiné string formáty, např. dd/MM/yyyy, dd.MM.yyyy
    }
    const parts = dateInput.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
    if (parts) {
      const date = new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]));
      if (!isNaN(date.getTime())) return date;
    }
    // Poslední pokus s Date konstruktorem
    const directParsed = new Date(dateInput);
    if (!isNaN(directParsed.getTime())) return directParsed;
  }
  return null;
};

// Helper function for getting current shift
const getCurrentShift = (date) => {
  const hours = date.getHours();
  const minutes = date.getMinutes();

  const shift1Start = 5 * 60 + 45;
  const shift1End = 13 * 60 + 45;

  const shift2Start = 13 * 60 + 45;
  const shift2End = 21 * 60 + 45;

  const currentTimeInMinutes = hours * 60 + minutes;

  if (currentTimeInMinutes >= shift1Start && currentTimeInMinutes < shift1End) {
    return 1;
  } else if (currentTimeInMinutes >= shift2Start && currentTimeInMinutes < shift2End) {
    return 2;
  }
  return null;
};

// Translation object pro více jazyků (Čeština, Angličtina, Němčina)
const translations = {
  cz: {
    title: "Přehled zakázek",
    upload: "Nahrát soubor",
    export: "Export do PDF",
    total: "Zakázky",
    done: "Hotovo",
    remaining: "Zbývá",
    inProgress: "V procesu",
    newOrders: "Nové",
    pallets: "Palety",
    carton: "Karton",
    delayed: "Zpožděné zakázky",
    sentPallets: "Odesláno palet",
    sentCartons: "Odesláno balíků",
    statuses: "Statusy celkem",
    types: "Typy dodávek",
    switchLang: "EN",
    langCode: "CZ",
    switchTheme: "Světlý režim",
    uploadFilePrompt: "Nahraj soubor pro zobrazení dat.",
    ordersOverTime: "Zakázky v čase",
    statusDistribution: "Rozložení statusů",
    orderTypes: "Typy dodávek",
    deliveryNo: "Číslo dodávky",
    status: "Status",
    deliveryType: "Typ dodávky",
    loadingDate: "Datum nakládky",
    delay: "Zpoždění (dny)",
    note: "Poznámka",
    loginTitle: "Přihlášení",
    username: "Uživatelské jméno",
    password: "Heslo",
    loginButton: "Přihlásit se",
    loginError: "Nesprávné uživatelské jméno nebo heslo.",
    logout: "Odhlásit se",
    totalDelayed: "Celkem zpožděných",
    shift: "Směna",
    hourlyOverview: "Hodinový přehled (dnešní den)",
    shift1: "Směna 1 (5:45 - 13:45)",
    shift2: "Směna 2 (13:45 - 21:45)",
    currentShift: "Aktuální směna",
    noShift: "Mimo směnu",
    history: "Historie importů",
    selectImport: "Vyber import",
    importTime: "Čas importu",
    fileName: "Název souboru",
    deleteConfirm: "Opravdu chcete smazat tento import?",
    yes: "Ano",
    no: "Ne",
    inProgressOnly: "V procesu",
    shipments: "Odeslané zakázky",
    showMore: "Zobrazit více",
    showLess: "Zobrazit méně",
    moreItems: "dalších",
    searchDelivery: "Vyhledat zakázku",
    enterDeliveryNo: "Zadejte číslo dodávky",
    deliveryDetails: "Detaily dodávky",
    deliveryNotFound: "Dodávka nenalezena.",
    forwardingAgent: "Jméno dopravce",
    shipToPartyName: "Jméno příjemce",
    totalWeight: "Celková hmotnost",
    close: "Zavřít",
    filters: "Filtry dat",
    timeRange: "Časový rozsah",
    allTime: "Celá historie",
    last7Days: "Posledních 7 dní",
    thisMonth: "Tento měsíc",
    customRange: "Vlastní rozsah",
    applyFilters: "Použít filtry",
    clearFilters: "Vymazat filtry",
    filterByDeliveryType: "Filtrovat dle typu dodávky",
    filterByStatus: "Filtrovat dle statusu",
    barChart: "Sloupcový graf",
    pieChart: "Koláčový graf",
    lineChart: "Čárový graf",
    stackedBarChart: "Skládaný sloupcový graf",
    shiftComparison: "Srovnání směn (Hotovo)",
    shift1Name: "Ranní směna",
    shift2Name: "Odpolední směna",
    toggleFilters: "Filtry",
    noDataAvailable: "Žádná data k zobrazení.",
    statusHistory: "Historie stavů",
    processingTime: "Doba zpracování",
    exportToXLSX: "Export do XLSX",
    exportToCSV: "Export do CSV",
    selectImportsToCompare: "Vyberte importy k porovnání",
    import1: "Import 1",
    import2: "Import 2",
    compare: "Porovnat",
    comparisonResults: "Výsledky porovnání",
    noComparisonSelected: "Vyberte dva importy k porovnání.",
    noChangesDetected: "Nebyly detekovány žádné změny stavů mezi vybranými importy.",
    transferCreated: "Přenos vytvořen",
    readyForPicking: "Zakázka připravena na pickování",
    picked: "Zakázka dopickovaná",
    packed: "Zakázka zabalena",
    readyForCarrier: "Zakázka připravena pro dopravce",
    onTheWay: "Zakázka na cestě k zákazníkovi",
    dashboardTab: "Dashboard",
    delayedOrdersTab: "Zpožděné zakázky",
    importComparisonTab: "Porovnání importů",
    orderSearchTab: "Vyhledávání zakázek",
    orderList: "Seznam zakázek",
    orderListFor: "Seznam zakázek pro",
    new_order: "Nová zakázka (status",
    removed_order: "Odstraněná zakázka (status",
    orders: "zakázek",
    filterByNameOfShipToParty: "Filtrovat dle jména příjemce",
    man: "MAN",
    daimler: "Daimler",
    volvo: "Volvo",
    iveco: "Iveco",
    scania: "Scania",
    daf: "DAF",
    searchOrders: "Vyhledat zakázky",
    noOrdersFound: "Žádné zakázky nebyly nalezeny pro zadaná kritéria.",
    billOfLading: "Nákladní list",
    selectDate: "Vyberte datum",
    today: "Dnes",
    yesterday: "Včera",
    older: "Starší",
    future: "Budoucí",
    dailySummary: "Denní souhrn",
    register: "Registrovat se",
    registerTitle: "Registrace nového účtu",
    registerSuccess: "Účet byl úspěšně vytvořen! Nyní se můžete přihlásit.",
    registerError: "Chyba při registraci účtu:",
    ticketsTab: "Tickety",
    createTicket: "Vytvořit nový úkol",
    ticketTitle: "Název úkolu",
    ticketDescription: "Popis úkolu",
    assignTo: "Přiřadit komu",
    assignedTo: "Přiřazeno",
    statusTicket: "Status",
    createdBy: "Vytvořil",
    createdAt: "Vytvořeno",
    markAsCompleted: "Označit jako hotové",
    open: "Otevřené",
    completed: "Hotové",
    noUsersFound: "Žádní uživatelé k přiřazení.",
    ticketCreatedSuccess: "Úkol úspěšně vytvořen!",
    ticketUpdateSuccess: "Úkol úspěšně aktualizován!",
    ticketError: "Chyba při operaci s úkolem:",
    all: "Vše",
    googleSignIn: "Přihlásit se přes Google",
    profileTab: "Profil",
    yourName: "Vaše jméno",
    yourFunction: "Vaše funkce",
    saveProfile: "Uložit profil",
    profileUpdated: "Profil úspěšně aktualizován!",
    profileError: "Chyba při aktualizaci profilu:",
    chatTab: "Chat",
    sendMessage: "Odeslat zprávu",
    noMessages: "Zatím žádné zprávy.",
    typeMessage: "Napište svou zprávu...",
    adminStatus: "Administrátor",
    notAdminStatus: "Uživatel",
  },
  en: {
    title: "Order Overview",
    upload: "Upload file",
    export: "Export to PDF",
    total: "Orders",
    done: "Completed",
    remaining: "Remaining",
    inProgress: "In Progress",
    newOrders: "New",
    pallets: "Pallets",
    carton: "Cartons",
    delayed: "Delayed Orders",
    sentPallets: "Pallets Sent",
    sentCartons: "Cartons Sent",
    statuses: "Total Statuses",
    types: "Delivery Types",
    switchLang: "DE",
    langCode: "EN",
    switchTheme: "Dark Mode",
    uploadFilePrompt: "Upload a file to display data.",
    ordersOverTime: "Orders Over Time",
    statusDistribution: "Status Distribution",
    orderTypes: "Order Types",
    deliveryNo: "Delivery No.",
    status: "Status",
    deliveryType: "Delivery Type",
    loadingDate: "Loading Date",
    delay: "Delay (days)",
    note: "Note",
    loginTitle: "Login",
    username: "Username",
    password: "Password",
    loginButton: "Login",
    loginError: "Incorrect username or password.",
    logout: "Logout",
    totalDelayed: "Total Delayed",
    shift: "Shift",
    hourlyOverview: "Hourly Overview (Today)",
    shift1: "Shift 1 (5:45 AM - 1:45 PM)",
    shift2: "Shift 2 (1:45 PM - 9:45 PM)",
    currentShift: "Current Shift",
    noShift: "Outside Shift",
    history: "Import History",
    selectImport: "Select Import",
    importTime: "Import Time",
    fileName: "File Name",
    deleteConfirm: "Are you sure you want to delete this import?",
    yes: "Yes",
    no: "No",
    inProgressOnly: "In Progress",
    shipments: "Shipments",
    showMore: "Show more",
    showLess: "Show less",
    moreItems: "more",
    searchDelivery: "Search Order",
    enterDeliveryNo: "Enter Delivery No.",
    deliveryDetails: "Delivery Details",
    deliveryNotFound: "Delivery not found.",
    forwardingAgent: "Forwarding Agent Name",
    shipToPartyName: "Name of Ship-to Party",
    totalWeight: "Total Weight",
    close: "Close",
    filters: "Data Filters",
    timeRange: "Time Range",
    allTime: "All Time",
    last7Days: "Last 7 Days",
    thisMonth: "This Month",
    customRange: "Custom Range",
    applyFilters: "Apply Filters",
    clearFilters: "Clear Filters",
    filterByDeliveryType: "Filter by Delivery Type",
    filterByStatus: "Filter by Status",
    barChart: "Bar Chart",
    pieChart: "Pie Chart",
    lineChart: "Line Chart",
    stackedBarChart: "Stacked Bar Chart",
    shiftComparison: "Shift Comparison (Completed)",
    shift1Name: "Morning Shift",
    shift2Name: "Afternoon Shift",
    toggleFilters: "Filters",
    noDataAvailable: "No data available.",
    statusHistory: "Status History",
    processingTime: "Processing Time",
    exportToXLSX: "Export to XLSX",
    exportToCSV: "Export to CSV",
    selectImportsToCompare: "Select imports to compare",
    import1: "Import 1",
    import2: "Import 2",
    compare: "Compare",
    comparisonResults: "Comparison Results",
    noComparisonSelected: "Select two imports to compare.",
    noChangesDetected: "No status changes detected between selected imports.",
    transferCreated: "Transfer Created",
    readyForPicking: "Order Ready for Picking",
    picked: "Order Picked",
    packed: "Order Packed",
    readyForCarrier: "Order Ready for Carrier",
    onTheWay: "Order On the Way to Customer",
    dashboardTab: "Dashboard",
    delayedOrdersTab: "Delayed Orders",
    importComparisonTab: "Import Comparison",
    orderSearchTab: "Order Search",
    orderList: "Order List",
    orderListFor: "Order List for",
    new_order: "New order (status",
    removed_order: "Removed order (status",
    orders: "orders",
    filterByNameOfShipToParty: "Filter by Name of Ship-to Party",
    man: "MAN",
    daimler: "Daimler",
    volvo: "Volvo",
    iveco: "Iveco",
    scania: "Scania",
    daf: "DAF",
    searchOrders: "Search Orders",
    noOrdersFound: "No orders found for the given criteria.",
    billOfLading: "Bill of lading",
    selectDate: "Select Date",
    today: "Today",
    yesterday: "Yesterday",
    older: "Older",
    future: "Future",
    dailySummary: "Daily Summary",
    register: "Register",
    registerTitle: "Register New Account",
    registerSuccess: "Account created successfully! You can now log in.",
    registerError: "Error registering account:",
    ticketsTab: "Tickets",
    createTicket: "Create New Ticket",
    ticketTitle: "Ticket Title",
    ticketDescription: "Ticket Description",
    assignTo: "Assign To",
    assignedTo: "Assigned To",
    statusTicket: "Status",
    createdBy: "Created By",
    createdAt: "Created At",
    markAsCompleted: "Mark as Completed",
    open: "Open",
    completed: "Completed",
    noUsersFound: "No users found to assign.",
    ticketCreatedSuccess: "Ticket created successfully!",
    ticketUpdateSuccess: "Ticket updated successfully!",
    ticketError: "Error performing ticket operation:",
    all: "All",
    googleSignIn: "Sign in with Google",
    profileTab: "Profile",
    yourName: "Your Name",
    yourFunction: "Your Function",
    saveProfile: "Save Profile",
    profileUpdated: "Profile updated successfully!",
    profileError: "Error updating profile:",
    chatTab: "Chat",
    sendMessage: "Send Message",
    noMessages: "No messages yet.",
    typeMessage: "Type your message...",
    adminStatus: "Administrator",
    notAdminStatus: "User",
  },
  de: {
    title: "Auftragsübersicht",
    upload: "Datei hochladen",
    export: "Als PDF exportieren",
    total: "Aufträge",
    done: "Abgeschlossen",
    remaining: "Verbleibend",
    inProgress: "In Bearbeitung",
    newOrders: "Neu",
    pallets: "Paletten",
    carton: "Kartons",
    delayed: "Verspätete Aufträge",
    sentPallets: "Gesendete Paletten",
    sentCartons: "Gesendete Kartons",
    statuses: "Gesamtstatus",
    types: "Lieferarten",
    switchLang: "CZ",
    langCode: "DE",
    switchTheme: "Dunkler Modus",
    uploadFilePrompt: "Laden Sie eine Datei hoch, um Daten anzuzeigen.",
    ordersOverTime: "Aufträge im Zeitverlauf",
    statusDistribution: "Statusverteilung",
    orderTypes: "Auftragsarten",
    deliveryNo: "Liefernummer",
    status: "Status",
    deliveryType: "Lieferart",
    loadingDate: "Ladedatum",
    delay: "Verzögerung (Tage)",
    note: "Notiz",
    loginTitle: "Anmeldung",
    username: "Benutzername",
    password: "Passwort",
    loginButton: "Anmelden",
    loginError: "Falscher Benutzername oder Passwort.",
    logout: "Abmelden",
    totalDelayed: "Gesamt verspätet",
    shift: "Schicht",
    hourlyOverview: "Stündliche Übersicht (Heute)",
    shift1: "Schicht 1 (5:45 - 13:45 Uhr)",
    shift2: "Schicht 2 (13:45 - 21:45 Uhr)",
    currentShift: "Aktuelle Schicht",
    noShift: "Außerhalb der Schicht",
    history: "Importverlauf",
    selectImport: "Import auswählen",
    importTime: "Importzeit",
    fileName: "Dateiname",
    deleteConfirm: "Möchten Sie diesen Import wirklich löschen?",
    yes: "Ja",
    no: "Nein",
    inProgressOnly: "In Bearbeitung",
    shipments: "Lieferungen",
    showMore: "Mehr anzeigen",
    showLess: "Weniger anzeigen",
    moreItems: "weitere",
    searchDelivery: "Auftrag suchen",
    enterDeliveryNo: "Liefernummer eingeben",
    deliveryDetails: "Lieferdetails",
    deliveryNotFound: "Lieferung nicht gefunden.",
    forwardingAgent: "Spediteur Name",
    shipToPartyName: "Name des Empfängers",
    totalWeight: "Gesamtgewicht",
    close: "Schließen",
    filters: "Datenfilter",
    timeRange: "Zeitbereich",
    allTime: "Gesamte Zeit",
    last7Days: "Letzte 7 Tage",
    thisMonth: "Dieser Monat",
    customRange: "Benutzerdefinierter Bereich",
    applyFilters: "Filter anwenden",
    clearFilters: "Filter löschen",
    filterByDeliveryType: "Nach Lieferart filtern",
    filterByStatus: "Nach Status filtern",
    barChart: "Balkendiagramm",
    pieChart: "Tortendiagramm",
    lineChart: "Liniendiagramm",
    stackedBarChart: "Gestapeltes Balkendiagramm",
    shiftComparison: "Schichtvergleich (Abgeschlossen)",
    shift1Name: "Morgenschicht",
    shift2Name: "Nachmittagsschicht",
    toggleFilters: "Filter",
    noDataAvailable: "Keine Daten verfügbar.",
    statusHistory: "Statusverlauf",
    processingTime: "Bearbeitungszeit",
    exportToXLSX: "Als XLSX exportieren",
    exportToCSV: "Als CSV exportieren",
    selectImportsToCompare: "Wählen Sie Importe zum Vergleich aus",
    import1: "Import 1",
    import2: "Import 2",
    compare: "Vergleichen",
    comparisonResults: "Vergleichsergebnisse",
    noComparisonSelected: "Wählen Sie zwei Importe zum Vergleich aus.",
    noChangesDetected: "Es wurden keine Statusänderungen zwischen den ausgewählten Importen erkannt.",
    transferCreated: "Übertragung erstellt",
    readyForPicking: "Auftrag zur Kommissionierung bereit",
    picked: "Auftrag kommissioniert",
    packed: "Auftrag verpackt",
    readyForCarrier: "Auftrag für Spediteur bereit",
    onTheWay: "Auftrag unterwegs zum Kunden",
    dashboardTab: "Dashboard",
    delayedOrdersTab: "Verspätete Aufträge",
    importComparisonTab: "Importvergleich",
    orderSearchTab: "Auftragssuche",
    orderList: "Seznam zakázek",
    orderListFor: "Seznam zakázek pro",
    new_order: "Neuer Auftrag (Status",
    removed_order: "Entfernter Auftrag (Status",
    orders: "Aufträge",
    filterByNameOfShipToParty: "Nach Name des Empfängers filtern",
    man: "MAN",
    daimler: "Daimler",
    volvo: "Volvo",
    iveco: "Iveco",
    scania: "Scania",
    daf: "DAF",
    searchOrders: "Aufträge suchen",
    noOrdersFound: "Keine Aufträge für die angegebenen Kriteria gefunden.",
    billOfLading: "Frachtbrief",
    selectDate: "Datum auswählen",
    today: "Heute",
    yesterday: "Gestern",
    older: "Älter",
    future: "Zukunft",
    dailySummary: "Tageszusammenfassung",
    register: "Registrieren",
    registerTitle: "Neues Konto registrieren",
    registerSuccess: "Konto erfolgreich erstellt! Sie können sich jetzt anmelden.",
    registerError: "Fehler bei der Kontoerstellung:",
    ticketsTab: "Tickety",
    createTicket: "Neues Ticket erstellen",
    ticketTitle: "Ticket Titel",
    ticketDescription: "Ticket Beschreibung",
    assignTo: "Zuweisen an",
    assignedTo: "Zugewiesen an",
    statusTicket: "Status",
    createdBy: "Erstellt von",
    createdAt: "Erstellt am",
    markAsCompleted: "Als abgeschlossen markieren",
    open: "Offen",
    completed: "Abgeschlossen",
    noUsersFound: "Keine Benutzer zum Zuweisen gefunden.",
    ticketCreatedSuccess: "Ticket erfolgreich erstellt!",
    ticketUpdateSuccess: "Ticket erfolgreich aktualisiert!",
    ticketError: "Fehler bei der Ticketoperation:",
    all: "Alle",
    googleSignIn: "Mit Google anmelden",
    profileTab: "Profil",
    yourName: "Ihr Name",
    yourFunction: "Ihre Funktion",
    saveProfile: "Profil speichern",
    profileUpdated: "Profil erfolgreich aktualisiert!",
    profileError: "Fehler beim Aktualisieren des Profils:",
    chatTab: "Chat",
    sendMessage: "Nachricht senden",
    noMessages: "Noch keine Nachrichten.",
    typeMessage: "Geben Sie Ihre Nachricht ein...",
    adminStatus: "Administrator",
    notAdminStatus: "Benutzer",
  },
};

// Definice konzistentní barevné palety pro grafy
const CHART_COLORS = [
  '#FFFFFF',
  '#EF4444',
  '#3B82F6',
  '#F59E0B',
  '#10B981',
  '#3498DB',
  '#9B59B6',
  '#28A745',
  '#218838',
  '#FFC107',
  '#FF9800',
  '#FF5722',
];

// Barvy pro kategorie dat v skládaných grafech
const DATE_CATEGORY_COLORS = {
  'Today': '#3498DB',
  'Yesterday': '#9B59B6',
  'Older': '#E74C3C',
  'Future': '#2ECC71',
};

// Mapování statusů na textové popisy pro porovnání importů
const STATUS_TRANSITIONS = {
  '10_to_31': 'transferCreated',
  '31_to_35': 'readyForPicking',
  '35_to_40': 'picked',
  '40_to_50': 'packed',
  '50_to_60': 'readyForCarrier',
  '60_to_70': 'onTheWay',
};

// Komponenta pro zobrazení detailů jedné zakázky
const OrderDetailsModal = ({ order, onClose, onShowStatusHistory, onSaveNote, t }) => {
  const [note, setNote] = useState(order.Note || '');

  useEffect(() => {
    setNote(order.Note || '');
  }, [order.Note]);

  const handleNoteBlur = () => {
    if (note !== order.Note) {
      onSaveNote(order["Delivery No"], note);
    }
  };

  // Zajištění, že datum je platné před formátováním
  let formattedLoadingDate = 'N/A';
  if (order["Loading Date"]) {
    try {
      const parsedDate = parseISO(order["Loading Date"]);
      if (!isNaN(parsedDate.getTime())) {
        formattedLoadingDate = format(parsedDate, 'dd/MM/yyyy');
      }
    } catch (e) {
      console.error("Error parsing loading date in OrderDetailsModal:", e, order["Loading Date"]);
    }
  }

  return (
    <Modal title={t.deliveryDetails} onClose={onClose}>
      {order ? (
        <div className="space-y-3 text-gray-200">
          <p><strong>{t.deliveryNo}:</strong> {order["Delivery No"]}</p>
          <p><strong>{t.status}:</strong> {order.Status}</p>
          <p><strong>{t.deliveryType}:</strong> {order["del.type"]}</p>
          <p><strong>{t.loadingDate}:</strong> {formattedLoadingDate}</p>
          <p><strong>{t.forwardingAgent}:</strong> {order["Forwarding agent name"] || 'N/A'}</p>
          <p><strong>{t.shipToPartyName}:</strong> {order["Name of ship-to party"] || 'N/A'}</p>
          <p><strong>{t.totalWeight}:</strong> {order["Total Weight"] || 'N/A'}</p>
          <p><strong>{t.billOfLading}:</strong> {order["Bill of lading"] || 'N/A'}</p>
          <div>
            <strong>{t.note}:</strong>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={handleNoteBlur}
              className="w-full p-1 rounded-md bg-gray-600 border border-gray-500 text-gray-100 text-sm focus:ring-blue-500 focus:border-blue-500 mt-1"
              placeholder={t.note}
            />
          </div>
          {order.processingTime && <p><strong>{t.processingTime}:</strong> {order.processingTime}</p>}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => onShowStatusHistory(order["Delivery No"])}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <History className="w-5 h-5" /> {t.statusHistory}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-400">{t.deliveryNotFound}</p>
      )}
    </Modal>
  );
};

// Komponenta pro modální okno
const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
    <div className="bg-gray-800 rounded-xl shadow-2xl p-6 relative w-full max-w-3xl max-h-[90vh] overflow-y-auto">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
        title="Close"
      >
        <XCircle className="w-6 h-6" />
      </button>
      <h2 className="text-2xl font-bold mb-4 text-blue-400 text-center">{title}</h2>
      {children}
    </div>
  </div>
);

// Komponenta pro zobrazení seznamu zakázek v modalu
const OrderListTable = ({ orders, onSelectOrder, t }) => (
  <div className="overflow-x-auto mt-4">
    {orders.length > 0 ? (
      <table className="min-w-full bg-gray-700 rounded-lg overflow-hidden">
        <thead className="bg-gray-600">
          <tr>
            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">{t.deliveryNo}</th>
            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">{t.status}</th>
            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">{t.deliveryType}</th>
            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">{t.loadingDate}</th>
            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">{t.forwardingAgent}</th>
            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">{t.shipToPartyName}</th>
            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">{t.totalWeight}</th>
            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">{t.billOfLading}</th>
            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">{t.note}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => {
            let formattedLoadingDate = 'N/A';
            if (order["Loading Date"]) {
              try {
                const parsedDate = parseISO(order["Loading Date"]);
                if (!isNaN(parsedDate.getTime())) {
                  formattedLoadingDate = format(parsedDate, 'dd/MM/yyyy');
                }
              } catch (e) {
                console.error("Error parsing loading date in OrderListTable:", e, order["Loading Date"]);
              }
            }
            return (
              <tr
                key={order["Delivery No"] || index}
                className={`border-t border-gray-600 cursor-pointer ${index % 2 === 0 ? "bg-gray-750" : "bg-gray-700"} hover:bg-gray-600 transition-colors`}
                onClick={() => onSelectOrder(order)}
              >
                <td className="py-3 px-4 text-gray-200">{order["Delivery No"]}</td>
                <td className="py-3 px-4 text-gray-200">{order.Status}</td>
                <td className="py-3 px-4 text-gray-200">{order["del.type"]}</td>
                <td className="py-3 px-4 text-gray-200">{formattedLoadingDate}</td>
                <td className="py-3 px-4 text-gray-200">{order["Forwarding agent name"] || 'N/A'}</td>
                <td className="py-3 px-4 text-gray-200">{order["Name of ship-to party"] || 'N/A'}</td>
                <td className="py-3 px-4 text-gray-200">{order["Total Weight"] || 'N/A'}</td>
                <td className="py-3 px-4 text-gray-200">{order["Bill of lading"] || 'N/A'}</td>
                <td className="py-3 px-4 text-gray-200">{order.Note || 'N/A'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    ) : (
      <p className="text-center text-gray-400">{t.noDataAvailable}</p>
    )}
  </div>
);

// Komponenta pro ticketovací systém
const TicketsTab = ({ t, currentUser, allUsers, db, appId }) => { // Pass db and appId as props
  const [tickets, setTickets] = useState([]);
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketDescription, setNewTicketDescription] = useState('');
  const [newTicketAssignee, setNewTicketAssignee] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketMessageType, setTicketMessageType] = useState(''); // 'success' or 'error'

  useEffect(() => {
    if (!db || !appId) {
      console.warn("Firestore or App ID not available for tickets tab.");
      return;
    }

    const ticketsColRef = collection(db, `artifacts/${appId}/public/data/tickets`);
    const q = query(ticketsColRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTickets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTickets(fetchedTickets);
    }, (error) => {
      console.error("Error fetching tickets:", error);
      setTicketMessage(`${t.ticketError} ${error.message}`);
      setTicketMessageType('error');
    });

    return () => unsubscribe();
  }, [db, appId, t]); // Add db and appId to dependencies

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!db || !appId || !newTicketTitle || !newTicketDescription || !newTicketAssignee || !currentUser) {
      setTicketMessage(`${t.ticketError} Vyplňte všechna pole a ujistěte se, že jste přihlášeni.`);
      setTicketMessageType('error');
      return;
    }

    try {
      await addDoc(collection(db, `artifacts/${appId}/public/data/tickets`), {
        title: newTicketTitle,
        description: newTicketDescription,
        assignedTo: newTicketAssignee,
        status: 'Open',
        createdBy: currentUser.uid,
        createdByName: currentUser.email, // Store name for display
        createdAt: new Date().toISOString(),
      });
      setNewTicketTitle('');
      setNewTicketDescription('');
      setNewTicketAssignee('');
      setTicketMessage(t.ticketCreatedSuccess);
      setTicketMessageType('success');
    } catch (error) {
      console.error("Error creating ticket:", error);
      setTicketMessage(`${t.ticketError} ${error.message}`);
      setTicketMessageType('error');
    }
  };

  const handleMarkAsCompleted = async (ticketId) => {
    if (!db || !appId) {
      setTicketMessage(`${t.ticketError} Firestore není inicializován.`);
      setTicketMessageType('error');
      return;
    }
    try {
      const ticketRef = doc(db, `artifacts/${appId}/public/data/tickets`, ticketId);
      await updateDoc(ticketRef, {
        status: 'Completed',
        completedAt: new Date().toISOString(),
      });
      setTicketMessage(t.ticketUpdateSuccess);
      setTicketMessageType('success');
    } catch (error) {
      console.error("Error updating ticket status:", error);
      setTicketMessage(`${t.ticketError} ${error.message}`);
      setTicketMessageType('error');
    }
  };

  return (
    <Card>
      <CardContent>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-purple-400">
          <Ticket className="w-6 h-6" /> {t.ticketsTab}
        </h2>

        {ticketMessage && (
          <div className={`p-3 mb-4 rounded-md text-sm ${ticketMessageType === 'success' ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100'}`}>
            {ticketMessage}
          </div>
        )}

        <form onSubmit={handleCreateTicket} className="space-y-4 mb-8 p-4 border border-gray-700 rounded-lg bg-gray-750">
          <h3 className="text-xl font-semibold text-blue-300 mb-3">{t.createTicket}</h3>
          <div>
            <label htmlFor="ticket-title" className="block text-sm font-medium text-gray-300 mb-1">{t.ticketTitle}:</label>
            <input
              type="text"
              id="ticket-title"
              value={newTicketTitle}
              onChange={(e) => setNewTicketTitle(e.target.value)}
              className="w-full p-2 rounded-md bg-gray-600 border border-gray-500 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t.ticketTitle}
            />
          </div>
          <div>
            <label htmlFor="ticket-description" className="block text-sm font-medium text-gray-300 mb-1">{t.ticketDescription}:</label>
            <textarea
              id="ticket-description"
              value={newTicketDescription}
              onChange={(e) => setNewTicketDescription(e.target.value)}
              className="w-full p-2 rounded-md bg-gray-600 border border-gray-500 text-gray-100 focus:ring-blue-500 focus:border-blue-500 h-24 resize-y"
              placeholder={t.ticketDescription}
            />
          </div>
          <div>
            <label htmlFor="ticket-assignee" className="block text-sm font-medium text-gray-300 mb-1">{t.assignTo}:</label>
            <select
              id="ticket-assignee"
              value={newTicketAssignee}
              onChange={(e) => setNewTicketAssignee(e.target.value)}
              className="w-full p-2 rounded-md bg-gray-600 border border-gray-500 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t.selectImport}</option> {/* Reusing selectImport for "Select User" */}
              {allUsers.length > 0 ? (
                allUsers.map(user => (
                  <option key={user.uid} value={user.uid}>
                    {user.email} ({user.displayName || 'N/A'})
                  </option>
                ))
              ) : (
                <option value="" disabled>{t.noUsersFound}</option>
              )}
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" /> {t.createTicket}
          </button>
        </form>

        <h3 className="text-xl font-semibold text-white mb-3">Seznam úkolů</h3>
        <div className="overflow-x-auto">
          {tickets.length > 0 ? (
            <table className="min-w-full bg-gray-700 rounded-lg overflow-hidden">
              <thead className="bg-gray-600">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">{t.ticketTitle}</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">{t.ticketDescription}</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">{t.assignedTo}</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">{t.statusTicket}</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">{t.createdBy}</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">{t.createdAt}</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">Akce</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket, index) => (
                  <tr key={ticket.id} className={`border-t border-gray-600 ${index % 2 === 0 ? "bg-gray-750" : "bg-gray-700"}`}>
                    <td className="py-3 px-4 text-gray-200">{ticket.title}</td>
                    <td className="py-3 px-4 text-gray-200 text-sm">{ticket.description}</td>
                    <td className="py-3 px-4 text-gray-200">
                      {allUsers.find(u => u.uid === ticket.assignedTo)?.displayName || ticket.assignedTo}
                    </td>
                    <td className="py-3 px-4 text-gray-200">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        ticket.status === 'Open' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                      }`}>
                        {ticket.status === 'Open' ? t.open : t.completed}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-200 text-sm">{allUsers.find(u => u.uid === ticket.createdBy)?.displayName || ticket.createdByName || 'N/A'}</td>
                    <td className="py-3 px-4 text-gray-200 text-sm">{format(parseISO(ticket.createdAt), 'dd/MM/yyyy HH:mm')}</td>
                    <td className="py-3 px-4">
                      {ticket.status === 'Open' && currentUser && ticket.assignedTo === currentUser.uid && (
                        <button
                          onClick={() => handleMarkAsCompleted(ticket.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700 transition-colors flex items-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" /> {t.markAsCompleted}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-400">{t.noDataAvailable}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Komponenta pro nastavení profilu
const ProfileSettingsTab = ({ t, currentUser, currentUserProfile, updateUserProfile, db, appId }) => {
  const [displayName, setDisplayName] = useState('');
  const [userFunction, setUserFunction] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileMessageType, setProfileMessageType] = useState('');

  useEffect(() => {
    if (currentUserProfile) {
      setDisplayName(currentUserProfile.displayName || '');
      setUserFunction(currentUserProfile.function || '');
    }
  }, [currentUserProfile]);

  const handleSaveProfile = async () => {
    if (!currentUser || !db || !appId) {
      setProfileMessage(`${t.profileError} Uživatel není přihlášen nebo Firebase není inicializován.`);
      setProfileMessageType('error');
      return;
    }
    try {
      await updateUserProfile(currentUser.uid, {
        displayName: displayName,
        function: userFunction,
      });
      setProfileMessage(t.profileUpdated);
      setProfileMessageType('success');
    } catch (error) {
      console.error("Error saving profile:", error);
      setProfileMessage(`${t.profileError} ${error.message}`);
      setProfileMessageType('error');
    }
  };

  return (
    <Card>
      <CardContent>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-yellow-400">
          <User className="w-6 h-6" /> {t.profileTab}
        </h2>

        {profileMessage && (
          <div className={`p-3 mb-4 rounded-md text-sm ${profileMessageType === 'success' ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100'}`}>
            {profileMessage}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email:</label>
            <input
              type="email"
              id="email"
              value={currentUser?.email || ''}
              readOnly
              className="w-full p-2 rounded-md bg-gray-700 border border-gray-600 text-gray-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label htmlFor="display-name" className="block text-sm font-medium text-gray-300 mb-1">{t.yourName}:</label>
            <input
              type="text"
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-2 rounded-md bg-gray-600 border border-gray-500 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t.yourName}
            />
          </div>
          <div>
            <label htmlFor="user-function" className="block text-sm font-medium text-gray-300 mb-1">{t.yourFunction}:</label>
            <input
              type="text"
              id="user-function"
              value={userFunction}
              onChange={(e) => setUserFunction(e.target.value)}
              className="w-full p-2 rounded-md bg-gray-600 border border-gray-500 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t.yourFunction}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Status:</label>
            <p className="text-gray-200">
              {currentUserProfile?.isAdmin ? (
                <span className="text-green-400 font-semibold">{t.adminStatus}</span>
              ) : (
                <span className="text-blue-400 font-semibold">{t.notAdminStatus}</span>
              )}
            </p>
          </div>
          <button
            onClick={handleSaveProfile}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" /> {t.saveProfile}
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

// Komponenta pro globální chat
const ChatTab = ({ t, currentUser, currentUserProfile, db, appId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!db || !appId) {
      console.warn("Firestore or App ID not available for chat tab.");
      return;
    }

    const chatColRef = collection(db, `artifacts/${appId}/public/data/chat_messages`);
    const q = query(chatColRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(fetchedMessages);
    }, (error) => {
      console.error("Error fetching chat messages:", error);
    });

    return () => unsubscribe();
  }, [db, appId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!db || !appId || !newMessage.trim() || !currentUser) {
      return;
    }

    try {
      await addDoc(collection(db, `artifacts/${appId}/public/data/chat_messages`), {
        senderId: currentUser.uid,
        senderName: currentUserProfile?.displayName || currentUser.email,
        messageText: newMessage.trim(),
        timestamp: new Date().toISOString(),
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col h-[70vh]">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-green-400">
          <MessageSquare className="w-6 h-6" /> {t.chatTab}
        </h2>

        <div className="flex-grow overflow-y-auto p-4 bg-gray-700 rounded-lg mb-4 space-y-3 custom-scrollbar">
          {messages.length > 0 ? (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] p-3 rounded-lg shadow-md ${msg.senderId === currentUser?.uid ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-100'}`}>
                  <p className="font-semibold text-sm mb-1">
                    {msg.senderId === currentUser?.uid ? 'Vy' : msg.senderName}
                  </p>
                  <p>{msg.messageText}</p>
                  <p className="text-xs text-gray-300 mt-1">
                    {format(parseISO(msg.timestamp), 'dd/MM HH:mm')}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-400">{t.noMessages}</p>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-grow p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
            placeholder={t.typeMessage}
            disabled={!currentUser}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-5 py-3 rounded-lg shadow hover:bg-blue-700 transition-colors flex items-center gap-2"
            disabled={!currentUser || !newMessage.trim()}
          >
            <Send className="w-5 h-5" /> {t.sendMessage}
          </button>
        </form>
      </CardContent>
    </Card>
  );
};


export default function ZakazkyDashboard() {
  // Stavy pro UI
  const [lang, setLang] = useState("cz");
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState(0); // 0: Dashboard, 1: Delayed, 2: Comparison, 3: Search, 4: Daily Summary, 5: Tickets, 6: Profile, 7: Chat
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState(null);
  const [showAllDelayed, setShowAllDelayed] = useState(false);

  // Stavy pro data
  const [allOrdersData, setAllOrdersData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [importHistory, setImportHistory] = useState([]);
  const [selectedImportId, setSelectedImportId] = useState(null);

  // Stavy pro grafy
  const [ordersOverTimeData, setOrdersOverTimeData] = useState([]);
  const [inProgressOnlyData, setInProgressOnlyData] = useState([]);
  const [shipmentsData, setShipmentsData] = useState([]);
  const [shiftComparisonData, setShiftComparisonData] = useState([]);
  const [deliveryTypePieData, setDeliveryTypePieData] = useState([]);
  const [deliveryTypeStackedChartData, setDeliveryTypeStackedChartData] = useState([]);

  // Stavy pro interaktivitu grafů
  const [chartTypeOrdersOverTime, setChartTypeOrdersOverTime] = useState('bar');
  const [chartTypeOrderTypes, setChartTypeOrderTypes] = useState('bar');
  const [chartTypeStatus, setChartTypeStatus] = useState('stackedBar'); // Default na 'stackedBar'
  const [activeIndexStatus, setActiveIndexStatus] = useState(0);
  const [activeIndexDelivery, setActiveIndexDelivery] = useState(0);

  // Stavy pro filtry
  const [filterTimeRange, setFilterTimeRange] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterDeliveryType, setFilterDeliveryType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Stavy pro přihlášení a načítání
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isClient, setIsClient] = useState(false); // Nový stav pro kontrolu, zda běží na klientovi
  const [isLoadingData, setIsLoadingData] = useState(true); // Default na true, aby se zobrazil loading
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false); // Nový stav pro přepínání mezi login/register
  const [registerMessage, setRegisterMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null); // Firebase User object
  const [currentUserProfile, setCurrentUserProfile] = useState(null); // User profile from Firestore
  const [allUsers, setAllUsers] = useState([]); // List of all registered users for ticket assignment

  // Firebase Instances as state
  const [firebaseAuth, setFirebaseAuth] = useState(null);
  const [firestoreDb, setFirestoreDb] = useState(null);
  const [currentAppId, setCurrentAppId] = useState(null); // App ID from __app_id
  const [isFirebaseReady, setIsFirebaseReady] = useState(false); // New state for Firebase readiness

  // Stavy pro modální okna
  const [showOrderListModal, setShowOrderListModal] = useState(false);
  const [modalOrders, setModalOrders] = useState([]);
  const [modalTitle, setModalTitle] = useState('');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [showStatusHistoryModal, setShowStatusHistoryModal] = useState(false);
  const [currentDeliveryNo, setCurrentDeliveryNo] = useState(null);
  const [deliveryStatusLog, setDeliveryStatusLog] = useState([]);

  // Stavy pro porovnání importů
  const [compareImport1Id, setCompareImport1Id] = useState('');
  const [compareImport2Id, setCompareImport2Id] = useState('');
  const [comparisonResults, setComparisonResults] = useState(null);

  // Stavy pro vyhledávání objednávek
  const [searchDeliveryNo, setSearchDeliveryNo] = useState("");
  const [searchLoadingDate, setSearchLoadingDate] = useState("");
  const [searchStatus, setSearchStatus] = useState("all");
  const [searchShipToPartyName, setSearchShipToPartyName] = useState("all");
  const [searchOrdersResult, setSearchOrdersResult] = useState([]);

  // Stavy pro výběr data v denním souhrnu
  const [selectedDailySummaryDate, setSelectedDailySummaryDate] = useState('');
  const [availableDatesForSummary, setAvailableDatesForSummary] = useState([]);

  // Reference na překladový objekt
  const t = translations[lang];

  // Dynamické načítání externích skriptů (XLSX, jsPDF, html2canvas)
  useEffect(() => {
    setIsClient(true);

    const loadScript = (src, id, onloadCallback) => {
      if (document.getElementById(id)) {
        if (onloadCallback) onloadCallback();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.id = id;
      script.onload = onloadCallback;
      script.onerror = () => console.error(`Failed to load script: ${src}`);
      document.head.appendChild(script);
    };

    loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'xlsx-script', () => {
      console.log('XLSX loaded');
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf-script', () => {
        console.log('jsPDF loaded');
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'html2canvas-script', () => {
          console.log('html2canvas loaded');
        });
      });
    });

    // Firebase Initialization
    try {
      if (typeof __firebase_config !== 'undefined') {
        const firebaseConfig = JSON.parse(__firebase_config);
        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        const dbInstance = getFirestore(app);
        const appIdValue = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

        setFirebaseAuth(authInstance);
        setFirestoreDb(dbInstance);
        setCurrentAppId(appIdValue);

        // Initial Firebase Auth
        onAuthStateChanged(authInstance, async (user) => {
          if (user) {
            setCurrentUser(user);
            setIsAuthenticated(true);
            console.log("Firebase Auth: User is signed in:", user.email, user.uid);

            // Fetch or create user profile
            const userProfileRef = doc(dbInstance, `artifacts/${appIdValue}/public/data/user_profiles`, user.uid);
            const userProfileSnap = await getDoc(userProfileRef);

            if (userProfileSnap.exists()) {
              setCurrentUserProfile(userProfileSnap.data());
            } else {
              // Create a basic profile if it doesn't exist
              const newProfile = {
                email: user.email,
                displayName: user.email.split('@')[0], // Default display name
                function: '',
                isAdmin: false, // Default to not admin
                createdAt: new Date().toISOString(),
              };
              await setDoc(userProfileRef, newProfile);
              setCurrentUserProfile(newProfile);
              console.log("New user profile created in Firestore.");
            }

            // Fetch all user profiles for assignment dropdown and chat
            const userProfilesCollectionRef = collection(dbInstance, `artifacts/${appIdValue}/public/data/user_profiles`);
            onSnapshot(userProfilesCollectionRef, (snapshot) => {
              const users = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data(),
              }));
              setAllUsers(users);
            }, (error) => {
              console.error("Error fetching all user profiles:", error);
            });

          } else {
            setCurrentUser(null);
            setCurrentUserProfile(null);
            setIsAuthenticated(false);
            setAllUsers([]);
            console.log("Firebase Auth: No user is signed in.");
            // Try to sign in with custom token if available
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
              try {
                await signInWithCustomToken(authInstance, __initial_auth_token);
                console.log("Signed in with custom token.");
              } catch (error) {
                console.error("Error signing in with custom token:", error);
                // Fallback to anonymous if custom token fails
                try {
                  await signInAnonymously(authInstance);
                  console.log("Signed in anonymously.");
                } catch (anonError) {
                  console.error("Error signing in anonymously:", anonError);
                }
              }
            } else {
              // If no custom token, sign in anonymously
              try {
                await signInAnonymously(authInstance);
                console.log("Signed in anonymously (no initial token).");
              } catch (anonError) {
                console.error("Error signing in anonymously:", anonError);
              }
            }
          }
          setIsLoadingData(false); // Stop loading after initial auth check
          setIsFirebaseReady(true); // Firebase is ready after initial auth check
        });

      } else {
        console.warn("Firebase config (__firebase_config) is not defined. Firebase features will not be available.");
        setIsLoadingData(false);
        setIsFirebaseReady(false); // Firebase is not ready if config is missing
      }
    } catch (e) {
      console.error("Error initializing Firebase:", e);
      setIsLoadingData(false);
      setIsFirebaseReady(false); // Firebase is not ready if initialization fails
    }

  }, []); // Empty dependency array to run only once on mount

  // Funkce pro aktualizaci uživatelského profilu
  const updateUserProfile = useCallback(async (uid, updates) => {
    if (!firestoreDb || !currentAppId) {
      throw new Error("Firestore or App ID not available.");
    }
    const userProfileRef = doc(firestoreDb, `artifacts/${currentAppId}/public/data/user_profiles`, uid);
    await updateDoc(userProfileRef, updates);
    // Update local state after successful update
    setCurrentUserProfile(prev => ({ ...prev, ...updates }));
  }, [firestoreDb, currentAppId]);

  // Hlavní logika zpracování dat (nyní přijímá již filtrované řádky)
  const processData = useCallback((rawData) => {
    const now = new Date();
    const today = startOfDay(now);

    const result = {
      total: 0,
      doneTotal: 0,
      remainingTotal: 0,
      inProgressTotal: 0,
      newOrdersTotal: 0,
      palletsTotal: 0,
      cartonsTotal: 0,
      statusCounts: {},
      dailySummaries: [],
      deliveryTypes: {},
      delayed: 0,
      sentPallets: 0,
      sentCartons: 0,
      currentShift: getCurrentShift(now),
      hourlyStatusSnapshots: {},
      shiftDoneCounts: { '1': 0, '2': 0 },
      statusByDateCategory: {},
      deliveryTypeByDateCategory: {},
      statusByLoadingDate: {},
      delayedOrdersList: [],
      allAvailableDates: new Set(),
    };

    for (let h = 0; h <= 23; h++) {
      const hourKey = format(new Date(today.getFullYear(), today.getMonth(), today.getDate(), h), 'HH');
      result.hourlyStatusSnapshots[hourKey] = {
        '10': 0, '31': 0, '35': 0, '40': 0, '50': 0, '60': 0, '70': 0,
      };
    }

    const dailySummariesMap = new Map();

    const doneStatuses = [50, 60, 70];
    const remainingStatuses = [10, 31, 35, 40];
    const inProgressStatuses = [31, 35, 40];
    const newOrderStatuses = [10];
    const sentStatuses = [60, 70];

    rawData.forEach((row) => {
      const loadingDate = row["Loading Date"];
      const status = Number(row["Status"]);
      const delType = row["del.type"];
      const deliveryIdentifier = (row["Delivery"] || row["Delivery No"])?.trim();

      if (!loadingDate || isNaN(status) || !deliveryIdentifier) return;

      const parsedDate = parseExcelDate(loadingDate);

      if (parsedDate === null || isNaN(parsedDate.getTime())) {
        console.warn(`Invalid Loading Date for row (skipping): ${JSON.stringify(row)}`);
        return;
      }

      const formattedDate_YYYYMMDD = format(parsedDate, "yyyy-MM-dd");
      const formattedDate_DDMMYYYY = format(parsedDate, "dd/MM/yyyy");

      result.allAvailableDates.add(formattedDate_YYYYMMDD);

      // Aktualizace pro původní přehledové karty (celkové součty)
      result.total += 1;
      if (doneStatuses.includes(status)) result.doneTotal += 1;
      if (remainingStatuses.includes(status)) result.remainingTotal += 1;
      if (inProgressStatuses.includes(status)) result.inProgressTotal += 1;
      if (newOrderStatuses.includes(status)) result.newOrdersTotal += 1;
      if (delType === "P") result.palletsTotal += 1;
      if (delType === "K") result.cartonsTotal += 1;


      if (!dailySummariesMap.has(formattedDate_YYYYMMDD)) {
        dailySummariesMap.set(formattedDate_YYYYMMDD, {
          date: formattedDate_YYYYMMDD,
          total: 0, done: 0, remaining: 0, inProgress: 0, newOrders: 0, pallets: 0, cartons: 0,
        });
      }
      const currentDayStats = dailySummariesMap.get(formattedDate_YYYYMMDD);
      currentDayStats.total += 1;
      if (doneStatuses.includes(status)) currentDayStats.done += 1;
      if (remainingStatuses.includes(status)) currentDayStats.remaining += 1;
      if (inProgressStatuses.includes(status)) currentDayStats.inProgress += 1;
      if (newOrderStatuses.includes(status)) currentDayStats.newOrders += 1;
      if (delType === "P") currentDayStats.pallets += 1;
      if (delType === "K") currentDayStats.cartons += 1;

      let dateCategoryName;
      if (formattedDate_YYYYMMDD === format(today, 'yyyy-MM-dd')) {
        dateCategoryName = 'Today';
      } else if (formattedDate_YYYYMMDD === format(subDays(today, 1), 'yyyy-MM-dd')) {
        dateCategoryName = 'Yesterday';
      } else if (isBefore(parsedDate, today)) {
        dateCategoryName = 'Older';
      } else if (isAfter(parsedDate, today)) {
        dateCategoryName = 'Future';
      } else {
        dateCategoryName = 'Other';
      }

      if (!result.statusByDateCategory[status]) {
        result.statusByDateCategory[status] = { 'Today': 0, 'Yesterday': 0, 'Older': 0, 'Future': 0 };
      }
      if (result.statusByDateCategory[status][dateCategoryName] !== undefined) {
        result.statusByDateCategory[status][dateCategoryName]++;
      }

      if (!result.deliveryTypeByDateCategory[delType]) {
        result.deliveryTypeByDateCategory[delType] = { 'Today': 0, 'Yesterday': 0, 'Older': 0, 'Future': 0 };
      }
      if (result.deliveryTypeByDateCategory[delType][dateCategoryName] !== undefined) {
        result.deliveryTypeByDateCategory[delType][dateCategoryName]++;
      }

      if (!result.statusByLoadingDate[formattedDate_YYYYMMDD]) {
        result.statusByLoadingDate[formattedDate_YYYYMMDD] = { date: formattedDate_DDMMYYYY };
      }
      result.statusByLoadingDate[formattedDate_YYYYMMDD][`status${status}`] =
        (result.statusByLoadingDate[formattedDate_YYYYMMDD][`status${status}`] || 0) + 1;

      if (doneStatuses.includes(status)) {
        const orderHour = getHours(parsedDate);
        const orderMinutes = parsedDate.getMinutes();
        const orderTimeInMinutes = orderHour * 60 + orderMinutes;

        const shift1Start = 5 * 60 + 45;
        const shift1End = 13 * 60 + 45;
        const shift2Start = 13 * 60 + 45;
        const shift2End = 21 * 60 + 45;

        if (orderTimeInMinutes >= shift1Start && orderTimeInMinutes < shift1End) {
          result.shiftDoneCounts['1'] += 1;
        } else if (orderTimeInMinutes >= shift2Start && orderTimeInMinutes < shift2End) {
          result.shiftDoneCounts['2'] += 1;
        }
      }

      if (sentStatuses.includes(status)) {
        if (delType === "P") result.sentPallets += 1;
        if (delType === "K") result.sentCartons += 1;
      }

      if (isBefore(parsedDate, today) && !doneStatuses.includes(status)) {
        result.delayed += 1;
        const delayDays = differenceInDays(today, parsedDate);
        result.delayedOrdersList.push({
          delivery: deliveryIdentifier, status: status, delType: delType,
          loadingDate: parsedDate.toISOString(), // Store as ISO string
          delayDays: delayDays,
          note: row["Note"] || "",
          "Forwarding agent name": row["Forwarding agent name"],
          "Name of ship-to party": row["Name of ship-to party"],
          "Total Weight": row["Total Weight"],
          "Bill of lading": row["Bill of lading"] || "",
        });
      }

      if (!isNaN(status)) {
        result.statusCounts[status] = (result.statusCounts[status] || 0) + 1;
      }
      if (delType) {
        result.deliveryTypes[delType] = (result.deliveryTypes[delType] || 0) + 1;
      }

      if (format(parsedDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
        const hourKey = format(parsedDate, 'HH');
        if (result.hourlyStatusSnapshots[hourKey]) {
          if (result.hourlyStatusSnapshots[hourKey][status]) {
            result.hourlyStatusSnapshots[hourKey][status] += 1;
          } else {
            result.hourlyStatusSnapshots[hourKey][status] = 1;
          }
        }
      }
    });

    result.dailySummaries = Array.from(dailySummariesMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));

    return result;
  }, []);

  // Funkce pro aplikaci všech filtrů a následné zpracování dat
  const applyFiltersAndProcessData = useCallback((dataToFilter) => {
    let currentFilteredRows = [...dataToFilter];
    const now = new Date();
    const today = startOfDay(now);

    let tempStartDate = null;
    let tempEndDate = null;

    if (filterTimeRange === 'yesterday') {
      tempStartDate = subDays(today, 1);
      tempEndDate = addDays(startOfDay(today), 0);
    } else if (filterTimeRange === 'today') {
      tempStartDate = today;
      tempEndDate = addDays(startOfDay(today), 1);
    } else if (filterTimeRange === 'last7days') {
      tempStartDate = subDays(today, 6);
      tempEndDate = addDays(startOfDay(today), 1);
    } else if (filterTimeRange === 'thisMonth') {
      tempStartDate = startOfMonth(today);
      tempEndDate = addDays(endOfMonth(today), 1);
    } else if (filterTimeRange === 'custom' && filterStartDate && filterEndDate) {
      tempStartDate = startOfDay(new Date(filterStartDate));
      tempEndDate = addDays(startOfDay(new Date(filterEndDate)), 1);
    }

    if (filterTimeRange !== 'all') {
      currentFilteredRows = currentFilteredRows.filter(row => {
        const parsedDate = parseExcelDate(row["Loading Date"]);
        if (parsedDate === null || isNaN(parsedDate.getTime())) return false;
        return parsedDate >= tempStartDate && parsedDate < tempEndDate;
      });
    }

    if (filterDeliveryType !== 'all') {
      currentFilteredRows = currentFilteredRows.filter(row => row["del.type"] === filterDeliveryType);
    }

    if (filterStatus !== 'all') {
      currentFilteredRows = currentFilteredRows.filter(row => Number(row["Status"]) === Number(filterStatus));
    }

    return processData(currentFilteredRows);
  }, [filterTimeRange, filterStartDate, filterEndDate, filterDeliveryType, filterStatus, processData]);

  // Efekt pro opětovné aplikování filtrů, když se změní stav filtrů nebo allOrdersData
  useEffect(() => {
    if (isAuthenticated && allOrdersData.length > 0) {
      const processed = applyFiltersAndProcessData(allOrdersData);
      setSummary(processed);

      const ordersOverTimeMap = new Map();
      processed.dailySummaries.forEach(day => {
        ordersOverTimeMap.set(day.date, {
          date: day.date,
          total: day.total,
          remaining: day.remaining,
          new: day.newOrders,
          inProgress: day.inProgress,
          completed: day.done,
        });
      });
      setOrdersOverTimeData(Array.from(ordersOverTimeMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date)));

      const shiftComparisonData = processed.shiftDoneCounts ? [
        { name: t.shift1Name, value: processed.shiftDoneCounts['1'] || 0 },
        { name: t.shift2Name, value: processed.shiftDoneCounts['2'] || 0 },
      ] : [];
      setShiftComparisonData(shiftComparisonData);

      const inProgressOnlyChartData = processed.hourlyStatusSnapshots ? Object.entries(processed.hourlyStatusSnapshots)
        .filter(([, statuses]) => (statuses['31'] || 0) + (statuses['35'] || 0) + (statuses['40'] || 0) > 0)
        .sort(([hourA], [hourB]) => parseInt(hourA) - parseInt(hourB))
        .map(([hour, statuses]) => ({
          hour: `${hour}:00`,
          status31: statuses['31'] || 0,
          status35: statuses['35'] || 0,
          status40: statuses['40'] || 0,
        })) : [];
      setInProgressOnlyData(inProgressOnlyChartData);

      const shipmentsChartData = processed.hourlyStatusSnapshots ? Object.entries(processed.hourlyStatusSnapshots)
        .filter(([, statuses]) => (statuses['50'] || 0) + (statuses['60'] || 0) + (statuses['70'] || 0) > 0)
        .sort(([hourA], [hourB]) => parseInt(hourA) - parseInt(hourB))
        .map(([hour, statuses]) => ({
          hour: `${hour}:00`,
          status50: statuses['50'] || 0,
          status60: statuses['60'] || 0,
          status70: statuses['70'] || 0,
        })) : [];
      setShipmentsData(shipmentsChartData);

      const deliveryTypePieData = Object.entries(processed.deliveryTypes || {}).map(([type, count]) => ({
        name: type === "P" ? t.pallets : t.carton,
        value: count,
      })).filter(item => item.value > 0);
      setDeliveryTypePieData(deliveryTypePieData);

      const deliveryTypeStackedChartData = Object.keys(processed.deliveryTypeByDateCategory || {})
        .map(type => ({
          name: type === 'P' ? t.pallets : t.carton,
          ...processed.deliveryTypeByDateCategory[type],
        }))
        .filter(item => Object.values(item).some((val, key) => key !== 'name' && val > 0));
      setDeliveryTypeStackedChartData(deliveryTypeStackedChartData);

      const dates = processed.dailySummaries.map(d => d.date);
      setAvailableDatesForSummary(dates);
      if (dates.length > 0) {
        setSelectedDailySummaryDate(dates[dates.length - 1]);
      }

    } else if (allOrdersData.length === 0 && summary !== null) {
      setSummary(null);
      setOrdersOverTimeData([]);
      setShiftComparisonData([]);
      setInProgressOnlyData([]);
      setShipmentsData([]);
      setDeliveryTypePieData([]);
      setDeliveryTypeStackedChartData([]);
      setAvailableDatesForSummary([]);
      setSelectedDailySummaryDate('');
    }
  }, [allOrdersData, applyFiltersAndProcessData, isAuthenticated, t]);

  // Načtení dat z Supabase po autentizaci a když je komponenta na klientovi
  useEffect(() => {
    const fetchDataAndHistory = async () => {
      if (!isAuthenticated) {
        setIsLoadingData(false); // Stop loading if not authenticated
        return;
      }
      setIsLoadingData(true);
      try {
        const { data: deliveriesData, error: deliveriesError } = await supabaseClient
          .from("deliveries")
          .select('*');

        if (deliveriesError) {
          console.error("Error fetching deliveries data:", deliveriesError.message || deliveriesError);
          setAllOrdersData([]);
        } else {
          // Ensure Loading Date is ISO string when fetched from DB
          const formattedData = deliveriesData.map(row => {
            const parsedDate = row["Loading Date"] ? new Date(row["Loading Date"]) : null;
            return {
              ...row,
              "Loading Date": parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null,
              "Delivery No": (row["Delivery No"] || row["Delivery"])?.trim()
            };
          });
          setAllOrdersData(formattedData);
          setSearchOrdersResult(formattedData);
        }

        const { data: importHistoryData, error: importHistoryError } = await supabaseClient
          .from("imports")
          .select("id, created_at, original_name, data, date_label")
          .order("created_at", { ascending: false });

        if (importHistoryError) {
          console.error("Error fetching import history:", importHistoryError.message || importHistoryError);
        } else {
          setImportHistory(importHistoryData);
          if (importHistoryData.length > 0 && !selectedImportId) {
            setSelectedImportId(importHistoryData[0].id);
          }
        }
      } catch (e) {
        console.error("Caught error fetching initial data:", e);
      } finally {
        setIsLoadingData(false);
      }
    };

    if (isClient && isAuthenticated) {
      fetchDataAndHistory();
    }
  }, [isClient, isAuthenticated, selectedImportId]);

  // Autentizace (Firebase Auth)
  const handleLogin = async () => {
    setLoginError("");
    setRegisterMessage("");
    if (!isFirebaseReady || !firebaseAuth) { // Check isFirebaseReady
      console.error("Firebase Auth not initialized or ready.");
      setLoginError("Firebase authentication service is not ready. Please wait a moment.");
      return;
    }
    try {
      await signInWithEmailAndPassword(firebaseAuth, username, password);
      // onAuthStateChanged listener handles setting isAuthenticated and currentUser
    } catch (error) {
      console.error("Login error:", error.message);
      setLoginError(t.loginError);
    }
  };

  const handleRegister = async () => {
    setLoginError("");
    setRegisterMessage("");
    if (!isFirebaseReady || !firebaseAuth || !firestoreDb || !currentAppId) { // Check isFirebaseReady
      console.error("Firebase services not initialized or ready.");
      setRegisterMessage("Firebase services are not ready for registration. Please wait a moment.");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, username, password);
      const user = userCredential.user;

      // Save user profile to Firestore
      await setDoc(doc(firestoreDb, `artifacts/${currentAppId}/public/data/user_profiles`, user.uid), {
        email: user.email,
        displayName: user.email.split('@')[0], // Default display name
        function: '',
        isAdmin: false, // Default to not admin
        createdAt: new Date().toISOString(),
      });

      setRegisterMessage(t.registerSuccess);
      setIsRegistering(false); // Switch back to login form
      setUsername('');
      setPassword('');
    } catch (error) {
      console.error("Registration error:", error.message);
      setRegisterMessage(`${t.registerError} ${error.message}`);
    }
  };

  // Google Sign-in
  const handleGoogleSignIn = async () => {
    setLoginError("");
    setRegisterMessage("");
    if (!isFirebaseReady || !firebaseAuth || !firestoreDb || !currentAppId) {
      console.error("Firebase services not initialized or ready for Google Sign-in.");
      setLoginError("Firebase services are not ready for Google Sign-in. Please wait a moment.");
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      const user = result.user;

      // Check if user profile exists in Firestore, if not, create it
      const userProfileRef = doc(firestoreDb, `artifacts/${currentAppId}/public/data/user_profiles`, user.uid);
      const userProfileSnap = await getDoc(userProfileRef);

      if (!userProfileSnap.exists()) {
        await setDoc(userProfileRef, {
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0], // Use Google display name or default
          function: '',
          isAdmin: false, // Default to not admin
          createdAt: new Date().toISOString(),
        });
        console.log("New Google user profile created in Firestore.");
      } else {
        console.log("Existing Google user profile found in Firestore.");
      }
      // onAuthStateChanged listener will handle setting isAuthenticated and currentUser
    } catch (error) {
      console.error("Google Sign-in error:", error.message);
      setLoginError(`Google Sign-in error: ${error.message}`);
    }
  };

  // Odhlášení
  const handleLogout = async () => {
    if (!firebaseAuth) {
      console.error("Firebase Auth not initialized for logout.");
      return;
    }
    try {
      await signOut(firebaseAuth);
      // onAuthStateChanged listener handles setting isAuthenticated and currentUser
      setUsername("");
      setPassword("");
      setSummary(null);
      setAllOrdersData([]);
      setImportHistory([]);
      setSelectedImportId(null);
      setSearchOrdersResult([]);
      setSelectedOrderDetails(null);
      setAllUsers([]); // Clear users on logout
      setCurrentUserProfile(null); // Clear current user profile on logout
    } catch (error) {
      console.error("Logout error:", error.message);
    }
  };

  // Funkce pro logování změn statusů do delivery_status_log a aktualizaci deliveries
  const logStatusChanges = async (newImportData, importId) => {
    try {
      const { data: currentDeliveries, error: fetchError } = await supabaseClient
        .from("deliveries")
        .select('"Delivery No", "Status"');

      if (fetchError) {
        console.error("Error fetching current deliveries for status log:", fetchError.message);
      }
      const currentDeliveriesMap = new Map(currentDeliveries?.map(d => [d["Delivery No"], d.Status]) || []);

      const statusLogEntries = [];
      const upsertPromises = [];

      for (const row of newImportData) {
        const deliveryIdentifier = (row["Delivery"] || row["Delivery No"])?.trim();
        const newStatus = Number(row["Status"]);
        const loadingDate = parseExcelDate(row["Loading Date"]);

        // Ensure loadingDate is valid before proceeding
        if (!loadingDate || isNaN(loadingDate.getTime())) {
          console.warn(`Skipping row due to invalid Loading Date: ${JSON.stringify(row)}`);
          continue;
        }

        const existingStatus = currentDeliveriesMap.get(deliveryIdentifier);

        if (!deliveryIdentifier || isNaN(newStatus)) {
          console.warn(`Skipping row due to missing/invalid data: ${JSON.stringify(row)}`);
          continue;
        }

        upsertPromises.push(
          supabaseClient.from("deliveries").upsert(
            {
              "Delivery No": deliveryIdentifier,
              "Status": newStatus,
              "del.type": row["del.type"],
              "Loading Date": loadingDate.toISOString(), // Ensure ISO string is saved
              "Forwarding agent name": row["Forwarding agent name"],
              "Name of ship-to party": row["Name of ship-to party"],
              "Total Weight": row["Total Weight"],
              "Note": row["Note"] || null,
              "Bill of lading": row["Bill of lading"] || null,
              last_imported_at: new Date().toISOString(),
              source_import_id: importId,
            },
            { onConflict: '"Delivery No"' }
          )
        );

        if (existingStatus === undefined) {
          statusLogEntries.push({
            delivery_no: deliveryIdentifier,
            status: newStatus,
            timestamp: new Date().toISOString(),
            source_import: importId,
          });
        } else if (existingStatus !== newStatus) {
          statusLogEntries.push({
            delivery_no: deliveryIdentifier,
            status: newStatus,
            timestamp: new Date().toISOString(),
            source_import: importId,
          });
        }
      }

      await Promise.all(upsertPromises);

      if (statusLogEntries.length > 0) {
        const { error: logError } = await supabaseClient.from("delivery_status_log").insert(statusLogEntries);
        if (logError) {
          console.error("Error logging status changes:", logError.message);
        } else {
          console.log(`Logged ${statusLogEntries.length} status changes.`);
        }
      }

    } catch (e) {
      console.error("Caught error during status logging:", e);
    }
  };

  // Handler pro nahrání souboru
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      if (typeof window.XLSX === 'undefined') {
        console.error("XLSX library not loaded.");
        return;
      }
      const workbook = window.XLSX.read(bstr, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = window.XLSX.utils.sheet_to_json(worksheet);

      try {
        const { data: savedImport, error: importError } = await supabaseClient.from("imports").insert([
          {
            created_at: new Date().toISOString(),
            original_name: file.name,
            data: jsonData,
            date_label: format(new Date(), "dd/MM/yyyy HH:mm"),
          },
        ]).select('id, created_at, original_name, date_label');

        if (importError) {
          console.error("Error saving import metadata and data to Supabase:", importError.message || importError);
          return;
        }

        const newImportId = savedImport[0].id;

        await logStatusChanges(jsonData, newImportId);

        const { data: deliveriesData, error: deliveriesError } = await supabaseClient
          .from("deliveries")
          .select('*');

        if (deliveriesError) {
          console.error("Error re-fetching deliveries data after upload:", deliveriesError.message || deliveriesError);
        } else {
          const formattedData = deliveriesData.map(row => {
            const parsedDate = row["Loading Date"] ? new Date(row["Loading Date"]) : null;
            return {
              ...row,
              "Loading Date": parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null,
              "Delivery No": (row["Delivery No"] || row["Delivery"])?.trim()
            };
          });
          setAllOrdersData(formattedData);
          setSearchOrdersResult(formattedData);
        }

        setImportHistory(prevHistory => [savedImport[0], ...prevHistory]);
        setSelectedImportId(newImportId);

      } catch (e) {
        console.error("Caught error during file upload and saving to Supabase:", e);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Handler pro výběr importu z historie
  const handleSelectImport = async (e) => {
    const id = e.target.value;
    setSelectedImportId(id);
    if (id) {
      try {
        const { data: fetchedImport, error } = await supabaseClient
          .from("imports")
          .select("data")
          .eq("id", id)
          .single();

        if (error) {
          console.error("Error fetching selected import data:", error.message || error);
          setAllOrdersData([]);
        } else {
          // Ensure data from import history is also formatted to ISO string
          const formattedData = fetchedImport.data.map(row => {
            const parsedDate = parseExcelDate(row["Loading Date"]);
            return {
              ...row,
              "Loading Date": parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null, // Re-parse and ISO string
              "Delivery No": (row["Delivery No"] || row["Delivery"])?.trim()
            };
          });
          setAllOrdersData(formattedData);
          setSearchOrdersResult(formattedData);
        }
      } catch (e) {
        console.error("Caught error fetching selected import data:", e);
        setAllOrdersData([]);
      }
    } else {
      const { data: deliveriesData, error: deliveriesError } = await supabaseClient
        .from("deliveries")
        .select('*');

      if (deliveriesError) {
        console.error("Error fetching all deliveries data:", deliveriesError.message || deliveriesError);
        setAllOrdersData([]);
      } else {
        const formattedData = deliveriesData.map(row => {
          const parsedDate = row["Loading Date"] ? new Date(row["Loading Date"]) : null;
          return {
            ...row,
            "Loading Date": parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null,
            "Delivery No": (row["Delivery No"] || row["Delivery"])?.trim()
          };
        });
        setAllOrdersData(formattedData);
        setSearchOrdersResult(formattedData);
      }
    }
  };

  // Potvrzení smazání importu
  const confirmDelete = (id) => {
    setItemToDeleteId(id);
    setShowDeleteConfirm(true);
  };

  // Smazání importu
  const handleDeleteImport = async () => {
    if (!itemToDeleteId) return;

    try {
      const { error: logDeleteError } = await supabaseClient
        .from("delivery_status_log")
        .delete()
        .eq("source_import", itemToDeleteId);

      if (logDeleteError) {
        console.error("Error deleting associated status logs:", logDeleteError.message);
      }

      const { error: importDeleteError } = await supabaseClient
        .from("imports")
        .delete()
        .eq("id", itemToDeleteId);

      if (importDeleteError) {
        console.error("Error deleting import:", importDeleteError.message);
      } else {
        setImportHistory(prevHistory => prevHistory.filter(item => item.id !== itemToDeleteId));
        if (selectedImportId === itemToDeleteId) {
          setSummary(null);
          setAllOrdersData([]);
          setSelectedImportId(null);
        }
      }
    } catch (e) {
      console.error("Caught error deleting import:", e);
    } finally {
      setShowDeleteConfirm(false);
      setItemToDeleteId(null);
    }
  };

  // Export do PDF (využívá html2canvas a jsPDF)
  const exportPDF = () => {
    const input = document.getElementById("report-section");
    if (!input) return;

    if (typeof window.html2canvas === 'undefined' || typeof window.jsPDF === 'undefined') {
      console.error("html2canvas or jsPDF library not loaded.");
      return;
    }

    window.html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new window.jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save("report.pdf");
    });
  };

  // Export do XLSX pro výsledky vyhledávání
  const exportSearchResultsToXLSX = () => {
    if (typeof window.XLSX === 'undefined') {
      console.error("XLSX library not loaded for export.");
      return;
    }
    if (searchOrdersResult.length === 0) {
      // Using alert for simplicity, consider a custom modal
      // Do not use alert() in production.
      // This is a placeholder for a custom modal message.
      console.log("No data to export.");
      return;
    }

    const ws = window.XLSX.utils.json_to_sheet(searchOrdersResult.map(order => ({
      [t.deliveryNo]: order["Delivery No"],
      [t.status]: order.Status,
      [t.deliveryType]: order["del.type"],
      [t.loadingDate]: order["Loading Date"] ? format(parseISO(order["Loading Date"]), 'dd/MM/yyyy') : 'N/A',
      [t.forwardingAgent]: order["Forwarding agent name"],
      [t.shipToPartyName]: order["Name of ship-to party"],
      [t.totalWeight]: order["Total Weight"],
      [t.billOfLading]: order["Bill of lading"],
      [t.note]: order.Note,
    })));
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Search Results");
    window.XLSX.writeFile(wb, `Search_Results_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
  };

  // Export zpožděných zakázek do XLSX
  const exportDelayedOrdersXLSX = async () => {
    if (typeof window.XLSX === 'undefined') {
      console.error("XLSX library not loaded for export.");
      return;
    }

    try {
      const today = startOfDay(new Date());
      const { data, error } = await supabaseClient
        .from('deliveries')
        .select('"Delivery No", "Status", "del.type", "Loading Date", "Note", "Forwarding agent name", "Name of ship-to party", "Total Weight", "Bill of lading"')
        .lt('"Loading Date"', today.toISOString())
        .not('Status', 'in', '(50,60,70)');

      if (error) {
        console.error('Error fetching delayed deliveries for XLSX export:', error.message);
        return;
      }

      const formattedData = data.map(item => {
        let parsedDate = null;
        if (item["Loading Date"]) {
          try {
            parsedDate = parseISO(item["Loading Date"]);
            if (isNaN(parsedDate.getTime())) {
              parsedDate = null; // Ensure it's null if invalid
            }
          } catch (e) {
            console.error("Error parsing date for export:", item["Loading Date"], e);
            parsedDate = null;
          }
        }

        const delayDays = (parsedDate && isBefore(parsedDate, today) && ![50, 60, 70].includes(Number(item.Status)))
          ? differenceInDays(today, parsedDate)
          : 0;

        return {
          [t.deliveryNo]: item["Delivery No"],
          [t.status]: item.Status,
          [t.deliveryType]: item["del.type"],
          [t.loadingDate]: parsedDate ? format(parsedDate, 'dd.MM.yyyy') : 'N/A',
          [t.delay]: delayDays,
          [t.note]: item.Note || '',
          [t.forwardingAgent]: item["Forwarding agent name"] || 'N/A',
          [t.shipToPartyName]: item["Name of ship-to party"] || 'N/A',
          [t.totalWeight]: item["Total Weight"] || 'N/A',
          [t.billOfLading]: item["Bill of lading"] || 'N/A',
        };
      });

      if (formattedData.length === 0) {
        console.log("No data to export.");
        return;
      }

      const ws = window.XLSX.utils.json_to_sheet(formattedData);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Delayed Orders");
      window.XLSX.writeFile(wb, `${t.delayed}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);

    } catch (e) {
      console.error("Caught error during XLSX export:", e);
    }
  };

  // Compare Imports (Placeholder for now, no actual comparison logic implemented)
  const handleCompareImports = () => {
    setComparisonResults({
      // Example results, replace with actual comparison logic
      '10_to_31': 5,
      'new_order_10': 2,
      'removed_order_40': 1,
      'noChangesDetected': 0, // This should be calculated
    });
  };

  // Funkce pro získání barvy zpoždění
  const getDelayColorClass = (delayDays) => {
    if (delayDays <= 1) return "text-green-400";
    if (delayDays <= 2) return "text-orange-400";
    return "text-red-400";
  };

  // Pomocná funkce pro formátování data naYYYY-MM-DD
  function formatDateToYYYYMMDD(dateInput) {
    if (!dateInput) return "";
    try {
      const date = typeof dateInput === "string" ? parseISO(dateInput) : new Date(dateInput);
      if (isNaN(date.getTime())) return ""; // Handle invalid date objects
      return format(date, "yyyy-MM-dd");
    } catch {
      return "";
    }
  }

  // Funkce pro uložení poznámky do Supabase
  const handleSaveNote = useCallback(async (deliveryNo, newNote) => {
    try {
      const { error } = await supabaseClient
        .from('deliveries')
        .update({ Note: newNote })
        .eq('"Delivery No"', deliveryNo.trim());

      if (error) {
        console.error("Error saving note:", error.message);
      } else {
        console.log(`Note for delivery ${deliveryNo} saved successfully.`);
        // Update allOrdersData to reflect the change
        setAllOrdersData(prevData =>
          prevData.map(order =>
            (order["Delivery No"] || order["Delivery"])?.trim() === deliveryNo
              ? { ...order, Note: newNote }
              : order
          )
        );
        // Update selectedOrderDetails if it's the current one
        setSelectedOrderDetails(prevDetails =>
          prevDetails && prevDetails["Delivery No"] === deliveryNo
            ? { ...prevDetails, Note: newNote }
            : prevDetails
        );
      }
    } catch (e) {
      console.error("Caught error during saving note:", e);
    }
  }, []);

  // Funkce pro vyhledávání dodávky a načtení historie statusů
  const handleSearchOrders = useCallback(() => {
    if (!Array.isArray(allOrdersData) || allOrdersData === null) {
      setSearchOrdersResult([]);
      return;
    }

    // Handle bulk search for Delivery No.
    const searchDeliveryNos = searchDeliveryNo
      .split(/[, \n]+/) // Split by comma, space, or newline
      .map(s => s.trim())
      .filter(s => s !== '');

    const filtered = allOrdersData.filter((row) => {
      const deliveryIdentifier = (row["Delivery"] || row["Delivery No"] || "").trim();

      const deliveryMatch = searchDeliveryNos.length > 0
        ? searchDeliveryNos.some(num => deliveryIdentifier.toLowerCase().includes(num.toLowerCase()))
        : true;

      const loadingDateMatch = searchLoadingDate
        ? formatDateToYYYYMMDD(row["Loading Date"]) === searchLoadingDate
        : true;

      const statusMatch = searchStatus !== "all"
        ? String(row["Status"]) === String(searchStatus)
        : true;

      const partyMatch = searchShipToPartyName !== "all"
        ? (row["Name of ship-to party"] || "").toLowerCase().includes(searchShipToPartyName.toLowerCase())
        : true;

      return deliveryMatch && loadingDateMatch && statusMatch && partyMatch;
    });

    const mappedResults = filtered.map(order => ({
      "Delivery No": (order["Delivery"] || order["Delivery No"])?.trim(),
      "Status": Number(order.Status),
      "del.type": order["del.type"],
      "Loading Date": order["Loading Date"], // Keep as ISO string
      "Note": order["Note"] || "",
      "Forwarding agent name": order["Forwarding agent name"] || "N/A",
      "Name of ship-to party": order["Name of ship-to party"] || "N/A",
      "Total Weight": order["Total Weight"],
      "Bill of lading": order["Bill of lading"] || "N/A",
      "processingTime": "N/A",
    }));

    setSearchOrdersResult(mappedResults);
  }, [allOrdersData, searchDeliveryNo, searchLoadingDate, searchStatus, searchShipToPartyName]);

  // Pie chart aktivní tvar pro hover efekt
  const renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="font-bold">
          {payload.name}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={3} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#E5E7EB">{`Value: ${value}`}</text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">{`(Rate ${ (percent * 100).toFixed(2) }%)`}</text>
      </g>
    );
  };

  const onPieEnterStatus = useCallback((_, index) => {
    setActiveIndexStatus(index);
  }, []);

  const onPieEnterDelivery = useCallback((_, index) => {
    setActiveIndexDelivery(index);
  }, []);

  // Data pro "Status Distribution" Pie Chart
  const statusPieData = Object.entries(summary?.statusCounts || {}).map(([status, count]) => ({
    name: `Status ${status}`,
    value: count,
  })).filter(item => item.value > 0);

  // NOVÁ data pro Stacked Status Chart by Loading Date
  const statusStackedChartData = Object.values(summary?.statusByLoadingDate || {})
    .sort((a, b) => {
      const dateA = new Date(a.date.split('/').reverse().join('-'));
      const dateB = new Date(b.date.split('/').reverse().join('-'));
      return dateA - dateB;
    });

  // Získání unikátních statusů a typů dodávek pro dropdown filtry
  const uniqueStatuses = Array.from(new Set(allOrdersData.map(row => Number(row["Status"])).filter(s => !isNaN(s)))).sort((a, b) => a - b);
  const uniqueDeliveryTypes = Array.from(new Set(allOrdersData.map(row => row["del.type"]).filter(t => t))).sort();

  // Funkce pro načtení a zobrazení seznamu zakázek v modalu
  const handleCardClick = useCallback(async (category, statusFilterArray = [], deliveryTypeFilter = null, selectedDateString = null) => {
    setModalTitle(t.orderListFor + " " + t[category]);

    let filteredOrders = allOrdersData;

    if (selectedDateString) {
      filteredOrders = filteredOrders.filter(order => {
        const parsedOrderDate = parseExcelDate(order["Loading Date"]);
        return parsedOrderDate && format(parsedOrderDate, 'yyyy-MM-dd') === selectedDateString;
      });
    }

    if (statusFilterArray.length > 0) {
      filteredOrders = filteredOrders.filter(order => statusFilterArray.includes(Number(order.Status)));
    } else if (category === 'delayed') {
      const today = startOfDay(new Date());
      filteredOrders = filteredOrders.filter(order => {
        const parsedDate = parseExcelDate(order["Loading Date"]);
        return parsedDate && isBefore(parsedDate, today) && ![50, 60, 70].includes(Number(order.Status));
      });
    } else if (deliveryTypeFilter) {
      filteredOrders = filteredOrders.filter(order => order["del.type"] === deliveryTypeFilter);
    }

    const mappedOrders = filteredOrders.map(order => ({
      "Delivery No": (order["Delivery"] || order["Delivery No"])?.trim(),
      "Status": Number(order.Status),
      "del.type": order["del.type"],
      "Loading Date": order["Loading Date"], // Keep as ISO string
      "Note": order["Note"] || "",
      "Forwarding agent name": order["Forwarding agent name"] || "N/A",
      "Name of ship-to party": order["Name of ship-to party"] || "N/A",
      "Total Weight": order["Total Weight"],
      "Bill of lading": order["Bill of lading"] || "N/A",
    }));

    setModalOrders(mappedOrders);
    setShowOrderListModal(true);
  }, [allOrdersData, t]);

  // Funkce pro zobrazení historie statusů v modalu
  const handleShowStatusHistory = useCallback(async (deliveryIdentifier) => {
    try {
      const { data, error } = await supabaseClient
        .from('delivery_status_log')
        .select('status, timestamp')
        .eq('delivery_no', deliveryIdentifier.trim())
        .order('timestamp', { ascending: true });

      if (error) {
        console.error("Error fetching status history:", error.message);
        setDeliveryStatusLog([]);
      } else {
        setDeliveryStatusLog(data || []);
      }
    } catch (e) {
      console.error("Caught error fetching status history:", e);
      setDeliveryStatusLog([]);
    } finally {
      setShowStatusHistoryModal(true);
    }
  }, []);

  // Zobrazení načítacího stavu, dokud není komponenta na klientovi
  if (!isClient || isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
        <p>Loading application...</p>
      </div>
    );
  }

  // Autentikační formulář
  if (!isAuthenticated) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${darkMode ? "bg-gray-950 text-gray-100" : "bg-white text-gray-900"} transition-colors duration-300`}>
        <Card className="p-8 max-w-md w-full">
          <h2 className="text-3xl font-bold mb-6 text-center text-blue-400">
            {isRegistering ? t.registerTitle : t.loginTitle}
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300">
                {t.username}
              </label>
              <input
                type="email" // Use type="email" for better UX with Firebase Auth
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full p-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                {t.password}
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full p-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                placeholder="********"
              />
            </div>
            {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
            {registerMessage && <p className={`text-sm text-center ${registerMessage.includes(t.registerError) ? 'text-red-500' : 'text-green-500'}`}>{registerMessage}</p>}

            {isRegistering ? (
              <button
                onClick={handleRegister}
                className="w-full bg-green-600 text-white py-2 rounded-lg shadow hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                disabled={!isFirebaseReady} // Disable if Firebase is not ready
              >
                <UserPlus className="w-5 h-5" /> {t.register}
              </button>
            ) : (
              <>
                <button
                  onClick={handleLogin}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg shadow hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  disabled={!isFirebaseReady} // Disable if Firebase is not ready
                >
                  <Lock className="w-5 h-5" /> {t.loginButton}
                </button>
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full bg-red-600 text-white py-2 rounded-lg shadow hover:bg-red-700 transition-colors flex items-center justify-center gap-2 mt-2"
                  disabled={!isFirebaseReady} // Disable if Firebase is not ready
                >
                  <Mail className="w-5 h-5" /> {t.googleSignIn}
                </button>
              </>
            )}
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setLoginError("");
                setRegisterMessage("");
                setUsername("");
                setPassword("");
              }}
              className="w-full text-blue-400 hover:underline mt-2 text-sm"
            >
              {isRegistering ? t.loginButton : t.register}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // Funkce pro získání dat pro konkrétní denní souhrn
  const getDailySummaryForDate = (date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return summary?.dailySummaries.find(d => d.date === formattedDate);
  };

  const today = startOfDay(new Date());
  const datesForOverview = [
    subDays(today, 2),
    subDays(today, 1),
    today,
    addDays(today, 1),
    addDays(today, 2),
    addDays(today, 3),
  ];

  // Hlavní dashboard UI
  return (
    <div
      className={`p-8 space-y-8 min-h-screen ${
        darkMode ? "bg-gray-950 text-gray-100" : "bg-white text-gray-900"
      } transition-colors duration-300 font-inter`}
    >
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">{t.title}</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setLang(prevLang => {
                if (prevLang === "cz") return "en";
                if (prevLang === "en") return "de";
                return "cz";
              });
            }}
            className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded-lg shadow text-sm"
          >
            <Globe className="w-4 h-4" /> {t.langCode}
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded-lg shadow text-sm"
          >
            {darkMode ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-blue-400" />} {t.switchTheme}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg shadow text-sm"
          >
            <Lock className="w-5 h-5" /> {t.logout}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-center items-center gap-4">
        <label className="cursor-pointer inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow transition-colors">
          <UploadCloud className="w-5 h-5 text-white" />
          <span>{t.upload}</span>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
        <button
          onClick={exportPDF}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition-colors"
        >
          <FileDown className="w-5 h-5" /> {t.export}
        </button>
      </div>

      {importHistory.length > 0 && (
        <div className="bg-gray-800 p-4 rounded-xl shadow-lg max-w-lg mx-auto">
          <h2 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
            <History className="w-5 h-5" /> {t.history}
          </h2>
          <div className="flex items-center gap-4">
            <select
              id="import-select"
              value={selectedImportId || ""}
              onChange={handleSelectImport}
              className="p-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500 flex-grow"
            >
              <option value="">{t.selectImport}</option>
              {importHistory.map((imp) => (
                <option key={imp.id} value={imp.id}>
                  {imp.date_label} - {imp.original_name}
                </option>
              ))}
            </select>
            {selectedImportId && (
              <button
                onClick={() => confirmDelete(selectedImportId)}
                className="p-2 rounded-full text-red-400 hover:bg-red-900 transition-colors"
                title="Smazat vybraný import"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {selectedOrderDetails && (
        <OrderDetailsModal
          order={selectedOrderDetails}
          onClose={() => setSelectedOrderDetails(null)}
          onShowStatusHistory={handleShowStatusHistory}
          onSaveNote={handleSaveNote}
          t={t}
        />
      )}

      {showDeleteConfirm && (
        <Modal title={t.deleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
          <p className="text-lg mb-4 text-center">{t.deleteConfirm}</p>
          <div className="flex justify-center gap-4">
            <button
              onClick={handleDeleteImport}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              {t.yes}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              {t.no}
            </button>
          </div>
        </Modal>
      )}

      {showOrderListModal && (
        <Modal title={modalTitle} onClose={() => setShowOrderListModal(false)}>
          <OrderListTable orders={modalOrders} onSelectOrder={setSelectedOrderDetails} t={t} />
        </Modal>
      )}

      {showStatusHistoryModal && (
        <Modal title={`${t.statusHistory} - ${currentDeliveryNo}`} onClose={() => setShowStatusHistoryModal(false)}>
          {deliveryStatusLog.length > 0 ? (
            <ul className="text-gray-200 text-sm space-y-1">
              {deliveryStatusLog.map((log, idx) => (
                <li key={idx}>
                  Status {log.status} - {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-400">{t.noDataAvailable}</p>
          )}
        </Modal>
      )}

      {!summary && (
        <p className="text-gray-400 text-center mt-8">{t.uploadFilePrompt}</p>
      )}

      {summary && (
        <div id="report-section" className="space-y-10">
          {/* Navigace záložek */}
          <div className="flex space-x-1 rounded-xl bg-gray-800 p-1 mb-8 max-w-6xl mx-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab(0)}
              className={`flex-shrink-0 w-full md:w-auto px-4 py-2.5 text-sm leading-5 font-medium rounded-lg focus:outline-none focus:ring-2 ring-offset-2 ring-offset-gray-700 ring-white ring-opacity-60 ${activeTab === 0 ? 'bg-blue-600 text-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`}
            >
              {t.dashboardTab}
            </button>
            <button
              onClick={() => setActiveTab(1)}
              className={`flex-shrink-0 w-full md:w-auto px-4 py-2.5 text-sm leading-5 font-medium rounded-lg focus:outline-none focus:ring-2 ring-offset-2 ring-offset-gray-700 ring-white ring-opacity-60 ${activeTab === 1 ? 'bg-blue-600 text-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`}
            >
              {t.delayedOrdersTab}
            </button>
            <button
              onClick={() => setActiveTab(2)}
              className={`flex-shrink-0 w-full md:w-auto px-4 py-2.5 text-sm leading-5 font-medium rounded-lg focus:outline-none focus:ring-2 ring-offset-2 ring-offset-gray-700 ring-white ring-opacity-60 ${activeTab === 2 ? 'bg-blue-600 text-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`}
            >
              {t.importComparisonTab}
            </button>
            <button
              onClick={() => setActiveTab(3)}
              className={`flex-shrink-0 w-full md:w-auto px-4 py-2.5 text-sm leading-5 font-medium rounded-lg focus:outline-none focus:ring-2 ring-offset-2 ring-offset-gray-700 ring-white ring-opacity-60 ${activeTab === 3 ? 'bg-blue-600 text-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`}
            >
              {t.orderSearchTab}
            </button>
            <button
              onClick={() => setActiveTab(4)}
              className={`flex-shrink-0 w-full md:w-auto px-4 py-2.5 text-sm leading-5 font-medium rounded-lg focus:outline-none focus:ring-2 ring-offset-2 ring-offset-gray-700 ring-white ring-opacity-60 ${activeTab === 4 ? 'bg-blue-600 text-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`}
            >
              {t.dailySummary}
            </button>
            <button
              onClick={() => setActiveTab(5)}
              className={`flex-shrink-0 w-full md:w-auto px-4 py-2.5 text-sm leading-5 font-medium rounded-lg focus:outline-none focus:ring-2 ring-offset-2 ring-offset-gray-700 ring-white ring-opacity-60 ${activeTab === 5 ? 'bg-blue-600 text-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`}
            >
              {t.ticketsTab}
            </button>
            <button
              onClick={() => setActiveTab(6)}
              className={`flex-shrink-0 w-full md:w-auto px-4 py-2.5 text-sm leading-5 font-medium rounded-lg focus:outline-none focus:ring-2 ring-offset-2 ring-offset-gray-700 ring-white ring-opacity-60 ${activeTab === 6 ? 'bg-blue-600 text-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`}
            >
              {t.profileTab}
            </button>
            <button
              onClick={() => setActiveTab(7)}
              className={`flex-shrink-0 w-full md:w-auto px-4 py-2.5 text-sm leading-5 font-medium rounded-lg focus:outline-none focus:ring-2 ring-offset-2 ring-offset-gray-700 ring-white ring-opacity-60 ${activeTab === 7 ? 'bg-blue-600 text-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`}
            >
              {t.chatTab}
            </button>
          </div>

          {/* Obsah záložek */}
          {activeTab === 0 && (
            <>
              {/* Sekce datových filtrů - kompaktní a sbalitelná */}
              <Card className="bg-gray-800 p-4 rounded-xl shadow-lg">
                <h2
                  className="text-xl font-semibold mb-3 text-gray-200 flex items-center gap-2 cursor-pointer"
                  onClick={() => setFiltersCollapsed(!filtersCollapsed)}
                >
                  <Search className="w-5 h-5" /> {t.filters}
                  <span className="ml-auto text-sm">
                    {filtersCollapsed ? '▼' : '▲'}
                  </span>
                </h2>
                {!filtersCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="time-range-filter" className="block text-xs font-medium text-gray-400 mb-1">{t.timeRange}:</label>
                      <select
                        id="time-range-filter"
                        value={filterTimeRange}
                        onChange={(e) => {
                          setFilterTimeRange(e.target.value);
                          if (e.target.value !== 'custom') {
                            setFilterStartDate('');
                            setFilterEndDate('');
                          }
                        }}
                        className="w-full p-1.5 text-sm rounded-md bg-gray-700 border border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All</option>
                        <option value="yesterday">{t.yesterday}</option>
                        <option value="today">{t.today}</option>
                        <option value="last7days">{t.last7Days}</option>
                        <option value="thisMonth">{t.thisMonth}</option>
                        <option value="custom">{t.customRange}</option>
                      </select>
                    </div>

                    {filterTimeRange === 'custom' && (
                      <>
                        <div>
                          <label htmlFor="start-date-filter" className="block text-xs font-medium text-gray-400 mb-1">Start Date:</label>
                          <input
                            type="date"
                            id="start-date-filter"
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                            className="w-full p-1.5 text-sm rounded-md bg-gray-700 border border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label htmlFor="end-date-filter" className="block text-xs font-medium text-gray-400 mb-1">End Date:</label>
                          <input
                            type="date"
                            id="end-date-filter"
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                            className="w-full p-1.5 text-sm rounded-md bg-gray-700 border border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label htmlFor="delivery-type-filter" className="block text-xs font-medium text-gray-400 mb-1">{t.filterByDeliveryType}:</label>
                      <select
                        id="delivery-type-filter"
                        value={filterDeliveryType}
                        onChange={(e) => setFilterDeliveryType(e.target.value)}
                        className="w-full p-1.5 text-sm rounded-md bg-gray-700 border border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All</option>
                        {uniqueDeliveryTypes.map(type => (
                          <option key={type} value={type}>{type === 'P' ? t.pallets : t.carton}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="status-filter" className="block text-xs font-medium text-gray-400 mb-1">{t.filterByStatus}:</label>
                      <select
                        id="status-filter"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full p-1.5 text-sm rounded-md bg-gray-700 border border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All</option>
                        {uniqueStatuses.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => {
                          setFilterTimeRange('all');
                          setFilterStartDate('');
                          setFilterEndDate('');
                          setFilterDeliveryType('all');
                          setFilterStatus('all');
                        }}
                        className="bg-gray-600 text-white px-3 py-1.5 text-sm rounded-lg shadow hover:bg-gray-700 transition-colors"
                      >
                        {t.clearFilters}
                      </button>
                    </div>
                  </div>
                )}
              </Card>

              {/* Původní přehledové karty */}
              {summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
                  <Card>
                    <CardContent>
                      <p className="text-gray-400">{t.total}</p>
                      <p className="text-3xl font-bold text-blue-400">{summary.total}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent>
                      <p className="text-gray-400">{t.done}</p>
                      <p className="text-3xl font-bold text-green-400">{summary.doneTotal}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent>
                      <p className="text-gray-400">{t.remaining}</p>
                      <p className="text-3xl font-bold text-yellow-400">{summary.remainingTotal}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent>
                      <p className="text-gray-400">{t.inProgress}</p>
                      <p className="text-3xl font-bold text-orange-400">{summary.inProgressTotal}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent>
                      <p className="text-gray-400">{t.newOrders}</p>
                      <p className="text-3xl font-bold text-purple-400">{summary.newOrdersTotal}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent>
                      <p className="text-gray-400">{t.pallets}</p>
                      <p className="text-3xl font-bold text-pink-400">{summary.palletsTotal}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent>
                      <p className="text-gray-400">{t.carton}</p>
                      <p className="text-3xl font-bold text-cyan-400">{summary.cartonsTotal}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Daily Overview Cards - for 2 days back, today, 3 days forward */}
              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <ClipboardList className="w-6 h-6 text-green-400" /> {t.dailyOverview}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                  {datesForOverview.map((date, index) => {
                    const dailyStats = getDailySummaryForDate(date);
                    const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
                    const isYesterday = format(date, 'yyyy-MM-dd') === format(subDays(today, 1), 'yyyy-MM-dd');
                    const isOlder = isBefore(date, today);
                    const isFuture = isAfter(date, today);

                    let dateLabel = format(date, 'dd/MM/yyyy');
                    if (isToday) dateLabel = t.today;
                    else if (isYesterday) dateLabel = t.yesterday;
                    else if (isOlder) dateLabel = `${t.older} (${dateLabel})`;
                    else if (isFuture) dateLabel = `${t.future} (${dateLabel})`;

                    return (
                      <Card key={index} className="flex flex-col justify-between h-full">
                        <CardContent className="flex-grow">
                          <p className="text-gray-400 text-center text-lg font-semibold mb-2">{dateLabel}</p>
                          {dailyStats ? (
                            <div className="space-y-1 text-sm">
                              <p className="text-gray-200">{t.total}: <strong className="text-blue-300">{dailyStats.total}</strong></p>
                              <p className="text-gray-200">{t.done}: <strong className="text-green-300">{dailyStats.done}</strong></p>
                              <p className="text-gray-200">{t.remaining}: <strong className="text-yellow-300">{dailyStats.remaining}</strong></p>
                              <p className="text-gray-200">{t.inProgress}: <strong className="text-orange-300">{dailyStats.inProgress}</strong></p>
                              <p className="text-gray-200">{t.newOrders}: <strong className="text-purple-300">{dailyStats.newOrders}</strong></p>
                            </div>
                          ) : (
                            <p className="text-center text-gray-400 text-sm">{t.noDataAvailable}</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>


              {/* Status Distribution Chart */}
              <div>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-blue-400" />{" "}
                  {t.statusDistribution}
                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() => setChartTypeStatus('bar')}
                      className={`p-2 rounded-full ${chartTypeStatus === 'bar' ? 'bg-blue-600' : 'bg-gray-700'} text-white hover:bg-blue-700 transition-colors`}
                      title={t.barChart}
                    >
                      <BarChart3 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setChartTypeStatus('pie')}
                      className={`p-2 rounded-full ${chartTypeStatus === 'pie' ? 'bg-blue-600' : 'bg-gray-700'} text-white hover:bg-blue-700 transition-colors`}
                      title={t.pieChart}
                    >
                      <PieChartIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setChartTypeStatus('stackedBar')}
                      className={`p-2 rounded-full ${chartTypeStatus === 'stackedBar' ? 'bg-blue-600' : 'bg-gray-700'} text-white hover:bg-blue-700 transition-colors`}
                      title={t.stackedBarChart}
                    >
                      <BarChart3 className="w-5 h-5 rotate-90" />
                    </button>
                  </div>
                </h2>
                <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-6 rounded-xl shadow-md">
                  {statusPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                      {chartTypeStatus === 'bar' ? (
                        <BarChart
                          data={statusPieData}
                        >
                          <XAxis
                            dataKey="name"
                            stroke="#E5E7EB"
                            tick={{ fill: "#E5E7EB" }}
                            axisLine={{ stroke: "#4B5563" }}
                          />
                          <YAxis
                            allowDecimals={false}
                            stroke="#E5E7EB"
                            tick={{ fill: "#E5E7EB" }}
                            axisLine={{ stroke: "#4B5563" }}
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                            contentStyle={{ backgroundColor: '#374151', border: 'none', borderRadius: '8px' }}
                            labelStyle={{ color: '#E5E7EB' }}
                            itemStyle={{ color: '#E5E7EB' }}
                          />
                          <Bar
                            dataKey="value"
                            name={t.total}
                            fill={CHART_COLORS[0]}
                            radius={[6, 6, 0, 0]}
                            animationDuration={800}
                          >
                            {/* <LabelList dataKey="value" position="top" fill="#E5E7EB" /> */}
                          </Bar>
                        </BarChart>
                      ) : chartTypeStatus === 'pie' ? (
                          <PieChart>
                            <Pie
                              activeIndex={activeIndexStatus}
                              activeShape={renderActiveShape}
                              data={statusPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              onMouseEnter={onPieEnterStatus}
                            >
                              {statusPieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: '#374151', border: 'none', borderRadius: '8px' }}
                              labelStyle={{ color: '#E5E7EB' }}
                              itemStyle={{ color: '#E5E7EB' }}
                            />
                            <Legend wrapperStyle={{ color: '#E5E7EB', paddingTop: '10px' }} />
                          </PieChart>
                      ) : (
                        <BarChart
                          data={statusStackedChartData}
                          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        >
                          <XAxis dataKey="date" stroke="#E5E7EB" tick={{ fill: "#E5E7EB" }} axisLine={{ stroke: "#4B5563" }} />
                          <YAxis allowDecimals={false} stroke="#E5E7EB" tick={{ fill: "#E5E7EB" }} axisLine={{ stroke: "#4B5563" }} />
                          <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                            contentStyle={{ backgroundColor: '#374151', border: 'none', borderRadius: '8px' }}
                            labelStyle={{ color: '#E5E7EB' }}
                            itemStyle={{ color: '#E5E7EB' }}
                          />
                          <Legend wrapperStyle={{ color: '#E5E7EB', paddingTop: '10px' }} />
                          {uniqueStatuses.map(status => (
                            <Bar key={`status-bar-${status}`} dataKey={`status${status}`} name={`Status ${status}`} fill={CHART_COLORS[status % CHART_COLORS.length]} stackId="statusStack" >
                              {/* <LabelList dataKey={`status${status}`} position="top" fill="#E5E7EB" /> */}
                            </Bar>
                          ))}
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-80 bg-gray-700 text-gray-400 rounded-xl">
                        <p className="text-lg">{t.noDataAvailable}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Overall Statuses Card and Delivery Types and Overall Delayed Orders Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Card>
                  <CardContent>
                    <h2 className="text-lg font-semibold text-green-400 flex items-center gap-1 mb-2">
                      <BarChart3 className="w-4 h-4" />{" "}
                      {t.statuses}
                    </h2>
                    {Object.entries(summary.statusCounts).length > 0 ? (
                      Object.entries(summary.statusCounts)
                        .sort(([sA], [sB]) => parseInt(sA) - parseInt(sB))
                        .map(([status, count]) => (
                          <p key={status} className="text-gray-200 cursor-pointer hover:text-gray-300" onClick={() => handleCardClick('status', [Number(status)])}>
                            Status {status}:{" "}
                            <strong>{count}</strong>
                          </p>
                        ))
                    ) : (
                      <p className="text-gray-400">{t.noDataAvailable}</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <h2 className="text-lg font-semibold text-indigo-400 flex items-center gap-1 mb-2">
                      <TimerReset className="w-4 h-4" />{" "}
                      {t.types}
                    </h2>
                    {Object.entries(summary.deliveryTypes).length > 0 ? (
                      Object.entries(summary.deliveryTypes).map(
                        ([type, count]) => (
                          <p key={type} className="text-gray-200 cursor-pointer hover:text-gray-300" onClick={() => handleCardClick('deliveryType', [], type)}>
                            {type === "P" ? t.pallets : t.carton}:{" "}
                            <strong>{count}</strong>
                          </p>
                        )
                      )
                    ) : (
                      <p className="text-gray-400">{t.noDataAvailable}</p>
                    )}
                    <p className="text-gray-200 pt-2">
                      {t.sentPallets}:{" "}
                      <strong>{summary.sentPallets}</strong>
                    </p>
                    <p className="text-gray-200">
                      {t.sentCartons}:{" "}
                      <strong>{summary.sentCartons}</strong>
                    </p>
                    <p className="text-red-400 pt-2 font-bold cursor-pointer hover:text-red-300" onClick={() => handleCardClick('delayed', [])}>
                      {t.delayed}:{" "}
                      <strong>{summary.delayed}</strong>
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Grafy */}
              <div className="mt-10 space-y-10">
                {/* Orders Over Time Chart */}
                <div>
                  <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-orange-400" />{" "}
                    {t.ordersOverTime}
                    <div className="ml-auto flex gap-2">
                      <button
                        onClick={() => setChartTypeOrdersOverTime('bar')}
                        className={`p-2 rounded-full ${chartTypeOrdersOverTime === 'bar' ? 'bg-blue-600' : 'bg-gray-700'} text-white hover:bg-blue-700 transition-colors`}
                        title={t.barChart}
                      >
                        <BarChart3 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setChartTypeOrdersOverTime('line')}
                        className={`p-2 rounded-full ${chartTypeOrdersOverTime === 'line' ? 'bg-blue-600' : 'bg-gray-700'} text-white hover:bg-blue-700 transition-colors`}
                        title={t.lineChart}
                      >
                        <LineChartIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </h2>
                  <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-6 rounded-xl shadow-md">
                    {ordersOverTimeData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={320}>
                        {chartTypeOrdersOverTime === 'bar' ? (
                          <BarChart
                            data={ordersOverTimeData}
                            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          >
                            <XAxis
                              dataKey="date"
                              stroke="#E5E7EB"
                              tick={{ fill: "#E5E7EB" }}
                              axisLine={{ stroke: "#4B5563" }}
                              tickFormatter={(tick) => format(new Date(tick), 'dd/MM')}
                            />
                            <YAxis allowDecimals={false} stroke="#E5E7EB" tick={{ fill: "#E5E7EB" }} axisLine={{ stroke: "#4B5563" }} />
                            <Tooltip
                              cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                              contentStyle={{ backgroundColor: '#374151', border: 'none', borderRadius: '8px' }}
                              labelStyle={{ color: '#E5E7EB' }}
                              itemStyle={{ color: '#E5E7EB' }}
                            />
                            <Legend wrapperStyle={{ color: '#E5E7EB', paddingTop: '10px' }} />
                            <Bar dataKey="total" name={t.total} fill="#FFFFFF" radius={[6, 6, 0, 0]} animationDuration={800}>
                              {/* <LabelList dataKey="total" position="top" fill="#E5E7EB" /> */}
                            </Bar>
                            <Bar dataKey="remaining" name={t.remaining} fill={CHART_COLORS[1]} radius={[6, 6, 0, 0]} animationDuration={800}>
                              {/* <LabelList dataKey="remaining" position="top" fill="#E5E7EB" /> */}
                            </Bar>
                            <Bar dataKey="new" name={t.newOrders} fill={CHART_COLORS[2]} radius={[6, 6, 0, 0]} animationDuration={800}>
                              {/* <LabelList dataKey="new" position="top" fill="#E5E7EB" /> */}
                            </Bar>
                            <Bar dataKey="inProgress" name={t.inProgress} fill={CHART_COLORS[3]} radius={[6, 6, 0, 0]} animationDuration={800}>
                              {/* <LabelList dataKey="inProgress" position="top" fill="#E5E7EB" /> */}
                            </Bar>
                            <Bar dataKey="completed" name={t.done} fill={CHART_COLORS[4]} radius={[6, 6, 0, 0]} animationDuration={800}>
                              {/* <LabelList dataKey="completed" position="top" fill="#E5E7EB" /> */}
                            </Bar>
                            <Brush dataKey="date" height={30} stroke="#8884d8" travellerWidth={10}>
                              <AreaChart>
                                <YAxis hide domain={['auto', 'auto']} />
                                <Area type="monotone" dataKey="total" stroke="#8884d8" fill="#8884d8" />
                              </AreaChart>
                            </Brush>
                          </BarChart>
                        ) : (
                          <LineChart
                            data={ordersOverTimeData}
                            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          >
                            <XAxis
                              dataKey="date"
                              stroke="#E5E7EB"
                              tick={{ fill: "#E5E7EB" }}
                              axisLine={{ stroke: "#4B5563" }}
                              tickFormatter={(tick) => format(new Date(tick), 'dd/MM')}
                            />
                            <YAxis allowDecimals={false} stroke="#E5E7EB" tick={{ fill: "#E5E7EB" }} axisLine={{ stroke: "#4B5563" }} />
                            <Tooltip
                              cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.3)' }}
                              contentStyle={{ backgroundColor: '#374151', border: 'none', borderRadius: '8px' }}
                              labelStyle={{ color: '#E5E7EB' }}
                              itemStyle={{ color: '#E5E7EB' }}
                            />
                            <Legend wrapperStyle={{ color: '#E5E7EB', paddingTop: '10px' }} />
                            <Line type="monotone" dataKey="total" name={t.total} stroke="#FFFFFF" activeDot={{ r: 8 }} animationDuration={800} />
                            <Line type="monotone" dataKey="remaining" name={t.remaining} stroke={CHART_COLORS[1]} activeDot={{ r: 8 }} animationDuration={800} />
                            <Line type="monotone" dataKey="new" name={t.newOrders} stroke={CHART_COLORS[2]} activeDot={{ r: 8 }} animationDuration={800} />
                            <Line type="monotone" dataKey="inProgress" name={t.inProgress} stroke={CHART_COLORS[3]} activeDot={{ r: 8 }} animationDuration={800} />
                            <Line type="monotone" dataKey="completed" name={t.done} stroke={CHART_COLORS[4]} activeDot={{ r: 8 }} animationDuration={800} />
                            <Brush dataKey="date" height={30} stroke="#8884d8" travellerWidth={10}>
                              <AreaChart>
                                <YAxis hide domain={['auto', 'auto']} />
                                <Area type="monotone" dataKey="total" stroke="#8884d8" fill="#8884d8" />
                              </AreaChart>
                            </Brush>
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-80 bg-gray-700 text-gray-400 rounded-xl">
                        <p className="text-lg">{t.noDataAvailable}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* New Chart: In Progress Only (statuses 31, 35, 40) */}
                <div>
                  <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-orange-400" />{" "}
                    {t.inProgressOnly}
                  </h2>
                  <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-6 rounded-xl shadow-md">
                    {inProgressOnlyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                          data={inProgressOnlyData}
                          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        >
                          <XAxis
                            dataKey="hour"
                            stroke="#E5E7EB"
                            tick={{ fill: "#E5E7EB" }}
                            axisLine={{ stroke: "#4B5563" }}
                          />
                          <YAxis
                            allowDecimals={false}
                            stroke="#E5E7EB"
                            tick={{ fill: "#E5E7EB" }}
                            axisLine={{ stroke: "#4B5563" }}
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                            contentStyle={{ backgroundColor: '#374151', border: 'none', borderRadius: '8px' }}
                            labelStyle={{ color: '#E5E7EB' }}
                            itemStyle={{ color: '#E5E7EB' }}
                          />
                          <Legend wrapperStyle={{ color: '#E5E7EB', paddingTop: '10px' }} />
                          <Bar dataKey="status31" name="Status 31" fill={CHART_COLORS[9]} stackId="b">
                            {/* <LabelList dataKey="status31" position="top" fill="#E5E7EB" /> */}
                          </Bar>
                          <Bar dataKey="status35" name="Status 35" fill={CHART_COLORS[10]} stackId="b">
                            {/* <LabelList dataKey="status35" position="top" fill="#E5E7EB" /> */}
                          </Bar>
                          <Bar dataKey="status40" name="Status 40" fill={CHART_COLORS[11]} stackId="b">
                            {/* <LabelList dataKey="status40" position="top" fill="#E5E7EB" /> */}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-80 bg-gray-700 text-gray-400 rounded-xl">
                        <p className="text-lg">{t.noDataAvailable}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* New Chart: Shipments (statuses 50, 60, 70) */}
                <div>
                  <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-green-400" />{" "}
                    {t.shipments}
                  </h2>
                  <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-6 rounded-xl shadow-md">
                    {shipmentsData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                          data={shipmentsData}
                          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        >
                          <XAxis
                            dataKey="hour"
                            stroke="#E5E7EB"
                            tick={{ fill: "#E5E7EB" }}
                            axisLine={{ stroke: "#4B5563" }}
                          />
                          <YAxis
                            allowDecimals={false}
                            stroke="#E5E7EB"
                            tick={{ fill: "#E5E7EB" }}
                            axisLine={{ stroke: "#4B5563" }}
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                            contentStyle={{ backgroundColor: '#374151', border: 'none', borderRadius: '8px' }}
                            labelStyle={{ color: '#E5E7EB' }}
                            itemStyle={{ color: '#E5E7EB' }}
                          />
                          <Legend wrapperStyle={{ color: '#E5E7EB', paddingTop: '10px' }} />
                          <Bar dataKey="status50" name="Status 50" fill={CHART_COLORS[4]} stackId="c">
                            {/* <LabelList dataKey="status50" position="top" fill="#E5E7EB" /> */}
                          </Bar>
                          <Bar dataKey="status60" name="Status 60" fill={CHART_COLORS[7]} stackId="c">
                            {/* <LabelList dataKey="status60" position="top" fill="#E5E7EB" /> */}
                          </Bar>
                          <Bar dataKey="status70" name="Status 70" fill={CHART_COLORS[8]} stackId="c">
                            {/* <LabelList dataKey="status70" position="top" fill="#E5E7EB" /> */}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-80 bg-gray-700 text-gray-400 rounded-xl">
                        <p className="text-lg">{t.noDataAvailable}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* New Chart: Shift Comparison (Hotovo) */}
                <div>
                  <h2 className="2xl font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-purple-400" />{" "}
                    {t.shiftComparison}
                  </h2>
                  <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-6 rounded-xl shadow-md">
                    {shiftComparisonData.length > 0 && shiftComparisonData.some(d => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                          data={shiftComparisonData}
                          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        >
                          <XAxis
                            dataKey="name"
                            stroke="#E5E7EB"
                            tick={{ fill: "#E5E7EB" }}
                            axisLine={{ stroke: "#4B5563" }}
                          />
                          <YAxis
                            allowDecimals={false}
                            stroke="#E5E7EB"
                            tick={{ fill: "#E5E7EB" }}
                            axisLine={{ stroke: "#4B5563" }}
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                            contentStyle={{ backgroundColor: '#374151', border: 'none', borderRadius: '8px' }}
                            labelStyle={{ color: '#E5E7EB' }}
                            itemStyle={{ color: '#E5E7EB' }}
                          />
                          <Bar dataKey="value" name={t.done} fill={CHART_COLORS[4]} radius={[6, 6, 0, 0]} animationDuration={800}>
                            {/* <LabelList dataKey="value" position="top" fill="#E5E7EB" /> */}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-80 bg-gray-700 text-gray-400 rounded-xl">
                        <p className="text-lg">{t.noDataAvailable}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Types Chart */}
                <div>
                  <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-blue-400" />{" "}
                    {t.orderTypes}
                    <div className="ml-auto flex gap-2">
                      <button
                        onClick={() => setChartTypeOrderTypes('bar')}
                        className={`p-2 rounded-full ${chartTypeOrderTypes === 'bar' ? 'bg-blue-600' : 'bg-gray-700'} text-white hover:bg-blue-700 transition-colors`}
                        title={t.barChart}
                      >
                        <BarChart3 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setChartTypeOrderTypes('pie')}
                        className={`p-2 rounded-full ${chartTypeOrderTypes === 'pie' ? 'bg-blue-600' : 'bg-gray-700'} text-white hover:bg-blue-700 transition-colors`}
                        title={t.pieChart}
                      >
                        <PieChartIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setChartTypeOrderTypes('stackedBar')}
                        className={`p-2 rounded-full ${chartTypeOrderTypes === 'stackedBar' ? 'bg-blue-600' : 'bg-gray-700'} text-white hover:bg-blue-700 transition-colors`}
                        title={t.stackedBarChart}
                      >
                        <BarChart3 className="w-5 h-5 rotate-90" />
                      </button>
                    </div>
                  </h2>
                  <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-6 rounded-xl shadow-md">
                    {deliveryTypePieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={320}>
                        {chartTypeOrderTypes === 'bar' ? (
                          <BarChart
                            data={deliveryTypePieData}
                          >
                            <XAxis
                              dataKey="name"
                              stroke="#E5E7EB"
                              tick={{ fill: "#E5E7EB" }}
                              axisLine={{ stroke: "#4B5563" }}
                            />
                            <YAxis
                              allowDecimals={false}
                              stroke="#E5E7EB"
                              tick={{ fill: "#E5E7EB" }}
                              axisLine={{ stroke: "#4B5563" }}
                            />
                            <Tooltip
                              cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                              contentStyle={{ backgroundColor: '#374151', border: 'none', borderRadius: '8px' }}
                              labelStyle={{ color: '#E5E7EB' }}
                              itemStyle={{ color: '#E5E7EB' }}
                            />
                            <Bar
                              dataKey="value"
                              name={t.total}
                              fill={CHART_COLORS[5]}
                              radius={[6, 6, 0, 0]}
                              animationDuration={800}
                            >
                              {/* <LabelList dataKey="value" position="top" fill="#E5E7EB" /> */}
                            </Bar>
                          </BarChart>
                        ) : chartTypeOrderTypes === 'pie' ? (
                          <PieChart>
                            <Pie
                              activeIndex={activeIndexDelivery}
                              activeShape={renderActiveShape}
                              data={deliveryTypePieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              onMouseEnter={onPieEnterDelivery}
                            >
                              {deliveryTypePieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: '#374151', border: 'none', borderRadius: '8px' }}
                              labelStyle={{ color: '#E5E7EB' }}
                              itemStyle={{ color: '#E5E7EB' }}
                            />
                            <Legend wrapperStyle={{ color: '#E5E7EB', paddingTop: '10px' }} />
                          </PieChart>
                        ) : (
                          <BarChart
                            data={deliveryTypeStackedChartData}
                            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          >
                            <XAxis dataKey="name" stroke="#E5E7EB" tick={{ fill: "#E5E7EB" }} axisLine={{ stroke: "#4B5563" }} />
                            <YAxis allowDecimals={false} stroke="#E5E7EB" tick={{ fill: "#E5E7EB" }} axisLine={{ stroke: "#4B5563" }} />
                            <Tooltip
                              cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                              contentStyle={{ backgroundColor: '#374151', border: 'none', borderRadius: '8px' }}
                              labelStyle={{ color: '#E5E7EB' }}
                              itemStyle={{ color: '#E5E7EB' }}
                            />
                            <Legend wrapperStyle={{ color: '#E5E7EB', paddingTop: '10px' }} />
                            <Bar key="today-delivery" dataKey="Today" name={t.today} fill={DATE_CATEGORY_COLORS['Today']} stackId="deliveryDate" />
                            <Bar key="yesterday-delivery" dataKey="Yesterday" name={t.yesterday} fill={DATE_CATEGORY_COLORS['Yesterday']} stackId="deliveryDate" />
                            <Bar key="older-delivery" dataKey="Older" name={t.older} fill={DATE_CATEGORY_COLORS['Older']} stackId="deliveryDate" />
                            <Bar key="future-delivery" dataKey="Future" name={t.future} fill={DATE_CATEGORY_COLORS['Future']} stackId="deliveryDate" />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-80 bg-gray-700 text-gray-400 rounded-xl">
                        <p className="text-lg">{t.noDataAvailable}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 1 && (
            <Card>
              <CardContent>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-red-400">
                  <ClipboardList className="w-6 h-6" /> {t.delayed}
                  <button
                    onClick={exportDelayedOrdersXLSX} // Changed to XLSX export
                    className="ml-auto flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700 transition-colors text-base"
                  >
                    <FileDown className="w-5 h-5" /> {t.exportToXLSX} {/* Changed text */}
                  </button>
                </h2>
                <p className="text-gray-200 text-lg mb-4">
                  {t.totalDelayed}: <strong className="text-red-400">{summary.delayedOrdersList.length}</strong>
                </p>
                <div className="overflow-x-auto">
                  {summary.delayedOrdersList.length > 0 ? (
                    <table className="min-w-full bg-gray-700 rounded-lg overflow-hidden">
                      <thead className="bg-gray-600">
                        <tr>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">{t.deliveryNo}</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">{t.status}</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">{t.deliveryType}</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">{t.loadingDate}</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">{t.delay}</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">{t.billOfLading}</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-gray-100">{t.note}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(showAllDelayed ? summary.delayedOrdersList : summary.delayedOrdersList.slice(0, 10)).map((order, index) => {
                          let formattedLoadingDate = 'N/A';
                          if (order.loadingDate) { // order.loadingDate is already ISO string
                            try {
                              const parsedDate = parseISO(order.loadingDate);
                              if (!isNaN(parsedDate.getTime())) {
                                formattedLoadingDate = format(parsedDate, 'dd/MM/yyyy');
                              }
                            } catch (e) {
                              console.error("Error parsing loading date in Delayed Orders table:", e, order.loadingDate);
                            }
                          }
                          return (
                            <tr
                              key={order.delivery || index}
                              className={`border-t border-gray-600 cursor-pointer ${index % 2 === 0 ? "bg-gray-750" : "bg-gray-700"} hover:bg-gray-600 transition-colors`}
                              onClick={() => setSelectedOrderDetails({
                                "Delivery No": order.delivery,
                                "Status": order.status,
                                "del.type": order.delType,
                                "Loading Date": order.loadingDate, // This is already ISO string
                                "Note": order.note,
                                "Forwarding agent name": order["Forwarding agent name"],
                                "Name of ship-to party": order["Name of ship-to party"],
                                "Total Weight": order["Total Weight"],
                                "Bill of lading": order["Bill of lading"],
                              })}
                            >
                              <td className="py-3 px-4 text-gray-200">{order.delivery}</td>
                              <td className="py-3 px-4 text-gray-200">{order.status}</td>
                              <td className="py-3 px-4 text-gray-200">{order.delType}</td>
                              <td className="py-3 px-4 text-gray-200">{formattedLoadingDate}</td>
                              <td className={`py-3 px-4 font-semibold ${getDelayColorClass(order.delayDays)}`}>{order.delayDays}</td>
                              <td className="py-3 px-4 text-gray-200">{order["Bill of lading"] || 'N/A'}</td>
                              <td className="py-3 px-4">
                                <input
                                  type="text"
                                  value={order.note}
                                  onChange={(e) => {
                                    const updatedDelayedList = [...summary.delayedOrdersList];
                                    updatedDelayedList[index].note = e.target.value;
                                    setSummary({ ...summary, delayedOrdersList: updatedDelayedList });
                                  }}
                                  onBlur={(e) => handleSaveNote(order.delivery, e.target.value)}
                                  className="w-full p-1 rounded-md bg-gray-600 border border-gray-500 text-gray-100 text-sm focus:ring-blue-500 focus:border-blue-500"
                                  placeholder={t.note}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-center text-gray-400">{t.noDataAvailable}</p>
                  )}
                </div>
                {summary.delayedOrdersList.length > 10 && (
                  <div className="text-center mt-4">
                    <button
                      onClick={() => setShowAllDelayed(!showAllDelayed)}
                      className="text-blue-400 hover:underline px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors"
                    >
                      {showAllDelayed ? t.showLess : `${t.showMore} (${summary.delayedOrdersList.length - 10} ${t.moreItems})`}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 2 && (
            <Card>
              <CardContent>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-yellow-400">
                  <History className="w-6 h-6" /> {t.importComparisonTab}
                </h2>
                <p className="text-gray-200 mb-4">{t.selectImportsToCompare}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label htmlFor="compare-import-1" className="block text-sm font-medium text-gray-400 mb-1">{t.import1}:</label>
                    <select
                      id="compare-import-1"
                      value={compareImport1Id}
                      onChange={(e) => setCompareImport1Id(e.target.value)}
                      className="w-full p-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">{t.selectImport}</option>
                      {importHistory.map((imp) => (
                        <option key={imp.id} value={imp.id}>
                          {imp.date_label} - {imp.original_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="compare-import-2" className="block text-sm font-medium text-gray-400 mb-1">{t.import2}:</label>
                    <select
                      id="compare-import-2"
                      value={compareImport2Id}
                      onChange={(e) => setCompareImport2Id(e.target.value)}
                      className="w-full p-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">{t.selectImport}</option>
                      {importHistory.map((imp) => (
                        <option key={imp.id} value={imp.id}>
                          {imp.date_label} - {imp.original_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleCompareImports}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  disabled={!compareImport1Id || !compareImport2Id || compareImport1Id === compareImport2Id}
                >
                  <Search className="w-5 h-5" /> {t.compare}
                </button>

                {comparisonResults && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4 text-white">{t.comparisonResults}</h3>
                    {Object.values(comparisonResults).every(val => val === 0) ? (
                      <p className="text-gray-400">{t.noChangesDetected}</p>
                    ) : (
                      <ul className="space-y-2">
                        {Object.entries(comparisonResults).map(([key, count]) => {
                          if (count > 0) {
                            let displayKey = key;
                            if (key.startsWith('new_order_')) {
                              displayKey = `${t.new_order} ${key.split('_')[2]})`;
                            } else if (key.startsWith('removed_order_')) {
                              displayKey = `${t.removed_order} ${key.split('_')[2]})`;
                            } else if (STATUS_TRANSITIONS[key]) {
                              displayKey = t[STATUS_TRANSITIONS[key]];
                            } else {
                              displayKey = key.replace(/_/g, ' ');
                            }
                            return (
                              <li key={key} className="text-gray-200">
                                <span className="font-semibold text-blue-300">{displayKey}:</span> {count} {t.orders}
                              </li>
                            );
                          }
                          return null;
                        })}
                      </ul>
                    )}
                  </div>
                )}
                {!comparisonResults && (compareImport1Id && compareImport2Id && compareImport1Id !== compareImport2Id) && (
                  <p className="text-gray-400 text-center mt-8">{t.noComparisonSelected}</p>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 3 && (
            <Card>
              <CardContent>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-blue-400">
                  <Search className="w-6 h-6" /> {t.orderSearchTab}
                  <button
                    onClick={exportSearchResultsToXLSX}
                    className="ml-auto flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700 transition-colors text-base"
                  >
                    <FileDown className="w-5 h-5" /> {t.exportToXLSX}
                  </button>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label htmlFor="search-delivery-no" className="block text-sm font-medium text-gray-400 mb-1">{t.deliveryNo}:</label>
                    <textarea
                      id="search-delivery-no"
                      value={searchDeliveryNo}
                      onChange={(e) => setSearchDeliveryNo(e.target.value)}
                      className="w-full p-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500 h-24 resize-y"
                      placeholder={t.bulkSearch}
                    />
                  </div>
                  <div>
                    <label htmlFor="search-loading-date" className="block text-sm font-medium text-gray-400 mb-1">{t.loadingDate}:</label>
                    <input
                      type="date"
                      id="search-loading-date"
                      value={searchLoadingDate}
                      onChange={(e) => setSearchLoadingDate(e.target.value)}
                      className="w-full p-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="search-status" className="block text-sm font-medium text-gray-400 mb-1">{t.status}:</label>
                    <select
                      id="search-status"
                      value={searchStatus}
                      onChange={(e) => setSearchStatus(e.target.value)}
                      className="w-full p-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All</option>
                      {uniqueStatuses.map(status => (
                        <option key={`search-status-${status}`} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="search-ship-to-party" className="block text-sm font-medium text-gray-400 mb-1">{t.filterByNameOfShipToParty}:</label>
                    <select
                      id="search-ship-to-party"
                      value={searchShipToPartyName}
                      onChange={(e) => setSearchShipToPartyName(e.target.value)}
                      className="w-full p-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All</option>
                      <option value="MAN">{t.man}</option>
                      <option value="Daimler">{t.daimler}</option>
                      <option value="Volvo">{t.volvo}</option>
                      <option value="Iveco">{t.iveco}</option>
                      <option value="Scania">{t.scania}</option>
                      <option value="DAF">{t.daf}</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleSearchOrders}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Search className="w-5 h-5" /> {t.searchOrders}
                </button>

                {searchOrdersResult.length > 0 ? (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4 text-white">{t.orderList}</h3>
                    <OrderListTable orders={searchOrdersResult} onSelectOrder={setSelectedOrderDetails} t={t} />
                  </div>
                ) : (
                  searchDeliveryNo || searchLoadingDate || searchStatus !== 'all' || searchShipToPartyName !== 'all' ? (
                    <p className="text-red-400 text-center mt-8">{t.noOrdersFound}</p>
                  ) : null
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 4 && (
            <Card>
              <CardContent>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <ClipboardList className="w-6 h-6 text-green-400" /> {t.dailySummary}
                  <div className="ml-auto">
                    <label htmlFor="daily-summary-date-select" className="sr-only">{t.selectDate}</label>
                    <select
                      id="daily-summary-date-select"
                      value={selectedDailySummaryDate}
                      onChange={(e) => setSelectedDailySummaryDate(e.target.value)}
                      className="p-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {availableDatesForSummary.length > 0 ? (
                        availableDatesForSummary.map(date => (
                          <option key={date} value={date}>
                            {format(new Date(date), 'dd/MM/yyyy')}
                          </option>
                        ))
                      ) : (
                        <option value="">{t.noDataAvailable}</option>
                      )}
                    </select>
                  </div>
                </h2>
                {selectedDailySummaryDate && summary?.dailySummaries ? (
                  (() => {
                    const currentDayStats = summary.dailySummaries.find(d => d.date === selectedDailySummaryDate);
                    return currentDayStats ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
                        <Card>
                          <CardContent>
                            <p className="text-gray-400">{t.total}</p>
                            <p className="text-3xl font-bold text-blue-400">{currentDayStats.total}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent>
                            <p className="text-gray-400">{t.done}</p>
                            <p className="text-3xl font-bold text-green-400">{currentDayStats.done}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent>
                            <p className="text-gray-400">{t.remaining}</p>
                            <p className="text-3xl font-bold text-yellow-400">{currentDayStats.remaining}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent>
                            <p className="text-gray-400">{t.inProgress}</p>
                            <p className="text-3xl font-bold text-orange-400">{currentDayStats.inProgress}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent>
                            <p className="text-gray-400">{t.newOrders}</p>
                            <p className="text-3xl font-bold text-purple-400">{currentDayStats.newOrders}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent>
                            <p className="text-gray-400">{t.pallets}</p>
                            <p className="text-3xl font-bold text-pink-400">{currentDayStats.pallets}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent>
                            <p className="text-gray-400">{t.carton}</p>
                            <p className="text-3xl font-bold text-cyan-400">{currentDayStats.cartons}</p>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-40 bg-gray-700 text-gray-400 rounded-xl">
                        <p className="text-lg">{t.noDataAvailable} pro vybrané datum.</p>
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex items-center justify-center h-40 bg-gray-700 text-gray-400 rounded-xl">
                    <p className="text-lg">{t.noDataAvailable}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 5 && (
            <TicketsTab t={t} currentUser={currentUser} db={firestoreDb} allUsers={allUsers} appId={currentAppId} />
          )}

          {activeTab === 6 && (
            <ProfileSettingsTab t={t} currentUser={currentUser} currentUserProfile={currentUserProfile} updateUserProfile={updateUserProfile} db={firestoreDb} appId={currentAppId} />
          )}

          {activeTab === 7 && (
            <ChatTab t={t} currentUser={currentUser} currentUserProfile={currentUserProfile} db={firestoreDb} appId={currentAppId} />
          )}
        </div>
      )}
    </div>
  );
}
