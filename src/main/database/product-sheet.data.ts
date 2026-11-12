export interface SheetProduct {
  key: string
  nameAr: string
  sourceCode: string
  unitCost: number
  regularSalePrice: number
  offerSalePrice: number | null
  category: string
  legacyId: string | null
}

export const productSheetSource = 'https://docs.google.com/spreadsheets/d/1OXoTk0wgL5LC6INTaWsJczEsh9EHfxAH5-TMUix7dZg/edit'
export const productSheetVersion = '2026-11-12-1'

// Snapshot of the owner's product price list. Arabic presentation forms are
// normalized to Unicode NFKC, and whitespace is trimmed. Numbers are unchanged.
// legacyId mappings reconcile the earlier supplier catalog with the owner's list.
export const sheetProducts: readonly SheetProduct[] = [
  {
    "key": "001",
    "nameAr": "فريم صور A4 اخضر وابیض",
    "sourceCode": "7-3509",
    "unitCost": 20,
    "regularSalePrice": 45,
    "offerSalePrice": 40,
    "category": "اطارات",
    "legacyId": "ghassan-product-067"
  },
  {
    "key": "002",
    "nameAr": "فریم بلاستیك عسلي صغیر",
    "sourceCode": "4-3605",
    "unitCost": 5,
    "regularSalePrice": 20,
    "offerSalePrice": 15,
    "category": "اطارات",
    "legacyId": "ghassan-product-071"
  },
  {
    "key": "003",
    "nameAr": "فریم بلاستیك رمادي صغیر",
    "sourceCode": "5-3605",
    "unitCost": 5,
    "regularSalePrice": 20,
    "offerSalePrice": 15,
    "category": "اطارات",
    "legacyId": "ghassan-product-069"
  },
  {
    "key": "004",
    "nameAr": "فریم صور A4 اطار معدن",
    "sourceCode": "4-1906",
    "unitCost": 17,
    "regularSalePrice": 40,
    "offerSalePrice": 35,
    "category": "اطارات",
    "legacyId": "ghassan-product-072"
  },
  {
    "key": "005",
    "nameAr": "فریم اطار بني وسلفر كبیر",
    "sourceCode": "6-3509",
    "unitCost": 20,
    "regularSalePrice": 45,
    "offerSalePrice": 40,
    "category": "اطارات",
    "legacyId": "ghassan-product-083"
  },
  {
    "key": "006",
    "nameAr": "برواز شھادة A4 اسود وسلفر",
    "sourceCode": "2-3214",
    "unitCost": 9,
    "regularSalePrice": 30,
    "offerSalePrice": 25,
    "category": "براويز",
    "legacyId": "ghassan-product-073"
  },
  {
    "key": "007",
    "nameAr": "برواز شھادة A4 خشب اسود",
    "sourceCode": "GH-2920 / 1-3605",
    "unitCost": 9,
    "regularSalePrice": 30,
    "offerSalePrice": 25,
    "category": "براويز",
    "legacyId": "ghassan-product-076"
  },
  {
    "key": "008",
    "nameAr": "برواز شھادة A3 ابیض",
    "sourceCode": "2-3902",
    "unitCost": 12,
    "regularSalePrice": 35,
    "offerSalePrice": 30,
    "category": "براويز",
    "legacyId": "ghassan-product-079"
  },
  {
    "key": "009",
    "nameAr": "برواز شھادة A3 اسود",
    "sourceCode": "1-3902",
    "unitCost": 12,
    "regularSalePrice": 35,
    "offerSalePrice": 30,
    "category": "براويز",
    "legacyId": "ghassan-product-077"
  },
  {
    "key": "010",
    "nameAr": "برواز خشب A4 ابیض",
    "sourceCode": "GH-2920",
    "unitCost": 9,
    "regularSalePrice": 30,
    "offerSalePrice": 25,
    "category": "براويز",
    "legacyId": "ghassan-product-078"
  },
  {
    "key": "011",
    "nameAr": "برواز شھادة A4 ذھبي مزخرف",
    "sourceCode": "11-3214",
    "unitCost": 15,
    "regularSalePrice": 45,
    "offerSalePrice": 40,
    "category": "براويز",
    "legacyId": "ghassan-product-081"
  },
  {
    "key": "012",
    "nameAr": "برواز شھادة A4 خشبي",
    "sourceCode": "4-3214",
    "unitCost": 10,
    "regularSalePrice": 30,
    "offerSalePrice": 25,
    "category": "براويز",
    "legacyId": "ghassan-product-080"
  },
  {
    "key": "013",
    "nameAr": "برواز شھادة A4 بني وذھبي",
    "sourceCode": "3-3214",
    "unitCost": 9,
    "regularSalePrice": 30,
    "offerSalePrice": 25,
    "category": "براويز",
    "legacyId": "ghassan-product-074"
  },
  {
    "key": "014",
    "nameAr": "شھادة جلد زیتي مبطن",
    "sourceCode": "9-307",
    "unitCost": 8,
    "regularSalePrice": 25,
    "offerSalePrice": 20,
    "category": "شهادات",
    "legacyId": "ghassan-product-062"
  },
  {
    "key": "015",
    "nameAr": "شھادة بني",
    "sourceCode": "4-3009",
    "unitCost": 4.5,
    "regularSalePrice": 20,
    "offerSalePrice": 15,
    "category": "شهادات",
    "legacyId": "ghassan-product-064"
  },
  {
    "key": "016",
    "nameAr": "درع فلوریدا اسود",
    "sourceCode": "4-3815",
    "unitCost": 29,
    "regularSalePrice": 120,
    "offerSalePrice": 100,
    "category": "دروع",
    "legacyId": "ghassan-product-053"
  },
  {
    "key": "017",
    "nameAr": "درع فلوریدا بني",
    "sourceCode": "2-3815",
    "unitCost": 29,
    "regularSalePrice": 120,
    "offerSalePrice": 100,
    "category": "دروع",
    "legacyId": "ghassan-product-054"
  },
  {
    "key": "018",
    "nameAr": "درع فلوریدا عسلي",
    "sourceCode": "5-3815",
    "unitCost": 29,
    "regularSalePrice": 120,
    "offerSalePrice": 100,
    "category": "دروع",
    "legacyId": "ghassan-product-056"
  },
  {
    "key": "019",
    "nameAr": "درع فلوریدا بني صغیر",
    "sourceCode": "12-3524",
    "unitCost": 23,
    "regularSalePrice": 100,
    "offerSalePrice": 80,
    "category": "دروع",
    "legacyId": "ghassan-product-057"
  },
  {
    "key": "020",
    "nameAr": "درع RED",
    "sourceCode": "12-2844",
    "unitCost": 29,
    "regularSalePrice": 120,
    "offerSalePrice": 100,
    "category": "دروع",
    "legacyId": "ghassan-product-058"
  },
  {
    "key": "021",
    "nameAr": "درع expo",
    "sourceCode": "2-3212",
    "unitCost": 33,
    "regularSalePrice": 130,
    "offerSalePrice": 110,
    "category": "دروع",
    "legacyId": "ghassan-product-059"
  },
  {
    "key": "022",
    "nameAr": "درع سنبلة مع صندوق",
    "sourceCode": "1-3815",
    "unitCost": 23,
    "regularSalePrice": 100,
    "offerSalePrice": 80,
    "category": "دروع",
    "legacyId": "ghassan-product-060"
  },
  {
    "key": "023",
    "nameAr": "درع ذھبي دبل",
    "sourceCode": "3-2327",
    "unitCost": 50,
    "regularSalePrice": 140,
    "offerSalePrice": 120,
    "category": "دروع",
    "legacyId": "ghassan-product-061"
  },
  {
    "key": "024",
    "nameAr": "درع زجاج مھدب بني",
    "sourceCode": "8-2508",
    "unitCost": 35,
    "regularSalePrice": 120,
    "offerSalePrice": 100,
    "category": "دروع",
    "legacyId": "ghassan-product-066"
  },
  {
    "key": "025",
    "nameAr": "ماج سبلیمیشن اید ذھبي",
    "sourceCode": "",
    "unitCost": 7,
    "regularSalePrice": 35,
    "offerSalePrice": 30,
    "category": "كاسات",
    "legacyId": "ghassan-product-001"
  },
  {
    "key": "026",
    "nameAr": "ماج سبلیمیشن ابیض",
    "sourceCode": "",
    "unitCost": 3,
    "regularSalePrice": 25,
    "offerSalePrice": 20,
    "category": "كاسات",
    "legacyId": "ghassan-product-003"
  },
  {
    "key": "027",
    "nameAr": "ماج سبلیمیشن ازرق ریف",
    "sourceCode": "",
    "unitCost": 4,
    "regularSalePrice": 35,
    "offerSalePrice": 30,
    "category": "كاسات",
    "legacyId": null
  },
  {
    "key": "028",
    "nameAr": "ماج سبلیمیشن زودجي",
    "sourceCode": "",
    "unitCost": 11,
    "regularSalePrice": 45,
    "offerSalePrice": 40,
    "category": "كاسات",
    "legacyId": null
  },
  {
    "key": "029",
    "nameAr": "ماج سبلیمیشن سحري",
    "sourceCode": "",
    "unitCost": 5.5,
    "regularSalePrice": 35,
    "offerSalePrice": 30,
    "category": "كاسات",
    "legacyId": "ghassan-product-006"
  },
  {
    "key": "030",
    "nameAr": "كاسة قزاز مع غطاء",
    "sourceCode": "",
    "unitCost": 9,
    "regularSalePrice": 30,
    "offerSalePrice": 25,
    "category": "كاسات",
    "legacyId": "ghassan-product-007"
  },
  {
    "key": "031",
    "nameAr": "ماج سبليميشن مع قاعدة خشب",
    "sourceCode": "",
    "unitCost": 6.5,
    "regularSalePrice": 35,
    "offerSalePrice": 30,
    "category": "كاسات",
    "legacyId": null
  },
  {
    "key": "032",
    "nameAr": "تیرموس سبلیمیشن",
    "sourceCode": "906-8",
    "unitCost": 16,
    "regularSalePrice": 50,
    "offerSalePrice": 40,
    "category": "تيرموس",
    "legacyId": "ghassan-product-012"
  },
  {
    "key": "033",
    "nameAr": "تیرموس سبلیمیشن DIGITAL",
    "sourceCode": "11-906",
    "unitCost": 16,
    "regularSalePrice": 50,
    "offerSalePrice": 40,
    "category": "تيرموس",
    "legacyId": "ghassan-product-011"
  },
  {
    "key": "034",
    "nameAr": "مطرة Ocean صغیر سبلیمییشن",
    "sourceCode": "9-3712",
    "unitCost": 15,
    "regularSalePrice": 35,
    "offerSalePrice": 30,
    "category": "مطرات",
    "legacyId": "ghassan-product-013"
  },
  {
    "key": "035",
    "nameAr": "ستانلي ماج سبلیمیشن",
    "sourceCode": "1-2909",
    "unitCost": 28,
    "regularSalePrice": 70,
    "offerSalePrice": 60,
    "category": "مطرات",
    "legacyId": "ghassan-product-014"
  },
  {
    "key": "036",
    "nameAr": "مطرة سبلیمیشن 600 ml",
    "sourceCode": "3-906",
    "unitCost": 10,
    "regularSalePrice": 30,
    "offerSalePrice": 25,
    "category": "مطرات",
    "legacyId": "ghassan-product-017"
  },
  {
    "key": "037",
    "nameAr": "كیس قطن اسود",
    "sourceCode": "3-918",
    "unitCost": 5.5,
    "regularSalePrice": 20,
    "offerSalePrice": 15,
    "category": "اكياس",
    "legacyId": "ghassan-product-018"
  },
  {
    "key": "038",
    "nameAr": "كیس قطن بیج",
    "sourceCode": "2-918",
    "unitCost": 5.5,
    "regularSalePrice": 20,
    "offerSalePrice": 15,
    "category": "اكياس",
    "legacyId": "ghassan-product-019"
  },
  {
    "key": "039",
    "nameAr": "حقيبة جيم ( نادي رياضي )",
    "sourceCode": "918-4",
    "unitCost": 6,
    "regularSalePrice": 20,
    "offerSalePrice": 15,
    "category": "اكياس",
    "legacyId": "ghassan-product-020"
  },
  {
    "key": "040",
    "nameAr": "كیس ابیض سبلیمیشن",
    "sourceCode": "4-2836",
    "unitCost": 5,
    "regularSalePrice": 20,
    "offerSalePrice": 15,
    "category": "اكياس",
    "legacyId": "ghassan-product-021"
  },
  {
    "key": "041",
    "nameAr": "مقلمة كنفس سبلیمیشن",
    "sourceCode": "1-3807",
    "unitCost": 3,
    "regularSalePrice": 15,
    "offerSalePrice": 10,
    "category": "اقمشة",
    "legacyId": "ghassan-product-022"
  },
  {
    "key": "042",
    "nameAr": "وشاح ابیض مع ھدب",
    "sourceCode": "2-3806",
    "unitCost": 3.5,
    "regularSalePrice": 20,
    "offerSalePrice": 15,
    "category": "اقمشة",
    "legacyId": "ghassan-product-051"
  },
  {
    "key": "043",
    "nameAr": "علم ابیض",
    "sourceCode": "2-2837",
    "unitCost": 3,
    "regularSalePrice": 20,
    "offerSalePrice": 15,
    "category": "اقمشة",
    "legacyId": "ghassan-product-050"
  },
  {
    "key": "044",
    "nameAr": "دفتر A6",
    "sourceCode": "11-2708",
    "unitCost": 7,
    "regularSalePrice": 20,
    "offerSalePrice": 15,
    "category": "هدايا",
    "legacyId": "ghassan-product-023"
  },
  {
    "key": "045",
    "nameAr": "لوح تقطیع سبلیمیشن",
    "sourceCode": "3-3709",
    "unitCost": 10,
    "regularSalePrice": 30,
    "offerSalePrice": 25,
    "category": "هدايا",
    "legacyId": "ghassan-product-025"
  },
  {
    "key": "046",
    "nameAr": "كوستر خشب سبلیمشن دائرة",
    "sourceCode": "14-1125",
    "unitCost": 4,
    "regularSalePrice": 15,
    "offerSalePrice": 10,
    "category": "هدايا",
    "legacyId": "ghassan-product-030"
  },
  {
    "key": "047",
    "nameAr": "كوستر خشب سبلیمشن مربع",
    "sourceCode": "15-1125",
    "unitCost": 4,
    "regularSalePrice": 15,
    "offerSalePrice": 10,
    "category": "هدايا",
    "legacyId": "ghassan-product-029"
  },
  {
    "key": "048",
    "nameAr": "فریم بامبو معین",
    "sourceCode": "5-2846",
    "unitCost": 12,
    "regularSalePrice": 35,
    "offerSalePrice": 30,
    "category": "هدايا",
    "legacyId": "ghassan-product-033"
  },
  {
    "key": "049",
    "nameAr": "فریم بامبو دائرة",
    "sourceCode": "5-1917",
    "unitCost": 12,
    "regularSalePrice": 35,
    "offerSalePrice": 30,
    "category": "هدايا",
    "legacyId": "ghassan-product-034"
  },
  {
    "key": "050",
    "nameAr": "فريم بابمو قلب",
    "sourceCode": "3-1917",
    "unitCost": 13,
    "regularSalePrice": 35,
    "offerSalePrice": 30,
    "category": "هدايا",
    "legacyId": "ghassan-product-032"
  },
  {
    "key": "051",
    "nameAr": "فریم صورمع ساعة",
    "sourceCode": "4-3503",
    "unitCost": 20,
    "regularSalePrice": 60,
    "offerSalePrice": 50,
    "category": "هدايا",
    "legacyId": "ghassan-product-035"
  },
  {
    "key": "052",
    "nameAr": "فریم صور سبلیمیشن ذھبي",
    "sourceCode": "1-2832",
    "unitCost": 15,
    "regularSalePrice": 45,
    "offerSalePrice": 35,
    "category": "هدايا",
    "legacyId": "ghassan-product-036"
  },
  {
    "key": "053",
    "nameAr": "حجر مربع 20*20",
    "sourceCode": "2-3503",
    "unitCost": 12,
    "regularSalePrice": 35,
    "offerSalePrice": 30,
    "category": "هدايا",
    "legacyId": "ghassan-product-043"
  },
  {
    "key": "054",
    "nameAr": "حجر دائرة",
    "sourceCode": "4-2832",
    "unitCost": 12,
    "regularSalePrice": 35,
    "offerSalePrice": 30,
    "category": "هدايا",
    "legacyId": "ghassan-product-044"
  },
  {
    "key": "055",
    "nameAr": "مدالیة خشب دائرة وجھین",
    "sourceCode": "",
    "unitCost": 1.5,
    "regularSalePrice": 7,
    "offerSalePrice": 5,
    "category": "هدايا",
    "legacyId": "ghassan-product-045"
  },
  {
    "key": "056",
    "nameAr": "مدالیة خشب مستطیل وجھین",
    "sourceCode": "",
    "unitCost": 1.5,
    "regularSalePrice": 7,
    "offerSalePrice": 5,
    "category": "هدايا",
    "legacyId": "ghassan-product-046"
  },
  {
    "key": "057",
    "nameAr": "مدالیة خشب قلب وجھین",
    "sourceCode": "",
    "unitCost": 1.5,
    "regularSalePrice": 7,
    "offerSalePrice": 5,
    "category": "هدايا",
    "legacyId": "ghassan-product-048"
  }
]
