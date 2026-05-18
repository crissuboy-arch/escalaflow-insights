export type Country = { code: string; name: string; flag: string; region: string; defaultCurrency: string };
export type Currency = { code: string; symbol: string; name: string };

export const COUNTRIES: Country[] = [
  // LATAM
  { code: "BR", name: "Brasil", flag: "🇧🇷", region: "LATAM", defaultCurrency: "BRL" },
  { code: "MX", name: "México", flag: "🇲🇽", region: "LATAM", defaultCurrency: "MXN" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", region: "LATAM", defaultCurrency: "ARS" },
  { code: "CL", name: "Chile", flag: "🇨🇱", region: "LATAM", defaultCurrency: "CLP" },
  { code: "CO", name: "Colômbia", flag: "🇨🇴", region: "LATAM", defaultCurrency: "COP" },
  { code: "PE", name: "Peru", flag: "🇵🇪", region: "LATAM", defaultCurrency: "PEN" },
  { code: "UY", name: "Uruguai", flag: "🇺🇾", region: "LATAM", defaultCurrency: "UYU" },
  // Europa
  { code: "PT", name: "Portugal", flag: "🇵🇹", region: "EU", defaultCurrency: "EUR" },
  { code: "ES", name: "Espanha", flag: "🇪🇸", region: "EU", defaultCurrency: "EUR" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧", region: "EU", defaultCurrency: "GBP" },
  { code: "FR", name: "França", flag: "🇫🇷", region: "EU", defaultCurrency: "EUR" },
  { code: "DE", name: "Alemanha", flag: "🇩🇪", region: "EU", defaultCurrency: "EUR" },
  { code: "IT", name: "Itália", flag: "🇮🇹", region: "EU", defaultCurrency: "EUR" },
  { code: "NL", name: "Holanda", flag: "🇳🇱", region: "EU", defaultCurrency: "EUR" },
  { code: "IE", name: "Irlanda", flag: "🇮🇪", region: "EU", defaultCurrency: "EUR" },
  { code: "CH", name: "Suíça", flag: "🇨🇭", region: "EU", defaultCurrency: "CHF" },
  { code: "SE", name: "Suécia", flag: "🇸🇪", region: "EU", defaultCurrency: "SEK" },
  { code: "PL", name: "Polônia", flag: "🇵🇱", region: "EU", defaultCurrency: "PLN" },
  // América do Norte
  { code: "US", name: "Estados Unidos", flag: "🇺🇸", region: "NA", defaultCurrency: "USD" },
  { code: "CA", name: "Canadá", flag: "🇨🇦", region: "NA", defaultCurrency: "CAD" },
  // APAC + outros
  { code: "JP", name: "Japão", flag: "🇯🇵", region: "APAC", defaultCurrency: "JPY" },
  { code: "AU", name: "Austrália", flag: "🇦🇺", region: "APAC", defaultCurrency: "AUD" },
  { code: "NZ", name: "Nova Zelândia", flag: "🇳🇿", region: "APAC", defaultCurrency: "NZD" },
  { code: "IN", name: "Índia", flag: "🇮🇳", region: "APAC", defaultCurrency: "INR" },
  { code: "AE", name: "Emirados Árabes", flag: "🇦🇪", region: "MEA", defaultCurrency: "AED" },
  { code: "SA", name: "Arábia Saudita", flag: "🇸🇦", region: "MEA", defaultCurrency: "SAR" },
  { code: "ZA", name: "África do Sul", flag: "🇿🇦", region: "MEA", defaultCurrency: "ZAR" },
];

export const CURRENCIES: Currency[] = [
  { code: "BRL", symbol: "R$", name: "Real Brasileiro" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "USD", symbol: "$", name: "Dólar Americano" },
  { code: "GBP", symbol: "£", name: "Libra Esterlina" },
  { code: "MXN", symbol: "MX$", name: "Peso Mexicano" },
  { code: "CAD", symbol: "C$", name: "Dólar Canadense" },
  { code: "JPY", symbol: "¥", name: "Iene" },
  { code: "AUD", symbol: "A$", name: "Dólar Australiano" },
  { code: "NZD", symbol: "NZ$", name: "Dólar Neozelandês" },
  { code: "ARS", symbol: "AR$", name: "Peso Argentino" },
  { code: "CLP", symbol: "CL$", name: "Peso Chileno" },
  { code: "COP", symbol: "CO$", name: "Peso Colombiano" },
  { code: "PEN", symbol: "S/", name: "Sol Peruano" },
  { code: "UYU", symbol: "U$", name: "Peso Uruguaio" },
  { code: "CHF", symbol: "CHF", name: "Franco Suíço" },
  { code: "SEK", symbol: "kr", name: "Coroa Sueca" },
  { code: "PLN", symbol: "zł", name: "Zloty Polonês" },
  { code: "INR", symbol: "₹", name: "Rúpia Indiana" },
  { code: "AED", symbol: "د.إ", name: "Dirham" },
  { code: "SAR", symbol: "﷼", name: "Rial Saudita" },
  { code: "ZAR", symbol: "R", name: "Rand" },
];

export const REGION_PRESETS: { id: string; label: string; codes: string[] }[] = [
  { id: "br", label: "Brasil", codes: ["BR"] },
  { id: "latam", label: "América Latina", codes: ["BR", "MX", "AR", "CL", "CO", "PE", "UY"] },
  { id: "eu", label: "Europa", codes: ["PT", "ES", "GB", "FR", "DE", "IT", "NL", "IE"] },
  { id: "na", label: "EUA + Canadá", codes: ["US", "CA"] },
  { id: "global", label: "Global (top 10)", codes: ["BR", "US", "GB", "DE", "ES", "FR", "MX", "CA", "AU", "JP"] },
];

export type PlatformGroup = { id: string; label: string; placements: { id: string; label: string; hint?: string }[] };

export const PLATFORM_CATALOG: PlatformGroup[] = [
  { id: "meta", label: "Meta Ads", placements: [
    { id: "Meta · Facebook Feed", label: "Facebook Feed" },
    { id: "Meta · Instagram Feed", label: "Instagram Feed" },
    { id: "Meta · Reels", label: "Reels", hint: "9:16 vertical" },
    { id: "Meta · Stories", label: "Stories" },
    { id: "Meta · Audience Network", label: "Audience Network" },
  ]},
  { id: "google", label: "Google Ads", placements: [
    { id: "Google · Pesquisa", label: "Pesquisa" },
    { id: "Google · Display", label: "Display" },
    { id: "Google · YouTube", label: "YouTube" },
    { id: "Google · Performance Max", label: "Performance Max" },
    { id: "Google · Shopping", label: "Shopping" },
  ]},
  { id: "tiktok", label: "TikTok Ads", placements: [
    { id: "TikTok · Feed", label: "Feed" },
    { id: "TikTok · Spark Ads", label: "Spark Ads" },
  ]},
  { id: "outros", label: "Outras redes", placements: [
    { id: "Kwai Ads", label: "Kwai Ads" },
    { id: "Pinterest Ads", label: "Pinterest Ads" },
    { id: "LinkedIn Ads", label: "LinkedIn Ads" },
  ]},
];

export function countryByCode(code: string) {
  return COUNTRIES.find((c) => c.code === code);
}
export function currencyByCode(code: string) {
  return CURRENCIES.find((c) => c.code === code);
}