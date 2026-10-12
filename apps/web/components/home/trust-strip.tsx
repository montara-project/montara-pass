const stack = [
  // The Fiber mark is plain black, so it is inverted on the dark theme.
  { src: "fiber.svg", name: "Go · Fiber v3", mono: true },
  { src: "postgresql.svg", name: "PostgreSQL 18" },
  { src: "react.svg", name: "React 19" },
  { src: "authula.png", name: "Authula" },
  { src: "docker.svg", name: "Docker" },
];

export function TrustStrip() {
  return (
    <section className="grid border-t border-line md:grid-cols-[220px_1fr]">
      <p className="border-line px-6 py-5 text-sm font-medium max-md:border-b sm:px-10 md:border-r md:py-7">
        What it runs on.
      </p>
      <ul className="grid grid-cols-2 items-center gap-x-10 gap-y-4 px-6 py-5 sm:flex sm:flex-wrap sm:px-10 md:justify-between md:py-7">
        {stack.map((item) => (
          <li key={item.name} className="flex items-center gap-2.5 text-sm text-mist">
            <span className="flex size-8 items-center justify-center rounded-lg border border-line bg-card">
              <img
                src={`/static/stack/${item.src}`}
                alt=""
                width={20}
                height={20}
                className={`size-5 object-contain ${item.mono ? "invert light:invert-0" : ""}`}
              />
            </span>
            {item.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
