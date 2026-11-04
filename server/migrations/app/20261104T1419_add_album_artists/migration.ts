#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1fe58ae628dcb44980ec54db454e584a22132bede851f0a927b5497a677a83d5/contract';
import startContract from '../../snapshots/1fe58ae628dcb44980ec54db454e584a22132bede851f0a927b5497a677a83d5/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/4136fda7ae92b9f7ef45763c346d2ffe37f23755f6e04af001ce71d00531b824/contract';
import endContract from '../../snapshots/4136fda7ae92b9f7ef45763c346d2ffe37f23755f6e04af001ce71d00531b824/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, rawSql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      rawSql({
        id: 'create_album_artist',
        label: 'Create AlbumArtist table',
        operationClass: 'additive',
        target: { id: 'postgres' },
        precheck: [],
        postcheck: [],
        execute: [
          { description: 'Create AlbumArtist', sql: `
            CREATE TABLE "AlbumArtist" (
              "id" SERIAL PRIMARY KEY,
              "albumId" INTEGER NOT NULL,
              "artistId" INTEGER NOT NULL,
              "role" TEXT NOT NULL DEFAULT 'PRIMARY',
              "order" INTEGER NOT NULL DEFAULT 0,
              CONSTRAINT "AlbumArtist_albumId_artistId_key" UNIQUE ("albumId", "artistId"),
              CONSTRAINT "AlbumArtist_role_check_575ffdfc" CHECK ("role" IN ('PRIMARY', 'FEATURED'))
            );
            CREATE INDEX "AlbumArtist_albumId_idx_921f6966" ON "AlbumArtist"("albumId");
            CREATE INDEX "AlbumArtist_artistId_idx_5a004db6" ON "AlbumArtist"("artistId");
            ALTER TABLE "AlbumArtist"
              ADD CONSTRAINT "AlbumArtist_albumId_fkey"
              FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE;
            ALTER TABLE "AlbumArtist"
              ADD CONSTRAINT "AlbumArtist_artistId_fkey"
              FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE;
          ` }
        ]
      }),
      rawSql({
        id: 'backfill_album_artist',
        label: 'Backfill AlbumArtist from Album.artistId',
        operationClass: 'data',
        target: { id: 'postgres' },
        precheck: [],
        postcheck: [],
        execute: [
          { description: 'Insert PRIMARY for each existing album', sql: `
            INSERT INTO "AlbumArtist" ("albumId", "artistId", "role", "order")
            SELECT id, "artistId", 'PRIMARY', 0
            FROM "Album"
            WHERE "artistId" IS NOT NULL;
          ` }
        ]
      }),
      rawSql({
        id: 'drop_album_artistId',
        label: 'Drop Album.artistId (now in AlbumArtist)',
        operationClass: 'destructive',
        target: { id: 'postgres' },
        precheck: [],
        postcheck: [],
        execute: [
          { description: 'Drop FK, index, column', sql: `
            ALTER TABLE "Album" DROP CONSTRAINT IF EXISTS "Album_artistId_fkey";
            DROP INDEX IF EXISTS "Album_artistId_idx_5a004db6";
            ALTER TABLE "Album" DROP COLUMN "artistId";
          ` }
        ]
      })
    ];
  }
}

MigrationCLI.run(import.meta.url, M);