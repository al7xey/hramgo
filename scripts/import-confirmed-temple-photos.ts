import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CsvRow = Record<string, string>;

const filePath = getStringArg("--file");
const replaceMain = process.argv.includes("--replace-main");
const confirmRights = process.argv.includes("--confirm-rights");
const dryRun = process.argv.includes("--dry-run");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to import confirmed temple photos.");
  }

  if (!filePath) {
    throw new Error("Pass --file=path/to/photos.csv");
  }

  if (!confirmRights && !dryRun) {
    throw new Error("Pass --confirm-rights to confirm that the owner approved these photo URLs for publication.");
  }

  const rows = parseCsv(await readFile(filePath, "utf8"));
  const stats = {
    rows: rows.length,
    added: 0,
    skipped: 0,
    mainReplaced: 0,
    errors: [] as string[]
  };

  for (const [index, row] of rows.entries()) {
    const line = index + 2;
    const imageUrl = normalizeUrl(row.imageUrl ?? row.image_url ?? row.url);
    const sourceUrl = normalizeUrl(row.sourceUrl ?? row.source_url ?? row.source);
    const temple = await findTemple(row);

    if (!temple) {
      stats.skipped += 1;
      stats.errors.push(`line ${line}: temple not found`);
      continue;
    }

    if (!imageUrl) {
      stats.skipped += 1;
      stats.errors.push(`line ${line}: imageUrl is required`);
      continue;
    }

    const existing = await prisma.templePhoto.findFirst({
      where: {
        templeId: temple.id,
        OR: [{ imageUrl }, ...(sourceUrl ? [{ sourceUrl }] : [])]
      },
      select: { id: true }
    });

    if (existing) {
      stats.skipped += 1;
      continue;
    }

    const shouldBeMain = parseBoolean(row.isMain ?? row.is_main) || (replaceMain && !stats.mainReplaced);

    if (dryRun) {
      stats.added += 1;
      if (shouldBeMain) stats.mainReplaced += 1;
      continue;
    }

    if (shouldBeMain) {
      await prisma.templePhoto.updateMany({
        where: { templeId: temple.id },
        data: { isMain: false }
      });
      stats.mainReplaced += 1;
    }

    await prisma.templePhoto.create({
      data: {
        templeId: temple.id,
        imageUrl,
        sourceUrl,
        alt: row.alt || `${temple.name}: фотография храма`,
        copyrightStatus: "USER_UPLOADED",
        moderationStatus: "APPROVED",
        isApproved: true,
        isMain: shouldBeMain
      }
    });

    stats.added += 1;
  }

  console.log(JSON.stringify(stats, null, 2));
}

async function findTemple(row: CsvRow) {
  const id = row.templeId ?? row.temple_id ?? row.id;
  const slug = row.slug ?? row.templeSlug ?? row.temple_slug;
  const name = row.name ?? row.templeName ?? row.temple_name;

  if (id) {
    return prisma.temple.findUnique({ where: { id }, select: { id: true, name: true } });
  }

  if (slug) {
    return prisma.temple.findUnique({ where: { slug }, select: { id: true, name: true } });
  }

  if (name) {
    return prisma.temple.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    });
  }

  return null;
}

function parseCsv(input: string) {
  const lines = input.replace(/^\uFEFF/u, "").split(/\r?\n/u).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce<CsvRow>((row, header, index) => {
      row[header] = values[index]?.trim() ?? "";
      return row;
    }, {});
  });
}

function parseCsvLine(line: string) {
  const result: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"" && quoted && next === "\"") {
      value += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      result.push(value);
      value = "";
      continue;
    }

    value += char;
  }

  result.push(value);
  return result;
}

function normalizeUrl(value?: string) {
  const url = value?.trim();
  if (!url) return null;
  if (!/^https?:\/\//iu.test(url)) return null;
  return url;
}

function parseBoolean(value?: string) {
  return /^(1|true|yes|y|да)$/iu.test(value?.trim() ?? "");
}

function getStringArg(name: string) {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
