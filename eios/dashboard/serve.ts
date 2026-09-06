// Static server for the built dashboard. Unknown paths fall back to
// index.html so client-side routing keeps working.
const DIST = "./dist";
const PORT = Number(Bun.env.PORT ?? 5173);

Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  async fetch(request) {
    const { pathname } = new URL(request.url);
    const candidate = pathname === "/" ? "/index.html" : pathname;

    let file = Bun.file(DIST + candidate);
    if (!(await file.exists())) file = Bun.file(DIST + "/index.html");

    return new Response(file);
  },
});

console.log(`dashboard listening on ${PORT}`);
