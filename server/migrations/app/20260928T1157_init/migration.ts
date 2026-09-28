#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/7882854c6b2ab1f0f2301bb46e4d882f9c1bf3a91ed19df9665a5e218e261848/contract';
import endContract from '../../snapshots/7882854c6b2ab1f0f2301bb46e4d882f9c1bf3a91ed19df9665a5e218e261848/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'Album',
        columns: [
          col('artistId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('coverUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('year', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Artist',
        columns: [
          col('bio', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('country', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('imageUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('nameNormalized', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ListeningHistory',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('listenedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('trackId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Playlist',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'PlaylistTrack',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('order', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('playlistId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('trackId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Track',
        columns: [
          col('albumId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('artistId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('duration', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('fileUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('genre', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('labelId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('labelName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('password', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('USER'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('verified', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('website', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('User_role_check_b07b4d24', "\"role\" IN ('USER', 'LABEL', 'ADMIN')"),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Artist',
        constraint: 'Artist_nameNormalized_key',
        columns: ['nameNormalized'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'PlaylistTrack',
        constraint: 'PlaylistTrack_playlistId_trackId_key',
        columns: ['playlistId', 'trackId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Album',
        index: 'Album_artistId_idx_5a004db6',
        columns: ['artistId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Artist',
        index: 'Artist_name_idx_ce87e6ba',
        columns: ['name'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ListeningHistory',
        index: 'ListeningHistory_trackId_idx_8b560769',
        columns: ['trackId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ListeningHistory',
        index: 'ListeningHistory_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ListeningHistory',
        index: 'ListeningHistory_userId_listenedAt_idx_06c89a59',
        columns: ['userId', 'listenedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Playlist',
        index: 'Playlist_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PlaylistTrack',
        index: 'PlaylistTrack_playlistId_idx_470a517f',
        columns: ['playlistId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PlaylistTrack',
        index: 'PlaylistTrack_trackId_idx_8b560769',
        columns: ['trackId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Track',
        index: 'Track_albumId_idx_921f6966',
        columns: ['albumId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Track',
        index: 'Track_artistId_idx_5a004db6',
        columns: ['artistId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Track',
        index: 'Track_labelId_idx_e2585939',
        columns: ['labelId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Track',
        index: 'Track_title_idx_1c94c7b6',
        columns: ['title'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Album',
        foreignKey: {
          name: 'Album_artistId_fkey',
          columns: ['artistId'],
          references: { schema: 'public', table: 'Artist', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ListeningHistory',
        foreignKey: {
          name: 'ListeningHistory_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ListeningHistory',
        foreignKey: {
          name: 'ListeningHistory_trackId_fkey',
          columns: ['trackId'],
          references: { schema: 'public', table: 'Track', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Playlist',
        foreignKey: {
          name: 'Playlist_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PlaylistTrack',
        foreignKey: {
          name: 'PlaylistTrack_playlistId_fkey',
          columns: ['playlistId'],
          references: { schema: 'public', table: 'Playlist', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PlaylistTrack',
        foreignKey: {
          name: 'PlaylistTrack_trackId_fkey',
          columns: ['trackId'],
          references: { schema: 'public', table: 'Track', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Track',
        foreignKey: {
          name: 'Track_artistId_fkey',
          columns: ['artistId'],
          references: { schema: 'public', table: 'Artist', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Track',
        foreignKey: {
          name: 'Track_albumId_fkey',
          columns: ['albumId'],
          references: { schema: 'public', table: 'Album', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Track',
        foreignKey: {
          name: 'Track_labelId_fkey',
          columns: ['labelId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'User',
        foreignKey: {
          name: 'User_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
