// "Prism": a soft, liquid 3D shape that slowly breathes, turns and leans towards the pointer. It floats in the night
// band at the top of inner pages and behind the contact panel. Plain WebGL (one fragment shader that ray-marches a
// wobbly sphere), no libraries. Without WebGL, or when the visitor prefers reduced motion, the CSS glow behind it
// (main.css, .prism-host) stays on its own and nothing moves.
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var hosts = document.querySelectorAll(".page-head, .prism-host");
  if (!hosts.length) return;

  var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FS = [
    "precision mediump float;",
    "uniform vec2 r;uniform float t;uniform vec2 m;uniform float seed;",
    "mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}",
    "float map(vec3 q){",
    "  q.xz*=rot(t*.18+m.x*.9+seed);q.yz*=rot(t*.12+m.y*.6);",
    "  float d=sin(q.x*2.3+t*.9+seed)*sin(q.y*2.0+t*1.1)*sin(q.z*2.5+t*.7)*.2+sin(q.y*4.5+t*1.5)*.025;",
    "  return length(q)-1.+d;}",
    "vec3 pal(float x){x=1.-abs(1.-2.*fract(x*.5));",
    "  vec3 a=vec3(.20,.15,.40),b=vec3(.47,.39,.88),c=vec3(.30,.70,.66),e=vec3(.95,.74,.60);",
    "  if(x<.33)return mix(a,b,x/.33);if(x<.66)return mix(b,c,(x-.33)/.33);return mix(c,e,(x-.66)/.34);}",
    "void main(){",
    "  vec2 uv=(gl_FragCoord.xy*2.-r)/min(r.x,r.y);",
    "  vec3 ro=vec3(0.,0.,3.4),rd=normalize(vec3(uv,-1.9));",
    "  float d=0.,h;bool hit=false;",
    "  for(int i=0;i<56;i++){h=map(ro+rd*d);if(h<.002){hit=true;break;}d+=h*.8;if(d>6.)break;}",
    "  if(!hit){gl_FragColor=vec4(0.);return;}",
    "  vec3 q=ro+rd*d;vec2 e=vec2(.002,0.);",
    "  vec3 n=normalize(vec3(map(q+e.xyy)-map(q-e.xyy),map(q+e.yxy)-map(q-e.yxy),map(q+e.yyx)-map(q-e.yyx)));",
    "  float fr=pow(1.-max(dot(n,-rd),0.),2.2);",
    "  vec3 col=pal(fr*.9+n.y*.3+n.x*.15+t*.04+seed);",
    "  col=mix(col*.32,col,.35+fr*.9);",
    "  col+=vec3(1.)*pow(max(dot(reflect(rd,n),normalize(vec3(.4,.7,.6))),0.),28.)*.65;",
    "  gl_FragColor=vec4(col,1.);}"
  ].join("\n");

  function make(host, i) {
    var c = document.createElement("canvas");
    c.className = "prism";
    c.setAttribute("aria-hidden", "true");
    var gl = c.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: true });
    if (!gl) return null;
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
    var v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, FS);
    if (!v || !f) return null;
    var pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uR = gl.getUniformLocation(pr, "r"), uT = gl.getUniformLocation(pr, "t"), uM = gl.getUniformLocation(pr, "m");
    gl.uniform1f(gl.getUniformLocation(pr, "seed"), i * 1.7 + (location.pathname.length % 7) * .4);
    host.classList.add("has-prism");
    host.insertBefore(c, host.firstChild);
    var st = { c: c, gl: gl, host: host, on: false, raf: 0, mx: 0, my: 0, tx: 0, ty: 0, t0: performance.now() - Math.random() * 8000 };
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5), b = c.getBoundingClientRect();
      c.width = Math.max(1, Math.round(b.width * dpr)); c.height = Math.max(1, Math.round(b.height * dpr));
      gl.viewport(0, 0, c.width, c.height); gl.uniform2f(uR, c.width, c.height);
    }
    function frame() {
      st.mx += (st.tx - st.mx) * .05; st.my += (st.ty - st.my) * .05;
      gl.uniform1f(uT, (performance.now() - st.t0) / 1000); gl.uniform2f(uM, st.mx, st.my);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      st.raf = requestAnimationFrame(frame);
    }
    st.start = function () { if (st.on) return; st.on = true; size(); st.raf = requestAnimationFrame(frame); };
    st.stop = function () { st.on = false; cancelAnimationFrame(st.raf); };
    st.size = size;
    host.addEventListener("pointermove", function (e) { var b = host.getBoundingClientRect(); st.tx = (e.clientX - b.left) / b.width - .5; st.ty = (e.clientY - b.top) / b.height - .5; });
    return st;
  }

  var all = [];
  hosts.forEach(function (h, i) { var s = make(h, i); if (s) all.push(s); });
  if (!all.length) return;
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (en) {
    en.forEach(function (e) { var s = all.filter(function (x) { return x.host === e.target; })[0]; if (!s) return; s.vis = e.isIntersecting; if (s.vis && !document.hidden) s.start(); else s.stop(); });
  }) : null;
  all.forEach(function (s) { if (io) io.observe(s.host); else s.start(); });
  document.addEventListener("visibilitychange", function () { all.forEach(function (s) { if (document.hidden) s.stop(); else if (s.vis) s.start(); }); });
  window.addEventListener("resize", function () { all.forEach(function (s) { if (s.on) s.size(); }); });
})();
