#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/22cf605569747cc4aa7384be6dfdc5cd337f2bc1a59bee2b65b554375902e53c/contract';
import endContract from '../../snapshots/22cf605569747cc4aa7384be6dfdc5cd337f2bc1a59bee2b65b554375902e53c/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/7882854c6b2ab1f0f2301bb46e4d882f9c1bf3a91ed19df9665a5e218e261848/contract';
import startContract from '../../snapshots/7882854c6b2ab1f0f2301bb46e4d882f9c1bf3a91ed19df9665a5e218e261848/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Playlist',
        column: col('isPublic', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'Playlist',
        index: 'Playlist_isPublic_idx_ceb5dcf6',
        columns: ['isPublic'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
