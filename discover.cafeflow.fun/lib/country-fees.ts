/**
 * CafeFlow Static Currency & Customer Fee Configuration
 *
 * ARCHITECTURAL PRINCIPLES:
 * 1. Currency is the PRIMARY pricing key. Country is used for fallback/metadata.
 * 2. Store only canonical integer `customerFeeMinor` as source of truth.
 * 3. Display amounts are derived dynamically via `customerFeeMinor / 10^decimalDigits`.
 * 4. NEVER silently fall back to USD. If currency/country is unknown, order calculation fails safely.
 * 5. Zero Firestore fee-config reads during checkout.
 * 6. FX exchange rates are used EXCLUSIVELY by the Developer Currency Monitor and NEVER participate in checkout.
 * 7. Internal CafeFlow usage is ALWAYS exactly $0.01 USD (1 cent) per eligible order.
 */

export interface CurrencyFeeConfig {
  currency: string;
  symbol: string;
  name: string;
  customerFeeMinor: number; // Integer minor units (e.g. 100 paise = ₹1, 300 paisa = PKR 3, 2 = $0.02)
  decimalDigits: number;
  primaryCountryCode: string;
  primaryCountryName: string;
  flag: string;
}

export interface CountryFeeItem {
  countryCode: string;
  countryName: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  customerFeeMinor: number;
  decimalDigits: number;
}

/**
 * All 125 Supported Countries from CountrySelector.tsx
 * Maps each country directly to its national currency and clean customer fee.
 */
