#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/284db78235cd529be1d280b36dfcc85b6bb5f4bf3d5546071d33e4e2530b8332/contract';
import endContract from '../../snapshots/284db78235cd529be1d280b36dfcc85b6bb5f4bf3d5546071d33e4e2530b8332/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/a9f07fa748479aa6b3105f63bd951bb8e2c3c1a57d929ab4a7a160c4aded7c03/contract';
import startContract from '../../snapshots/a9f07fa748479aa6b3105f63bd951bb8e2c3c1a57d929ab4a7a160c4aded7c03/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'TrackReaction',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('trackId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('TrackReaction_type_check_37b7ee9b', "\"type\" IN ('LIKE', 'DISLIKE')"),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Track',
        column: col('dislikeCount', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Track',
        column: col('likeCount', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'TrackReaction',
        constraint: 'TrackReaction_userId_trackId_key',
        columns: ['userId', 'trackId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TrackReaction',
        index: 'TrackReaction_trackId_idx_8b560769',
        columns: ['trackId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TrackReaction',
        index: 'TrackReaction_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TrackReaction',
        foreignKey: {
          name: 'TrackReaction_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TrackReaction',
        foreignKey: {
          name: 'TrackReaction_trackId_fkey',
          columns: ['trackId'],
          references: { schema: 'public', table: 'Track', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
