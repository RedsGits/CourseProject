#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/a9f07fa748479aa6b3105f63bd951bb8e2c3c1a57d929ab4a7a160c4aded7c03/contract';
import endContract from '../../snapshots/a9f07fa748479aa6b3105f63bd951bb8e2c3c1a57d929ab4a7a160c4aded7c03/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f56039493e97092a0099db0bfd07a2df045dbffbb1043205efef854a1128172e/contract';
import startContract from '../../snapshots/f56039493e97092a0099db0bfd07a2df045dbffbb1043205efef854a1128172e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('avatarUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
