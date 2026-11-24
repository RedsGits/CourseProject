#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0b5465d530a7a495bfff36cb4e8568440fa278e44b5efa8804ee6aaa3b382fcc/contract';
import endContract from '../../snapshots/0b5465d530a7a495bfff36cb4e8568440fa278e44b5efa8804ee6aaa3b382fcc/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f1b730e9ff174e56458bda93f91e4ad9ca4350350d2e485bf2b1f08fa36d1cb3/contract';
import startContract from '../../snapshots/f1b730e9ff174e56458bda93f91e4ad9ca4350350d2e485bf2b1f08fa36d1cb3/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'UserGenrePreference',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('genre', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'UserGenrePreference_genre_check_7ea8c6b1',
            "\"genre\" IN ('POP', 'ROCK', 'HIPHOP', 'RNB', 'ELECTRONIC', 'HOUSE', 'TECHNO', 'TRANCE', 'DUBSTEP', 'DRUM_AND_BASS', 'RAP', 'JAZZ', 'BLUES', 'CLASSICAL', 'ORCHESTRAL', 'OPERA', 'COUNTRY', 'FOLK', 'FOLK_ROCK', 'INDIE', 'ALTERNATIVE', 'METAL', 'HEAVY_METAL', 'PUNK', 'HARDCORE', 'REGGAE', 'SKA', 'SOUL', 'FUNK', 'DISCO', 'LATIN', 'PHONK', 'SALSA', 'BOSSA_NOVA', 'SAMBA', 'AFROBEAT', 'K_POP', 'J_POP', 'ANIME', 'SOUNDTRACK', 'AMBIENT', 'CHILLOUT', 'LO_FI', 'NEW_AGE', 'GOSPEL', 'SPIRITUAL', 'WORLD', 'CELTIC', 'GUITAR', 'PIANO', 'EXPERIMENTAL', 'SPOKEN_WORD')",
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'ListeningHistory',
        column: col('completed', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ListeningHistory',
        column: col('listenedSeconds', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'UserGenrePreference',
        constraint: 'UserGenrePreference_userId_genre_key',
        columns: ['userId', 'genre'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'UserGenrePreference',
        index: 'UserGenrePreference_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'UserGenrePreference',
        foreignKey: {
          name: 'UserGenrePreference_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
