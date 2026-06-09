// Option D — « Trois nations » · affiche couleur des trois pays hôtes (MEX · USA · CAN)
// Typo : Barlow Condensed 700 (display) · Outfit (données)

const D_C = {
  bg: "#FBF7EF", card: "#FFFFFF", ink: "#1A1A1A", sub: "#75716A", line: "#E8E2D4",
  green: "#0E7C3F", blue: "#1D4ED8", red: "#D7263D"
};

function DTriStripe({ height }) {
  const h = height || 6;
  return (
    <div style={{ display: "flex", height: h, borderRadius: h / 2, overflow: "hidden" }}>
      <span style={{ flex: 1, background: D_C.green }}></span>
      <span style={{ flex: 1, background: D_C.blue }}></span>
      <span style={{ flex: 1, background: D_C.red }}></span>
    </div>
  );
}

function DDelta({ d, onColor }) {
  if (d === 0) return <span style={{ color: onColor ? "rgba(255,255,255,0.7)" : D_C.sub, fontSize: 13, fontWeight: 600 }}>—</span>;
  const pos = d > 0;
  const col = onColor ? "#FFFFFF" : (pos ? D_C.green : D_C.red);
  return (
    <span style={{
      color: col, fontSize: 13.5, fontWeight: 700,
      background: onColor ? "rgba(255,255,255,0.18)" : "transparent",
      borderRadius: 4, padding: onColor ? "2px 8px" : 0
    }}>{pos ? "+" : "−"}{Math.abs(d)} pts {pos ? "▲" : "▼"}</span>
  );
}

function DAvatar({ name, hue, size, onColor }) {
  const s = size || 40;
  const initials = name.split(" ").map(function (w) { return w[0]; }).join("").replace(".", "");
  return (
    <div style={{
      width: s, height: s, borderRadius: "50%", flexShrink: 0,
      background: onColor ? "rgba(255,255,255,0.22)" : "oklch(0.90 0.06 " + hue + ")",
      color: onColor ? "#FFFFFF" : "oklch(0.40 0.10 " + hue + ")",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: s * 0.36, fontWeight: 700,
      border: onColor ? "2px solid rgba(255,255,255,0.5)" : "none"
    }}>{initials}</div>
  );
}

function DPodiumCard({ p, place }) {
  const colors = { 1: D_C.green, 2: D_C.blue, 3: D_C.red };
  const isFirst = place === 1;
  return (
    <div style={{
      flex: isFirst ? 1.2 : 1, background: colors[place], color: "#FFFFFF",
      borderRadius: 16, padding: isFirst ? "30px 30px 26px" : "24px 26px 22px",
      marginTop: isFirst ? 0 : 28, position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column", gap: 12
    }}>
      <div style={{
        position: "absolute", right: -10, bottom: -34,
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontStyle: "italic",
        fontSize: 170, lineHeight: 1, color: "rgba(255,255,255,0.14)"
      }}>{place}</div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16,
        letterSpacing: "0.2em", opacity: 0.85
      }}>{isFirst ? "★ LEADER" : place + "ᵉ PLACE"}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <DAvatar name={p.name} hue={p.hue} size={isFirst ? 62 : 50} onColor={true} />
        <div>
          <div style={{ fontSize: isFirst ? 19 : 16.5, fontWeight: 700 }}>{p.name}</div>
          <div style={{ marginTop: 5 }}><DDelta d={p.delta} onColor={true} /></div>
        </div>
      </div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontStyle: "italic",
        fontSize: isFirst ? 72 : 54, lineHeight: 0.95
      }}>{p.points}<span style={{ fontSize: 20, fontStyle: "normal", letterSpacing: "0.1em", marginLeft: 8, opacity: 0.8 }}>PTS</span></div>
    </div>
  );
}

function DMatchCard({ m, idx }) {
  const colors = [D_C.green, D_C.blue, D_C.red];
  const c = colors[idx % 3];
  return (
    <div style={{
      flex: 1, background: D_C.card, border: "1px solid " + D_C.line,
      borderTop: "4px solid " + c, borderRadius: 12,
      padding: "13px 15px", display: "flex", flexDirection: "column", gap: 9, minWidth: 0
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: D_C.sub }}>
        <span style={{ fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: c }}>{m.stage}</span>
        <span>{m.date}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 24, color: D_C.ink }}>{m.home}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: D_C.sub }}>{m.time}</span>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 24, color: D_C.ink }}>{m.away}</span>
      </div>
      <div style={{ fontSize: 10.5, color: D_C.sub, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.venue}</div>
    </div>
  );
}

