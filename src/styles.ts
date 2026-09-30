/** Scoped styles. Blinko's Tailwind is precompiled, so plugin UI can't rely on utility classes. */
export const CSS = `
#cf-root{--cf-accent:#f97316;--cf-line:rgba(128,128,128,.28);--cf-soft:rgba(128,128,128,.07);
  width:100%;max-width:880px;margin:0 auto;padding:16px 20px 56px;box-sizing:border-box;font-size:14px;line-height:1.5;position:relative;z-index:1}
#cf-root *{box-sizing:border-box}
#cf-root h1{font-size:24px;font-weight:800;margin:0;display:flex;align-items:center;gap:10px}
#cf-root h2{font-size:15px;font-weight:700;margin:0 0 10px}
#cf-root .cf-sub{opacity:.65;margin:2px 0 18px}
#cf-root .cf-card{border:1px solid var(--cf-line);background:var(--cf-soft);border-radius:16px;padding:16px 18px;margin-bottom:16px}
#cf-root .cf-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
#cf-root .cf-grow{flex:1 1 0;min-width:0}
#cf-root .cf-muted{opacity:.6;font-size:12px}
#cf-root .cf-err{color:#ef4444;margin:8px 0}
#cf-root button{font:inherit;cursor:pointer;color:inherit}
#cf-root button:disabled{opacity:.5;cursor:default}
#cf-root .cf-btn{background:var(--cf-accent);color:#fff;border:0;border-radius:10px;padding:9px 16px;font-weight:600}
#cf-root .cf-btn.ghost{background:transparent;color:inherit;border:1px solid var(--cf-line);font-weight:500}
#cf-root .cf-link{background:none;border:0;padding:0;text-decoration:underline;opacity:.75}
#cf-root input[type=text],#cf-root textarea,#cf-root select{width:100%;font:inherit;color:inherit;background:transparent;
  border:1px solid var(--cf-line);border-radius:10px;padding:9px 12px;outline:none}
#cf-root select{width:auto}
#cf-root textarea{min-height:84px;resize:vertical}
#cf-root input:focus,#cf-root textarea:focus,#cf-root select:focus{border-color:var(--cf-accent)}
#cf-root label.cf-lbl{display:block;font-weight:600;margin:0 0 6px}
#cf-root .cf-field{margin-bottom:16px}
#cf-root .cf-chips{display:flex;flex-wrap:wrap;gap:8px}
#cf-root .cf-chip{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:84px;padding:8px 10px;border-radius:12px;
  border:1px solid var(--cf-line);background:transparent;transition:transform .08s}
#cf-root .cf-chip:hover{transform:translateY(-1px)}
#cf-root .cf-chip .e{font-size:26px;line-height:1.1}
#cf-root .cf-chip .l{font-size:12px}
#cf-root .cf-chip.on{border-color:var(--cf-accent);background:rgba(249,115,22,.16);font-weight:700}
#cf-root .cf-status{display:flex;align-items:center;gap:12px;flex:1 1 240px;border:1px solid var(--cf-line);border-radius:14px;padding:12px 14px}
#cf-root .cf-status .ic{font-size:28px}
#cf-root .cf-done{color:#22c55e;font-weight:700}
#cf-root .cf-item{display:flex;gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--cf-line)}
#cf-root .cf-item:first-of-type{border-top:0}
#cf-root .cf-item .em{font-size:24px;width:34px;text-align:center}
#cf-root .cf-item .tx{flex:1;min-width:0}
#cf-root .cf-item .tx div{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#cf-root .cf-badge{font-size:11px;border:1px solid var(--cf-line);border-radius:999px;padding:1px 8px;margin-left:6px;opacity:.8}
#cf-root .cf-out{white-space:pre-wrap;border:1px solid var(--cf-line);border-radius:12px;padding:14px;max-height:55vh;overflow:auto}
#cf-root .cf-bar{height:8px;border-radius:4px;background:rgba(128,128,128,.25);overflow:hidden;width:110px}
#cf-root .cf-bar>div{height:100%;background:var(--cf-accent)}
#cf-root .cf-goalrow{display:flex;align-items:center;gap:10px;padding:3px 0}
#cf-root .cf-check{display:flex;align-items:center;gap:8px;padding:3px 0}
#cf-root .cf-check input{width:auto}
#cf-root .cf-quote{border-left:3px solid var(--cf-accent);padding:4px 12px;margin:0 0 4px;white-space:pre-wrap}
#cf-root .cf-foot{position:sticky;bottom:0;padding:12px 0;display:flex;gap:10px;background:linear-gradient(transparent,var(--cf-bg,rgba(128,128,128,.0)))}
#cf-root .cf-strip{display:flex;gap:6px;overflow-x:auto;padding:4px 0 8px}
#cf-root .cf-strip div{display:flex;flex-direction:column;align-items:center;font-size:11px;opacity:.9;min-width:34px}
#cf-root .cf-strip .em{font-size:20px}
`;
