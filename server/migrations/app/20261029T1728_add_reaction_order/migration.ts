#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/09ab0b15abb520edf6849f398742f9e4952a36cdd36f44404b4abfa11070796f/contract';
import endContract from '../../snapshots/09ab0b15abb520edf6849f398742f9e4952a36cdd36f44404b4abfa11070796f/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/30e13eba3203047e59c75abd7dcfb4d9e31298b78d38315e4efcf5a7ec39680c/contract';
import startContract from '../../snapshots/30e13eba3203047e59c75abd7dcfb4d9e31298b78d38315e4efcf5a7ec39680c/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'TrackReaction',
        column: col('order', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
