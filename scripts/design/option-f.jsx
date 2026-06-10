// Option F — « Électrique » · gradient vert émeraude→cyan, cartes blanches, énergie broadcast
// Typo : Space Grotesk (data) · Barlow Condensed italic (chiffres)

const F_C = {
  ink: "#07261B", sub: "#5E7A6E", card: "#FFFFFF",
  lime: "#C8F051", green: "#00B25C", red: "#E0245E", line: "#E4EFE8"
};
const F_BG = "linear-gradient(160deg, #00B25C 0%, #00BC8B 55%, #00B6C2 100%)";

function FDelta({ d }) {
  if (d === 0) return <span style={{ color: F_C.sub, fontSize: 13, fontWeight: 500 }}>—</span>;
  const pos = d > 0;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: pos ? "rgba(0,178,92,0.12)" : "rgba(224,36,94,0.10)",
      color: pos ? F_C.green : F_C.red,
      borderRadius: 999, padding: "3px 10px", fontSize: 13, fontWeight: 700
    }}>{pos ? "↑" : "↓"} {pos ? "+" : "−"}{Math.abs(d)}</span>
  );
}

function FAvatar({ name, hue, size }) {
  const s = size || 40;
  const initials = name.split(" ").map(function (w) { return w[0]; }).join("").replace(".", "");
  return (
    <div style={{
      width: s, height: s, borderRadius: 12, flexShrink: 0,
      background: "oklch(0.92 0.06 " + hue + ")",
      color: "oklch(0.40 0.10 " + hue + ")",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: s * 0.36, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif"
    }}>{initials}</div>
  );
}

function FPodiumCard({ p, place }) {
  const isFirst = place === 1;
  return (
    <div style={{
      flex: isFirst ? 1.15 : 1, background: F_C.card, borderRadius: 18,
      border: isFirst ? "3px solid " + F_C.lime : "none",
      boxShadow: isFirst ? "0 16px 40px rgba(0,40,25,0.30)" : "0 10px 28px rgba(0,40,25,0.20)",
      padding: isFirst ? "26px 28px 24px" : "22px 24px 20px",
      marginTop: isFirst ? 0 : 30,
      display: "flex", flexDirection: "column", gap: 13, position: "relative"
    }}>
      {isFirst &&
        <div style={{
          position: "absolute", top: -16, right: 22, background: F_C.lime, color: F_C.ink,
          borderRadius: 999, fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 12.5, fontWeight: 700, letterSpacing: "0.08em", padding: "5px 14px"
        }}>LEADER</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontStyle: "italic",
          fontSize: 38, lineHeight: 1, color: isFirst ? F_C.green : "#B8CCC1"
        }}>{"0" + place}</span>
        <FAvatar name={p.name} hue={p.hue} size={isFirst ? 56 : 46} />
        <div>
          <div style={{ fontSize: isFirst ? 17.5 : 15.5, fontWeight: 700, color: F_C.ink, fontFamily: "'Space Grotesk', sans-serif" }}>{p.name}</div>
          <div style={{ marginTop: 4 }}><FDelta d={p.delta} /></div>
        </div>
      </div>
      <div style={{
        display: "flex", alignItems: "baseline", gap: 8,
        borderTop: "1px solid " + F_C.line, paddingTop: 12
      }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontStyle: "italic",
          fontSize: isFirst ? 58 : 46, lineHeight: 1, color: F_C.ink
        }}>{p.points}</span>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", color: F_C.sub, fontFamily: "'Space Grotesk', sans-serif" }}>PTS</span>
        {isFirst && <span style={{ marginLeft: "auto", width: 34, height: 8, background: F_C.lime, borderRadius: 999 }}></span>}
      </div>
    </div>
  );
}

function FMatchChip({ m }) {
  return (
    <div style={{
      flex: 1, background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.35)",
      backdropFilter: "blur(6px)", borderRadius: 14, color: "#FFFFFF",
      padding: "13px 15px", display: "flex", flexDirection: "column", gap: 9, minWidth: 0
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.85 }}>
        <span style={{ fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{m.stage}</span>
        <span>{m.date}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontStyle: "italic", fontSize: 25 }}>{m.home}</span>
        <span style={{
          background: F_C.lime, color: F_C.ink, borderRadius: 999,
          fontSize: 12, fontWeight: 700, padding: "2px 9px", fontFamily: "'Space Grotesk', sans-serif"
        }}>{m.time}</span>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontStyle: "italic", fontSize: 25 }}>{m.away}</span>
      </div>
      <div style={{ fontSize: 10.5, opacity: 0.8, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.venue}</div>
    </div>
  );
}

