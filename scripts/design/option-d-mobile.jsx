// Option D Mobile — Leaderboard 390px (iPhone) · thème light & dark
// Typo : Barlow Condensed 700 (display) · Outfit (données)

const DM_THEMES = {
  light: {
    bg: "#FBF7EF", card: "#FFFFFF", ink: "#1A1A1A", sub: "#75716A", line: "#E8E2D4",
    green: "#0E7C3F", blue: "#1D4ED8", red: "#D7263D",
    podiumGreen: "#0E7C3F", podiumBlue: "#1D4ED8", podiumRed: "#D7263D",
    deltaPos: "#0E7C3F", deltaNeg: "#D7263D", zebra: "#FDFBF5"
  },
  dark: {
    bg: "#14120E", card: "#1E1B15", ink: "#F2EEE6", sub: "#9C9486", line: "#2E2A21",
    green: "#1FA45B", blue: "#4D7CE8", red: "#E04A57",
    podiumGreen: "#157F45", podiumBlue: "#3A5FCC", podiumRed: "#C53B49",
    deltaPos: "#3DD68C", deltaNeg: "#F0606C", zebra: "#211E17"
  }
};

function DMTriStripe({ T, height }) {
  const h = height || 5;
  return (
    <div style={{ display: "flex", height: h }}>
      <span style={{ flex: 1, background: T.green }}></span>
      <span style={{ flex: 1, background: T.blue }}></span>
      <span style={{ flex: 1, background: T.red }}></span>
    </div>
  );
}

function DMDelta({ T, d, onColor }) {
  if (d === 0) return <span style={{ color: onColor ? "rgba(255,255,255,0.7)" : T.sub, fontSize: 12, fontWeight: 600 }}>—</span>;
  const pos = d > 0;
  const col = onColor ? "#FFFFFF" : (pos ? T.deltaPos : T.deltaNeg);
  return (
    <span style={{
      color: col, fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap",
      background: onColor ? "rgba(255,255,255,0.18)" : "transparent",
      borderRadius: 4, padding: onColor ? "2px 7px" : 0
    }}>{pos ? "+" : "−"}{Math.abs(d)} {pos ? "▲" : "▼"}</span>
  );
}

function DMAvatar({ name, hue, size, onColor }) {
  const s = size || 36;
  const initials = name.split(" ").map(function (w) { return w[0]; }).join("").replace(".", "");
  return (
    <div style={{
      width: s, height: s, borderRadius: "50%", flexShrink: 0,
      background: onColor ? "rgba(255,255,255,0.22)" : "oklch(0.88 0.06 " + hue + ")",
      color: onColor ? "#FFFFFF" : "oklch(0.40 0.10 " + hue + ")",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: s * 0.36, fontWeight: 700,
      border: onColor ? "2px solid rgba(255,255,255,0.5)" : "none"
    }}>{initials}</div>
  );
}

function DMPodiumCard({ T, p, place }) {
  const colors = { 1: T.podiumGreen, 2: T.podiumBlue, 3: T.podiumRed };
  const isFirst = place === 1;
  return (
    <div style={{
      background: colors[place], color: "#FFFFFF", borderRadius: 14,
      padding: isFirst ? "18px 18px 16px" : "13px 16px",
      position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center", gap: 13
    }}>
      <div style={{
        position: "absolute", right: -6, bottom: -26,
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontStyle: "italic",
        fontSize: isFirst ? 110 : 84, lineHeight: 1, color: "rgba(255,255,255,0.14)"
      }}>{place}</div>
      <DMAvatar name={p.name} hue={p.hue} size={isFirst ? 52 : 42} onColor={true} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12,
          letterSpacing: "0.18em", opacity: 0.85
        }}>{isFirst ? "★ LEADER" : place + "ᵉ PLACE"}</div>
        <div style={{ fontSize: isFirst ? 17 : 15, fontWeight: 700, marginTop: 2 }}>{p.name}</div>
        <div style={{ marginTop: 4 }}><DMDelta T={T} d={p.delta} onColor={true} /></div>
      </div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontStyle: "italic",
        fontSize: isFirst ? 46 : 36, lineHeight: 1, zIndex: 1
      }}>{p.points}<div style={{
        fontSize: 11, fontStyle: "normal", letterSpacing: "0.14em", opacity: 0.8, textAlign: "right", marginTop: 2
      }}>PTS</div></div>
    </div>
  );
}