export const CAFEFLOW_SUPPORTED_COUNTRIES: CountryFeeItem[] = [
  { countryCode: "AF", countryName: "Afghanistan", flag: "🇦🇫", currency: "AFN", currencySymbol: "؋", customerFeeMinor: 200, decimalDigits: 2 },
  { countryCode: "AL", countryName: "Albania", flag: "🇦🇱", currency: "ALL", currencySymbol: "L", customerFeeMinor: 200, decimalDigits: 2 },
  { countryCode: "DZ", countryName: "Algeria", flag: "🇩🇿", currency: "DZD", currencySymbol: "د.ج", customerFeeMinor: 300, decimalDigits: 2 },
  { countryCode: "AD", countryName: "Andorra", flag: "🇦🇩", currency: "EUR", currencySymbol: "€", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "AO", countryName: "Angola", flag: "🇦🇴", currency: "AOA", currencySymbol: "Kz", customerFeeMinor: 2000, decimalDigits: 2 },
  { countryCode: "AG", countryName: "Antigua and Barbuda", flag: "🇦🇬", currency: "XCD", currencySymbol: "$", customerFeeMinor: 5, decimalDigits: 2 },
  { countryCode: "AR", countryName: "Argentina", flag: "🇦🇷", currency: "ARS", currencySymbol: "$", customerFeeMinor: 2000, decimalDigits: 2 },
  { countryCode: "AM", countryName: "Armenia", flag: "🇦🇲", currency: "AMD", currencySymbol: "֏", customerFeeMinor: 800, decimalDigits: 2 },
  { countryCode: "AU", countryName: "Australia", flag: "🇦🇺", currency: "AUD", currencySymbol: "$", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "AT", countryName: "Austria", flag: "🇦🇹", currency: "EUR", currencySymbol: "€", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "AZ", countryName: "Azerbaijan", flag: "🇦🇿", currency: "AZN", currencySymbol: "₼", customerFeeMinor: 5, decimalDigits: 2 },
  { countryCode: "BS", countryName: "Bahamas", flag: "🇧🇸", currency: "BSD", currencySymbol: "$", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "BH", countryName: "Bahrain", flag: "🇧🇭", currency: "BHD", currencySymbol: ".د.ب", customerFeeMinor: 5, decimalDigits: 3 },
  { countryCode: "BD", countryName: "Bangladesh", flag: "🇧🇩", currency: "BDT", currencySymbol: "৳", customerFeeMinor: 200, decimalDigits: 2 },
  { countryCode: "BB", countryName: "Barbados", flag: "🇧🇧", currency: "BBD", currencySymbol: "$", customerFeeMinor: 5, decimalDigits: 2 },
  { countryCode: "BY", countryName: "Belarus", flag: "🇧🇾", currency: "BYN", currencySymbol: "Br", customerFeeMinor: 10, decimalDigits: 2 },
  { countryCode: "BE", countryName: "Belgium", flag: "🇧🇪", currency: "EUR", currencySymbol: "€", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "BZ", countryName: "Belize", flag: "🇧🇿", currency: "BZD", currencySymbol: "BZ$", customerFeeMinor: 5, decimalDigits: 2 },
  { countryCode: "BJ", countryName: "Benin", flag: "🇧🇯", currency: "XOF", currencySymbol: "CFA", customerFeeMinor: 15, decimalDigits: 0 },
  { countryCode: "BT", countryName: "Bhutan", flag: "🇧🇹", currency: "BTN", currencySymbol: "Nu.", customerFeeMinor: 100, decimalDigits: 2 },
  { countryCode: "BO", countryName: "Bolivia", flag: "🇧🇴", currency: "BOB", currencySymbol: "Bs.", customerFeeMinor: 15, decimalDigits: 2 },
  { countryCode: "BA", countryName: "Bosnia and Herzegovina", flag: "🇧🇦", currency: "BAM", currencySymbol: "KM", customerFeeMinor: 5, decimalDigits: 2 },
  { countryCode: "BW", countryName: "Botswana", flag: "🇧🇼", currency: "BWP", currencySymbol: "P", customerFeeMinor: 30, decimalDigits: 2 },
  { countryCode: "BR", countryName: "Brazil", flag: "🇧🇷", currency: "BRL", currencySymbol: "R$", customerFeeMinor: 10, decimalDigits: 2 },
  { countryCode: "BN", countryName: "Brunei", flag: "🇧🇳", currency: "BND", currencySymbol: "$", customerFeeMinor: 3, decimalDigits: 2 },
  { countryCode: "BG", countryName: "Bulgaria", flag: "🇧🇬", currency: "BGN", currencySymbol: "лв", customerFeeMinor: 5, decimalDigits: 2 },
  { countryCode: "BF", countryName: "Burkina Faso", flag: "🇧🇫", currency: "XOF", currencySymbol: "CFA", customerFeeMinor: 15, decimalDigits: 0 },
  { countryCode: "BI", countryName: "Burundi", flag: "🇧🇮", currency: "BIF", currencySymbol: "FBu", customerFeeMinor: 60, decimalDigits: 0 },
  { countryCode: "CV", countryName: "Cabo Verde", flag: "🇨🇻", currency: "CVE", currencySymbol: "$", customerFeeMinor: 200, decimalDigits: 2 },
  { countryCode: "KH", countryName: "Cambodia", flag: "🇰🇭", currency: "KHR", currencySymbol: "៛", customerFeeMinor: 8000, decimalDigits: 2 },
  { countryCode: "CM", countryName: "Cameroon", flag: "🇨🇲", currency: "XAF", currencySymbol: "FCFA", customerFeeMinor: 15, decimalDigits: 0 },
  { countryCode: "CA", countryName: "Canada", flag: "🇨🇦", currency: "CAD", currencySymbol: "$", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "CF", countryName: "Central African Republic", flag: "🇨🇫", currency: "XAF", currencySymbol: "FCFA", customerFeeMinor: 15, decimalDigits: 0 },
  { countryCode: "TD", countryName: "Chad", flag: "🇹🇩", currency: "XAF", currencySymbol: "FCFA", customerFeeMinor: 15, decimalDigits: 0 },
  { countryCode: "CL", countryName: "Chile", flag: "🇨🇱", currency: "CLP", currencySymbol: "$", customerFeeMinor: 15, decimalDigits: 0 },
  { countryCode: "CN", countryName: "China", flag: "🇨🇳", currency: "CNY", currencySymbol: "¥", customerFeeMinor: 10, decimalDigits: 2 },
  { countryCode: "CO", countryName: "Colombia", flag: "🇨🇴", currency: "COP", currencySymbol: "$", customerFeeMinor: 60, decimalDigits: 0 },
  { countryCode: "KM", countryName: "Comoros", flag: "🇰🇲", currency: "KMF", currencySymbol: "CF", customerFeeMinor: 10, decimalDigits: 0 },
  { countryCode: "CG", countryName: "Congo", flag: "🇨🇬", currency: "XAF", currencySymbol: "FCFA", customerFeeMinor: 15, decimalDigits: 0 },
  { countryCode: "CR", countryName: "Costa Rica", flag: "🇨🇷", currency: "CRC", currencySymbol: "₡", customerFeeMinor: 1000, decimalDigits: 2 },
  { countryCode: "HR", countryName: "Croatia", flag: "🇭🇷", currency: "EUR", currencySymbol: "€", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "CU", countryName: "Cuba", flag: "🇨🇺", currency: "CUP", currencySymbol: "$", customerFeeMinor: 50, decimalDigits: 2 },
  { countryCode: "CY", countryName: "Cyprus", flag: "🇨🇾", currency: "EUR", currencySymbol: "€", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "CZ", countryName: "Czechia", flag: "🇨🇿", currency: "CZK", currencySymbol: "Kč", customerFeeMinor: 50, decimalDigits: 2 },
  { countryCode: "DK", countryName: "Denmark", flag: "🇩🇰", currency: "DKK", currencySymbol: "kr", customerFeeMinor: 15, decimalDigits: 2 },
  { countryCode: "DJ", countryName: "Djibouti", flag: "🇩🇯", currency: "DJF", currencySymbol: "Fdj", customerFeeMinor: 5, decimalDigits: 0 },
  { countryCode: "DM", countryName: "Dominica", flag: "🇩🇲", currency: "XCD", currencySymbol: "$", customerFeeMinor: 5, decimalDigits: 2 },
  { countryCode: "DO", countryName: "Dominican Republic", flag: "🇩🇴", currency: "DOP", currencySymbol: "RD$", customerFeeMinor: 150, decimalDigits: 2 },
  { countryCode: "EC", countryName: "Ecuador", flag: "🇪🇨", currency: "USD", currencySymbol: "$", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "EG", countryName: "Egypt", flag: "🇪🇬", currency: "EGP", currencySymbol: "E£", customerFeeMinor: 100, decimalDigits: 2 },
  { countryCode: "SV", countryName: "El Salvador", flag: "🇸🇻", currency: "USD", currencySymbol: "$", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "GQ", countryName: "Equatorial Guinea", flag: "🇬🇶", currency: "XAF", currencySymbol: "FCFA", customerFeeMinor: 15, decimalDigits: 0 },
  { countryCode: "ER", countryName: "Eritrea", flag: "🇪🇷", currency: "ERN", currencySymbol: "Nfk", customerFeeMinor: 30, decimalDigits: 2 },
  { countryCode: "EE", countryName: "Estonia", flag: "🇪🇪", currency: "EUR", currencySymbol: "€", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "SZ", countryName: "Eswatini", flag: "🇸🇿", currency: "SZL", currencySymbol: "E", customerFeeMinor: 30, decimalDigits: 2 },
  { countryCode: "ET", countryName: "Ethiopia", flag: "🇪🇹", currency: "ETB", currencySymbol: "Br", customerFeeMinor: 250, decimalDigits: 2 },
  { countryCode: "FJ", countryName: "Fiji", flag: "🇫🇯", currency: "FJD", currencySymbol: "$", customerFeeMinor: 5, decimalDigits: 2 },
  { countryCode: "FI", countryName: "Finland", flag: "🇫🇮", currency: "EUR", currencySymbol: "€", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "FR", countryName: "France", flag: "🇫🇷", currency: "EUR", currencySymbol: "€", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "GA", countryName: "Gabon", flag: "🇬🇦", currency: "XAF", currencySymbol: "FCFA", customerFeeMinor: 15, decimalDigits: 0 },
  { countryCode: "GM", countryName: "Gambia", flag: "🇬🇲", currency: "GMD", currencySymbol: "D", customerFeeMinor: 150, decimalDigits: 2 },
  { countryCode: "GE", countryName: "Georgia", flag: "🇬🇪", currency: "GEL", currencySymbol: "₾", customerFeeMinor: 5, decimalDigits: 2 },
  { countryCode: "DE", countryName: "Germany", flag: "🇩🇪", currency: "EUR", currencySymbol: "€", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "GH", countryName: "Ghana", flag: "🇬🇭", currency: "GHS", currencySymbol: "GH₵", customerFeeMinor: 30, decimalDigits: 2 },
  { countryCode: "GR", countryName: "Greece", flag: "🇬🇷", currency: "EUR", currencySymbol: "€", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "GD", countryName: "Grenada", flag: "🇬🇩", currency: "XCD", currencySymbol: "$", customerFeeMinor: 5, decimalDigits: 2 },
  { countryCode: "GT", countryName: "Guatemala", flag: "🇬🇹", currency: "GTQ", currencySymbol: "Q", customerFeeMinor: 15, decimalDigits: 2 },
  { countryCode: "GN", countryName: "Guinea", flag: "🇬🇳", currency: "GNF", currencySymbol: "FG", customerFeeMinor: 180, decimalDigits: 0 },
  { countryCode: "GW", countryName: "Guinea-Bissau", flag: "🇬🇼", currency: "XOF", currencySymbol: "CFA", customerFeeMinor: 15, decimalDigits: 0 },
  { countryCode: "GY", countryName: "Guyana", flag: "🇬🇾", currency: "GYD", currencySymbol: "$", customerFeeMinor: 400, decimalDigits: 2 },
  { countryCode: "HT", countryName: "Haiti", flag: "🇭🇹", currency: "HTG", currencySymbol: "G", customerFeeMinor: 250, decimalDigits: 2 },
  { countryCode: "HN", countryName: "Honduras", flag: "🇭🇳", currency: "HNL", currencySymbol: "L", customerFeeMinor: 50, decimalDigits: 2 },
  { countryCode: "HU", countryName: "Hungary", flag: "🇭🇺", currency: "HUF", currencySymbol: "Ft", customerFeeMinor: 8, decimalDigits: 0 },
  { countryCode: "IS", countryName: "Iceland", flag: "🇮🇸", currency: "ISK", currencySymbol: "kr", customerFeeMinor: 3, decimalDigits: 0 },
  { countryCode: "IN", countryName: "India", flag: "🇮🇳", currency: "INR", currencySymbol: "₹", customerFeeMinor: 100, decimalDigits: 2 },
  { countryCode: "ID", countryName: "Indonesia", flag: "🇮🇩", currency: "IDR", currencySymbol: "Rp", customerFeeMinor: 200, decimalDigits: 0 },
  { countryCode: "IR", countryName: "Iran", flag: "🇮🇷", currency: "IRR", currencySymbol: "﷼", customerFeeMinor: 20000, decimalDigits: 0 },
  { countryCode: "IQ", countryName: "Iraq", flag: "🇮🇶", currency: "IQD", currencySymbol: "د.ع", customerFeeMinor: 30, decimalDigits: 0 },
  { countryCode: "IE", countryName: "Ireland", flag: "🇮🇪", currency: "EUR", currencySymbol: "€", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "IL", countryName: "Israel", flag: "🇮🇱", currency: "ILS", currencySymbol: "₪", customerFeeMinor: 5, decimalDigits: 2 },
  { countryCode: "IT", countryName: "Italy", flag: "🇮🇹", currency: "EUR", currencySymbol: "€", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "JM", countryName: "Jamaica", flag: "🇯🇲", currency: "JMD", currencySymbol: "$", customerFeeMinor: 300, decimalDigits: 2 },
  { countryCode: "JP", countryName: "Japan", flag: "🇯🇵", currency: "JPY", currencySymbol: "¥", customerFeeMinor: 2, decimalDigits: 0 },
  { countryCode: "JO", countryName: "Jordan", flag: "🇯🇴", currency: "JOD", currencySymbol: "د.ا", customerFeeMinor: 15, decimalDigits: 3 },
  { countryCode: "KZ", countryName: "Kazakhstan", flag: "🇰🇿", currency: "KZT", currencySymbol: "₸", customerFeeMinor: 1000, decimalDigits: 2 },
  { countryCode: "KE", countryName: "Kenya", flag: "🇰🇪", currency: "KES", currencySymbol: "KSh", customerFeeMinor: 200, decimalDigits: 2 },
  { countryCode: "KI", countryName: "Kiribati", flag: "🇰🇮", currency: "AUD", currencySymbol: "$", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "KP", countryName: "North Korea", flag: "🇰🇵", currency: "KPW", currencySymbol: "₩", customerFeeMinor: 2000, decimalDigits: 2 },
  { countryCode: "KR", countryName: "South Korea", flag: "🇰🇷", currency: "KRW", currencySymbol: "₩", customerFeeMinor: 20, decimalDigits: 0 },
  { countryCode: "KW", countryName: "Kuwait", flag: "🇰🇼", currency: "KWD", currencySymbol: "د.ك", customerFeeMinor: 5, decimalDigits: 3 },
  { countryCode: "KG", countryName: "Kyrgyzstan", flag: "🇰🇬", currency: "KGS", currencySymbol: "сом", customerFeeMinor: 180, decimalDigits: 2 },
  { countryCode: "LA", countryName: "Laos", flag: "🇱🇦", currency: "LAK", currencySymbol: "₭", customerFeeMinor: 450, decimalDigits: 0 },
  { countryCode: "LV", countryName: "Latvia", flag: "🇱🇻", currency: "EUR", currencySymbol: "€", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "LB", countryName: "Lebanon", flag: "🇱🇧", currency: "LBP", currencySymbol: "ل.ل", customerFeeMinor: 1800, decimalDigits: 0 },
  { countryCode: "LS", countryName: "Lesotho", flag: "🇱🇸", currency: "LSL", currencySymbol: "L", customerFeeMinor: 30, decimalDigits: 2 },
  { countryCode: "LR", countryName: "Liberia", flag: "🇱🇷", currency: "LRD", currencySymbol: "$", customerFeeMinor: 400, decimalDigits: 2 },
  { countryCode: "LY", countryName: "Libya", flag: "🇱🇾", currency: "LYD", currencySymbol: "د.ل", customerFeeMinor: 100, decimalDigits: 3 },
  { countryCode: "LI", countryName: "Liechtenstein", flag: "🇱🇮", currency: "CHF", currencySymbol: "CHF", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "LT", countryName: "Lithuania", flag: "🇱🇹", currency: "EUR", currencySymbol: "€", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "LU", countryName: "Luxembourg", flag: "🇱🇺", currency: "EUR", currencySymbol: "€", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "MG", countryName: "Madagascar", flag: "🇲🇬", currency: "MGA", currencySymbol: "Ar", customerFeeMinor: 90, decimalDigits: 0 },
  { countryCode: "MW", countryName: "Malawi", flag: "🇲🇼", currency: "MWK", currencySymbol: "MK", customerFeeMinor: 3500, decimalDigits: 2 },
  { countryCode: "MY", countryName: "Malaysia", flag: "🇲🇾", currency: "MYR", currencySymbol: "RM", customerFeeMinor: 5, decimalDigits: 2 },
  { countryCode: "MV", countryName: "Maldives", flag: "🇲🇻", currency: "MVR", currencySymbol: "Rf", customerFeeMinor: 30, decimalDigits: 2 },
  { countryCode: "ML", countryName: "Mali", flag: "🇲🇱", currency: "XOF", currencySymbol: "CFA", customerFeeMinor: 15, decimalDigits: 0 },
  { countryCode: "MT", countryName: "Malta", flag: "🇲🇹", currency: "EUR", currencySymbol: "€", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "MH", countryName: "Marshall Islands", flag: "🇲🇭", currency: "USD", currencySymbol: "$", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "MR", countryName: "Mauritania", flag: "🇲🇷", currency: "MRU", currencySymbol: "UM", customerFeeMinor: 80, decimalDigits: 2 },
  { countryCode: "MU", countryName: "Mauritius", flag: "🇲🇺", currency: "MUR", currencySymbol: "₨", customerFeeMinor: 100, decimalDigits: 2 },
  { countryCode: "MX", countryName: "Mexico", flag: "🇲🇽", currency: "MXN", currencySymbol: "$", customerFeeMinor: 40, decimalDigits: 2 },
  { countryCode: "SE", countryName: "Sweden", flag: "🇸🇪", currency: "SEK", currencySymbol: "kr", customerFeeMinor: 20, decimalDigits: 2 },
  { countryCode: "NO", countryName: "Norway", flag: "🇳🇴", currency: "NOK", currencySymbol: "kr", customerFeeMinor: 20, decimalDigits: 2 },
  { countryCode: "NL", countryName: "Netherlands", flag: "🇳🇱", currency: "EUR", currencySymbol: "€", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "PT", countryName: "Portugal", flag: "🇵🇹", currency: "EUR", currencySymbol: "€", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "PL", countryName: "Poland", flag: "🇵🇱", currency: "PLN", currencySymbol: "zł", customerFeeMinor: 10, decimalDigits: 2 },
  { countryCode: "RU", countryName: "Russia", flag: "🇷🇺", currency: "RUB", currencySymbol: "₽", customerFeeMinor: 150, decimalDigits: 2 },
  { countryCode: "TH", countryName: "Thailand", flag: "🇹🇭", currency: "THB", currencySymbol: "฿", customerFeeMinor: 50, decimalDigits: 2 },
  { countryCode: "VN", countryName: "Vietnam", flag: "🇻🇳", currency: "VND", currencySymbol: "₫", customerFeeMinor: 300, decimalDigits: 0 },
  { countryCode: "PH", countryName: "Philippines", flag: "🇵🇭", currency: "PHP", currencySymbol: "₱", customerFeeMinor: 100, decimalDigits: 2 },
  { countryCode: "PK", countryName: "Pakistan", flag: "🇵🇰", currency: "PKR", currencySymbol: "Rs", customerFeeMinor: 300, decimalDigits: 2 },
  { countryCode: "LK", countryName: "Sri Lanka", flag: "🇱🇰", currency: "LKR", currencySymbol: "Rs", customerFeeMinor: 400, decimalDigits: 2 },
  { countryCode: "NG", countryName: "Nigeria", flag: "🇳🇬", currency: "NGN", currencySymbol: "₦", customerFeeMinor: 2000, decimalDigits: 2 },
  { countryCode: "ZA", countryName: "South Africa", flag: "🇿🇦", currency: "ZAR", currencySymbol: "R", customerFeeMinor: 30, decimalDigits: 2 },
  { countryCode: "SA", countryName: "Saudi Arabia", flag: "🇸🇦", currency: "SAR", currencySymbol: "﷼", customerFeeMinor: 5, decimalDigits: 2 },
  { countryCode: "AE", countryName: "United Arab Emirates", flag: "🇦🇪", currency: "AED", currencySymbol: "د.إ", customerFeeMinor: 5, decimalDigits: 2 },
  { countryCode: "GB", countryName: "United Kingdom", flag: "🇬🇧", currency: "GBP", currencySymbol: "£", customerFeeMinor: 2, decimalDigits: 2 },
  { countryCode: "US", countryName: "United States", flag: "🇺🇸", currency: "USD", currencySymbol: "$", customerFeeMinor: 2, decimalDigits: 2 }
];