function OptionF() {
  const D = window.JDE_DATA;
  const top3 = D.participants.slice(0, 3);
  const rest = D.participants.slice(3);
  return (
    <div data-screen-label="Option F — Électrique" style={{
      width: 1280, background: F_BG, color: "#FFFFFF",
      fontFamily: "'Space Grotesk', sans-serif", paddingBottom: 48
    }}>
      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 30, padding: "0 48px", height: 66 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <span style={{
            background: F_C.lime, color: F_C.ink, borderRadius: 8, fontWeight: 700, fontSize: 14, padding: "4px 9px"
          }}>JE</span>
          <span style={{ fontWeight: 700, fontSize: 17 }}>Jeu de l'Entraîneur</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["Classement", "Équipes", "Stats", "Calendrier"].map(function (t, i) {
            return <span key={t} style={{
              fontSize: 13.5, fontWeight: 600, padding: "7px 15px", borderRadius: 999,
              background: i === 0 ? "rgba(255,255,255,0.95)" : "transparent",
              color: i === 0 ? F_C.ink : "rgba(255,255,255,0.85)"
            }}>{t}</span>;
          })}
        </div>
        <span style={{ marginLeft: "auto", fontSize: 12.5, opacity: 0.9, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: F_C.lime }}></span>
          Mise à jour {D.updatedAt}
        </span>
      </div>

      {/* Header */}
      <div style={{ padding: "36px 48px 0", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: F_C.lime }}>
            Coupe du Monde 2026
          </div>
          <h1 style={{
            margin: "8px 0 0", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            fontStyle: "italic", textTransform: "uppercase", fontSize: 66, lineHeight: 0.95
          }}>Classement</h1>
          <div style={{ marginTop: 10, fontSize: 15, opacity: 0.9 }}>{D.matchday} · 14 coachs en course</div>
        </div>
        <div style={{
          background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.35)",
          borderRadius: 16, padding: "14px 24px", textAlign: "center", backdropFilter: "blur(6px)"
        }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontStyle: "italic", fontSize: 38, lineHeight: 1 }}>{D.pot}</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", opacity: 0.85, marginTop: 4 }}>CAGNOTTE</div>
        </div>
      </div>

      {/* Podium */}
      <div style={{ display: "flex", gap: 18, padding: "34px 48px 0", alignItems: "stretch" }}>
        <FPodiumCard p={top3[1]} place={2} />
        <FPodiumCard p={top3[0]} place={1} />
        <FPodiumCard p={top3[2]} place={3} />
      </div>

      {/* Tableau */}
      <div style={{ padding: "30px 48px 0" }}>
        <div style={{
          background: F_C.card, borderRadius: 18, overflow: "hidden",
          boxShadow: "0 14px 36px rgba(0,40,25,0.25)", color: F_C.ink
        }}>
          <div style={{
            display: "grid", gridTemplateColumns: "64px 1fr 280px 130px 100px",
            padding: "14px 26px", borderBottom: "1px solid " + F_C.line,
            fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: F_C.sub, textTransform: "uppercase"
          }}>
            <span>#</span><span>Coach</span><span>Progression</span>
            <span style={{ textAlign: "right" }}>Évolution</span><span style={{ textAlign: "right" }}>Points</span>
          </div>
          {rest.map(function (p) {
            const maxPts = window.JDE_DATA.participants[0].points;
            return (
              <div key={p.rank} style={{
                display: "grid", gridTemplateColumns: "64px 1fr 280px 130px 100px",
                alignItems: "center", padding: "11px 26px",
                borderBottom: p.rank === 14 ? "none" : "1px solid #F0F6F2"
              }}>
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontStyle: "italic",
                  fontSize: 22, color: F_C.sub
                }}>{p.rank}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  <FAvatar name={p.name} hue={p.hue} size={36} />
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</span>
                </span>
                <span style={{ paddingRight: 30 }}>
                  <span style={{ display: "block", height: 6, borderRadius: 999, background: "#EDF4EF" }}>
                    <span style={{
                      display: "block", height: 6, borderRadius: 999,
                      width: Math.round(p.points / maxPts * 100) + "%",
                      background: "linear-gradient(90deg, " + F_C.green + ", " + F_C.lime + ")"
                    }}></span>
                  </span>
                </span>
                <span style={{ textAlign: "right" }}><FDelta d={p.delta} /></span>
                <span style={{
                  textAlign: "right", fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700, fontStyle: "italic", fontSize: 25
                }}>{p.points}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Prochains matchs */}
      <div style={{ padding: "32px 48px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", marginBottom: 13 }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontStyle: "italic",
            textTransform: "uppercase", fontSize: 27
          }}>Prochains matchs</span>
          <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 600, opacity: 0.9 }}>Calendrier complet →</span>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {D.matches.map(function (m, i) { return <FMatchChip key={i} m={m} />; })}
        </div>
      </div>
    </div>
  );
}

window.OptionF = OptionF;
