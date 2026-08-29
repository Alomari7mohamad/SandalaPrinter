export type GhassanCategoryKey =
  | 'SUBLIMATION_DRINKWARE'
  | 'SUBLIMATION_BAGS'
  | 'SUBLIMATION_NOTEBOOKS'
  | 'SUBLIMATION_DESK'
  | 'SUBLIMATION_GIFTS'
  | 'SUBLIMATION_FRAMES'
  | 'SUBLIMATION_KEYCHAINS'
  | 'SUBLIMATION_FLAGS'
  | 'AWARDS'
  | 'CERTIFICATES'
  | 'FRAMES'
export type GhassanProductRow = readonly [
  category: GhassanCategoryKey,
  name: string,
  code: string,
  size: string | null,
  unitCost: number,
  supplierQuantity: number,
  listedTotal: number,
  extraNotes?: string
]

export const ghassanCategories = [
  { key: 'SUBLIMATION_DRINKWARE' as const, id: 'cat-ghassan-sublimation-drinkware', code: 'GHASSAN_SUBLIMATION_DRINKWARE', name: 'أكواب وعبوات سبليميشن', sortOrder: 110 },
  { key: 'SUBLIMATION_BAGS' as const, id: 'cat-ghassan-sublimation-bags', code: 'GHASSAN_SUBLIMATION_BAGS', name: 'حقائب ومقالم سبليميشن', sortOrder: 111 },
  { key: 'SUBLIMATION_NOTEBOOKS' as const, id: 'cat-ghassan-sublimation-notebooks', code: 'GHASSAN_SUBLIMATION_NOTEBOOKS', name: 'دفاتر سبليميشن', sortOrder: 112 },
  { key: 'SUBLIMATION_DESK' as const, id: 'cat-ghassan-sublimation-desk', code: 'GHASSAN_SUBLIMATION_DESK', name: 'مستلزمات مكتبية سبليميشن', sortOrder: 113 },
  { key: 'SUBLIMATION_GIFTS' as const, id: 'cat-ghassan-sublimation-gifts', code: 'GHASSAN_SUBLIMATION_GIFTS', name: 'هدايا وديكور سبليميشن', sortOrder: 114 },
  { key: 'SUBLIMATION_FRAMES' as const, id: 'cat-ghassan-sublimation-frames', code: 'GHASSAN_SUBLIMATION_FRAMES', name: 'براويز سبليميشن', sortOrder: 115 },
  { key: 'SUBLIMATION_KEYCHAINS' as const, id: 'cat-ghassan-sublimation-keychains', code: 'GHASSAN_SUBLIMATION_KEYCHAINS', name: 'ميداليات سبليميشن', sortOrder: 116 },
  { key: 'SUBLIMATION_FLAGS' as const, id: 'cat-ghassan-sublimation-flags', code: 'GHASSAN_SUBLIMATION_FLAGS', name: 'أعلام وأوشحة', sortOrder: 117 },
  { key: 'AWARDS' as const, id: 'cat-ghassan-awards', code: 'GHASSAN_AWARDS', name: 'دروع', sortOrder: 120 },
  { key: 'CERTIFICATES' as const, id: 'cat-ghassan-certificates', code: 'GHASSAN_CERTIFICATES', name: 'شهادات', sortOrder: 121 },
  { key: 'FRAMES' as const, id: 'cat-ghassan-frames', code: 'GHASSAN_FRAMES', name: 'براويز', sortOrder: 130 }
]