/**
 * Fast lookup map by ISO Country Code (e.g. "IN", "PK", "US")
 */
export const CAFEFLOW_COUNTRY_MAP: Record<string, CountryFeeItem> = Object.fromEntries(
  CAFEFLOW_SUPPORTED_COUNTRIES.map((item) => [item.countryCode, item])
);

/**
 * Canonical Currency-First Customer Fee Directory
 */
export const CAFEFLOW_CURRENCY_FEES: Record<string, CurrencyFeeConfig> = {};

// Populate currency directory from supported countries
CAFEFLOW_SUPPORTED_COUNTRIES.forEach((c) => {
  if (!CAFEFLOW_CURRENCY_FEES[c.currency]) {
    CAFEFLOW_CURRENCY_FEES[c.currency] = {
      currency: c.currency,
      symbol: c.currencySymbol,
      name: `${c.countryName} Currency`,
      customerFeeMinor: c.customerFeeMinor,
      decimalDigits: c.decimalDigits,
      primaryCountryCode: c.countryCode,
      primaryCountryName: c.countryName,
      flag: c.flag
    };
  }
});

// Explicit canonical overrides for major shared currencies
CAFEFLOW_CURRENCY_FEES["INR"] = {
  currency: "INR",
  symbol: "₹",
  name: "Indian Rupee",
  customerFeeMinor: 100, // ₹1.00
  decimalDigits: 2,
  primaryCountryCode: "IN",
  primaryCountryName: "India",
  flag: "🇮🇳"
};

