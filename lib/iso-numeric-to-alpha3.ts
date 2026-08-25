/*
  ISO 3166-1 numeric to alpha 3.

  The world-atlas package carries no alpha 3 code. Every geometry has only a
  numeric id, which is the ISO 3166-1 numeric code, and a display name. The
  corpus is keyed by alpha 3, so the join needs this table.

  Built from the Natural Earth 110m admin 0 build that world-atlas is derived
  from. Natural Earth sets both ISO_A3 and ISO_N3 to minus 99 for France,
  Norway, Northern Cyprus, Somaliland and Kosovo, so those five were resolved
  through ISO_N3_EH and ADM0_A3 instead. France and Norway are therefore present
  and correct below. The other three carry no ISO numeric code at all, so
  world-atlas gives them an undefined id and they cannot be joined by code; none
  of the three appears in the corpus.

  174 entries, covering every world-atlas geometry that has an id.
*/
export const ISO_NUMERIC_TO_ALPHA3: Record<string, string> = {
  '4': 'AFG', // Afghanistan
  '8': 'ALB', // Albania
  '10': 'ATA', // Antarctica
  '12': 'DZA', // Algeria
  '24': 'AGO', // Angola
  '31': 'AZE', // Azerbaijan
  '32': 'ARG', // Argentina
  '36': 'AUS', // Australia
  '40': 'AUT', // Austria
  '44': 'BHS', // Bahamas
  '50': 'BGD', // Bangladesh
  '51': 'ARM', // Armenia
  '56': 'BEL', // Belgium
  '64': 'BTN', // Bhutan
  '68': 'BOL', // Bolivia
  '70': 'BIH', // Bosnia and Herz.
  '72': 'BWA', // Botswana
  '76': 'BRA', // Brazil
  '84': 'BLZ', // Belize
  '90': 'SLB', // Solomon Is.
  '96': 'BRN', // Brunei
  '100': 'BGR', // Bulgaria
  '104': 'MMR', // Myanmar
  '108': 'BDI', // Burundi
  '112': 'BLR', // Belarus
  '116': 'KHM', // Cambodia
  '120': 'CMR', // Cameroon
  '124': 'CAN', // Canada
  '140': 'CAF', // Central African Rep.
  '144': 'LKA', // Sri Lanka
  '148': 'TCD', // Chad
  '152': 'CHL', // Chile
  '156': 'CHN', // China
  '158': 'TWN', // Taiwan
  '170': 'COL', // Colombia
  '178': 'COG', // Congo
  '180': 'COD', // Dem. Rep. Congo
  '188': 'CRI', // Costa Rica
  '191': 'HRV', // Croatia
  '192': 'CUB', // Cuba
  '196': 'CYP', // Cyprus
  '203': 'CZE', // Czechia
  '204': 'BEN', // Benin
  '208': 'DNK', // Denmark
  '214': 'DOM', // Dominican Rep.
  '218': 'ECU', // Ecuador
  '222': 'SLV', // El Salvador
  '226': 'GNQ', // Eq. Guinea
  '231': 'ETH', // Ethiopia
  '232': 'ERI', // Eritrea
  '233': 'EST', // Estonia
  '238': 'FLK', // Falkland Is.
  '242': 'FJI', // Fiji
  '246': 'FIN', // Finland
  '250': 'FRA', // France
  '260': 'ATF', // Fr. S. Antarctic Lands
  '262': 'DJI', // Djibouti
  '266': 'GAB', // Gabon
  '268': 'GEO', // Georgia
  '270': 'GMB', // Gambia
  '275': 'PSE', // Palestine
  '276': 'DEU', // Germany
  '288': 'GHA', // Ghana
  '300': 'GRC', // Greece
  '304': 'GRL', // Greenland
  '320': 'GTM', // Guatemala
  '324': 'GIN', // Guinea
  '328': 'GUY', // Guyana
  '332': 'HTI', // Haiti
  '340': 'HND', // Honduras
  '348': 'HUN', // Hungary
  '352': 'ISL', // Iceland
  '356': 'IND', // India
  '360': 'IDN', // Indonesia
  '364': 'IRN', // Iran
  '368': 'IRQ', // Iraq
  '372': 'IRL', // Ireland
  '376': 'ISR', // Israel
  '380': 'ITA', // Italy
  '384': 'CIV', // Côte d'Ivoire
  '388': 'JAM', // Jamaica
  '392': 'JPN', // Japan
  '398': 'KAZ', // Kazakhstan
  '400': 'JOR', // Jordan
  '404': 'KEN', // Kenya
  '408': 'PRK', // North Korea
  '410': 'KOR', // South Korea
  '414': 'KWT', // Kuwait
  '417': 'KGZ', // Kyrgyzstan
  '418': 'LAO', // Laos
  '422': 'LBN', // Lebanon
  '426': 'LSO', // Lesotho
  '428': 'LVA', // Latvia
  '430': 'LBR', // Liberia
  '434': 'LBY', // Libya
  '440': 'LTU', // Lithuania
  '442': 'LUX', // Luxembourg
  '450': 'MDG', // Madagascar
  '454': 'MWI', // Malawi
  '458': 'MYS', // Malaysia
  '466': 'MLI', // Mali
  '478': 'MRT', // Mauritania
  '484': 'MEX', // Mexico
  '496': 'MNG', // Mongolia
  '498': 'MDA', // Moldova
  '499': 'MNE', // Montenegro
  '504': 'MAR', // Morocco
  '508': 'MOZ', // Mozambique
  '512': 'OMN', // Oman
  '516': 'NAM', // Namibia
  '524': 'NPL', // Nepal
  '528': 'NLD', // Netherlands
  '540': 'NCL', // New Caledonia
  '548': 'VUT', // Vanuatu
  '554': 'NZL', // New Zealand
  '558': 'NIC', // Nicaragua
  '562': 'NER', // Niger
  '566': 'NGA', // Nigeria
  '578': 'NOR', // Norway
  '586': 'PAK', // Pakistan
  '591': 'PAN', // Panama
  '598': 'PNG', // Papua New Guinea
  '600': 'PRY', // Paraguay
  '604': 'PER', // Peru
  '608': 'PHL', // Philippines
  '616': 'POL', // Poland
  '620': 'PRT', // Portugal
  '624': 'GNB', // Guinea-Bissau
  '626': 'TLS', // Timor-Leste
  '630': 'PRI', // Puerto Rico
  '634': 'QAT', // Qatar
  '642': 'ROU', // Romania
  '643': 'RUS', // Russia
  '646': 'RWA', // Rwanda
  '682': 'SAU', // Saudi Arabia
  '686': 'SEN', // Senegal
  '688': 'SRB', // Serbia
  '694': 'SLE', // Sierra Leone
  '703': 'SVK', // Slovakia
  '704': 'VNM', // Vietnam
  '705': 'SVN', // Slovenia
  '706': 'SOM', // Somalia
  '710': 'ZAF', // South Africa
  '716': 'ZWE', // Zimbabwe
  '724': 'ESP', // Spain
  '728': 'SSD', // S. Sudan
  '729': 'SDN', // Sudan
  '732': 'ESH', // W. Sahara
  '740': 'SUR', // Suriname
  '748': 'SWZ', // eSwatini
  '752': 'SWE', // Sweden
  '756': 'CHE', // Switzerland
  '760': 'SYR', // Syria
  '762': 'TJK', // Tajikistan
  '764': 'THA', // Thailand
  '768': 'TGO', // Togo
  '780': 'TTO', // Trinidad and Tobago
  '784': 'ARE', // United Arab Emirates
  '788': 'TUN', // Tunisia
  '792': 'TUR', // Turkey
  '795': 'TKM', // Turkmenistan
  '800': 'UGA', // Uganda
  '804': 'UKR', // Ukraine
  '807': 'MKD', // Macedonia
  '818': 'EGY', // Egypt
  '826': 'GBR', // United Kingdom
  '834': 'TZA', // Tanzania
  '840': 'USA', // United States of America
  '854': 'BFA', // Burkina Faso
  '858': 'URY', // Uruguay
  '860': 'UZB', // Uzbekistan
  '862': 'VEN', // Venezuela
  '887': 'YEM', // Yemen
  '894': 'ZMB', // Zambia
}
