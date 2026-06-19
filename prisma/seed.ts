async function main() {
  console.log("Seed is intentionally empty. HramGo production data must be imported from verified sources, not demo records.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