CAFEFLOW_CURRENCY_FEES["PKR"] = {
  currency: "PKR",
  symbol: "Rs",
  name: "Pakistani Rupee",
  customerFeeMinor: 300, // PKR 3.00
  decimalDigits: 2,
  primaryCountryCode: "PK",
  primaryCountryName: "Pakistan",
  flag: "🇵🇰"
};

CAFEFLOW_CURRENCY_FEES["USD"] = {
  currency: "USD",
  symbol: "$",
  name: "US Dollar",
  customerFeeMinor: 2, // $0.02
  decimalDigits: 2,
  primaryCountryCode: "US",
  primaryCountryName: "United States",
  flag: "🇺🇸"
};

CAFEFLOW_CURRENCY_FEES["EUR"] = {
  currency: "EUR",
  symbol: "€",
  name: "Euro",
  customerFeeMinor: 2, // €0.02
  decimalDigits: 2,
  primaryCountryCode: "DE",
  primaryCountryName: "Eurozone",
  flag: "🇪🇺"
};

CAFEFLOW_CURRENCY_FEES["GBP"] = {
  currency: "GBP",
  symbol: "£",
  name: "British Pound",
  customerFeeMinor: 2, // £0.02
  decimalDigits: 2,
  primaryCountryCode: "GB",
  primaryCountryName: "United Kingdom",
  flag: "🇬🇧"
};

