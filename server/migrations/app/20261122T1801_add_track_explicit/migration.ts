#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/87b969b6fc49bfb9d2b3fac578f36a0f193656fd5d7d1b54c2d3a7dbf0bf10ae/contract';
import startContract from '../../snapshots/87b969b6fc49bfb9d2b3fac578f36a0f193656fd5d7d1b54c2d3a7dbf0bf10ae/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f1b730e9ff174e56458bda93f91e4ad9ca4350350d2e485bf2b1f08fa36d1cb3/contract';
import endContract from '../../snapshots/f1b730e9ff174e56458bda93f91e4ad9ca4350350d2e485bf2b1f08fa36d1cb3/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Track',
        column: col('isExplicit', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