function DMMatchCard({ T, m, idx }) {
  const c = [T.green, T.blue, T.red][idx % 3];
  return (
    <div style={{
      background: T.card, border: "1px solid " + T.line, borderLeft: "4px solid " + c,
      borderRadius: 10, padding: "11px 14px",
      display: "flex", alignItems: "center", gap: 12
    }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 17,
        color: T.ink, width: 50, textAlign: "center", flexShrink: 0
      }}>{m.time}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 19, color: T.ink }}>{m.home}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: T.sub }}>vs</span>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 19, color: T.ink }}>{m.away}</span>
          <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", color: c, textTransform: "uppercase" }}>{m.stage}</span>
        </div>
        <div style={{ fontSize: 10.5, color: T.sub, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {m.date} · {m.venue}
        </div>
      </div>
    </div>
  );
}

function OptionDMobile({ dark }) {
  const T = DM_THEMES[dark ? "dark" : "light"];
  const D = window.JDE_DATA;
  const top3 = D.participants.slice(0, 3);
  const rest = D.participants.slice(3);
  return (
    <div data-screen-label={"Option D Mobile — " + (dark ? "Dark" : "Light")} style={{
      width: 390, background: T.bg, color: T.ink,
      fontFamily: "'Outfit', sans-serif", paddingBottom: 34
    }}>
      {/* Nav compacte */}
      <div style={{ background: T.card, borderBottom: "1px solid " + T.line }}>
        <div style={{ display: "flex", alignItems: "center", height: 54, padding: "0 18px" }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 19,
            letterSpacing: "0.05em", textTransform: "uppercase"
          }}>Jeu de l'Entraîneur</span>
          <span style={{
            marginLeft: "auto", display: "flex", flexDirection: "column", gap: 4, padding: 6
          }}>
            <span style={{ width: 20, height: 2, background: T.ink, borderRadius: 1 }}></span>
            <span style={{ width: 20, height: 2, background: T.ink, borderRadius: 1 }}></span>
            <span style={{ width: 14, height: 2, background: T.ink, borderRadius: 1 }}></span>
          </span>
        </div>
        <DMTriStripe T={T} height={4} />
      </div>

      {/* Header */}
      <div style={{ padding: "22px 18px 0" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["MEX", "USA", "CAN"].map(function (n, i) {
            return <span key={n} style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
              color: [T.green, T.blue, T.red][i],
              border: "1.5px solid currentColor", borderRadius: 4, padding: "2px 6px"
            }}>{n}</span>;
          })}
        </div>
        <h1 style={{
          margin: "10px 0 0", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
          fontSize: 42, lineHeight: 0.95, textTransform: "uppercase"
        }}>Classement</h1>
        <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
          <span style={{ fontSize: 12.5, color: T.sub }}>{D.matchday}</span>
          <span style={{
            marginLeft: "auto", fontSize: 12, fontWeight: 700,
            background: T.card, border: "1px solid " + T.line, borderRadius: 999, padding: "4px 12px"
          }}>Cagnotte <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14 }}>{D.pot}</span></span>
        </div>
      </div>

      {/* Podium en colonne */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "18px 18px 0" }}>
        <DMPodiumCard T={T} p={top3[0]} place={1} />
        <DMPodiumCard T={T} p={top3[1]} place={2} />
        <DMPodiumCard T={T} p={top3[2]} place={3} />
      </div>

      {/* Tableau compact */}
      <div style={{ padding: "20px 18px 0" }}>
        <div style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "34px 1fr 64px 52px",
            padding: "10px 14px", borderBottom: "2px solid " + T.ink,
            fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: T.sub, textTransform: "uppercase"
          }}>
            <span>#</span><span>Participant</span><span style={{ textAlign: "right" }}>Évol.</span><span style={{ textAlign: "right" }}>Pts</span>
          </div>
          {rest.map(function (p) {
            return (
              <div key={p.rank} style={{
                display: "grid", gridTemplateColumns: "34px 1fr 64px 52px",
                alignItems: "center", padding: "9px 14px",
                background: p.rank % 2 === 0 ? T.zebra : T.card,
                borderBottom: p.rank === 14 ? "none" : "1px solid " + T.line
              }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontStyle: "italic", fontSize: 17, color: T.sub }}>{p.rank}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                  <DMAvatar name={p.name} hue={p.hue} size={28} />
                  <span style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                </span>
                <span style={{ textAlign: "right" }}><DMDelta T={T} d={p.delta} /></span>
                <span style={{
                  textAlign: "right", fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700, fontStyle: "italic", fontSize: 19
                }}>{p.points}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Prochains matchs */}
      <div style={{ padding: "24px 18px 0" }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 21,
          textTransform: "uppercase", marginBottom: 10
        }}>Prochains matchs</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {D.matches.slice(0, 4).map(function (m, i) { return <DMMatchCard key={i} T={T} m={m} idx={i} />; })}
        </div>
        <div style={{ fontSize: 12, color: T.sub, fontWeight: 600, textAlign: "center", marginTop: 12 }}>
          Calendrier complet →
        </div>
      </div>
    </div>
  );
}

window.OptionDMobile = OptionDMobile;
