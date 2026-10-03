//#region src/urls.ts
var e = /* @__PURE__ */ new Set([
	"https://econds.github.io/ro_tools_portal/",
	"https://econds.github.io/ro-leveling-map/",
	"https://econds.github.io/ro-best-status/",
	"https://econds.github.io/ro-reform-preparation/",
	"https://econds.github.io/dim_glacier_planner/",
	"https://econds.github.io/sessrumnir-ocean-week-guide/"
]);
function t(t) {
	return typeof t == "string" && e.has(t);
}
//#endregion
//#region src/tool-icons.ts
var n = {
	map: ["M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z", "M9 4v14M15 6v14"],
	anvil: ["M3 7h13a4 4 0 0 1-4 4v3h2v3H6v-3h2v-3a5 5 0 0 1-5-4Z", "M16 7h5M5 20h14"],
	snowflake: ["M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9", "m9.5 5 2.5 2 2.5-2M9.5 19l2.5-2 2.5 2"],
	wave: ["M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0"],
	gem: ["M6 4h12l3 5-9 11L3 9Z", "M3 9h18M9 4 7.5 9 12 20l4.5-11L15 4"]
}, r = (e) => typeof e == "string" && Object.hasOwn(n, e), i = (e) => typeof e == "string" && /^#[0-9a-f]{6}$/.test(e), a = {
	viewBox: "0 0 24 24",
	width: "24",
	height: "24",
	fill: "none",
	stroke: "currentColor",
	"stroke-width": "1.8",
	"stroke-linecap": "round",
	"stroke-linejoin": "round",
	focusable: "false",
	"aria-hidden": "true"
};
function o(e) {
	let t = (t) => {
		let n = parseInt(e.slice(t, t + 2), 16) / 255;
		return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4;
	};
	return 1.05 / (.2126 * t(1) + .7152 * t(3) + .0722 * t(5) + .05);
}
//#endregion
//#region integrations/nav/src/catalog.ts
var s = {
	schemaVersion: 1,
	catalogVersion: "0.2.0",
	tools: [
		{
			id: "leveling-map",
			title: "แผนที่เก็บเลเวล",
			canonicalUrl: "https://econds.github.io/ro-leveling-map/",
			listingStatus: "listed",
			identity: {
				accent: "#2f7a4f",
				icon: "map"
			}
		},
		{
			id: "reform-workshop",
			title: "Reform Workshop",
			canonicalUrl: "https://econds.github.io/ro-reform-preparation/",
			listingStatus: "listed",
			identity: {
				accent: "#9a5b12",
				icon: "anvil"
			}
		},
		{
			id: "dim-glacier",
			title: "Dim Glacier Planner",
			canonicalUrl: "https://econds.github.io/dim_glacier_planner/",
			listingStatus: "listed",
			identity: {
				accent: "#2b6fa3",
				icon: "snowflake"
			}
		},
		{
			id: "ocean-week-guide",
			title: "Sessrumnir Ocean Week",
			canonicalUrl: "https://econds.github.io/sessrumnir-ocean-week-guide/",
			listingStatus: "listed",
			identity: {
				accent: "#0f7686",
				icon: "wave"
			}
		},
		{
			id: "best-status",
			title: "Best Status",
			canonicalUrl: "https://econds.github.io/ro-best-status/",
			listingStatus: "listed",
			identity: {
				accent: "#7047a8",
				icon: "gem"
			}
		},
		{
			id: "grade-refine",
			title: "Grade & Refine Workshop",
			canonicalUrl: null,
			listingStatus: "planned",
			identity: {
				accent: "#636c67",
				icon: "gem"
			}
		}
	]
}, c = (e) => typeof e == "object" && !!e && !Array.isArray(e);
function l(e) {
	if (!c(e) || e.schemaVersion !== 1 || typeof e.catalogVersion != "string" || !e.catalogVersion.length || e.catalogVersion.length > 80 || !Array.isArray(e.tools) || e.tools.length < 1 || e.tools.length > 50) throw Error("Unsupported catalog");
	let n = /* @__PURE__ */ new Set(), a = e.tools.map((e) => {
		if (!c(e) || typeof e.id != "string" || !/^[a-z][a-z0-9-]{0,63}$/.test(e.id) || n.has(e.id) || typeof e.title != "string" || !e.title.trim() || e.title.length > 160 || /[<>\u0000-\u001f]/.test(e.title)) throw Error("Invalid tool");
		if (n.add(e.id), e.listingStatus !== "listed" && e.listingStatus !== "planned") throw Error("Unknown listing status");
		if (e.listingStatus === "listed" ? !t(e.canonicalUrl) : e.canonicalUrl !== null) throw Error("Unsafe launch URL");
		let a;
		if (e.identity !== void 0) {
			let t = e.identity;
			if (!c(t) || !i(t.accent) || o(t.accent) < 4.5 || !r(t.icon)) throw Error("Invalid tool identity");
			a = {
				accent: t.accent,
				icon: t.icon
			};
		}
		return {
			id: e.id,
			title: e.title,
			canonicalUrl: e.canonicalUrl,
			listingStatus: e.listingStatus,
			...a && { identity: a }
		};
	});
	return {
		schemaVersion: 1,
		catalogVersion: e.catalogVersion,
		tools: a
	};
}
async function u(e) {
	if (e !== "https://econds.github.io/ro_tools_portal/catalog/v1/tools.json") throw Error("Unapproved catalog endpoint");
	let t = new AbortController(), n = setTimeout(() => t.abort(), 1500);
	try {
		let n = await fetch(e, {
			signal: t.signal,
			credentials: "omit",
			redirect: "error",
			referrerPolicy: "no-referrer"
		});
		if (!n.ok || n.url !== "https://econds.github.io/ro_tools_portal/catalog/v1/tools.json" || !n.headers.get("content-type")?.includes("application/json") || !n.body) throw Error("Invalid catalog response");
		let r = n.body.getReader(), i = new TextDecoder(), a = "", o = 0;
		try {
			for (;;) {
				let e = await r.read();
				if (e.done) break;
				if (o += e.value.byteLength, o > 32768) throw Error("Oversized catalog");
				a += i.decode(e.value, { stream: !0 });
			}
			return a += i.decode(), l(JSON.parse(a));
		} finally {
			await r.cancel().catch(() => {}), r.releaseLock();
		}
	} finally {
		clearTimeout(n);
	}
}
//#endregion
//#region integrations/nav/src/nav.ts
var d = "\n:host{display:block;position:static;font:14px/1.6 var(--ro-suite-font-family,system-ui,sans-serif);--_ro-nav-bg:#f8fafc;--_ro-nav-ink:#1e293b;--_ro-nav-line:#cbd5e1;--_ro-nav-focus:#075985;--_ro-nav-current:#e2e8f0;--_ro-nav-muted:#475569;--_ro-nav-accent:#0369a1;color-scheme:light;color:var(--ro-suite-text,var(--ro-suite-color,var(--_ro-nav-ink)))}\n@media(prefers-color-scheme:dark){:host(:not([theme=light])){--_ro-nav-bg:#0f172a;--_ro-nav-ink:#f1f5f9;--_ro-nav-line:#475569;--_ro-nav-focus:#7dd3fc;--_ro-nav-current:#1e293b;--_ro-nav-muted:#cbd5e1;--_ro-nav-accent:#7dd3fc;color-scheme:dark}}\n:host([theme=dark]){--_ro-nav-bg:#0f172a;--_ro-nav-ink:#f1f5f9;--_ro-nav-line:#475569;--_ro-nav-focus:#7dd3fc;--_ro-nav-current:#1e293b;--_ro-nav-muted:#cbd5e1;--_ro-nav-accent:#7dd3fc;color-scheme:dark}\n*{box-sizing:border-box}\nnav{font:inherit;background:var(--ro-suite-surface,var(--ro-suite-background,var(--_ro-nav-bg)));color:var(--ro-suite-text,var(--ro-suite-color,var(--_ro-nav-ink)));border:0;border-bottom:1px solid var(--ro-suite-border,var(--_ro-nav-line));border-radius:0}\n.shell{width:100%;max-width:var(--ro-suite-content-max-width,none);margin-inline:auto;padding:4px var(--ro-suite-inline-padding,16px)}\na,button{font:inherit;color:inherit;min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;padding:8px 10px;border-radius:4px}\na{text-underline-offset:3px}\nbutton{background:transparent;color:inherit;border:1px solid var(--ro-suite-border,var(--_ro-nav-line));cursor:pointer;gap:6px;flex:none}\na:focus-visible,button:focus-visible{outline:3px solid var(--ro-suite-focus,var(--_ro-nav-focus));outline-offset:2px}\n.bar{display:flex;align-items:center;gap:12px;min-height:44px;flex-wrap:nowrap}\n.portal{flex:none;white-space:nowrap;text-decoration:none;padding-inline:0;font-weight:600}\n.portal:hover{text-decoration:underline}\nbutton:hover,li a:hover{background:var(--ro-suite-surface-hover,var(--_ro-nav-current))}\n.current{font-weight:600;flex:1 1 0;min-width:0;display:inline-flex;align-items:center;gap:6px}\n.current-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.chip{flex:none;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:3px;background:var(--chip);color:#fff}\n.chip svg{width:14px;height:14px}\n.menu-icon{width:18px;height:18px;flex:none}\nli a,li span{gap:8px}\nul{list-style:none;padding:8px 0 0;margin:4px 0 0;border-top:1px solid var(--ro-suite-border,var(--_ro-nav-line));display:flex;flex-wrap:wrap;gap:4px}\nli{margin:0}\nli span{display:inline-flex;align-items:center;padding:8px 10px;min-height:44px;color:var(--ro-suite-muted,var(--_ro-nav-muted))}\nli .chip{padding:0;min-height:0;color:#fff}\n[aria-current=page]{font-weight:bold;background:var(--ro-suite-surface-hover,var(--_ro-nav-current));box-shadow:inset 2px 0 var(--ro-suite-accent,var(--_ro-nav-accent))}\n.current .chip,[aria-current=page] .chip{background:transparent;color:var(--ro-suite-accent,var(--_ro-nav-accent))}\np{font:inherit;font-size:12px;margin:4px 0;color:var(--ro-suite-muted,var(--_ro-nav-muted))}\np:empty{margin:0}\n[hidden]{display:none!important}\n@media(max-width:480px){.bar{gap:8px}.menu-label{display:none}button{padding:8px;width:44px}ul{display:block}li a{width:100%;justify-content:flex-start}}\n";
function f(e, t) {
	let n = document.createElement("a");
	return n.textContent = e, n.href = t, n;
}
function p(e) {
	if (!e) return null;
	let t = document.createElement("span");
	t.className = "chip", t.setAttribute("aria-hidden", "true"), t.style.setProperty("--chip", e.accent);
	let r = "http://www.w3.org/2000/svg", i = document.createElementNS(r, "svg");
	for (let [e, t] of Object.entries(a)) i.setAttribute(e, t);
	for (let t of n[e.icon]) {
		let e = document.createElementNS(r, "path");
		e.setAttribute("d", t), i.append(e);
	}
	return t.append(i), t;
}
function m(e, t, n) {
	let r = p(t);
	return r && e.append(r), e.append(n), e;
}
var h = class extends HTMLElement {
	connectedCallback() {
		if (!this.shadowRoot) try {
			this.initialize();
		} catch {}
	}
	initialize() {
		let e = l(s), n = this.getAttribute("tool-id"), r = e.tools.find((e) => e.id === n), i = this.getAttribute("portal-url"), a = i === "https://econds.github.io/ro_tools_portal/" && t(i) ? i : "https://econds.github.io/ro_tools_portal/", o = document.createElement("nav");
		o.setAttribute("aria-label", "เครื่องมือ RO");
		let c = document.createElement("div");
		c.className = "shell", o.append(c);
		let h = document.createElement("div");
		h.className = "bar";
		let g = f("RO Tools", a);
		if (g.className = "portal", g.setAttribute("aria-label", "กลับ RO Tools Portal"), h.append(g), c.append(h), r) {
			r.identity && o.style.setProperty("--tool-accent", r.identity.accent);
			let t = document.createElement("span");
			t.className = "current";
			let i = p(r.identity);
			i && t.append(i);
			let a = document.createElement("span");
			a.className = "current-text", a.textContent = r.title, t.append(a), h.append(t);
			let s = document.createElement("button");
			s.type = "button", s.setAttribute("aria-label", "เครื่องมืออื่น");
			let l = document.createElement("span");
			l.className = "menu-label", l.textContent = "เครื่องมืออื่น";
			let d = document.createElementNS("http://www.w3.org/2000/svg", "svg");
			d.classList.add("menu-icon"), d.setAttribute("viewBox", "0 0 24 24"), d.setAttribute("aria-hidden", "true");
			let g = document.createElementNS("http://www.w3.org/2000/svg", "path");
			g.setAttribute("d", "M4 6h16M4 12h16M4 18h16"), g.setAttribute("fill", "none"), g.setAttribute("stroke", "currentColor"), g.setAttribute("stroke-width", "2"), d.append(g), s.append(l, d), s.setAttribute("aria-expanded", "false"), s.setAttribute("aria-controls", "tools");
			let _ = document.createElement("div");
			_.id = "tools", _.hidden = !0;
			let v = document.createElement("ul"), y = document.createElement("p");
			y.setAttribute("role", "status"), _.append(v, y), h.append(s), c.append(_);
			let b = () => {
				let t = e.tools.map((e) => {
					let t = document.createElement("li");
					if (e.listingStatus === "listed" && e.canonicalUrl) {
						let r = m(f("", e.canonicalUrl), e.identity, e.title);
						e.id === n && r.setAttribute("aria-current", "page"), t.append(r);
					} else t.append(m(document.createElement("span"), e.identity, `${e.title} — อยู่ในแผน`));
					return t;
				});
				v.replaceChildren(...t);
			}, x = (e) => {
				_.hidden = !0, s.setAttribute("aria-expanded", "false"), e && s.focus();
			}, S = !1;
			s.addEventListener("click", () => {
				let t = _.hidden;
				_.hidden = !t, s.setAttribute("aria-expanded", String(t));
				let i = this.getAttribute("catalog-url");
				if (t && i && !S) {
					if (S = !0, i !== "https://econds.github.io/ro_tools_portal/catalog/v1/tools.json") {
						y.textContent = "ใช้รายการเครื่องมือที่ติดตั้งไว้";
						return;
					}
					u(i).then((t) => {
						if (!t.tools.some((e) => e.id === n && e.title === r.title)) throw Error("Missing current identity");
						let i = v.querySelector("a:focus")?.getAttribute("href");
						e = {
							...t,
							tools: t.tools.map((t) => t.identity ? t : {
								...t,
								identity: e.tools.find((e) => e.id === t.id)?.identity
							})
						}, b(), i && [...v.querySelectorAll("a")].find((e) => e.href === i)?.focus(), y.textContent = "";
					}).catch(() => {
						y.textContent = "อัปเดตรายการไม่ได้ ใช้รายการที่ติดตั้งไว้";
					});
				}
			}), o.addEventListener("keydown", (e) => {
				e.key === "Escape" && !_.hidden && (e.preventDefault(), x(!0));
			}), o.addEventListener("focusout", (e) => {
				e.relatedTarget instanceof Node && !o.contains(e.relatedTarget) && x(!1);
			}), b();
		}
		let _ = document.createElement("style");
		_.textContent = d, this.attachShadow({ mode: "open" }).append(_, o);
	}
};
customElements.get("ro-suite-nav") || customElements.define("ro-suite-nav", h);
//#endregion
export { h as RoSuiteNav };
