const choices = (title, options, target, help) => ({ title, options, target, help });
const service = choices('어디에서 드시나요?', ['매장에서 먹기', '포장하기'], '포장하기', '가져가서 드실 거라면 포장하기를 눌러요.');

export const products = [
  { name: '물티슈', icon: '🧻', price: 1000 },
  { name: '수세미', icon: '🧽', price: 1000 },
  { name: '건전지', icon: '🔋', price: 2000 },
];

export const kiosks = [
  {
    label: '카페 주문', brand: '메가커피',
    mission: '아이스 아메리카노 한 잔을 포장해 보세요.',
    steps: [
      service,
      { ...choices('음료를 골라 주세요', ['아메리카노', '카페라테'], '아메리카노', '메뉴 이름과 가격을 확인하고 원하는 음료를 눌러요.'), icons: ['🧊', '☕'], prices: [2000, 3000] },
      choices('온도를 골라 주세요', ['차갑게 (아이스)', '따뜻하게 (핫)'], '차갑게 (아이스)', '아이스는 차가운 음료예요.'),
      choices('몇 잔 드릴까요?', ['1잔', '2잔', '3잔'], '1잔', '주문할 음료의 잔 수를 골라요.'),
    ],
    total: (order) => (order[1] === '아메리카노' ? 2000 : 3000) * parseInt(order[3], 10),
  },
  {
    label: '햄버거 주문', brand: '맥도날드',
    mission: '빅맥 미디엄 세트를 감자튀김과 콜라로 골라 포장해 보세요.',
    steps: [
      service,
      { ...choices('버거를 골라 주세요', ['빅맥', '불고기 버거'], '빅맥', '버거를 고른 뒤 다음 화면에서 세트를 선택할 수 있어요.'), icons: ['🍔', '🍔'], prices: [5500, 3800] },
      choices('단품과 세트 중 골라 주세요', ['단품', '세트'], '세트', '세트를 고르면 사이드와 음료가 함께 나와요.'),
      choices('세트 크기를 골라 주세요', ['미디엄', '라지'], '미디엄', '라지는 사이드와 음료가 더 커요.'),
      choices('사이드를 골라 주세요', ['감자튀김', '치즈스틱'], '감자튀김', '세트와 함께 먹을 사이드를 하나 골라요.'),
      choices('음료를 골라 주세요', ['콜라', '사이다'], '콜라', '세트에 넣을 음료를 하나 골라요.'),
    ],
    total: (order) => (order[1] === '빅맥' ? 5500 : 3800) +
      (order[2] === '세트' ? (order[3] === '라지' ? 2900 : 2200) : 0),
  },
  {
    label: '영화표 구매', brand: 'CGV',
    mission: '별빛 여행 14:30 회차를 골라 두 사람이 나란히 앉을 자리를 예매해 보세요.',
    steps: [
      choices('영화를 골라 주세요', ['별빛 여행', '바다의 친구들'], '별빛 여행', '연습용 영화 목록에서 제목을 골라요.'),
      choices('상영 시간을 골라 주세요', ['12:00', '14:30', '17:00'], '14:30', '14:30은 오후 2시 30분에 시작하는 회차예요.'),
      choices('몇 분이 관람하시나요?', ['1명', '2명', '3명'], '2명', '고른 인원만큼 좌석을 선택해요.'),
      { title: '좌석을 골라 주세요', help: '같은 줄에서 번호가 이어지는 두 칸을 골라요. 통로 양쪽이나 서로 다른 줄은 나란히 앉는 자리가 아니에요.' },
    ],
    total: (order) => parseInt(order[2], 10) * 12000,
  },
  {
    label: '마트 셀프계산대', brand: '다이소',
    mission: '상품을 스캔하고 두 번 찍힌 상품을 찾아 수량을 1개로 고쳐 보세요. 봉투 없이 결제해 보세요.',
    steps: [
      { title: '상품을 스캔해 주세요', help: '바코드가 스캐너를 향하도록 대는 상황을 연습해요. 상품마다 스캔 버튼을 눌러요.' },
      { title: '실물과 목록을 비교해 주세요', help: '상품마다 실물 수량과 스캔 수량을 비교해 보세요. 수량이 다르면 상품 옆의 버튼으로 수정해요.' },
      choices('봉투가 필요하세요?', ['봉투 없음', '봉투 1장'], '봉투 없음', '가져온 가방이 있다면 봉투 없음을 골라요.'),
    ],
    total: (order) => products.reduce((sum, product, i) => sum + product.price * order[1][i], 0) +
      (order[2] === '봉투 1장' ? 100 : 0),
  },
];

export const seatLabels = ['A', 'B', 'C'].flatMap((row) => [1, 2, 3, 4].map((n) => row + n));

export function isAdjacentPair(seats) {
  if (seats.length !== 2) return false;
  const [left, right] = [...seats].sort();
  return left[0] === right[0] && Number(right[1]) - Number(left[1]) === 1 && left[1] !== '2';
}
