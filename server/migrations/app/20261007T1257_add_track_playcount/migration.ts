#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/22cf605569747cc4aa7384be6dfdc5cd337f2bc1a59bee2b65b554375902e53c/contract';
import startContract from '../../snapshots/22cf605569747cc4aa7384be6dfdc5cd337f2bc1a59bee2b65b554375902e53c/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f56039493e97092a0099db0bfd07a2df045dbffbb1043205efef854a1128172e/contract';
import endContract from '../../snapshots/f56039493e97092a0099db0bfd07a2df045dbffbb1043205efef854a1128172e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Track',
        column: col('playCount', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
