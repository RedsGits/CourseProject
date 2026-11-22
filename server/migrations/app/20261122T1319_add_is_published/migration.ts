#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/7f653a13f43173e76a44551b60e5525744272ce9ac50703e2acbc8621910f00c/contract';
import startContract from '../../snapshots/7f653a13f43173e76a44551b60e5525744272ce9ac50703e2acbc8621910f00c/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/87b969b6fc49bfb9d2b3fac578f36a0f193656fd5d7d1b54c2d3a7dbf0bf10ae/contract';
import endContract from '../../snapshots/87b969b6fc49bfb9d2b3fac578f36a0f193656fd5d7d1b54c2d3a7dbf0bf10ae/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Album',
        column: col('isPublished', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Track',
        column: col('isPublished', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
