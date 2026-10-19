import "dotenv/config";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { homedir } from "node:os";
import { Service } from "./service.js";
// Reserve stdout for the JSON protocol, including when third-party SDKs log.
const send = (value: unknown) =>
  process.stdout.write(JSON.stringify(value) + "\n");
console.log = (...args) =>
  process.stderr.write(args.map(String).join(" ") + "\n");
console.info = console.log;
const service = new Service(
  process.env.CLINEAR_DATA_DIR ||
    join(homedir(), "Library", "Application Support", "dev.clinear.app"),
  send,
);
const tick = setInterval(
  () =>
    void service.autopilot
      .tick()
      .catch((e) => process.stderr.write(String(e) + "\n")),
  2000,
);
const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
  void (async () => {
    let request: any;
    try {
      request = JSON.parse(line);
      if (typeof request.id !== "string" || typeof request.method !== "string")
        throw Error("Invalid request");
      const result = await service.dispatch(request.method, request.params);
      send({ id: request.id, result });
    } catch (error) {
      send({
        id: request?.id || "",
        error: service.redact(
          error instanceof Error ? error.message : String(error),
        ),
      });
    }
  })();
});
const stop = () => {
  clearInterval(tick);
  service.shutdown();
  setTimeout(() => process.exit(0), 1800);
};
rl.on("close", stop);
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
send({ event: "ready", data: service.snapshot() });
