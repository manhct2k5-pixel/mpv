export type StoreCategory = {
  title: string;
  description: string;
  path: string;
  accent: string;
  highlight: string;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  price: string;
  detail: string;
  badge?: string;
  tone: string;
};

export type StoreCollection = {
  title: string;
  subtitle: string;
  highlight: string;
  accent: string;
  chips: string[];
  products: Product[];
};

export type LookbookStory = {
  title: string;
  description: string;
  mood: string;
};

export const storeCategories: StoreCategory[] = [
  {
    title: 'Nữ dịu dàng',
    description: 'Váy xoè, sơ mi kẹo bông, cardigan mềm mịn.',
    path: '/nu',
    accent: 'bg-blush/30',
    highlight: 'Form dáng tôn eo'
  },
  {
    title: 'Nam ấm áp',
    description: 'Áo thun nâu latte, quần ống suông gọn gàng.',
    path: '/nam',
    accent: 'bg-caramel/25',
    highlight: 'Chất liệu thoáng'
  },
  {
    title: 'Unisex đáng yêu',
    description: 'Hoodie, sweater và set đôi đi chơi.',
    path: '/phu-kien',
    accent: 'bg-latte/40',
    highlight: 'Mix dễ dàng'
  },
  {
    title: 'Sale ngọt ngào',
    description: 'Ưu đãi tuần này, số lượng giới hạn.',
    path: '/sale',
    accent: 'bg-cream/80',
    highlight: 'Giảm đến 35%'
  }
];

export const featuredProducts: Product[] = [
  {
    id: 'p1',
    name: 'Áo len mây kem',
    category: 'Nữ',
    price: '320.000đ',
    detail: 'Chất len mềm, co giãn nhẹ',
    badge: 'Mới về',
    tone: 'bg-cream'
  },
  {
    id: 'p2',
    name: 'Set sơ mi latte',
    category: 'Nam',
    price: '410.000đ',
    detail: 'Form rộng, mát nhẹ',
    badge: 'Bán chạy',
    tone: 'bg-latte'
  },
  {
    id: 'p3',
    name: 'Chân váy cacao',
    category: 'Nữ',
    price: '260.000đ',
    detail: 'Dáng chữ A nhẹ nhàng',
    tone: 'bg-blush/40'
  },
  {
    id: 'p4',
    name: 'Áo thun hạt dẻ',
    category: 'Nam',
    price: '190.000đ',
    detail: 'Cotton 2 chiều thấm hút',
    tone: 'bg-caramel/30'
  },
  {
    id: 'p5',
    name: 'Khăn cổ caramel',
    category: 'Phụ kiện',
    price: '120.000đ',
    detail: 'Điểm nhấn ấm áp',
    tone: 'bg-latte/60'
  },
  {
    id: 'p6',
    name: 'Túi đeo mini kem',
    category: 'Phụ kiện',
    price: '290.000đ',
    detail: 'Mix dễ với mọi outfit',
    badge: 'Limited',
    tone: 'bg-cream'
  }
];

