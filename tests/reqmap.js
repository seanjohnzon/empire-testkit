export const REQ_MAP = {
  // test name substring  -> REQ ids this test covers
  'REQ-105A: 400 when walletAddress missing': ['REQ-105'],
  'REQ-105B: 200 and returns breakdown for known wallet': ['REQ-105', 'REQ-124', 'REQ-242'],
  'REQ-201: cooldown immediate second call yields <= previous': ['REQ-201'],
  'REQ-310/315/318: soldier pack spend splits cost': ['REQ-310', 'REQ-315', 'REQ-318'],
  'REQ-330/315/318: train unit spend splits cost': ['REQ-330', 'REQ-315', 'REQ-318'],
  'REQ-401/402: economy stats totals and recents': ['REQ-401', 'REQ-402'],
  'REQ-520/521: referral capture idempotent': ['REQ-520', 'REQ-521'],
  'REQ-160/145: sign claim returns signature and halving multiplier': ['REQ-160', 'REQ-145']
};
