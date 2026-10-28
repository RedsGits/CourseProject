#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/284db78235cd529be1d280b36dfcc85b6bb5f4bf3d5546071d33e4e2530b8332/contract';
import startContract from '../../snapshots/284db78235cd529be1d280b36dfcc85b6bb5f4bf3d5546071d33e4e2530b8332/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/30e13eba3203047e59c75abd7dcfb4d9e31298b78d38315e4efcf5a7ec39680c/contract';
import endContract from '../../snapshots/30e13eba3203047e59c75abd7dcfb4d9e31298b78d38315e4efcf5a7ec39680c/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Playlist',
        column: col('coverUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