CAFEFLOW_CURRENCY_FEES["JPY"] = {
  currency: "JPY",
  symbol: "¥",
  name: "Japanese Yen",
  customerFeeMinor: 2, // ¥2 (zero-decimal)
  decimalDigits: 0,
  primaryCountryCode: "JP",
  primaryCountryName: "Japan",
  flag: "🇯🇵"
};

CAFEFLOW_CURRENCY_FEES["AED"] = {
  currency: "AED",
  symbol: "د.إ",
  name: "UAE Dirham",
  customerFeeMinor: 5, // AED 0.05
  decimalDigits: 2,
  primaryCountryCode: "AE",
  primaryCountryName: "United Arab Emirates",
  flag: "🇦🇪"
};

CAFEFLOW_CURRENCY_FEES["SAR"] = {
  currency: "SAR",
  symbol: "﷼",
  name: "Saudi Riyal",
  customerFeeMinor: 5, // SAR 0.05
  decimalDigits: 2,
  primaryCountryCode: "SA",
  primaryCountryName: "Saudi Arabia",
  flag: "🇸🇦"
};

/**
 * Country Code -> ISO Currency Fallback Mapping
 */
export const COUNTRY_TO_CURRENCY_MAP: Record<string, string> = Object.fromEntries(
  CAFEFLOW_SUPPORTED_COUNTRIES.map((item) => [item.countryCode, item.currency])
);