function OptionD() {
  const D = window.JDE_DATA;
  const top3 = D.participants.slice(0, 3);
  const rest = D.participants.slice(3);
  return (
    <div data-screen-label="Option D — Trois nations" style={{
      width: 1280, background: D_C.bg, color: D_C.ink,
      fontFamily: "'Outfit', sans-serif", paddingBottom: 48
    }}>
      {/* Nav */}
      <div style={{ padding: "0 48px", background: D_C.card, borderBottom: "1px solid " + D_C.line }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32, height: 64 }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22,
            letterSpacing: "0.06em", textTransform: "uppercase"
          }}>Jeu de l'Entraîneur</span>
          <div style={{ display: "flex", gap: 24, fontSize: 14, fontWeight: 600, color: D_C.sub }}>
            <span style={{ color: D_C.ink, borderBottom: "3px solid " + D_C.ink, paddingBottom: 19, marginBottom: -22 }}>Classement</span>
            <span>Équipes</span><span>Stats</span><span>Calendrier</span>
          </div>
          <span style={{ marginLeft: "auto", fontSize: 12.5, color: D_C.sub }}>Mise à jour {D.updatedAt}</span>
        </div>
        <DTriStripe height={5} />
      </div>

      {/* Header */}
      <div style={{ padding: "42px 48px 0", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {["MEXIQUE", "ÉTATS-UNIS", "CANADA"].map(function (n, i) {
              return <span key={n} style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
                color: [D_C.green, D_C.blue, D_C.red][i],
                border: "1.5px solid currentColor", borderRadius: 4, padding: "3px 8px"
              }}>{n}</span>;
            })}
          </div>
          <h1 style={{
            margin: "12px 0 0", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            fontSize: 68, lineHeight: 0.95, textTransform: "uppercase", letterSpacing: "0.01em"
          }}>Classement<br />général</h1>
          <div style={{ marginTop: 10, fontSize: 15, color: D_C.sub }}>{D.matchday} · 14 participants</div>
        </div>
        <div style={{
          background: D_C.card, border: "1px solid " + D_C.line, borderRadius: 14,
          padding: "16px 26px", textAlign: "center"
        }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 42, lineHeight: 1 }}>{D.pot}</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: D_C.sub, textTransform: "uppercase", marginTop: 4 }}>Cagnotte</div>
          <div style={{ marginTop: 10 }}><DTriStripe height={4} /></div>
        </div>
      </div>

      {/* Podium */}
      <div style={{ display: "flex", gap: 18, padding: "32px 48px 0", alignItems: "stretch" }}>
        <DPodiumCard p={top3[1]} place={2} />
        <DPodiumCard p={top3[0]} place={1} />
        <DPodiumCard p={top3[2]} place={3} />
      </div>

      {/* Tableau */}
      <div style={{ padding: "32px 48px 0" }}>
        <div style={{ background: D_C.card, border: "1px solid " + D_C.line, borderRadius: 16, overflow: "hidden" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "64px 1fr 150px 110px",
            padding: "14px 28px", borderBottom: "2px solid " + D_C.ink,
            fontSize: 11.5, fontWeight: 700, letterSpacing: "0.12em", color: D_C.sub, textTransform: "uppercase"
          }}>
            <span>#</span><span>Participant</span><span style={{ textAlign: "right" }}>Évolution</span><span style={{ textAlign: "right" }}>Points</span>
          </div>
          {rest.map(function (p) {
            return (
              <div key={p.rank} style={{
                display: "grid", gridTemplateColumns: "64px 1fr 150px 110px",
                alignItems: "center", padding: "12px 28px",
                background: p.rank % 2 === 0 ? "#FDFBF5" : D_C.card,
                borderBottom: p.rank === 14 ? "none" : "1px solid #F0EBDF"
              }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontStyle: "italic", fontSize: 22, color: D_C.sub }}>{p.rank}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  <DAvatar name={p.name} hue={p.hue} size={36} />
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</span>
                </span>
                <span style={{ textAlign: "right" }}><DDelta d={p.delta} /></span>
                <span style={{
                  textAlign: "right", fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700, fontStyle: "italic", fontSize: 26
                }}>{p.points}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Prochains matchs */}
      <div style={{ padding: "34px 48px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14 }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 28,
            textTransform: "uppercase", letterSpacing: "0.02em"
          }}>Prochains matchs</span>
          <span style={{ fontSize: 12.5, color: D_C.sub, fontWeight: 600, marginLeft: "auto" }}>Calendrier complet →</span>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {D.matches.map(function (m, i) { return <DMatchCard key={i} m={m} idx={i} />; })}
        </div>
      </div>
    </div>
  );
}

window.OptionD = OptionD;