export const collections: Record<string, StoreCollection> = {
  women: {
    title: 'Bộ sưu tập Nữ',
    subtitle: 'Nét ngọt ngào pha chút tinh nghịch cho mọi ngày.',
    highlight: 'Vải mềm, lên dáng chuẩn',
    accent: 'bg-blush/20',
    chips: ['Váy xoè', 'Áo croptop', 'Cardigan'],
    products: [
      {
        id: 'w1',
        name: 'Váy hoa kem sữa',
        category: 'Nữ',
        price: '360.000đ',
        detail: 'Lót mềm, bay nhẹ',
        badge: 'Hot',
        tone: 'bg-cream'
      },
      {
        id: 'w2',
        name: 'Áo cardigan mocha',
        category: 'Nữ',
        price: '290.000đ',
        detail: 'Len tăm, giữ ấm vừa',
        tone: 'bg-latte'
      },
      {
        id: 'w3',
        name: 'Chân váy cacao',
        category: 'Nữ',
        price: '250.000đ',
        detail: 'Dáng A, tôn dáng',
        tone: 'bg-blush/40'
      },
      {
        id: 'w4',
        name: 'Áo thun kem vani',
        category: 'Nữ',
        price: '180.000đ',
        detail: 'Cotton mịn, thấm hút',
        tone: 'bg-cream'
      },
      {
        id: 'w5',
        name: 'Set váy yếm latte',
        category: 'Nữ',
        price: '420.000đ',
        detail: 'Đai nơ dễ thương',
        badge: 'Mới',
        tone: 'bg-caramel/25'
      },
      {
        id: 'w6',
        name: 'Áo sơ mi sữa hạnh nhân',
        category: 'Nữ',
        price: '310.000đ',
        detail: 'Cổ bèo nhẹ',
        tone: 'bg-latte/50'
      }
    ]
  },
  men: {
    title: 'Bộ sưu tập Nam',
    subtitle: 'Tối giản, ấm áp, dễ phối mỗi ngày.',
    highlight: 'Form suông gọn gàng',
    accent: 'bg-caramel/15',
    chips: ['Áo thun', 'Sơ mi', 'Quần ống đứng'],
    products: [
      {
        id: 'm1',
        name: 'Áo thun hạt dẻ',
        category: 'Nam',
        price: '190.000đ',
        detail: 'Cotton 2 chiều',
        badge: 'Bán chạy',
        tone: 'bg-caramel/30'
      },
      {
        id: 'm2',
        name: 'Sơ mi latte',
        category: 'Nam',
        price: '320.000đ',
        detail: 'Vải mềm, ít nhăn',
        tone: 'bg-latte/60'
      },
      {
        id: 'm3',
        name: 'Quần kaki cacao',
        category: 'Nam',
        price: '360.000đ',
        detail: 'Ống đứng, tôn dáng',
        tone: 'bg-cream'
      },
      {
        id: 'm4',
        name: 'Áo khoác mocha',
        category: 'Nam',
        price: '490.000đ',
        detail: 'Lót cotton, ấm nhẹ',
        tone: 'bg-latte'
      },
      {
        id: 'm5',
        name: 'Áo polo caramel',
        category: 'Nam',
        price: '260.000đ',
        detail: 'Dệt pique, thoáng khí',
        tone: 'bg-caramel/20'
      },
      {
        id: 'm6',
        name: 'Áo sơ mi sọc kem',
        category: 'Nam',
        price: '300.000đ',
        detail: 'Sọc nhỏ, thanh lịch',
        tone: 'bg-cream'
      }
    ]
  },
  accessories: {
    title: 'Phụ kiện đáng yêu',
    subtitle: 'Nâng tầm outfit với những món nhỏ xinh.',
    highlight: 'Mix match siêu dễ',
    accent: 'bg-latte/30',
    chips: ['Túi mini', 'Khăn cổ', 'Mũ len'],
    products: [
      {
        id: 'a1',
        name: 'Túi mini kem',
        category: 'Phụ kiện',
        price: '290.000đ',
        detail: 'Đeo vai hoặc chéo',
        badge: 'Limited',
        tone: 'bg-cream'
      },
      {
        id: 'a2',
        name: 'Khăn cổ caramel',
        category: 'Phụ kiện',
        price: '120.000đ',
        detail: 'Mềm ấm, nhẹ cổ',
        tone: 'bg-caramel/25'
      },
      {
        id: 'a3',
        name: 'Mũ len mocha',
        category: 'Phụ kiện',
        price: '140.000đ',
        detail: 'Dệt gân, giữ ấm',
        tone: 'bg-latte/70'
      },
      {
        id: 'a4',
        name: 'Tất cotton kem',
        category: 'Phụ kiện',
        price: '60.000đ',
        detail: 'Thoáng, co giãn',
        tone: 'bg-cream'
      },
      {
        id: 'a5',
        name: 'Kẹp tóc mocha',
        category: 'Phụ kiện',
        price: '80.000đ',
        detail: 'Set 2 chiếc',
        tone: 'bg-blush/40'
      },
      {
        id: 'a6',
        name: 'Dây nịt da sữa',
        category: 'Phụ kiện',
        price: '210.000đ',
        detail: 'Khóa tròn vintage',
        tone: 'bg-latte/60'
      }
    ]
  },
  sale: {
    title: 'Ưu đãi ngọt ngào',
    subtitle: 'Những món dễ thương với mức giá mềm nhất.',
    highlight: 'Giảm đến 35%',
    accent: 'bg-cream/80',
    chips: ['Combo đôi', 'Sale tuần', 'Limited'],
    products: [
      {
        id: 's1',
        name: 'Áo len mây kem',
        category: 'Sale',
        price: '245.000đ',
        detail: 'Giảm 25%',
        badge: 'Best',
        tone: 'bg-cream'
      },
      {
        id: 's2',
        name: 'Váy yếm caramel',
        category: 'Sale',
        price: '310.000đ',
        detail: 'Giảm 30%',
        tone: 'bg-caramel/30'
      },
      {
        id: 's3',
        name: 'Áo thun hạt dẻ',
        category: 'Sale',
        price: '150.000đ',
        detail: 'Giảm 20%',
        tone: 'bg-blush/30'
      },
      {
        id: 's4',
        name: 'Quần ống đứng cacao',
        category: 'Sale',
        price: '280.000đ',
        detail: 'Giảm 15%',
        tone: 'bg-latte/50'
      },
      {
        id: 's5',
        name: 'Túi mini kem',
        category: 'Sale',
        price: '220.000đ',
        detail: 'Giảm 18%',
        tone: 'bg-cream'
      },
      {
        id: 's6',
        name: 'Khăn cổ caramel',
        category: 'Sale',
        price: '90.000đ',
        detail: 'Giảm 25%',
        tone: 'bg-caramel/25'
      }
    ]
  }
};

export const lookbookStories: LookbookStory[] = [
  {
    title: 'Cafe sáng cuối tuần',
    description: 'Set cardigan + váy hoa kem tạo vibe mềm mại.',
    mood: 'Ngọt dịu'
  },
  {
    title: 'Đi học đi làm',
    description: 'Sơ mi latte + quần kaki cacao, gọn gàng lịch sự.',
    mood: 'Thanh lịch'
  },
  {
    title: 'Dạo phố tối',
    description: 'Áo thun hạt dẻ + túi mini kem, dễ thương năng động.',
    mood: 'Tươi vui'
  },
  {
    title: 'Chuyến đi xa',
    description: 'Hoodie unisex + mũ len mocha, ấm áp cả ngày.',
    mood: 'Ấm áp'
  }
];

export const storeBenefits = [
  {
    title: 'Vải mềm thân thiện',
    description: 'Chất liệu cotton, linen nhẹ, dễ chịu cho da.'
  },
  {
    title: 'Đổi trả trong 7 ngày',
    description: 'Thử tại nhà, đổi size hoặc mẫu nhanh chóng.'
  },
  {
    title: 'Gói quà đáng yêu',
    description: 'Đóng gói như sticker, tặng kèm thiệp nhỏ.'
  }
];
