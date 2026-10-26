/* ==========================================================================
   MULTIFOTOS DE OAXACA · app.js
   Estructura:
     1. Utilidades
     2. Núcleo (funciona aunque GSAP no cargue): papel picado, pétalos, menú, formulario
     3. Movimiento (GSAP + ScrollTrigger + Lenis): loader, hero, secciones con scroll
   Reglas de movimiento: solo transform/opacity/clip-path, nada de listeners de
   "scroll" (se usa ScrollTrigger/Lenis), todo se pausa fuera de pantalla y
   se desactiva con prefers-reduced-motion.
   ========================================================================== */
(function () {
    'use strict';

    /* ---------------------------------------------------------------------
       1. UTILIDADES
       --------------------------------------------------------------------- */
    const root = document.documentElement;
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
    const WA_NUMBER = '5219514788075';

    const rand = (a, b) => Math.random() * (b - a) + a;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

    /** Parte un elemento en palabras (<span.w><span.wi>) respetando etiquetas internas como <em>. */
    function splitWords(el) {
        const words = [];
        const label = el.textContent.trim().replace(/\s+/g, ' ');
        const walk = (node) => {
            Array.from(node.childNodes).forEach((child) => {
                if (child.nodeType === 3) {
                    const frag = document.createDocumentFragment();
                    child.textContent.split(/(\s+)/).forEach((part) => {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                        const w = document.createElement('span');
                        w.className = 'w';
                        w.setAttribute('aria-hidden', 'true');
                        const i = document.createElement('span');
                        i.className = 'wi';
                        i.textContent = part;
                        w.appendChild(i);
                        frag.appendChild(w);
                        words.push(i);
                    });
                    node.replaceChild(frag, child);
                } else if (child.nodeType === 1) {
                    walk(child);
                }
            });
        };
        walk(el);
        el.setAttribute('aria-label', label);
        return words;
    }

    /* ---------------------------------------------------------------------
       2. NÚCLEO
       --------------------------------------------------------------------- */

    /* ---- 2.1 Papel picado: banderines generados con máscaras SVG ---- */
    const FLAG_SHAPES = [
        // Rombos, círculos y borde en dientes de sierra
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 80' preserveAspectRatio='none'><path fill-rule='evenodd' d='M0 0H100V66L90 78L80 66L70 78L60 66L50 78L40 66L30 78L20 66L10 78L0 66Z M50 10L64 26L50 42L36 26Z M50 19L57 26L50 33L43 26Z M12 12a6 6 0 1 0 12 0a6 6 0 1 0-12 0Z M76 12a6 6 0 1 0 12 0a6 6 0 1 0-12 0Z M44 54a6 6 0 1 0 12 0a6 6 0 1 0-12 0Z'/></svg>",
        // Flor de cuatro pétalos y borde ondulado
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 80' preserveAspectRatio='none'><path fill-rule='evenodd' d='M0 0H100V62a10 10 0 0 1-20 0a10 10 0 0 1-20 0a10 10 0 0 1-20 0a10 10 0 0 1-20 0a10 10 0 0 1-20 0Z M50 24a6 6 0 1 0 0 12a6 6 0 1 0 0-12Z M50 12a5 5 0 1 0 0 10a5 5 0 1 0 0-10Z M50 38a5 5 0 1 0 0 10a5 5 0 1 0 0-10Z M33 25a5 5 0 1 0 0 10a5 5 0 1 0 0-10Z M67 25a5 5 0 1 0 0 10a5 5 0 1 0 0-10Z M12 10a4 4 0 1 0 8 0a4 4 0 1 0-8 0Z M80 10a4 4 0 1 0 8 0a4 4 0 1 0-8 0Z'/></svg>",
        // Sol concéntrico con flecos
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 80' preserveAspectRatio='none'><path fill-rule='evenodd' d='M0 0H100V68L95 80L90 68L85 80L80 68L75 80L70 68L65 80L60 68L55 80L50 68L45 80L40 68L35 80L30 68L25 80L20 68L15 80L10 68L5 80L0 68Z M50 14a19 19 0 1 0 0 38a19 19 0 1 0 0-38Z M50 22a11 11 0 1 0 0 22a11 11 0 1 0 0-22Z M50 30a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7Z M10 8L16 14L10 20L4 14Z M90 8L96 14L90 20L84 14Z M10 48L16 54L10 60L4 54Z M90 48L96 54L90 60L84 54Z'/></svg>"
    ].map((svg) => 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")');

    const PAPEL = {
        hero:   { sag: 18, step: 64, wMin: 44, wMax: 58, colors: ['#FFBE1A', '#12B5A6', '#FFF1D8', '#FF6A1F', '#FF8FC7', '#2B2570'] },
        loader: { sag: 26, step: 78, wMin: 54, wMax: 70, colors: ['#FFBE1A', '#12B5A6', '#FFF1D8', '#FF6A1F', '#D90E78', '#FF8FC7'] },
        fiesta: { sag: 38, step: 98, wMin: 70, wMax: 92, colors: ['#FFBE1A', '#12B5A6', '#FFF1D8', '#FF6A1F', '#D90E78', '#FF8FC7'] }
    };

    function buildPapel(el) {
        const cfg = PAPEL[el.dataset.papel];
        const w = el.clientWidth;
        if (!cfg || !w) return;
        const NS = 'http://www.w3.org/2000/svg';
        const ctrl = cfg.sag * 2;
        const n = Math.max(4, Math.round(w / cfg.step));

        el.textContent = '';
        const line = document.createElement('div');
        line.className = 'pp-line';

        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('class', 'pp-string');
        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + (ctrl + 4));
        svg.setAttribute('width', w);
        svg.setAttribute('height', ctrl + 4);
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', 'M0 2Q' + (w / 2) + ' ' + (ctrl + 2) + ' ' + w + ' 2');
        svg.appendChild(path);
        line.appendChild(svg);

        for (let i = 0; i < n; i++) {
            const t = (i + 0.5) / n;
            const x = t * w;
            const y = 2 + 2 * t * (1 - t) * ctrl;
            const slope = (2 * ctrl * (1 - 2 * t)) / w;
            const fw = rand(cfg.wMin, cfg.wMax);
            const flag = document.createElement('span');
            flag.className = 'flag';
            flag.style.left = (x - fw / 2).toFixed(1) + 'px';
            flag.style.top = y.toFixed(1) + 'px';
            flag.style.rotate = (Math.atan(slope) * 180 / Math.PI).toFixed(2) + 'deg';
            flag.style.setProperty('--w', fw.toFixed(0) + 'px');
            flag.style.setProperty('--c', cfg.colors[i % cfg.colors.length]);
            flag.style.setProperty('--m', FLAG_SHAPES[(i + Math.floor(rand(0, 3))) % FLAG_SHAPES.length]);
            flag.style.setProperty('--dur', rand(2.6, 4.6).toFixed(2) + 's');
            flag.style.setProperty('--dl', (-rand(0, 4)).toFixed(2) + 's');
            line.appendChild(flag);
        }
        el.appendChild(line);
        el.dataset.builtW = w;
    }

    function initPapel() {
        $$('[data-papel]').forEach((el) => {
            buildPapel(el);
            if (!('ResizeObserver' in window)) return;
            let timer;
            new ResizeObserver(() => {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    if (Math.abs(el.clientWidth - Number(el.dataset.builtW || 0)) > 24) buildPapel(el);
                }, 200);
            }).observe(el);
        });
    }

    /* ---- 2.2 Pétalos de cempasúchil (canvas, se pausa fuera de pantalla) ---- */
    class Petals {
        constructor(canvas, opts) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.colors = opts.colors;
            this.base = opts.count;
            this.list = [];
            this.running = false;
            this.mouse = { x: -999, y: -999 };
            this.frame = 0;
            this.last = 0;
            this.resize();

            if ('ResizeObserver' in window) new ResizeObserver(() => this.resize()).observe(canvas);
            if ('IntersectionObserver' in window) {
                new IntersectionObserver((entries) => {
                    entries[0].isIntersecting ? this.start() : this.stop();
                }, { threshold: 0 }).observe(canvas);
            } else {
                this.start();
            }
            document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.start()));

            const host = canvas.closest('section') || canvas.parentElement;
            host.addEventListener('pointermove', (e) => {
                const r = canvas.getBoundingClientRect();
                this.mouse.x = e.clientX - r.left;
                this.mouse.y = e.clientY - r.top;
            }, { passive: true });
            host.addEventListener('pointerleave', () => { this.mouse.x = this.mouse.y = -999; });
        }

        resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.w = this.canvas.clientWidth;
            this.h = this.canvas.clientHeight;
            if (!this.w || !this.h) return;
            this.canvas.width = Math.round(this.w * dpr);
            this.canvas.height = Math.round(this.h * dpr);
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const target = Math.round(this.base * clamp(this.w / 1100, 0.5, 1.2));
            while (this.list.length < target) this.list.push(this.spawn(true));
            this.list.length = Math.min(this.list.length, target);
        }

        spawn(anywhere) {
            return {
                x: rand(0, this.w || 800),
                y: anywhere ? rand(0, this.h || 600) : rand(-40, -10),
                s: rand(6, 15),
                vy: rand(22, 58),
                vx: rand(-10, 16),
                rot: rand(0, Math.PI * 2),
                vr: rand(-1.4, 1.4),
                ph: rand(0, Math.PI * 2),
                sw: rand(0.6, 1.6),
                sa: rand(8, 26),
                flip: rand(0, Math.PI * 2),
                c: pick(this.colors)
            };
        }

        start() {
            if (this.running || reduce) return;
            this.running = true;
            this.last = performance.now();
            const loop = (now) => {
                if (!this.running) return;
                this.step(Math.min((now - this.last) / 1000, 0.05));
                this.last = now;
                this.frame = requestAnimationFrame(loop);
            };
            this.frame = requestAnimationFrame(loop);
        }

        stop() {
            this.running = false;
            cancelAnimationFrame(this.frame);
        }

        step(dt) {
            const { ctx, w, h, mouse } = this;
            ctx.clearRect(0, 0, w, h);
            for (let i = 0; i < this.list.length; i++) {
                const p = this.list[i];
                p.ph += p.sw * dt;
                p.flip += 2.2 * dt;
                p.rot += p.vr * dt;
                p.y += p.vy * dt;
                p.x += (p.vx + Math.sin(p.ph) * p.sa) * dt;

                // el cursor aparta los pétalos
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < 14400) {
                    const d = Math.sqrt(d2) || 1;
                    const f = (1 - d / 120) * 140 * dt;
                    p.x += (dx / d) * f;
                    p.y += (dy / d) * f;
                }

                if (p.y > h + 30 || p.x < -40 || p.x > w + 40) {
                    this.list[i] = this.spawn(false);
                    continue;
                }
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.scale(0.4 + 0.6 * Math.abs(Math.cos(p.flip)), 1);
                ctx.fillStyle = p.c;
                const s = p.s;
                ctx.beginPath();
                ctx.moveTo(0, -s);
                ctx.bezierCurveTo(s * 0.95, -s * 0.45, s * 0.75, s * 0.7, 0, s);
                ctx.bezierCurveTo(-s * 0.75, s * 0.7, -s * 0.95, -s * 0.45, 0, -s);
                ctx.fill();
                ctx.restore();
            }
        }
    }

    function initPetals() {
        if (reduce) return;
        const hero = $('#petals-hero');
        const contact = $('#petals-contact');
        if (hero) new Petals(hero, { count: 46, colors: ['#FFBE1A', '#FF6A1F', '#FFF1D8', '#FFD25C', '#12B5A6', '#A01B35'] });
        if (contact) new Petals(contact, { count: 40, colors: ['#FFBE1A', '#FF6A1F', '#FFF1D8', '#FFD25C', '#FF8FC7'] });
    }

    /* ---- 2.3 Menú móvil ---- */
    let lenis = null;
    let menuOpen = false;
    const nav = $('#nav');
    const burger = $('#burger');
    const menu = $('#menu');

    function setMenu(open) {
        if (!burger || !menu) return;
        menuOpen = open;
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
        menu.classList.toggle('is-open', open);
        menu.setAttribute('aria-hidden', String(!open));
        root.classList.toggle('menu-open', open);
        if (open && nav) nav.classList.remove('is-hidden');
        if (lenis) (open ? lenis.stop() : lenis.start());
        else root.style.overflow = open ? 'hidden' : '';
    }

    function initMenu() {
        if (!burger || !menu) return;
        burger.addEventListener('click', () => setMenu(!menuOpen));
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });
        window.matchMedia('(min-width: 980px)').addEventListener('change', (e) => { if (e.matches && menuOpen) setMenu(false); });
    }

    /* ---- 2.4 Anclas internas (con Lenis si existe) ---- */
    function initAnchors() {
        document.addEventListener('click', (e) => {
            const a = e.target.closest('a[href^="#"]');
            if (!a) return;
            const id = a.getAttribute('href');
            if (id.length < 2) return;
            const target = $(id);
            if (!target) return;
            e.preventDefault();
            if (menuOpen) setMenu(false);
            if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.7 });
            else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
        });
    }

    /* ---- 2.5 Formulario -> WhatsApp ---- */
    function initForm() {
        const form = $('#wa-form');
        if (!form) return;
        const note = $('#form-note');
        const fields = {
            nombre: { el: $('#f-nombre'), err: $('#e-nombre'), msg: 'Cuéntanos tu nombre para saludarte.' },
            servicio: { el: $('#f-servicio'), err: $('#e-servicio'), msg: 'Elige qué necesitas para orientarte mejor.' }
        };
        const validate = (key) => {
            const f = fields[key];
            const ok = f.el.value.trim() !== '';
            f.el.closest('.field').classList.toggle('has-error', !ok);
            f.el.setAttribute('aria-invalid', String(!ok));
            f.err.textContent = ok ? '' : f.msg;
            return ok;
        };
        Object.keys(fields).forEach((k) => {
            fields[k].el.addEventListener('input', () => validate(k));
            fields[k].el.addEventListener('change', () => validate(k));
        });
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const valid = Object.keys(fields).map(validate).every(Boolean);
            if (!valid) {
                const first = Object.keys(fields).find((k) => fields[k].el.getAttribute('aria-invalid') === 'true');
                if (first) fields[first].el.focus();
                return;
            }
            const nombre = fields.nombre.el.value.trim();
            const servicio = fields.servicio.el.value;
            const extra = $('#f-mensaje').value.trim();
            const text = 'Hola, soy ' + nombre + '. Me interesa: ' + servicio + '.' + (extra ? ' ' + extra : '');
            const a = document.createElement('a');
            a.href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(text);
            a.target = '_blank';
            a.rel = 'noopener';
            document.body.appendChild(a);
            a.click();
            a.remove();
            note.textContent = '¡Listo! Abriendo WhatsApp con tu mensaje.';
            note.classList.add('is-ok');
        });
    }

    /* ---- 2.6 Globo del botón flotante ---- */
    function initWaTip() {
        const wa = $('#wa-float');
        if (!wa) return;
        setTimeout(() => {
            wa.classList.add('show-tip');
            setTimeout(() => wa.classList.remove('show-tip'), 6500);
        }, 9000);
    }

    /* ---- 2.7 Preguntas frecuentes (sin GSAP: <details> nativo) ---- */
    function initFaq() {
        const items = $$('.qa');
        if (!items.length) return;
        const close = (d) => {
            const body = $('.qa-body', d);
            if (!hasGsap || reduce) { d.open = false; return; }
            gsap.to(body, {
                height: 0, duration: 0.5, ease: 'power3.inOut',
                onComplete: () => { d.open = false; gsap.set(body, { clearProps: 'height' }); }
            });
        };
        items.forEach((d) => {
            const sum = $('summary', d);
            const body = $('.qa-body', d);
            sum.addEventListener('click', (e) => {
                e.preventDefault();
                if (d.open) { close(d); return; }
                items.forEach((o) => { if (o !== d && o.open) close(o); });
                d.open = true;
                if (!hasGsap || reduce) return;
                gsap.fromTo(body, { height: 0 }, {
                    height: 'auto', duration: 0.6, ease: 'power3.out',
                    onComplete: () => { gsap.set(body, { clearProps: 'height' }); window.ScrollTrigger && ScrollTrigger.refresh(); }
                });
            });
        });
    }

    /* ---------------------------------------------------------------------
       3. MOVIMIENTO
       --------------------------------------------------------------------- */

    /* ---- 3.1 Loader: obturador que se abre como un iris ---- */
    function runLoader() {
        return new Promise((resolve) => {
            const loader = $('#loader');
            if (!loader) { resolve(); return; }
            const num = $('#ld-num');
            const arc = $('.ld-arc');
            const flower = $('.ld-flower');
            const C = 2 * Math.PI * 64;
            const state = { p: 0 };
            let loaded = document.readyState === 'complete';
            window.addEventListener('load', () => { loaded = true; }, { once: true });

            arc.style.strokeDasharray = C;
            arc.style.strokeDashoffset = C;
            const render = () => {
                num.textContent = Math.round(state.p);
                arc.style.strokeDashoffset = C * (1 - state.p / 100);
            };

            gsap.fromTo(flower, { scale: 0.5 }, { scale: 1, duration: 1.6, ease: 'elastic.out(1,.55)' });
            gsap.to(flower, { rotation: 360, duration: 2.6, ease: 'none', repeat: -1 });
            gsap.fromTo('.ld-papel .pp-line', { yPercent: -120 }, { yPercent: 0, duration: 1.4, ease: 'elastic.out(1,.7)' });

            const exit = () => {
                const tl = gsap.timeline({
                    onComplete: () => { loader.remove(); root.classList.remove('is-loading'); }
                });
                tl.to('.ld-count, .ld-text', { y: -18, opacity: 0, duration: 0.35, ease: 'power2.in' })
                    .to(flower, { scale: 1.3, duration: 0.5, ease: 'power2.in' }, '<')
                    .to('.ld-papel', { opacity: 0, duration: 0.3 }, '<')
                    .to(loader, { '--r': '112%', duration: 1.15, ease: 'power3.inOut' }, '-=0.1')
                    .add(resolve, '-=0.7');
            };

            gsap.to(state, {
                p: 88, duration: 1.7, ease: 'power1.out', onUpdate: render,
                onComplete: () => {
                    const ready = new Promise((r) => {
                        const t0 = performance.now();
                        const iv = setInterval(() => {
                            if (loaded || performance.now() - t0 > 4500) { clearInterval(iv); r(); }
                        }, 60);
                    });
                    const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
                    Promise.race([Promise.all([ready, fonts]), new Promise((r) => setTimeout(r, 5000))]).then(() => {
                        gsap.to(state, { p: 100, duration: 0.55, ease: 'power2.out', onUpdate: render, onComplete: exit });
                    });
                }
            });
        });
    }

    /* ---- 3.2 Scroll suave ---- */
    function initSmoothScroll() {
        if (typeof window.Lenis === 'undefined') return;
        lenis = new Lenis({
            duration: 1.15,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true
        });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
        lenis.stop();
    }

    /* ---- 3.3 Navegación: se esconde al bajar, resalta la sección activa ---- */
    function initNavMotion() {
        ScrollTrigger.create({
            start: 0, end: 'max',
            onUpdate: (self) => {
                if (menuOpen || !nav) return;
                nav.classList.toggle('is-hidden', self.direction === 1 && self.scroll() > 260);
            }
        });
        gsap.to('.progress i', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.2 } });
    }

    /** Resalta el enlace de la sección visible. Se crea al final: debe medir después de los "pin". */
    function initNavActive() {
        $$('.nav-links a').forEach((link) => {
            const section = $(link.getAttribute('href'));
            if (!section) return;
            ScrollTrigger.create({
                trigger: section, start: 'top 55%', end: 'bottom 55%',
                onToggle: (self) => link.classList.toggle('is-active', self.isActive)
            });
        });
    }

    /* ---- 3.4 Hero ---- */
    function initHero() {
        const title = $('.hero-title');
        const words = splitWords(title);
        gsap.set(words, { yPercent: 118 });
        title.style.visibility = 'visible';
        gsap.set('.hl', { '--hlx': 0 });
        gsap.set(['.pill-label', '.hero-sub', '.hero-ctas'], { opacity: 0, y: 26 });
        gsap.set('.hv-sun .sunburst', { scale: 0.4, opacity: 0 });
        gsap.set('.hv-flower', { opacity: 0, scale: 0.6 });
        gsap.set('.hv .arch', { clipPath: 'inset(100% 0% 0% 0%)' });
        gsap.set('.hv .arch img', { scale: 1.45 });
        const archReveal = { from: 'inset(100% 0% 0% 0%)', to: 'inset(0% 0% 0% 0%)' };
        gsap.set('.polaroid', { y: 90, opacity: 0 });
        gsap.set('.hv .seal', { scale: 0 });
        gsap.set('.pp--hero .pp-line', { yPercent: -140 });

        return function play() {
            const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
            tl.to('.pp--hero .pp-line', { yPercent: 0, duration: 1.6, ease: 'elastic.out(1,.65)' }, 0)
                .to('.pill-label', { opacity: 1, y: 0, duration: 0.9 }, 0.15)
                .to(words, { yPercent: 0, duration: 1.15, stagger: 0.07 }, 0.25)
                .to('.hl', { '--hlx': 1, duration: 0.9, ease: 'power3.inOut' }, 0.95)
                .to('.hero-sub', { opacity: 1, y: 0, duration: 0.9 }, 0.75)
                .to('.hero-ctas', { opacity: 1, y: 0, duration: 0.9 }, 0.9)
                .to('.hv-sun .sunburst', { scale: 1, opacity: 1, duration: 1.7, ease: 'expo.out' }, 0.1)
                .to('.hv-flower', { opacity: 0.17, scale: 1, duration: 2, ease: 'expo.out' }, 0.2)
                .fromTo('.hv .arch', { clipPath: archReveal.from }, { clipPath: archReveal.to, duration: 1.3, stagger: 0.14, ease: 'power4.inOut' }, 0.35)
                .to('.hv .arch img', { scale: 1, duration: 1.8, stagger: 0.14 }, 0.35)
                .to('.polaroid', { y: 0, opacity: 1, duration: 1.2 }, 0.95)
                .to('.hv .seal', { scale: 1, duration: 1.2, ease: 'back.out(2.2)' }, 1.15)
                .add(() => { heroLoops(); }, 1.4);
        };
    }

    /** Bucles del hero: visor de la cámara + parallax con el cursor. Se pausan fuera de pantalla. */
    function heroLoops() {
        const focus = $('.vf .focus');
        const corners = $$('.vf .c');
        const flash = $('.flash');
        if (focus) {
            const tl = gsap.timeline({ repeat: -1, repeatDelay: 3.2, delay: 0.6 });
            tl.set(focus, { opacity: 1, scale: 2.8, borderColor: '#FFF1D8' })
                .to(focus, { scale: 1, duration: 0.95, ease: 'power3.out' })
                .to(focus, { borderColor: '#FFBE1A', duration: 0.1 })
                .to(focus, { scale: 0.9, duration: 0.09, yoyo: true, repeat: 1 })
                .to(corners, { scale: 1.1, duration: 0.14, yoyo: true, repeat: 1, stagger: 0.02 }, '<')
                .to(flash, { opacity: 0.5, duration: 0.05 })
                .to(flash, { opacity: 0, duration: 0.55, ease: 'power2.out' })
                .to(focus, { opacity: 0, duration: 0.4 }, '<');
            ScrollTrigger.create({ trigger: '.hero', start: 'top bottom', end: 'bottom top', onToggle: (s) => tl.paused(!s.isActive) });
        }

        if (!canHover) return;
        const hero = $('.hero');
        const items = $$('[data-depth]', hero).map((el) => ({
            xTo: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3' }),
            yTo: gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3' }),
            d: parseFloat(el.dataset.depth)
        }));
        hero.addEventListener('pointermove', (e) => {
            const nx = e.clientX / window.innerWidth - 0.5;
            const ny = e.clientY / window.innerHeight - 0.5;
            items.forEach((it) => { it.xTo(nx * -it.d * 46); it.yTo(ny * -it.d * 36); });
        });
    }

    function initHeroScroll() {
        gsap.to('.hero-copy', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
        gsap.to('.hv', { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    }

    /* ---- 3.5 Marquee: acelera y cambia de sentido con el scroll ---- */
    function initMarquee() {
        const track = $('.marquee-track');
        if (!track) return;
        const loop = gsap.to(track, { xPercent: -50, duration: 36, ease: 'none', repeat: -1 });
        const setScale = gsap.quickTo(loop, 'timeScale', { duration: 0.6, ease: 'power2.out' });
        let timer;
        ScrollTrigger.create({
            start: 0, end: 'max',
            onUpdate: (self) => {
                const boost = Math.min(Math.abs(self.getVelocity()) / 320, 5);
                setScale(self.direction * (1 + boost));
                clearTimeout(timer);
                timer = setTimeout(() => setScale(self.direction), 140);
            }
        });
    }

    /* ---- 3.6 Textos: revelado de titulares y relleno palabra por palabra ---- */
    function initText(scope) {
        if (!scope) return;
        $$('[data-split-lines]', scope).forEach((h) => {
            const words = splitWords(h);
            gsap.set(words, { yPercent: 118 });
            h.style.visibility = 'visible';
            ScrollTrigger.create({
                trigger: h, start: 'top 88%', once: true,
                onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.15, stagger: 0.055, ease: 'power4.out' })
            });
        });

        const fill = $('[data-fill]', scope);
        if (fill) {
            const words = splitWords(fill);
            gsap.to(words, {
                opacity: 1, stagger: 0.12, ease: 'none',
                scrollTrigger: { trigger: fill, start: 'top 82%', end: 'bottom 52%', scrub: true }
            });
        }

        $$('[data-reveal]', scope).forEach((el) => {
            gsap.fromTo(el, { opacity: 0, y: 44 }, {
                opacity: 1, y: 0, duration: 1, ease: 'power3.out',
                scrollTrigger: { trigger: el, start: 'top 90%', once: true }
            });
        });
    }

    /* ---- 3.7 Fiesta: la foto crece desde un arco hasta ocupar toda la pantalla ---- */
    function initFiesta(mm) {
        mm.add({ desk: '(min-width: 800px)', mob: '(max-width: 799px)' }, (ctx) => {
            const desk = ctx.conditions.desk;
            // Recortes de la foto. Siempre con fromTo y valores explícitos en AMBOS extremos
            // (si solo se da el final, Chrome normaliza el inicio a menos valores, GSAP los
            // empareja mal y la foto desaparece o aparece desplazada a mitad del scroll).
            const hidden = 'inset(50% 50% 50% 50% round 999px 999px 999px 999px)';
            const arch = desk
                ? 'inset(14% 31% 14% 31% round 999px 999px 24px 24px)'
                : 'inset(20% 12% 20% 12% round 999px 999px 20px 20px)';
            const full = 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)';

            gsap.set('.fiesta-copy > *', { opacity: 0, y: 40 });

            /* Fase 1: SOLO las letras sobre el fondo turquesa. Entran deslizándose desde los
               lados mientras la sección sube a pantalla y terminan justo cuando se fija. */
            const dirs = [-1, 1, -1];
            const enter = gsap.timeline({
                defaults: { ease: 'power3.out' },
                scrollTrigger: { trigger: '.fiesta', start: 'top 95%', end: 'top top', scrub: 0.5, invalidateOnRefresh: true }
            });
            $$('.fiesta-bgtext span').forEach((el, i) => {
                enter.fromTo(el, { xPercent: dirs[i] * 230, skewX: dirs[i] * -16 }, { xPercent: 0, skewX: 0, duration: 1 }, i * 0.28);
            });

            /* Fase 2 (sección fija): pausa con las letras, la foto nace desde el centro como un
               arco y se abre hasta ocupar toda la pantalla; después aparecen el texto y el botón. */
            const tl = gsap.timeline({
                defaults: { ease: 'none' },
                scrollTrigger: { trigger: '.fiesta', start: 'top top', end: '+=260%', pin: '.fiesta-pin', scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 3 }
            });
            tl.to('.fiesta-bgtext', { scale: 1.06, duration: 1 }, 0)
                // la foto aparece SOLO cuando termina la pausa de las letras
                .fromTo('.fiesta-media', { clipPath: hidden }, { clipPath: arch, ease: 'power2.out', duration: 2 }, 1)
                .fromTo('.fiesta-media img', { scale: 1.5 }, { scale: 1.2, duration: 2 }, 1)
                .fromTo('.fiesta-media', { clipPath: arch }, { clipPath: full, ease: 'power2.inOut', duration: 5, immediateRender: false }, 3)
                .to('.fiesta-media img', { scale: 1, duration: 5 }, 3)
                .to('.fiesta-bgtext span:nth-child(1)', { xPercent: -28, duration: 7 }, 1)
                .to('.fiesta-bgtext span:nth-child(3)', { xPercent: 28, duration: 7 }, 1)
                .to('.fiesta-bgtext', { scale: 1.2, duration: 7 }, 1)
                .to('.fiesta-shade', { opacity: 1, duration: 2.4 }, 6)
                .fromTo('.pp--fiesta .pp-line', { yPercent: -110 }, { yPercent: 0, duration: 2.4 }, 6)
                .to('.pp--fiesta', { opacity: 1, duration: 1.2 }, 6)
                .to('.fiesta-copy > *', { opacity: 1, y: 0, duration: 1.8, stagger: 0.5, ease: 'power2.out' }, 7.2)
                .to({}, { duration: 1.4 });
        });
    }

    /* ---- 3.8 Servicios: cada tarjeta se encoge y se oscurece cuando la siguiente la cubre ---- */
    function initStack(mm) {
        mm.add('(min-width: 900px)', () => {
            const stack = $('.stack');
            const cards = $$('.svc', stack);
            if (cards.length < 2) return;
            gsap.set(cards, { transformOrigin: '50% 0%' });
            let nat = [];
            let vh = window.innerHeight;
            const topOf = (i) => 5.4 * 16 + i * 0.9 * 16;

            const measure = () => {
                vh = window.innerHeight;
                const gap = parseFloat(getComputedStyle(stack).rowGap) || 0;
                nat = [];
                let y = 0;
                cards.forEach((c) => { nat.push(y); y += c.offsetHeight + gap; });
            };
            const apply = (scroll, start) => {
                const d = scroll - start;
                for (let i = 0; i < cards.length - 1; i++) {
                    const next = i + 1;
                    const from = vh * 0.92;
                    const p = clamp((from - (nat[next] - d)) / (from - topOf(next)), 0, 1);
                    gsap.set(cards[i], { scale: 1 - 0.065 * p, '--dim': 0.42 * p });
                }
            };
            ScrollTrigger.create({
                trigger: stack, start: 'top top', end: 'bottom top',
                onRefreshInit: measure,
                onRefresh: (self) => { measure(); apply(self.scroll(), self.start); },
                onUpdate: (self) => apply(self.scroll(), self.start)
            });
            measure();
        });
    }

    /* ---- 3.9 Trabajos: el scroll vertical mueve la tira de negativos y cada foto se "revela" ---- */
    function initStrip(mm) {
        mm.add('(min-width: 900px)', () => {
            const pin = $('.strip-pin');
            const track = $('.strip-track');
            const bar = $('.strip-bar i');
            const dist = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth);

            const move = gsap.to(track, {
                x: () => -dist(), ease: 'none',
                scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 2 }
            });
            gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), scrub: true, invalidateOnRefresh: true } });

            $$('.frame:not(.frame--cta) img', track).forEach((img) => {
                gsap.fromTo(img,
                    { filter: 'grayscale(1) sepia(0.6) brightness(0.8)' },
                    {
                        filter: 'grayscale(0) sepia(0) brightness(1)', ease: 'none',
                        scrollTrigger: { trigger: img.parentElement, containerAnimation: move, start: 'left 92%', end: 'left 48%', scrub: true }
                    });
            });
        });
    }

    /* ---- 3.10 Restauración: una línea de luz revela la foto recuperada ---- */
    function initResto() {
        const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: { trigger: '.resto-pin', start: 'top top', end: '+=140%', pin: true, scrub: 0.6, anticipatePin: 1, refreshPriority: 1 }
        });
        tl.set('.resto-scan', { opacity: 1 }, 0)
            .fromTo('.resto-after', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1 }, 0)
            .fromTo('.resto-scan', { left: '0%' }, { left: '100%', duration: 1 }, 0)
            .to('.resto-scan', { opacity: 0, duration: 0.08 }, 0.92)
            .to('.resto-tag--after', { opacity: 1, duration: 0.15 }, 0.12)
            .to('.resto-tag--before', { opacity: 0, duration: 0.15 }, 0.78)
            .fromTo('.resto-frame', { scale: 0.94, rotate: 1.6 }, { scale: 1, rotate: 0, duration: 1 }, 0)
            .to({}, { duration: 0.25 });
    }

    /* ---- 3.11 Cómo trabajamos: el camino se dibuja con el scroll ---- */
    function initSteps() {
        gsap.fromTo('.steps-line i', { clipPath: 'inset(0 0 100% 0)' }, {
            clipPath: 'inset(0 0 0% 0)', ease: 'none',
            scrollTrigger: { trigger: '.steps-wrap', start: 'top 70%', end: 'bottom 62%', scrub: true }
        });
        $$('.step').forEach((s) => {
            gsap.fromTo($('.step-dot', s), { scale: 0.3, rotation: -120 }, {
                scale: 1, rotation: 0, duration: 0.9, ease: 'back.out(2.4)',
                scrollTrigger: { trigger: s, start: 'top 72%', toggleActions: 'play none none reverse' }
            });
        });
    }

    /* ---- 3.12 Cuidado: capas con parallax ---- */
    function initCuidado() {
        $$('.par').forEach((el) => {
            gsap.fromTo(el, { y: 0 }, {
                y: parseFloat(el.dataset.speed || 0), ease: 'none',
                scrollTrigger: { trigger: '.cuidado', start: 'top bottom', end: 'bottom top', scrub: true }
            });
        });
    }

    /* ---- 3.13 Pie: el nombre sube letra por letra ---- */
    function initFooter() {
        const g = $('.foot-giant');
        if (!g) return;
        const text = g.textContent;
        g.textContent = '';
        const chars = text.split('').map((ch) => {
            const s = document.createElement('span');
            s.className = 'ch';
            s.textContent = ch;
            g.appendChild(s);
            return s;
        });
        gsap.from(chars, {
            yPercent: 115, duration: 1.2, stagger: 0.05, ease: 'power4.out',
            scrollTrigger: { trigger: g, start: 'top 96%', once: true }
        });
    }

    /* ---- 3.14 Botones magnéticos ---- */
    function initMagnetic() {
        if (!canHover) return;
        $$('.magnetic').forEach((el) => {
            const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
            const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                xTo((e.clientX - r.left - r.width / 2) * 0.28);
                yTo((e.clientY - r.top - r.height / 2) * 0.4);
            });
            el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
        });
    }

    /* ---- Arranque del movimiento ---- */
    function startMotion() {
        window.__mf = true;
        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ ignoreMobileResize: true });
        root.classList.add('is-loading');

        initSmoothScroll();
        const playHero = initHero();
        const mm = gsap.matchMedia();

        // Se crean en el orden del documento (y los "pin" llevan refreshPriority) para que
        // cada trigger se mida con el espacio que añaden los pines que tiene encima.
        initNavMotion();
        initHeroScroll();
        initMarquee();
        initText($('#por-que'));
        initFiesta(mm);
        initText($('#servicios'));
        initStack(mm);
        initStrip(mm);
        initResto();
        initText($('#como-trabajamos'));
        initSteps();
        initText($('#cuidado'));
        initCuidado();
        initText($('#preguntas'));
        initText($('#contacto'));
        initFooter();
        initNavActive();
        initMagnetic();

        runLoader().then(() => {
            playHero();
            if (lenis) lenis.start();
            initWaTip();
            ScrollTrigger.refresh();
        });

        const refresh = () => ScrollTrigger.refresh();
        window.addEventListener('load', refresh);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    }

    /* ---------------------------------------------------------------------
       ARRANQUE
       --------------------------------------------------------------------- */
    initPapel();
    initPetals();
    initMenu();
    initAnchors();
    initForm();
    initFaq();

    if (hasGsap && !reduce) {
        startMotion();
    } else {
        // Sin GSAP o con movimiento reducido: la página se muestra completa y estática
        window.__mf = true;
        root.classList.remove('js', 'is-loading');
        const loader = $('#loader');
        if (loader) loader.remove();
        initWaTip();
    }
})();