/**
 * Derives the major unit display amount from integer minor units.
 */
export function deriveCustomerFeeAmount(config: { customerFeeMinor: number; decimalDigits: number }): number {
  if (config.decimalDigits === 0) {
    return config.customerFeeMinor;
  }
  const factor = Math.pow(10, config.decimalDigits);
  return Math.round((config.customerFeeMinor / factor) * factor) / factor;
}

/**
 * Looks up fee configuration by ISO currency code (PRIMARY).
 */
export function getFeeConfigByCurrency(currencyCode?: string | null): CurrencyFeeConfig | undefined {
  if (!currencyCode) return undefined;
  const clean = currencyCode.trim().toUpperCase();
  return CAFEFLOW_CURRENCY_FEES[clean];
}

/**
 * Looks up fee configuration by country ISO code (FALLBACK).
 */
export function getFeeConfigByCountry(countryCode?: string | null): CurrencyFeeConfig | undefined {
  if (!countryCode) return undefined;
  const clean = countryCode.trim().toUpperCase();
  const countryItem = CAFEFLOW_COUNTRY_MAP[clean];
  if (countryItem) {
    const currencyConfig = CAFEFLOW_CURRENCY_FEES[countryItem.currency];
    if (currencyConfig) return currencyConfig;
    return {
      currency: countryItem.currency,
      symbol: countryItem.currencySymbol,
      name: countryItem.countryName,
      customerFeeMinor: countryItem.customerFeeMinor,
      decimalDigits: countryItem.decimalDigits,
      primaryCountryCode: countryItem.countryCode,
      primaryCountryName: countryItem.countryName,
      flag: countryItem.flag
    };
  }
  return undefined;
}

