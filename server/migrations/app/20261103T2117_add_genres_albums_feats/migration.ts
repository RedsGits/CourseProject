#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/4d4f326e1cde9f83a7eb80c62e0f8c2ad238f82bc3b1d63be086146d5f94d54e/contract';
import startContract from '../../snapshots/4d4f326e1cde9f83a7eb80c62e0f8c2ad238f82bc3b1d63be086146d5f94d54e/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e8c4db82bcc5ebc70e2ecf56d04cc3c33d29d347fafe04fdd2b18d9b2e49a308/contract';
import endContract from '../../snapshots/e8c4db82bcc5ebc70e2ecf56d04cc3c33d29d347fafe04fdd2b18d9b2e49a308/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, rawSql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      rawSql({
        id: 'add_columns',
        label: 'Add countryCode, Album.type+check, Album.labelId, Track.genre_new',
        operationClass: 'additive',
        target: { id: 'postgres' },
        precheck: [],
        postcheck: [],
        execute: [
          { description: 'Artist.countryCode', sql: `ALTER TABLE "Artist" ADD COLUMN "countryCode" TEXT;` },
          { description: 'Album.type + check', sql: `
            ALTER TABLE "Album" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'ALBUM';
            ALTER TABLE "Album" ADD CONSTRAINT "Album_type_check_8ff77fae" CHECK ("type" IN ('SINGLE', 'EP', 'ALBUM'));
          ` },
          { description: 'Album.labelId', sql: `ALTER TABLE "Album" ADD COLUMN "labelId" INTEGER;` },
          { description: 'Track.genre_new', sql: `ALTER TABLE "Track" ADD COLUMN "genre_new" TEXT;` }
        ]
      }),
      rawSql({
        id: 'create_track_artist',
        label: 'Create TrackArtist table with check and indexes',
        operationClass: 'additive',
        target: { id: 'postgres' },
        precheck: [],
        postcheck: [],
        execute: [
          { description: 'Create TrackArtist', sql: `
            CREATE TABLE "TrackArtist" (
              "id" SERIAL PRIMARY KEY,
              "trackId" INTEGER NOT NULL,
              "artistId" INTEGER NOT NULL,
              "role" TEXT NOT NULL DEFAULT 'PRIMARY',
              "order" INTEGER NOT NULL DEFAULT 0,
              CONSTRAINT "TrackArtist_trackId_artistId_key" UNIQUE ("trackId", "artistId"),
              CONSTRAINT "TrackArtist_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE,
              CONSTRAINT "TrackArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE,
              CONSTRAINT "TrackArtist_role_check_575ffdfc" CHECK ("role" IN ('PRIMARY', 'FEATURED'))
            );
            CREATE INDEX "TrackArtist_artistId_idx_5a004db6" ON "TrackArtist"("artistId");
            CREATE INDEX "TrackArtist_trackId_idx_8b560769" ON "TrackArtist"("trackId");
          ` }
        ]
      }),
      rawSql({
        id: 'migrate_data',
        label: 'Backfill countryCode, genre_new, Unknown Albums, TrackArtist',
        operationClass: 'data',
        target: { id: 'postgres' },
        precheck: [],
        postcheck: [],
        execute: [
          { description: 'countryCode backfill', sql: `
            UPDATE "Artist" SET "countryCode" = 'RU' WHERE country ILIKE 'россия' OR country ILIKE 'russia';
            UPDATE "Artist" SET "countryCode" = 'EE' WHERE country ILIKE 'estonia';
          ` },
          { description: 'genre_new backfill', sql: `
            UPDATE "Track" SET "genre_new" =
              CASE LOWER(TRIM(genre))
                WHEN 'trap'       THEN 'HIPHOP'
                WHEN 'electronic' THEN 'ELECTRONIC'
                WHEN 'hiphop'     THEN 'HIPHOP'
                WHEN 'guitar'     THEN 'GUITAR'
                WHEN 'pop'        THEN 'POP'
                WHEN 'rock'       THEN 'ROCK'
                WHEN 'rnb'        THEN 'RNB'
                WHEN 'jazz'       THEN 'JAZZ'
                ELSE 'POP'
              END;
          ` },
          { description: 'Create Unknown Albums and backfill albumId', sql: `
            INSERT INTO "Album" (title, "artistId", "type", "labelId", "createdAt")
            SELECT 'Unknown Album', t."artistId", 'ALBUM',
              COALESCE((SELECT MIN(t2."labelId") FROM "Track" t2 WHERE t2."artistId" = t."artistId"), 3),
              NOW()
            FROM (SELECT DISTINCT "artistId" FROM "Track" WHERE "albumId" IS NULL) t;
            
            UPDATE "Track" t SET "albumId" = a.id FROM "Album" a
            WHERE t."albumId" IS NULL AND a."artistId" = t."artistId" AND a.title = 'Unknown Album';
          ` },
          { description: 'Album.labelId backfill', sql: `
            UPDATE "Album" a SET "labelId" = COALESCE(
              (SELECT MIN(t."labelId") FROM "Track" t WHERE t."albumId" = a.id),
              (SELECT MIN(t."labelId") FROM "Track" t WHERE t."artistId" = a."artistId"),
              3
            ) WHERE a."labelId" IS NULL;
          ` },
          { description: 'TrackArtist backfill', sql: `
            INSERT INTO "TrackArtist" ("trackId", "artistId", "role", "order")
            SELECT id, "artistId", 'PRIMARY', 0 FROM "Track" WHERE "artistId" IS NOT NULL;
          ` }
        ]
      }),
      rawSql({
        id: 'finalize_constraints',
        label: 'Replace genre, drop artistId/country, add NOT NULLs, FKs, indexes',
        operationClass: 'destructive',
        target: { id: 'postgres' },
        precheck: [],
        postcheck: [],
        execute: [
          { description: 'Replace genre + check', sql: `
            ALTER TABLE "Track" DROP COLUMN genre;
            ALTER TABLE "Track" RENAME COLUMN "genre_new" TO genre;
            ALTER TABLE "Track" ALTER COLUMN genre SET NOT NULL;
            ALTER TABLE "Track" ADD CONSTRAINT "Track_genre_check_7ea8c6b1" CHECK ("genre" IN (
              'POP','ROCK','HIPHOP','RNB','ELECTRONIC','HOUSE','TECHNO','TRANCE','DUBSTEP','DRUM_AND_BASS',
              'RAP','JAZZ','BLUES','CLASSICAL','ORCHESTRAL','OPERA','COUNTRY','FOLK','FOLK_ROCK','INDIE',
              'ALTERNATIVE','METAL','HEAVY_METAL','PUNK','HARDCORE','REGGAE','SKA','SOUL','FUNK','DISCO',
              'LATIN','PHONK','SALSA','BOSSA_NOVA','SAMBA','AFROBEAT','K_POP','J_POP','ANIME','SOUNDTRACK',
              'AMBIENT','CHILLOUT','LO_FI','NEW_AGE','GOSPEL','SPIRITUAL','WORLD','CELTIC','GUITAR','PIANO',
              'EXPERIMENTAL','SPOKEN_WORD'
            ));
          ` },
          { description: 'Drop Track.artistId', sql: `ALTER TABLE "Track" DROP COLUMN "artistId";` },
          { description: 'Track.albumId NOT NULL + FK', sql: `
            ALTER TABLE "Track" DROP CONSTRAINT IF EXISTS "Track_albumId_fkey";
            ALTER TABLE "Track" ALTER COLUMN "albumId" SET NOT NULL;
            ALTER TABLE "Track" ADD CONSTRAINT "Track_albumId_fkey"
              FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE RESTRICT;
          ` },
          { description: 'Album.labelId NOT NULL + FK + index', sql: `
            ALTER TABLE "Album" ALTER COLUMN "labelId" SET NOT NULL;
            ALTER TABLE "Album" ADD CONSTRAINT "Album_labelId_fkey"
              FOREIGN KEY ("labelId") REFERENCES "User"("id") ON DELETE RESTRICT;
            CREATE INDEX "Album_labelId_idx_e2585939" ON "Album"("labelId");
          ` },
          { description: 'Drop Artist.country', sql: `ALTER TABLE "Artist" DROP COLUMN country;` }
        ]
      })
    ];
  }
}

MigrationCLI.run(import.meta.url, M);