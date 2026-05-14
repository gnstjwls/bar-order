import { useState, useEffect, useCallback } from "react";

const MENU = [
  { id: 1, name: "사랑을 담은 프렌치 토스트", price: 9900,  emoji: "🍞", tag: "달콤",  category: "food" },
  { id: 2, name: "열정의 불닭 빠네 파스타",   price: 16000, emoji: "🌶️", tag: "매콤",  category: "food" },
  { id: 3, name: "참치의 꿈 카나페",          price: 9000,  emoji: "🐟", tag: "상큼",  category: "food" },
  { id: 4, name: "우정을 담은 김치 제육 볶음밥", price: 13000, emoji: "🍳", tag: "든든", category: "food" },
  { id: 5, name: "소주 / 맥주 배달 서비스",   price: 5000,  emoji: "🍺", tag: "주류",  category: "drink" },
  { id: 6, name: "블루베리 모히또",            price: 6000,  emoji: "🫐", tag: "칵테일", category: "drink" },
  { id: 7, name: "오레오 막걸리",              price: 6000,  emoji: "🥛", tag: "전통주", category: "drink" },
];

const BANK      = "토스뱅크";
const ACCOUNT   = "1000-9363-7681";
const ACCT_RAW  = "100093637681";
const OWNER     = "서은희";
const KITCHEN_PW = "kitchen";
const STORE_KEY  = "hofs_bar_v2";
const TABLES     = Array.from({ length: 15 }, (_, i) => i + 1);

const fmt   = (p) => p.toLocaleString("ko-KR") + "원";
const genId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const safeGet = async (key, shared) => {
  try { const r = await window.storage.get(key, shared); return r ? JSON.parse(r.value) : null; }
  catch { return null; }
};
const safeSet = async (key, value, shared) => {
  try { await window.storage.set(key, JSON.stringify(value), shared); return true; }
  catch { return false; }
};

const C = {
  bg:      "#0c0905",
  card:    "#18110a",
  card2:   "#221a0f",
  border:  "#2c1f10",
  accent:  "#f0a500",
  coral:   "#e0603a",
  green:   "#3daa6e",
  text:    "#fcefd8",
  sub:     "#917a60",
  toss:    "#0064ff",
};

const STATUS_MAP = {
  waiting: { label: "대기중",   color: "#f0a500", bg: "rgba(240,165,0,0.12)"   },
  cooking: { label: "준비중",   color: "#e0603a", bg: "rgba(224,96,58,0.12)"   },
  ready:   { label: "완료",     color: "#3daa6e", bg: "rgba(61,170,110,0.12)"  },
  paid:    { label: "결제완료", color: "#6b6b6b", bg: "rgba(107,107,107,0.12)" },
};

const NEXT = { waiting: "cooking", cooking: "ready", ready: "paid" };
const NEXT_LABEL = { waiting: "준비 시작 →", cooking: "완료 처리 →", ready: "결제 완료 →" };

const btn = (extra = {}) => ({
  border: "none", cursor: "pointer", fontFamily: "'Noto Sans KR', sans-serif", ...extra,
});