export interface ResolvedCafeFee {
  success: boolean;
  currency: string;
  symbol: string;
  customerFeeMinor: number;
  feeAmount: number;
  payerMode: "customer" | "cafe";
  feeAddedToCustomerBill: number;
  error?: string;
}

/**
 * Authoritative CafeFlow Customer Fee Resolution Engine
 *
 * RESOLUTION PRIORITY:
 * 1. Cafe currency (e.g. INR -> ₹1, PKR -> PKR 3)
 * 2. Country -> currency derivation fallback
 * 3. Never silently fall back to USD! If currency is unknown and country cannot derive it, fails safely.
 */
export function resolveCafeCustomerFee(params: {
  currency?: string | null;
  countryCode?: string | null;
  cafeFlowFeeMode?: "customer" | "cafe" | null;
}): ResolvedCafeFee {
  const payerMode = params.cafeFlowFeeMode === "cafe" ? "cafe" : "customer";

  // 1. Primary resolution: Cafe currency
  let config = getFeeConfigByCurrency(params.currency);

  // 2. Fallback resolution: Derive from Country code
  if (!config && params.countryCode) {
    config = getFeeConfigByCountry(params.countryCode);
  }

  // 3. Fail safely if neither currency nor country can resolve a supported configuration
  if (!config) {
    return {
      success: false,
      currency: (params.currency || "UNKNOWN").toUpperCase(),
      symbol: (params.currency || "UNKNOWN").toUpperCase(),
      customerFeeMinor: 0,
      feeAmount: 0,
      payerMode,
      feeAddedToCustomerBill: 0,
      error: `UNSUPPORTED_CURRENCY: Fee configuration for currency '${params.currency || params.countryCode}' not found.`
    };
  }

  const feeAmount = deriveCustomerFeeAmount(config);
  const feeAddedToCustomerBill = payerMode === "customer" ? feeAmount : 0;

  return {
    success: true,
    currency: config.currency,
    symbol: config.symbol,
    customerFeeMinor: config.customerFeeMinor,
    feeAmount,
    payerMode,
    feeAddedToCustomerBill
  };
}

