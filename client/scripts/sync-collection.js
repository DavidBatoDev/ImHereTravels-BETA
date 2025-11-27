#!/usr/bin/env node
/**
 * Sync a single Firestore collection between two projects (dev <-> prod)
 * Usage examples:
 *  node scripts/sync-collection.js --collection=tourPackages --from=prod --to=dev --dry-run
 *  node scripts/sync-collection.js --collection=bookings --srcKey=./keys/prod-project-service-account.json --destKey=./keys/dev-project-service-account.json
 *
 * Supported options:
 *  --collection  : collection name to sync (required)
 *  --from        : 'prod' or 'dev' (source alias)
 *  --to          : 'prod' or 'dev' (destination alias)
 *  --srcKey      : path to source service account JSON (overrides alias)
 *  --destKey     : path to destination service account JSON (overrides alias)
 *  --preserve-ids: true|false (default: true) - keep same document IDs in destination
 *  --delete-extra: true|false (default: false) - delete destination docs not present in source
 *  --dry-run     : true|false (default: true) - when true, don't write to destination
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (!arg.startsWith("--")) continue;
    const parts = arg.slice(2).split("=");
    const key = parts[0];
    const val = parts.length > 1 ? parts.slice(1).join("=") : "true";
    // Normalize hyphenated keys to camelCase (e.g. dry-run -> dryRun)
    const camelKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    args[key] = val;
    args[camelKey] = val;
  }
  return args;
}

function pathIfExists(p) {
  if (!p) return null;
  try {
    const resolved = path.resolve(p);
    if (fs.existsSync(resolved)) return resolved;
  } catch (e) {}
  return null;
}

function loadServiceAccount(p) {
  if (!p) return null;
  const resolved = path.resolve(p);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Service account file not found: ${resolved}`);
  }
  return require(resolved);
}

function initApp(appName, serviceAccount) {
  if (!serviceAccount) throw new Error("serviceAccount required");
  try {
    const app = admin.initializeApp(
      {
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      },
      appName
    );
    return app;
  } catch (e) {
    // If app with that name already initialized, return it
    return admin.app(appName);
  }
}

async function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const args = parseArgs();

  const collection = args.collection;
  if (!collection) {
    console.error("Error: --collection is required");
    process.exit(1);
  }

  const aliasToPath = (alias) => {
    if (!alias) return null;
    const name = alias.toLowerCase();
    if (name === "prod")
      return path.join(
        __dirname,
        "..",
        "keys",
        "prod-project-service-account.json"
      );
    if (name === "dev")
      return path.join(
        __dirname,
        "..",
        "keys",
        "dev-project-service-account.json"
      );
    return null;
  };

  const srcKeyArg = args.srcKey || aliasToPath(args.from);
  const destKeyArg = args.destKey || aliasToPath(args.to);

  const srcKeyPath =
    pathIfExists(srcKeyArg) || pathIfExists(process.env.SYNC_SRC_KEY) || null;
  const destKeyPath =
    pathIfExists(destKeyArg) || pathIfExists(process.env.SYNC_DEST_KEY) || null;

  if (!srcKeyPath || !destKeyPath) {
    console.error(
      "Error: Could not resolve both source and destination service-account JSON paths."
    );
    console.error(
      "Provide via --srcKey and --destKey, or use --from/--to with 'prod' or 'dev'."
    );
    process.exit(1);
  }

  const preserveIds = args.preserveIds !== "false"; // default true
  const deleteExtra = args.deleteExtra === "true";
  const dryRun = args.dryRun !== "false"; // default true to be safe

  console.log("SYNC OPTIONS:");
  console.log("  collection:", collection);
  console.log("  srcKey:", srcKeyPath);
  console.log("  destKey:", destKeyPath);
  console.log("  preserveIds:", preserveIds);
  console.log("  deleteExtra:", deleteExtra);
  console.log("  dryRun:", dryRun);

  const srcSA = loadServiceAccount(srcKeyPath);
  const destSA = loadServiceAccount(destKeyPath);

  const srcAppName = "sync-src-app" + Date.now();
  const destAppName = "sync-dest-app" + Date.now();

  const srcApp = initApp(srcAppName, srcSA);
  const destApp = initApp(destAppName, destSA);

  const srcDb = srcApp.firestore();
  const destDb = destApp.firestore();

  console.log(`Reading documents from source collection: ${collection}`);
  const srcSnapshot = await srcDb.collection(collection).get();
  const srcDocs = [];
  srcSnapshot.forEach((d) => srcDocs.push({ id: d.id, data: d.data() }));

  console.log(`Source documents: ${srcDocs.length}`);

  // Read destination docs (for optional deleteExtra and change detection)
  const destSnapshot = await destDb.collection(collection).get();
  const destDocs = [];
  const destDocsMap = new Map(); // id -> data
  destSnapshot.forEach((d) => {
    const data = d.data();
    destDocs.push({ id: d.id, data });
    destDocsMap.set(d.id, data);
  });
  const destIdsSet = new Set(destDocs.map((d) => d.id));

  if (dryRun) console.log("Dry-run mode: no writes will be performed.");

  // Write to destination in batches of max 500
  const BATCH_LIMIT = 500;
  const chunks = await chunkArray(srcDocs, BATCH_LIMIT);

  let totalWrites = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;
  let deletedCount = 0;

  for (const [idx, chunk] of chunks.entries()) {
    console.log(
      `Processing batch ${idx + 1}/${chunks.length} (size=${chunk.length})`
    );
    if (!dryRun) {
      const batch = destDb.batch();
      chunk.forEach((doc) => {
        if (preserveIds) {
          const ref = destDb.collection(collection).doc(doc.id);
          if (destIdsSet.has(doc.id)) {
            // compare data to determine if changed
            const existing = destDocsMap.get(doc.id);
            const srcStr = JSON.stringify(doc.data);
            const dstStr = JSON.stringify(existing);
            if (srcStr === dstStr) {
              unchangedCount++;
              // skip writing identical doc
            } else {
              batch.set(ref, doc.data, { merge: true });
              updatedCount++;
            }
          } else {
            // create with same id
            batch.set(ref, doc.data);
            createdCount++;
          }
        } else {
          const ref = destDb.collection(collection).doc();
          batch.set(ref, doc.data);
          createdCount++;
        }
      });
      await batch.commit();
    } else {
      // Dry-run: log planned actions and count them
      chunk.forEach((doc) => {
        if (preserveIds) {
          if (destIdsSet.has(doc.id)) {
            const existing = destDocsMap.get(doc.id);
            const srcStr = JSON.stringify(doc.data);
            const dstStr = JSON.stringify(existing);
            if (srcStr === dstStr) {
              console.log(`  [DRY] Unchanged doc id=${doc.id}`);
              unchangedCount++;
            } else {
              console.log(`  [DRY] Update doc id=${doc.id}`);
              updatedCount++;
            }
          } else {
            console.log(`  [DRY] Create doc id=${doc.id}`);
            createdCount++;
          }
        } else {
          console.log(
            `  [DRY] Create new doc (would auto-id) from source id=${doc.id}`
          );
          createdCount++;
        }
      });
    }
    totalWrites += chunk.length;
  }

  // Optionally delete extra docs on destination not present in source
  const srcIdSet = new Set(srcDocs.map((d) => d.id));
  const extras = destDocs.filter((d) => !srcIdSet.has(d.id));
  console.log(
    `Destination had ${destDocs.length} docs; ${extras.length} extra docs not in source.`
  );
  if (deleteExtra && extras.length > 0) {
    console.log(`Deleting ${extras.length} extra docs from destination.`);
    if (!dryRun) {
      const delChunks = await chunkArray(extras, BATCH_LIMIT);
      for (const delChunk of delChunks) {
        const batch = destDb.batch();
        delChunk.forEach((d) => {
          batch.delete(destDb.collection(collection).doc(d.id));
          deletedCount++;
        });
        await batch.commit();
      }
    } else {
      extras.forEach((d) => {
        console.log(`  [DRY] Would delete doc id=${d.id}`);
        deletedCount++;
      });
    }
  }

  console.log("\nSYNC SUMMARY:");
  console.log(`  collection: ${collection}`);
  console.log(`  srcDocs: ${srcDocs.length}`);
  console.log(`  created: ${createdCount}`);
  console.log(`  updated: ${updatedCount}`);
  console.log(`  unchanged (skipped): ${unchangedCount}`);
  console.log(`  deleted: ${deletedCount}`);
  console.log(`  totalWritesPlanned (source docs): ${totalWrites}`);
  console.log(`  deleteExtra: ${deleteExtra} (found ${extras.length})`);
  console.log(`  dryRun: ${dryRun}`);

  // Clean up initialized apps
  try {
    await srcApp.delete();
  } catch (e) {}
  try {
    await destApp.delete();
  } catch (e) {}

  console.log("Done.");
}

main().catch((err) => {
  console.error("Error during sync:", err);
  process.exit(1);
});
