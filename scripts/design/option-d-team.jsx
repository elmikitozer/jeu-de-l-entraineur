// Option D — Page Équipe · formation 4-3-3 visuelle · thème light & dark
// Typo : Barlow Condensed 700 (display) · Outfit (données)

const DT_THEMES = {
  light: {
    bg: "#FBF7EF", card: "#FFFFFF", ink: "#1A1A1A", sub: "#75716A", line: "#E8E2D4",
    green: "#0E7C3F", blue: "#1D4ED8", red: "#D7263D",
    pitchA: "#2F9E5B", pitchB: "#2A9152", pitchLine: "rgba(255,255,255,0.45)",
    deltaPos: "#0E7C3F", live: "#D7263D"
  },
  dark: {
    bg: "#14120E", card: "#1E1B15", ink: "#F2EEE6", sub: "#9C9486", line: "#2E2A21",
    green: "#1FA45B", blue: "#4D7CE8", red: "#E04A57",
    pitchA: "#16482C", pitchB: "#133F27", pitchLine: "rgba(255,255,255,0.30)",
    deltaPos: "#3DD68C", live: "#E04A57"
  }
};

function DTTriStripe({ T, height }) {
  const h = height || 5;
  return (
    <div style={{ display: "flex", height: h, borderRadius: h / 2, overflow: "hidden" }}>
      <span style={{ flex: 1, background: T.green }}></span>
      <span style={{ flex: 1, background: T.blue }}></span>
      <span style={{ flex: 1, background: T.red }}></span>
    </div>
  );
}

function DTAvatar({ name, hue, size, ring }) {
  const s = size || 40;
  const initials = name.split(" ").map(function (w) { return w[0]; }).join("").replace(".", "");
  return (
    <div style={{
      width: s, height: s, borderRadius: "50%", flexShrink: 0,
      background: "oklch(0.88 0.06 " + hue + ")",
      color: "oklch(0.38 0.10 " + hue + ")",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: s * 0.34, fontWeight: 700,
      border: ring ? "2.5px solid rgba(255,255,255,0.9)" : "none",
      boxShadow: ring ? "0 4px 10px rgba(0,0,0,0.3)" : "none"
    }}>{initials}</div>
  );
}

function DTPitchPlayer({ T, pl }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, width: 110, position: "relative" }}>
      {pl.live &&
        <span style={{
          position: "absolute", top: -10, right: 14, zIndex: 2,
          background: T.live, color: "#FFF", borderRadius: 4,
          fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", padding: "2px 6px",
          display: "inline-flex", alignItems: "center", gap: 4
        }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "#FFF" }}></span>LIVE</span>}
      <DTAvatar name={pl.name} hue={pl.hue} size={52} ring={true} />
      <div style={{
        background: "rgba(10,24,16,0.72)", color: "#FFFFFF", borderRadius: 6,
        padding: "3px 9px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
        display: "flex", alignItems: "center", gap: 6
      }}>
        {pl.name}
        <span style={{ fontSize: 9.5, fontWeight: 700, opacity: 0.75, letterSpacing: "0.06em" }}>{pl.country}</span>
      </div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontStyle: "italic",
        background: "#FFFFFF", color: "#1A1A1A", borderRadius: 5,
        fontSize: 15, padding: "1px 9px", boxShadow: "0 2px 6px rgba(0,0,0,0.25)"
      }}>{pl.points} pts</div>
    </div>
  );
}

function DTPitch({ T }) {
  const lines = window.JDE_TEAM.lines; // Attaque, Milieu, Défense, Gardien
  return (
    <div style={{
      position: "relative", borderRadius: 16, overflow: "hidden",
      background: "repeating-linear-gradient(180deg, " + T.pitchA + " 0 90px, " + T.pitchB + " 90px 180px)",
      border: "1px solid " + T.line,
      padding: "44px 30px 36px",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      minHeight: 700
    }}>
      {/* Marquages */}
      <div style={{ position: "absolute", inset: 18, border: "2px solid " + T.pitchLine, borderRadius: 8, pointerEvents: "none" }}></div>
      <div style={{ position: "absolute", left: 18, right: 18, top: "50%", height: 2, background: T.pitchLine, pointerEvents: "none" }}></div>
      <div style={{
        position: "absolute", left: "50%", top: "50%", width: 120, height: 120,
        border: "2px solid " + T.pitchLine, borderRadius: "50%",
        transform: "translate(-50%, -50%)", pointerEvents: "none"
      }}></div>
      <div style={{
        position: "absolute", left: "50%", bottom: 18, width: 240, height: 86,
        border: "2px solid " + T.pitchLine, borderBottom: "none",
        transform: "translateX(-50%)", pointerEvents: "none"
      }}></div>
      <div style={{
        position: "absolute", left: "50%", top: 18, width: 240, height: 86,
        border: "2px solid " + T.pitchLine, borderTop: "none",
        transform: "translateX(-50%)", pointerEvents: "none"
      }}></div>
      {/* Lignes de joueurs : Attaque en haut → Gardien en bas */}
      {lines.map(function (line) {
        return (
          <div key={line.label} style={{
            display: "flex", justifyContent: "space-evenly", position: "relative", zIndex: 1,
            padding: "0 " + (line.players.length === 4 ? 0 : 40) + "px"
          }}>
            {line.players.map(function (pl) { return <DTPitchPlayer key={pl.name} T={T} pl={pl} />; })}
          </div>
        );
      })}
    </div>
  );
}