export interface CafeUsageLimits {
  currency: string;
  symbol: string;
  feePerOrder: number;
  maxOutstandingUsage: number;
  warningThreshold: number;
  maxOrders: number;
}

/**
 * Derives the local currency usage limits for a cafe.
 * Canonical model: 200 orders hard limit, 150 orders warning threshold.
 * e.g. India (₹1/order): max ₹200, warn ₹150
 * e.g. Pakistan (PKR 3/order): max PKR 600, warn PKR 450
 * e.g. USA ($0.02/order): max $4.00, warn $3.00
 * e.g. Japan (¥2/order): max ¥400, warn ¥300
 */
export function getCafeUsageLimits(params: {
  currency?: string | null;
  countryCode?: string | null;
}): CafeUsageLimits {
  const resolved = resolveCafeCustomerFee(params);
  const feePerOrder = resolved.success ? resolved.feeAmount : 1;
  const currency = resolved.success ? resolved.currency : (params.currency || "INR").toUpperCase();
  const symbol = resolved.success ? resolved.symbol : currency;
  const decimalDigits = resolved.success ? (CAFEFLOW_CURRENCY_FEES[currency]?.decimalDigits ?? 2) : 2;

  const maxOrders = 200; // CAFEFLOW_MAX_OUTSTANDING_ORDERS
  const warnOrders = 150; // CAFEFLOW_WARNING_OUTSTANDING_ORDERS

  const maxOutstandingUsage =
    decimalDigits === 0
      ? Math.round(maxOrders * feePerOrder)
      : Math.round(maxOrders * feePerOrder * 100) / 100;

  const warningThreshold =
    decimalDigits === 0
      ? Math.round(warnOrders * feePerOrder)
      : Math.round(warnOrders * feePerOrder * 100) / 100;

  return {
    currency,
    symbol,
    feePerOrder,
    maxOutstandingUsage,
    warningThreshold,
    maxOrders
  };
}

