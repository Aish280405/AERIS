/**
 * AERIS Internationalization
 * 
 * All UI strings in one place. Add a new language by adding a key to the `translations` object.
 * Components access strings via: const t = useTranslations()
 */

export type Language = "en" | "hi";

export const translations = {
  en: {
    // Common
    appName: "AERIS",
    appTagline: "Urban AQI Intelligence Platform",
    language: "Language",
    signOut: "Sign out",
    askAI: "Ask AI",
    loading: "Loading...",

    // Navigation
    mapDashboard: "Map Dashboard",
    forecasts: "Forecasts",
    sourceAttribution: "Source Attribution",
    enforcement: "Enforcement",
    healthAdvisory: "Health Advisory",
    platform: "Platform",

    // Map Dashboard
    delhiAqiMap: "Delhi AQI Map",
    realTimeAcross: "Real-time air quality across Delhi",
    cityAvgAqi: "City Avg AQI",
    worstStation: "Worst Station",
    severeZones: "Severe Zones",
    activeStations: "Active Stations",
    reportingLive: "reporting live",
    delhiMonitoringNetwork: "Delhi Monitoring Network",
    clickStation: "Click a station to inspect forecasts & sources",

    // Forecast
    aqiForecast: "AQI Forecast",
    dayPredictions: "1–3 day PM2.5 predictions",
    noStationSelected: "No station selected",
    pickStation: "Pick a station on the Map to view",
    modelInfo: "Model Info",
    baselineRmse: "Baseline RMSE",
    features: "Features",
    resolution: "Resolution",
    forecastNote: "Forecasts use 72 engineered features. Currently showing mock values — real predictions activate once the trained model is dropped into /models.",

    // Attribution
    sourceBreakdown: "Source Breakdown",
    whatsPolluting: "What's polluting this location",
    dominantSource: "is the dominant pollution source",
    contribution: "contribution",
    attributionNote: "Attribution derived from SHAP feature groups: road density, industrial proximity, FIRMS fire hotspots, and weather patterns.",
    mockWarning: "Mock values — real SHAP attribution activates after model training",

    // Enforcement
    enforcementIntel: "Enforcement Intelligence",
    whereToInspect: "Where to deploy inspectors",
    totalRecommendations: "Total Recommendations",
    criticalPriority: "Critical Priority",
    generated: "Generated",
    predictedAqi: "pred. AQI",
    potentialReduction: "Potential AQI reduction if acted within 6 hours",

    // Advisory / Citizen
    airQualityAt: "Air Quality at",
    forecast3Day: "3-Day Forecast",
    healthAdvisoryTitle: "Health Advisory",
    pollutantLevels: "Pollutant Levels",
    aboveSafeLimit: "Above safe limit",
    worsening: "Worsening",
    improving: "Improving",
    stable: "Stable",
    humidity: "humidity",
    yourAirCompanion: "Your Air Quality Companion",
    selectLocation: "Select your location",

    // AQI Categories
    categories: {
      Good: "Good",
      Satisfactory: "Satisfactory",
      Moderate: "Moderate",
      Poor: "Poor",
      "Very Poor": "Very Poor",
      Severe: "Severe",
    } as Record<string, string>,

    // AQI Descriptions
    descriptions: {
      Good: "Minimal impact on health",
      Satisfactory: "Minor discomfort to sensitive people",
      Moderate: "Breathing discomfort for those with lung/heart disease",
      Poor: "Breathing discomfort on prolonged exposure",
      "Very Poor": "Respiratory illness on prolonged exposure",
      Severe: "Serious health impact even on healthy people",
    } as Record<string, string>,

    // Sources
    sources: {
      vehicular_traffic: "Vehicular Traffic",
      industrial: "Industrial",
      construction: "Construction Dust",
      biomass_burning: "Biomass Burning",
      weather_driven: "Weather-driven",
      secondary_particles: "Secondary Particles",
    } as Record<string, string>,

    // AQI legend
    legend: {
      Good: "Good",
      Moderate: "Moderate",
      Poor: "Poor",
      "Very Poor": "Very Poor",
      Severe: "Severe",
    } as Record<string, string>,
  },

  hi: {
    // Common
    appName: "AERIS",
    appTagline: "शहरी वायु गुणवत्ता इंटेलिजेंस प्लेटफॉर्म",
    language: "भाषा",
    signOut: "साइन आउट",
    askAI: "AI से पूछें",
    loading: "लोड हो रहा है...",

    // Navigation
    mapDashboard: "मानचित्र डैशबोर्ड",
    forecasts: "पूर्वानुमान",
    sourceAttribution: "प्रदूषण स्रोत",
    enforcement: "प्रवर्तन",
    healthAdvisory: "स्वास्थ्य सलाह",
    platform: "प्लेटफॉर्म",

    // Map Dashboard
    delhiAqiMap: "दिल्ली AQI मानचित्र",
    realTimeAcross: "दिल्ली भर में रीयल-टाइम वायु गुणवत्ता",
    cityAvgAqi: "शहर औसत AQI",
    worstStation: "सबसे खराब स्टेशन",
    severeZones: "गंभीर क्षेत्र",
    activeStations: "सक्रिय स्टेशन",
    reportingLive: "लाइव रिपोर्ट",
    delhiMonitoringNetwork: "दिल्ली निगरानी नेटवर्क",
    clickStation: "पूर्वानुमान और स्रोत देखने के लिए स्टेशन क्लिक करें",

    // Forecast
    aqiForecast: "AQI पूर्वानुमान",
    dayPredictions: "1-3 दिन PM2.5 भविष्यवाणी",
    noStationSelected: "कोई स्टेशन नहीं चुना",
    pickStation: "पूर्वानुमान देखने के लिए मानचित्र पर स्टेशन चुनें",
    modelInfo: "मॉडल जानकारी",
    baselineRmse: "बेसलाइन RMSE",
    features: "फीचर्स",
    resolution: "रिज़ॉल्यूशन",
    forecastNote: "पूर्वानुमान 72 इंजीनियर्ड फीचर्स का उपयोग करता है। वर्तमान में मॉक मान दिखा रहा है — प्रशिक्षित मॉडल लोड होने पर वास्तविक भविष्यवाणी सक्रिय होगी।",

    // Attribution
    sourceBreakdown: "स्रोत विश्लेषण",
    whatsPolluting: "इस स्थान पर प्रदूषण का कारण",
    dominantSource: "प्रमुख प्रदूषण स्रोत है",
    contribution: "योगदान",
    attributionNote: "SHAP फीचर ग्रुप से प्राप्त: सड़क घनत्व, औद्योगिक निकटता, FIRMS अग्नि हॉटस्पॉट, और मौसम पैटर्न।",
    mockWarning: "मॉक मान — मॉडल प्रशिक्षण के बाद वास्तविक SHAP विश्लेषण सक्रिय होगा",

    // Enforcement
    enforcementIntel: "प्रवर्तन इंटेलिजेंस",
    whereToInspect: "निरीक्षकों को कहां तैनात करें",
    totalRecommendations: "कुल सिफारिशें",
    criticalPriority: "गंभीर प्राथमिकता",
    generated: "जनरेट किया गया",
    predictedAqi: "अनुमानित AQI",
    potentialReduction: "6 घंटे के भीतर कार्रवाई से AQI में संभावित कमी",

    // Advisory / Citizen
    airQualityAt: "हवा की गुणवत्ता",
    forecast3Day: "3-दिन का पूर्वानुमान",
    healthAdvisoryTitle: "स्वास्थ्य सलाह",
    pollutantLevels: "प्रदूषक स्तर",
    aboveSafeLimit: "सुरक्षित सीमा से ऊपर",
    worsening: "बिगड़ रहा है",
    improving: "सुधर रहा है",
    stable: "स्थिर",
    humidity: "आर्द्रता",
    yourAirCompanion: "आपका वायु गुणवत्ता साथी",
    selectLocation: "अपना स्थान चुनें",

    // AQI Categories
    categories: {
      Good: "अच्छा",
      Satisfactory: "संतोषजनक",
      Moderate: "मध्यम",
      Poor: "खराब",
      "Very Poor": "बहुत खराब",
      Severe: "गंभीर",
    } as Record<string, string>,

    // AQI Descriptions
    descriptions: {
      Good: "स्वास्थ्य पर न्यूनतम प्रभाव",
      Satisfactory: "संवेदनशील लोगों को मामूली असुविधा",
      Moderate: "फेफड़े/हृदय रोगियों को सांस की तकलीफ",
      Poor: "लंबे समय बाहर रहने पर सांस की तकलीफ",
      "Very Poor": "लंबे समय बाहर रहने पर श्वसन बीमारी",
      Severe: "स्वस्थ लोगों पर भी गंभीर प्रभाव",
    } as Record<string, string>,

    // Sources
    sources: {
      vehicular_traffic: "वाहन यातायात",
      industrial: "औद्योगिक",
      construction: "निर्माण धूल",
      biomass_burning: "बायोमास जलना",
      weather_driven: "मौसम-जनित",
      secondary_particles: "द्वितीयक कण",
    } as Record<string, string>,

    // AQI legend
    legend: {
      Good: "अच्छा",
      Moderate: "मध्यम",
      Poor: "खराब",
      "Very Poor": "बहुत खराब",
      Severe: "गंभीर",
    } as Record<string, string>,
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function getTranslations(lang: Language): typeof translations.en {
  return translations[lang] as typeof translations.en;
}
