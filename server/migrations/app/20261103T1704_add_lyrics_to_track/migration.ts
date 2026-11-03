#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/09ab0b15abb520edf6849f398742f9e4952a36cdd36f44404b4abfa11070796f/contract';
import startContract from '../../snapshots/09ab0b15abb520edf6849f398742f9e4952a36cdd36f44404b4abfa11070796f/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/4d4f326e1cde9f83a7eb80c62e0f8c2ad238f82bc3b1d63be086146d5f94d54e/contract';
import endContract from '../../snapshots/4d4f326e1cde9f83a7eb80c62e0f8c2ad238f82bc3b1d63be086146d5f94d54e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Track',
        column: col('lyrics', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Track',
        column: col('syncedLyrics', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