export const ghassanProducts = [
  ['SUBLIMATION_DRINKWARE', 'ماج سبليميشن أبيض يد ذهبي', 'GH-SUB-001', '11 أوز', 7, 36, 250],
  ['SUBLIMATION_DRINKWARE', 'ماج سبليميشن أبيض مع علبة', 'GH-SUB-002', '11 أوز', 3.5, 36, 110],
  ['SUBLIMATION_DRINKWARE', 'ماج سبليميشن أبيض', 'GH-SUB-003', '11 أوز', 3, 36, 100],
  ['SUBLIMATION_DRINKWARE', 'ماج سبليميشن أبيض يد كحلي', 'GH-SUB-004', '11 أوز', 4, 36, 144],
  ['SUBLIMATION_DRINKWARE', 'ماج سبليميشن أبيض كابلز', 'GH-SUB-005', '11 أوز', 5.5, 36, 198, 'الكمية في الملف: 18×2، وسعر الوحدة مكتوب 11÷2.'],
  ['SUBLIMATION_DRINKWARE', 'ماج سبليميشن سحري', 'GH-SUB-006', '11 أوز', 7, 36, 200],
  ['SUBLIMATION_DRINKWARE', 'كاسة آيس كوفي بغطاء خشب بامبو', 'GH1027', '16 أوز', 9, 5, 45],
  ['SUBLIMATION_DRINKWARE', 'CROCK GLOSSY', 'GH1026', '11 أوز', 6.5, 5, 32.5],
  ['SUBLIMATION_DRINKWARE', 'كاسة سبليميشن بيضاء', '1-3514', '400 ملل', 15, 5, 75],
  ['SUBLIMATION_GIFTS', 'حصالة بورسلان', 'GH-SUB-010', '11 أوز', 8.5, 36, 300],
  ['SUBLIMATION_DRINKWARE', 'ترموس Digital سبليميشن', '11-906', '500 ملل', 16, 5, 80],
  ['SUBLIMATION_DRINKWARE', 'ترموس Guard أبيض', '8-906', '500 ملل', 16, 5, 80],
  ['SUBLIMATION_DRINKWARE', 'مطرة Ocean صغيرة', '3514-18', '480 ملل', 16, 5, 80],
  ['SUBLIMATION_DRINKWARE', 'ماج ستانلي سبليميشن', '2909-1', '1200 ملل', 28, 5, 140],
  ['SUBLIMATION_DRINKWARE', 'ماج ستانلي سبليميشن', '3514-3', '20 أوز', 19, 5, 95],
  ['SUBLIMATION_DRINKWARE', 'حافظة حرارة أبيض', '906-10', '350 ملل', 9, 5, 45],
  ['SUBLIMATION_DRINKWARE', 'مطرة مصاصة سبليميشن', '906-3', '600 ملل', 10, 5, 50],
  ['SUBLIMATION_BAGS', 'كيس قطن أسود', '918-3', '42×36', 5.5, 5, 27.5],
  ['SUBLIMATION_BAGS', 'كيس قطن بيج', '918-2', '42×36', 5.5, 5, 27.5],
  ['SUBLIMATION_BAGS', 'GYM BAG COTTON أسود', 'GH-SUB-020', '42×36', 6, 5, 60],
  ['SUBLIMATION_BAGS', 'كيس سبليميشن بوليستر', '3514-29', '36×40', 5, 5, 25],
  ['SUBLIMATION_BAGS', 'مقلمة كانفاس', '3617-1', '12×22', 3.5, 5, 17.5],
  ['SUBLIMATION_NOTEBOOKS', 'دفتر سبليميشن', '2708-11', 'A6', 7, 5, 35],
  ['SUBLIMATION_NOTEBOOKS', 'دفتر سبليميشن', '3011-4', 'A5', 8, 5, 40],
  ['SUBLIMATION_GIFTS', 'لوح تقطيع سيراميك', '3506-5', '24×18', 10, 5, 50],
  ['SUBLIMATION_NOTEBOOKS', 'دفتر جلد', '3406-2', 'A5', 13, 5, 65],
  ['SUBLIMATION_DESK', 'PAD MOUSE', '3227-3', '20×20', 4, 5, 20],
  ['SUBLIMATION_DESK', 'PAD MOUSE', '2846-36', '26×19', 4, 5, 20],
  ['SUBLIMATION_DESK', 'كوستر خشب سبليميشن مربع', '15-1125', '9×9', 4, 5, 20],
  ['SUBLIMATION_DESK', 'كوستر خشب سبليميشن مربع', '14-1125', '9×9', 4, 5, 20],
  ['SUBLIMATION_GIFTS', 'وعاء زهور', '3630-6', '8×5.5', 9, 5, 45],
  ['SUBLIMATION_FRAMES', 'فريم بامبو مع ألمنيوم قلب', '1917-3', '9×12', 13, 5, 65],
  ['SUBLIMATION_FRAMES', 'فريم بامبو مع ألمنيوم معين', '2846-5', '9×15', 12, 5, 60],
  ['SUBLIMATION_FRAMES', 'فريم بامبو مع ألمنيوم دائرة', '2846-4', '9×15', 12, 5, 60],
  ['SUBLIMATION_FRAMES', 'فريم صورة خشب بامبو مع ساعة', '3503-4', '14×22.5', 20, 5, 100],
  ['SUBLIMATION_FRAMES', 'فريم صورة ذهبي مع ألمنيوم', '2832-1', '20×15', 15, 5, 75],
  ['SUBLIMATION_FRAMES', 'فريم صورة ألمنيوم قاعدة بامبو', '3506-16', '20×25', 15, 5, 75],
  ['SUBLIMATION_FRAMES', 'ألمنيوم مع قاعدة خشب', '2846-11', '15×15', 12, 5, 60],
  ['SUBLIMATION_FRAMES', 'فريم صورة ألمنيوم قاعدة بامبو', '3506-17', '15×20', 12, 5, 60],
  ['SUBLIMATION_GIFTS', 'مراية سبليميشن', '3514-6', '6×6', 4, 5, 20],
  ['SUBLIMATION_FRAMES', 'فريم حجر مستطيل', '3630-1', 'A4', 15, 5, 75],
  ['SUBLIMATION_FRAMES', 'فريم حجر مستطيل', '3630-2', 'A5', 12, 5, 60],
  ['SUBLIMATION_FRAMES', 'فريم حجر مربع', '3503-2', '20×20', 12, 5, 60],
  ['SUBLIMATION_FRAMES', 'فريم حجر دائرة', '2832-4', '20×20', 12, 5, 60],
  ['SUBLIMATION_KEYCHAINS', 'ميدالية خشب وجهين دائرة', 'GH-KEYCHAIN-CIRCLE', '5×5', 2, 10, 20],
  ['SUBLIMATION_KEYCHAINS', 'ميدالية خشب وجهين مستطيل', 'GH-KEYCHAIN-RECTANGLE', '5×3.5', 2, 10, 20],
  ['SUBLIMATION_KEYCHAINS', 'ميدالية خشب وجهين مربع', 'GH-KEYCHAIN-SQUARE', '5×5', 2, 10, 20],
  ['SUBLIMATION_KEYCHAINS', 'ميدالية خشب وجهين قلب', 'GH-KEYCHAIN-HEART', '5×5', 2, 10, 20],
  ['SUBLIMATION_FLAGS', 'سارية علم مفرد', '3523-2', '33 سم', 10, 5, 50],
  ['SUBLIMATION_FLAGS', 'علم أبيض', '2837-2', '60×40', 3, 10, 30],
  ['SUBLIMATION_FLAGS', 'وشاح مع هدب', '3211-2', '13×152', 3.5, 12, 42],
  ['SUBLIMATION_FLAGS', 'وشاح مع هدب', '2-2702', '11×158', 7, 12, 84, 'ظهر الرقم 3585 أيضًا في خانة رقم المنتج بالملف.'],

  ['AWARDS', 'درع فلوريدا أسود', '3524-3', '29×23', 29, 2, 87],
  ['AWARDS', 'درع فلوريدا بني', '3524-4', '29×23', 29, 2, 87],
  ['AWARDS', 'درع فلوريدا بني وسلفر', '2006-11', '29×23', 32, 2, 64],
  ['AWARDS', 'درع فلوريدا عسلي', '3524-5', '29×23', 29, 2, 58],
  ['AWARDS', 'درع فلوريدا صغير', '3524-12', '19×23', 23, 2, 46],
  ['AWARDS', 'درع خشب أحمر', '2844-12', '22×27.5', 29, 2, 58],
  ['AWARDS', 'درع EXPO', '3212-2', '30×24', 33, 2, 66],
  ['AWARDS', 'درع سنبلة مع صندوق', '3524-9', '29×23', 23, 2, 46],
  ['AWARDS', 'درع صندوق زخرفة إسلامية', '2327-3', '24×29', 50, 2, 100],
  ['CERTIFICATES', 'شهادة جلد زيتي', '307-9', 'A4', 8, 5, 40],
  ['CERTIFICATES', 'شهادة جلد عسلي', '307-8', 'A4', 8, 5, 40],
  ['CERTIFICATES', 'شهادة بني', '2816-4', 'A4', 4.5, 5, 22.5],
  ['CERTIFICATES', 'ورق شهادات أبيض 260 غرام', '3537-1', 'A4', 25, 2, 50],
  ['AWARDS', 'درع خشب مع كريستال', '2508-8', '26×19', 35, 2, 70],

  ['FRAMES', 'فريم إطار أخضر وأبيض', '3509-7', 'A4', 15, 2, 30],
  ['FRAMES', 'فريم بلاستيك سكني', '3605-9', '20×15', 6, 2, 12],
  ['FRAMES', 'فريم بلاستيك سكني', '3605-5', '15×10', 5, 2, 10],
  ['FRAMES', 'فريم بلاستيك عسلي', '3605-6', '20×15', 6, 2, 12],
  ['FRAMES', 'فريم بلاستيك عسلي', '3605-4', '15×10', 5, 2, 10],
  ['FRAMES', 'فريم شهادة معدن', '1906-4', 'A4', 17, 2, 34],
  ['FRAMES', 'فريم شهادة أسود وسلفر', '3214-2', 'A4', 9, 2, 18],
  ['FRAMES', 'فريم شهادة بني ذهبي', '3214-3', '35×26 - A4', 9, 2, 18],
  ['FRAMES', 'برواز صورة سلفر', '2316-3', 'A4', 11, 2, 22],
  ['FRAMES', 'برواز شهادة أسود', '3605-1', 'A4', 9, 2, 18],
  ['FRAMES', 'برواز شهادة أسود', '3214-19', 'A3', 13, 2, 26],
  ['FRAMES', 'برواز شهادة أبيض', '3605-2', 'A4', 9, 2, 18],
  ['FRAMES', 'برواز شهادة أبيض', '3214-20', 'A3', 13, 2, 26],
  ['FRAMES', 'فريم شهادة خشبي', '3214-4', 'A4', 10, 2, 20],
  ['FRAMES', 'فريم شهادة مزخرف', '3214-11', 'A4', 15, 2, 30],
  ['FRAMES', 'فريم شهادة مزخرف', '3214-12', 'A3', 19, 2, 38],
  ['FRAMES', 'فريم إطار بني وسلفر', '3509-6', 'A4', 20, 2, 40]
] as const satisfies readonly GhassanProductRow[]
