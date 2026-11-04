#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/4136fda7ae92b9f7ef45763c346d2ffe37f23755f6e04af001ce71d00531b824/contract';
import startContract from '../../snapshots/4136fda7ae92b9f7ef45763c346d2ffe37f23755f6e04af001ce71d00531b824/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/cf30569df2d3711f7cfddf4b6e3486b8233e516e701690f95769074654d9a9e8/contract';
import endContract from '../../snapshots/cf30569df2d3711f7cfddf4b6e3486b8233e516e701690f95769074654d9a9e8/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Track',
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
