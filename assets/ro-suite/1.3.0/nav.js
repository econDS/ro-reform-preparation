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
var d = ":host{display:block;position:static;font:14px/1.6 Tahoma,\"Leelawadee UI\",sans-serif;--bg:#f1f5ed;--ink:#233b2c;--line:#cbd7c7;--button:#fff;--button-line:#becbb9;--focus:#315d45;--current:#dee9d7;--muted:#52604f;color-scheme:light;color:var(--ink)}@media(prefers-color-scheme:dark){:host(:not([theme=light])){--bg:#16211b;--ink:#ecf2e8;--line:#2f3f35;--button:#1b2620;--button-line:#415447;--focus:#b6d7a8;--current:#23342a;--muted:#b3c1b6;color-scheme:dark}}:host([theme=dark]){--bg:#16211b;--ink:#ecf2e8;--line:#2f3f35;--button:#1b2620;--button-line:#415447;--focus:#b6d7a8;--current:#23342a;--muted:#b3c1b6;color-scheme:dark}*{box-sizing:border-box}nav{font:14px/1.6 Tahoma,\"Leelawadee UI\",sans-serif;background:var(--ro-suite-background,var(--bg));color:var(--ro-suite-color,var(--ink));border:1px solid var(--line);border-bottom:3px solid var(--tool-accent,var(--line));border-radius:8px;padding:10px 14px}a,button{font:inherit;color:inherit;min-height:44px;display:inline-flex;align-items:center;padding:8px 12px;border-radius:5px}a{text-underline-offset:3px}button{background:var(--button);color:var(--ink);border:1px solid var(--button-line);cursor:pointer}a:focus-visible,button:focus-visible{outline:3px solid var(--focus);outline-offset:2px}.bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.current{font-weight:bold;flex:1;display:inline-flex;align-items:center;gap:8px}.chip{flex:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:var(--chip);color:#fff}.chip svg{width:18px;height:18px}li a,li span{gap:8px}li .chip{width:22px;height:22px;border-radius:6px;padding:0;min-height:0;color:#fff}li .chip svg{width:14px;height:14px}ul{list-style:none;padding:12px 0 0;margin:10px 0 0;border-top:1px solid var(--line);display:flex;flex-wrap:wrap;gap:6px}li{margin:0}li span{display:inline-flex;align-items:center;padding:8px 12px;min-height:44px;color:var(--muted)}[aria-current=page]{font-weight:bold;background:var(--current)}p{font:12px/1.6 Tahoma,sans-serif;margin:8px 0 0;color:var(--muted)}[hidden]{display:none!important}@media(max-width:480px){nav{padding:8px}.bar{gap:6px}.current{flex-basis:100%;order:3;padding:0 12px}button{margin-left:auto}ul{display:block}li a{width:100%}}";
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
		if (c.className = "bar", c.append(f("กลับ RO Tools Portal", a)), o.append(c), r) {
			r.identity && o.style.setProperty("--tool-accent", r.identity.accent);
			let t = m(document.createElement("span"), r.identity, r.title);
			t.className = "current", c.append(t);
			let i = document.createElement("button");
			i.type = "button", i.textContent = "เครื่องมืออื่น", i.setAttribute("aria-expanded", "false"), i.setAttribute("aria-controls", "tools");
			let a = document.createElement("div");
			a.id = "tools", a.hidden = !0;
			let s = document.createElement("ul"), l = document.createElement("p");
			l.setAttribute("role", "status"), a.append(s, l), c.append(i), o.append(a);
			let d = () => {
				let t = e.tools.map((e) => {
					let t = document.createElement("li");
					if (e.listingStatus === "listed" && e.canonicalUrl) {
						let r = m(f("", e.canonicalUrl), e.identity, e.title);
						e.id === n && r.setAttribute("aria-current", "page"), t.append(r);
					} else t.append(m(document.createElement("span"), e.identity, `${e.title} — อยู่ในแผน`));
					return t;
				});
				s.replaceChildren(...t);
			}, p = (e) => {
				a.hidden = !0, i.setAttribute("aria-expanded", "false"), e && i.focus();
			}, h = !1;
			i.addEventListener("click", () => {
				let t = a.hidden;
				a.hidden = !t, i.setAttribute("aria-expanded", String(t));
				let o = this.getAttribute("catalog-url");
				if (t && o && !h) {
					if (h = !0, o !== "https://econds.github.io/ro_tools_portal/catalog/v1/tools.json") {
						l.textContent = "ใช้รายการเครื่องมือที่ติดตั้งไว้";
						return;
					}
					u(o).then((t) => {
						if (!t.tools.some((e) => e.id === n && e.title === r.title)) throw Error("Missing current identity");
						let i = s.querySelector("a:focus")?.getAttribute("href");
						e = {
							...t,
							tools: t.tools.map((t) => t.identity ? t : {
								...t,
								identity: e.tools.find((e) => e.id === t.id)?.identity
							})
						}, d(), i && [...s.querySelectorAll("a")].find((e) => e.href === i)?.focus(), l.textContent = "";
					}).catch(() => {
						l.textContent = "อัปเดตรายการไม่ได้ ใช้รายการที่ติดตั้งไว้";
					});
				}
			}), o.addEventListener("keydown", (e) => {
				e.key === "Escape" && !a.hidden && (e.preventDefault(), p(!0));
			}), o.addEventListener("focusout", (e) => {
				e.relatedTarget instanceof Node && !o.contains(e.relatedTarget) && p(!1);
			}), d();
		}
		let p = document.createElement("style");
		p.textContent = d, this.attachShadow({ mode: "open" }).append(p, o);
	}
};
customElements.get("ro-suite-nav") || customElements.define("ro-suite-nav", h);
//#endregion
export { h as RoSuiteNav };