function DTRosterRow({ T, pl }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 18px" }}>
      <DTAvatar name={pl.name} hue={pl.hue} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{pl.name}</span>
        {pl.live &&
          <span style={{
            marginLeft: 8, background: T.live, color: "#FFF", borderRadius: 3,
            fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", padding: "1.5px 5px", verticalAlign: "middle"
          }}>LIVE</span>}
        <div style={{ fontSize: 11, color: T.sub, marginTop: 1 }}>{pl.country}</div>
      </div>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontStyle: "italic",
        fontSize: 21, color: T.ink
      }}>{pl.points}</span>
    </div>
  );
}

function OptionDTeam({ dark }) {
  const T = DT_THEMES[dark ? "dark" : "light"];
  const TEAM = window.JDE_TEAM;
  const P = TEAM.participant;
  const lineColors = { "Attaque": T.red, "Milieu": T.blue, "Défense": T.green, "Gardien": T.sub };
  return (
    <div data-screen-label={"Option D Équipe — " + (dark ? "Dark" : "Light")} style={{
      width: 1280, background: T.bg, color: T.ink,
      fontFamily: "'Outfit', sans-serif", paddingBottom: 48
    }}>
      {/* Nav */}
      <div style={{ padding: "0 48px", background: T.card, borderBottom: "1px solid " + T.line }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32, height: 64 }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22,
            letterSpacing: "0.06em", textTransform: "uppercase"
          }}>Jeu de l'Entraîneur</span>
          <div style={{ display: "flex", gap: 24, fontSize: 14, fontWeight: 600, color: T.sub }}>
            <span>Classement</span>
            <span style={{ color: T.ink, borderBottom: "3px solid " + T.ink, paddingBottom: 19, marginBottom: -22 }}>Équipes</span>
            <span>Stats</span><span>Calendrier</span>
          </div>
          <span style={{ marginLeft: "auto", fontSize: 12.5, color: T.sub }}>Mise à jour {window.JDE_DATA.updatedAt}</span>
        </div>
        <DTTriStripe T={T} height={5} />
      </div>

      {/* Header participant */}
      <div style={{ padding: "36px 48px 0" }}>
        <span style={{
          fontSize: 13, fontWeight: 600, color: T.sub,
          border: "1px solid " + T.line, background: T.card, borderRadius: 999, padding: "6px 14px"
        }}>← Classement</span>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <DTAvatar name={P.name} hue={P.hue} size={76} />
            <div>
              <h1 style={{
                margin: 0, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                fontSize: 54, lineHeight: 1, textTransform: "uppercase"
              }}>{P.name}</h1>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <span style={{
                  background: T.green, color: "#FFF", borderRadius: 4,
                  fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", padding: "4px 10px"
                }}>★ 1ᵉʳ AU CLASSEMENT</span>
                <span style={{
                  border: "1px solid " + T.line, background: T.card, color: T.deltaPos, borderRadius: 4,
                  fontSize: 12, fontWeight: 700, padding: "4px 10px"
                }}>+{P.delta} pts hier ▲</span>
                <span style={{
                  border: "1px solid " + T.line, background: T.card, color: T.sub, borderRadius: 4,
                  fontSize: 12, fontWeight: 600, padding: "4px 10px"
                }}>Formation {TEAM.formation}</span>
              </div>
            </div>
          </div>
          <div style={{
            background: T.card, border: "1px solid " + T.line, borderRadius: 14,
            padding: "14px 26px", textAlign: "center"
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontStyle: "italic",
              fontSize: 46, lineHeight: 1
            }}>{P.points}</div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: T.sub, textTransform: "uppercase", marginTop: 3 }}>Points</div>
            <div style={{ marginTop: 9 }}><DTTriStripe T={T} height={4} /></div>
          </div>
        </div>
      </div>

      {/* Terrain + effectif */}
      <div style={{ display: "flex", gap: 26, padding: "30px 48px 0", alignItems: "stretch" }}>
        <div style={{ flex: 1 }}>
          <DTPitch T={T} />
        </div>
        <div style={{ width: 380, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {TEAM.lines.map(function (line) {
            return (
              <div key={line.label} style={{
                background: T.card, border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden"
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 18px", borderBottom: "1px solid " + T.line
                }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: lineColors[line.label] }}></span>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 17,
                    letterSpacing: "0.08em", textTransform: "uppercase"
                  }}>{line.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11.5, color: T.sub, fontWeight: 600 }}>
                    {line.players.reduce(function (s, p) { return s + p.points; }, 0)} pts
                  </span>
                </div>
                {line.players.map(function (pl) { return <DTRosterRow key={pl.name} T={T} pl={pl} />; })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

window.OptionDTeam = OptionDTeam;
