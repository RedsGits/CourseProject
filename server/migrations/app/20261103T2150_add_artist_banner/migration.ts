#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1fe58ae628dcb44980ec54db454e584a22132bede851f0a927b5497a677a83d5/contract';
import endContract from '../../snapshots/1fe58ae628dcb44980ec54db454e584a22132bede851f0a927b5497a677a83d5/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e8c4db82bcc5ebc70e2ecf56d04cc3c33d29d347fafe04fdd2b18d9b2e49a308/contract';
import startContract from '../../snapshots/e8c4db82bcc5ebc70e2ecf56d04cc3c33d29d347fafe04fdd2b18d9b2e49a308/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Artist',
        column: col('bannerUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
