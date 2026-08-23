import { runPull } from "../src/lib/pull/run";

async function main() {
  const result = await runPull();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