export default function App() {
  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Jua&family=Noto+Sans+KR:wght@400;500;700&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      body{background:${C.bg};font-family:'Noto Sans KR',sans-serif;color:${C.text}}
      input,textarea{font-family:'Noto Sans KR',sans-serif}
      ::-webkit-scrollbar{width:3px}
      ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
      @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
      @keyframes pop{0%{transform:scale(0.95)}60%{transform:scale(1.04)}100%{transform:scale(1)}}
      .fadeUp{animation:fadeUp 0.3s ease both}
      .pop{animation:pop 0.2s ease both}
    `;
    document.head.appendChild(s);
  }, []);

  const [view,        setView]        = useState("customer");
  const [table,       setTable]       = useState(null);
  const [page,        setPage]        = useState("table");
  const [cart,        setCart]        = useState([]);
  const [note,        setNote]        = useState("");
  const [orders,      setOrders]      = useState([]);
  const [placed,      setPlaced]      = useState(null);
  const [kwInput,     setKwInput]     = useState("");
  const [kwErr,       setKwErr]       = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [kFilter,     setKFilter]     = useState("active");

  const loadOrders = useCallback(async () => {
    const d = await safeGet(STORE_KEY, true);
    setOrders(d || []);
  }, []);

  useEffect(() => {
    if (view !== "kitchen") return;
    loadOrders();
    const id = setInterval(loadOrders, 3000);
    return () => clearInterval(id);
  }, [view, loadOrders]);

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const qty = (id) => cart.find(x => x.id === id)?.qty || 0;

  const add = (item) =>
    setCart(c => c.find(x => x.id === item.id)
      ? c.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x)
      : [...c, { ...item, qty: 1 }]);

  const sub = (id) =>
    setCart(c => {
      const x = c.find(i => i.id === id);
      if (!x) return c;
      return x.qty === 1 ? c.filter(i => i.id !== id) : c.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i);
    });

  const placeOrder = async () => {
    if (!cart.length || submitting) return;
    setSubmitting(true);
    const order = { id: genId(), table, items: cart, total: cartTotal, note, status: "waiting", createdAt: Date.now() };
    const prev = await safeGet(STORE_KEY, true) || [];
    await safeSet(STORE_KEY, [...prev, order], true);
    setPlaced(order);
    setCart([]);
    setNote("");
    setPage("success");
    setSubmitting(false);
  };

  const updateStatus = async (oid, ns) => {
    const updated = orders.map(o => o.id === oid ? { ...o, status: ns } : o);
    await safeSet(STORE_KEY, updated, true);
    setOrders(updated);
  };

  const deleteOrder = async (oid) => {
    const updated = orders.filter(o => o.id !== oid);
    await safeSet(STORE_KEY, updated, true);
    setOrders(updated);
  };

  const kitchenLogin = () => {
    if (kwInput === KITCHEN_PW) { setView("kitchen"); setKwErr(false); setKwInput(""); }
    else setKwErr(true);
  };

  // ─── Kitchen Login ────────────────────────────────────────────────────────────
  if (view === "kitchenLogin") {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
        <div className="fadeUp" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:36, width:"100%", maxWidth:360, textAlign:"center" }}>
          <div style={{ fontSize:52, marginBottom:12 }}>🍳</div>
          <div style={{ fontFamily:"'Jua',sans-serif", fontSize:26, color:C.text, marginBottom:6 }}>주방 접속</div>
          <div style={{ color:C.sub, fontSize:14, marginBottom:28 }}>비밀번호를 입력하세요</div>
          <input
            type="password" value={kwInput}
            onChange={e => { setKwInput(e.target.value); setKwErr(false); }}
            onKeyDown={e => e.key === "Enter" && kitchenLogin()}
            placeholder="비밀번호"
            style={{
              width:"100%", padding:"13px 16px", borderRadius:12,
              border:`1.5px solid ${kwErr ? C.coral : C.border}`,
              background:C.card2, color:C.text, fontSize:16, outline:"none", marginBottom:8,
            }}
          />
          {kwErr && <div style={{ color:C.coral, fontSize:13, marginBottom:10 }}>❌ 비밀번호가 틀렸습니다</div>}
          <button onClick={kitchenLogin} style={{ ...btn(), width:"100%", padding:14, borderRadius:12, background:C.accent, color:"#000", fontSize:17, fontWeight:700, fontFamily:"'Jua',sans-serif", marginTop:8 }}>
            입장하기
          </button>
          <button onClick={() => setView("customer")} style={{ ...btn(), background:"none", color:C.sub, marginTop:18, fontSize:14 }}>
            ← 고객 화면으로
          </button>
        </div>
      </div>
    );
  }

  // ─── Kitchen Dashboard ────────────────────────────────────────────────────────
  if (view === "kitchen") {
    const active = orders.filter(o => o.status !== "paid").sort((a,b) => a.createdAt - b.createdAt);
    const paid   = orders.filter(o => o.status === "paid").sort((a,b) => b.createdAt - a.createdAt);
    const shown  = kFilter === "active" ? active : paid;
    const counts = { waiting:0, cooking:0, ready:0 };
    active.forEach(o => counts[o.status] = (counts[o.status] || 0) + 1);

    return (
      <div style={{ minHeight:"100vh", background:C.bg }}>
        {/* Header */}
        <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"14px 18px", position:"sticky", top:0, zIndex:20 }}>
          <div style={{ maxWidth:680, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontFamily:"'Jua',sans-serif", fontSize:22, color:C.accent }}>🍳 주방 대시보드</div>
              <div style={{ color:C.sub, fontSize:12, marginTop:2 }}>3초마다 자동 갱신 중</div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={loadOrders} style={{ ...btn(), background:C.card2, border:`1px solid ${C.border}`, color:C.sub, padding:"7px 12px", borderRadius:8, fontSize:13 }}>
                ↻ 새로고침
              </button>
              <button onClick={() => setView("customer")} style={{ ...btn(), background:C.card2, border:`1px solid ${C.border}`, color:C.sub, padding:"7px 12px", borderRadius:8, fontSize:13 }}>
                고객 화면
              </button>
            </div>
          </div>
        </div>

        <div style={{ maxWidth:680, margin:"0 auto", padding:"18px 14px" }}>
          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:18 }}>
            {[["대기중","waiting"],["준비중","cooking"],["완료","ready"]].map(([label,key]) => (
              <div key={key} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 12px", textAlign:"center" }}>
                <div style={{ fontFamily:"'Jua',sans-serif", fontSize:30, color:STATUS_MAP[key].color }}>{counts[key] || 0}</div>
                <div style={{ fontSize:12, color:C.sub, marginTop:3 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Tab */}
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            {[["active","진행 중",active.length],["paid","결제 완료",paid.length]].map(([k,l,n]) => (
              <button key={k} onClick={() => setKFilter(k)} style={{
                ...btn(), padding:"9px 18px", borderRadius:10,
                background: kFilter===k ? C.accent : C.card2,
                border: `1px solid ${kFilter===k ? C.accent : C.border}`,
                color: kFilter===k ? "#000" : C.sub,
                fontWeight: kFilter===k ? 700 : 400, fontSize:14,
              }}>
                {l} ({n})
              </button>
            ))}
          </div>

          {/* Orders */}
          {shown.length === 0 ? (
            <div style={{ textAlign:"center", padding:"64px 0", color:C.sub }}>
              {kFilter === "active" ? "🎉 대기 중인 주문이 없습니다" : "결제 완료된 주문이 없습니다"}
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:12, paddingBottom:48 }}>
              {shown.map(order => {
                const s   = STATUS_MAP[order.status];
                const t   = new Date(order.createdAt);
                const ts  = `${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`;
                return (
                  <div key={order.id} className="fadeUp" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ background:C.accent, color:"#000", fontFamily:"'Jua',sans-serif", fontSize:18, borderRadius:10, padding:"4px 14px" }}>
                          {order.table}번
                        </div>
                        <span style={{ color:C.sub, fontSize:13 }}>{ts}</span>
                      </div>
                      <div style={{ background:s.bg, color:s.color, borderRadius:20, padding:"5px 13px", fontSize:13, fontWeight:700 }}>
                        {s.label}
                      </div>
                    </div>

                    <div style={{ marginBottom:12, borderRadius:10, overflow:"hidden", border:`1px solid ${C.border}` }}>
                      {order.items.map((item, idx) => (
                        <div key={item.id} style={{
                          display:"flex", justifyContent:"space-between", padding:"9px 12px",
                          background: idx%2===0 ? C.card : C.card2,
                        }}>
                          <span style={{ fontSize:14 }}>{item.emoji} {item.name}</span>
                          <span style={{ color:C.accent, fontWeight:700, fontSize:14, marginLeft:8, flexShrink:0 }}>×{item.qty}</span>
                        </div>
                      ))}
                    </div>

                    {order.note && (
                      <div style={{ background:C.card2, borderRadius:8, padding:"8px 12px", marginBottom:12, fontSize:13, color:C.sub }}>
                        📝 {order.note}
                      </div>
                    )}

                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontFamily:"'Jua',sans-serif", fontSize:20, color:C.accent }}>{fmt(order.total)}</span>
                      <div style={{ display:"flex", gap:8 }}>
                        {order.status === "paid" && (
                          <button onClick={() => deleteOrder(order.id)} style={{ ...btn(), background:"rgba(224,96,58,0.1)", color:C.coral, border:`1px solid ${C.coral}40`, borderRadius:8, padding:"7px 12px", fontSize:13 }}>
                            삭제
                          </button>
                        )}
                        {order.status !== "paid" && (
                          <button onClick={() => updateStatus(order.id, NEXT[order.status])} style={{ ...btn(), background:s.color, color:"#fff", borderRadius:10, padding:"9px 18px", fontSize:14, fontWeight:700 }}>
                            {NEXT_LABEL[order.status]}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Customer: Table Select ───────────────────────────────────────────────────
  if (page === "table") {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, position:"relative" }}>
        <button onClick={() => setView("kitchenLogin")} style={{ ...btn(), position:"fixed", top:14, right:14, background:C.card, border:`1px solid ${C.border}`, color:C.sub, padding:"6px 13px", borderRadius:8, fontSize:12 }}>
          🍳 주방
        </button>

        <div className="fadeUp" style={{ textAlign:"center", marginBottom:44 }}>
          <div style={{ fontSize:60, marginBottom:14 }}>🥂</div>
          <div style={{ fontFamily:"'Jua',sans-serif", fontSize:34, color:C.text, marginBottom:8 }}>어서오세요!</div>
          <div style={{ color:C.sub, fontSize:16 }}>테이블 번호를 선택해주세요</div>
        </div>

        <div className="fadeUp" style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, width:"100%", maxWidth:360 }}>
          {TABLES.map(n => (
            <button
              key={n}
              onClick={() => { setTable(n); setPage("menu"); }}
              style={{ ...btn(), aspectRatio:"1", borderRadius:14, border:`1px solid ${C.border}`, background:C.card, color:C.text, fontSize:20, fontFamily:"'Jua',sans-serif", transition:"all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = C.card2; e.currentTarget.style.borderColor = C.accent+"66"; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.card; e.currentTarget.style.borderColor = C.border; }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Customer: Success / Payment ─────────────────────────────────────────────
  if (page === "success" && placed) {
    const tossUrl = `supertoss://send?bank=${encodeURIComponent(BANK)}&accountNo=${ACCT_RAW}&amount=${placed.total}`;
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20 }}>
        <div className="fadeUp" style={{ width:"100%", maxWidth:420, textAlign:"center" }}>
          <div style={{ fontSize:64, marginBottom:14 }}>✅</div>
          <div style={{ fontFamily:"'Jua',sans-serif", fontSize:30, color:C.text, marginBottom:6 }}>주문 완료!</div>
          <div style={{ color:C.sub, fontSize:15, marginBottom:32 }}>
            {placed.table}번 테이블 주문이 접수되었습니다 🎉
          </div>

          {/* Summary */}
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:20, marginBottom:16, textAlign:"left" }}>
            {placed.items.map(item => (
              <div key={item.id} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:14 }}>{item.emoji} {item.name} ×{item.qty}</span>
                <span style={{ color:C.sub, fontSize:14 }}>{fmt(item.price * item.qty)}</span>
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"space-between", paddingTop:12, marginTop:4 }}>
              <span style={{ fontWeight:700 }}>합계</span>
              <span style={{ fontFamily:"'Jua',sans-serif", fontSize:22, color:C.accent }}>{fmt(placed.total)}</span>
            </div>
          </div>

          {/* Payment */}
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:20, marginBottom:18, textAlign:"left" }}>
            <div style={{ color:C.sub, fontSize:12, marginBottom:12, letterSpacing:"0.05em" }}>💸 결제 안내</div>
            {[["은행",BANK],["계좌번호",ACCOUNT],["예금주",OWNER]].map(([k,v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ color:C.sub, fontSize:14 }}>{k}</span>
                <span style={{ fontWeight:700, fontSize:14 }}>{v}</span>
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:18 }}>
              <span style={{ color:C.sub, fontSize:14 }}>금액</span>
              <span style={{ fontFamily:"'Jua',sans-serif", fontSize:20, color:C.accent }}>{fmt(placed.total)}</span>
            </div>
            <a href={tossUrl} style={{
              display:"block", width:"100%", padding:14, borderRadius:12, textDecoration:"none",
              background:C.toss, color:"#fff", textAlign:"center", fontWeight:700, fontSize:16,
              fontFamily:"'Noto Sans KR',sans-serif",
            }}>
              💙 토스로 바로 송금
            </a>
          </div>

          <button onClick={() => setPage("menu")} style={{ ...btn(), background:C.card2, border:`1px solid ${C.border}`, color:C.sub, padding:"13px 28px", borderRadius:14, fontSize:15 }}>
            + 추가 주문하기
          </button>
        </div>
      </div>
    );
  }

  // ─── Customer: Cart ───────────────────────────────────────────────────────────
  if (page === "cart") {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, paddingBottom:60 }}>
        <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"14px 18px", position:"sticky", top:0, zIndex:10, display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={() => setPage("menu")} style={{ ...btn(), background:"none", color:C.text, fontSize:22 }}>←</button>
          <span style={{ fontFamily:"'Jua',sans-serif", fontSize:20 }}>장바구니</span>
          <span style={{ marginLeft:"auto", color:C.sub, fontSize:14 }}>{table}번 테이블</span>
        </div>

        <div style={{ maxWidth:480, margin:"0 auto", padding:"20px 16px" }}>
          {cart.length === 0 ? (
            <div style={{ textAlign:"center", padding:"80px 0", color:C.sub }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🛒</div>
              <div>장바구니가 비었습니다</div>
            </div>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.id} className="fadeUp" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"14px 16px", marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:500, marginBottom:4 }}>{item.emoji} {item.name}</div>
                    <div style={{ fontFamily:"'Jua',sans-serif", fontSize:17, color:C.accent }}>{fmt(item.price * item.qty)}</div>
                    <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>{fmt(item.price)} × {item.qty}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <button onClick={() => sub(item.id)} style={{ ...btn(), width:34, height:34, borderRadius:10, border:`1px solid ${C.border}`, background:C.card2, color:C.text, fontSize:20 }}>−</button>
                    <span style={{ fontWeight:700, fontSize:17, minWidth:22, textAlign:"center" }}>{item.qty}</span>
                    <button onClick={() => add(item)} style={{ ...btn(), width:34, height:34, borderRadius:10, background:C.accent, color:"#000", fontSize:20, fontWeight:700 }}>+</button>
                  </div>
                </div>
              ))}

              <div style={{ marginTop:18, marginBottom:20 }}>
                <div style={{ color:C.sub, fontSize:13, marginBottom:8 }}>📝 요청사항 (선택)</div>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="예: 맵기 조절, 알레르기 등"
                  style={{ width:"100%", padding:12, borderRadius:12, border:`1px solid ${C.border}`, background:C.card, color:C.text, fontSize:14, resize:"none", height:80, outline:"none" }}
                />
              </div>

              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:16, marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ color:C.sub }}>총 합계</span>
                <span style={{ fontFamily:"'Jua',sans-serif", fontSize:26, color:C.accent }}>{fmt(cartTotal)}</span>
              </div>

              <button onClick={placeOrder} disabled={submitting} style={{
                ...btn(), width:"100%", padding:16, borderRadius:16,
                background: submitting ? C.sub : C.accent,
                color:"#000", fontFamily:"'Jua',sans-serif", fontSize:20,
                opacity: submitting ? 0.7 : 1,
              }}>
                {submitting ? "주문 중..." : `주문하기 · ${fmt(cartTotal)}`}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── Customer: Menu ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:C.bg, paddingBottom:100 }}>
      {/* Header */}
      <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"14px 18px", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ maxWidth:480, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontFamily:"'Jua',sans-serif", fontSize:22, color:C.accent }}>🥂 오늘의 메뉴</div>
            <div style={{ color:C.sub, fontSize:13 }}>{table}번 테이블</div>
          </div>
          <button onClick={() => setPage("cart")} style={{
            ...btn(), background: cartCount > 0 ? C.accent : C.card2,
            border:`1px solid ${cartCount > 0 ? C.accent : C.border}`,
            color: cartCount > 0 ? "#000" : C.sub,
            borderRadius:12, padding:"9px 16px", fontSize:14, fontWeight: cartCount > 0 ? 700 : 400,
          }}>
            {cartCount > 0 ? `🛒 ${cartCount}개 · ${fmt(cartTotal)}` : "🛒 장바구니"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth:480, margin:"0 auto", padding:"22px 14px" }}>
        {[["food","🍽️ 푸드"],["drink","🍹 음료 & 주류"]].map(([cat, catLabel]) => (
          <div key={cat} style={{ marginBottom:32 }}>
            <div style={{ fontFamily:"'Jua',sans-serif", fontSize:18, color:C.sub, marginBottom:14 }}>{catLabel}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {MENU.filter(m => m.category === cat).map(item => {
                const q = qty(item.id);
                return (
                  <div key={item.id} style={{ background:C.card, border:`1px solid ${q > 0 ? C.accent+"44" : C.border}`, borderRadius:18, padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", transition:"border-color 0.2s" }}>
                    <div style={{ flex:1, minWidth:0, paddingRight:12 }}>
                      <div style={{ fontSize:26, marginBottom:5 }}>{item.emoji}</div>
                      <div style={{ fontSize:14, fontWeight:500, lineHeight:1.4, marginBottom:4 }}>{item.name}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontFamily:"'Jua',sans-serif", fontSize:17, color:C.accent }}>{fmt(item.price)}</span>
                        <span style={{ fontSize:11, color:C.sub, background:C.card2, padding:"2px 9px", borderRadius:20 }}>{item.tag}</span>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                      {q > 0 && (
                        <>
                          <button onClick={() => sub(item.id)} style={{ ...btn(), width:34, height:34, borderRadius:10, border:`1px solid ${C.border}`, background:C.card2, color:C.text, fontSize:20 }}>−</button>
                          <span style={{ fontWeight:700, fontSize:17, minWidth:20, textAlign:"center", color:C.accent }}>{q}</span>
                        </>
                      )}
                      <button onClick={() => add(item)} className={q === 0 ? "" : "pop"} style={{ ...btn(), width:36, height:36, borderRadius:10, background:C.accent, color:"#000", fontSize:22, fontWeight:700 }}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Cart */}
      {cartCount > 0 && (
        <div style={{ position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)", zIndex:100, width:"calc(100% - 28px)", maxWidth:460 }}>
          <button onClick={() => setPage("cart")} style={{
            ...btn(), width:"100%", padding:"15px 20px", borderRadius:18, background:C.accent, color:"#000",
            fontFamily:"'Jua',sans-serif", fontSize:17, display:"flex", justifyContent:"space-between", alignItems:"center",
            boxShadow:`0 6px 28px ${C.accent}55`,
          }}>
            <span style={{ background:"rgba(0,0,0,0.15)", borderRadius:8, padding:"3px 10px", fontSize:14 }}>{cartCount}개</span>
            <span>장바구니 보기</span>
            <span>{fmt(cartTotal)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
