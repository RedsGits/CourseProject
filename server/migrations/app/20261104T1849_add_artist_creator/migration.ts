#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/7f653a13f43173e76a44551b60e5525744272ce9ac50703e2acbc8621910f00c/contract';
import endContract from '../../snapshots/7f653a13f43173e76a44551b60e5525744272ce9ac50703e2acbc8621910f00c/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/cf30569df2d3711f7cfddf4b6e3486b8233e516e701690f95769074654d9a9e8/contract';
import startContract from '../../snapshots/cf30569df2d3711f7cfddf4b6e3486b8233e516e701690f95769074654d9a9e8/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Artist',
        column: col('createdById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'Artist',
        index: 'Artist_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Artist',
        foreignKey: {
          name: 'Artist_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
