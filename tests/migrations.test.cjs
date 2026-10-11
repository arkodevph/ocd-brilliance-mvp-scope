const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { migrate } = require('../.backend/database/migrate.js');

const available = ['initdb', 'pg_ctl'].every(
  (command) => spawnSync(command, ['--version']).status === 0,
);

test(
  'PostgreSQL migration preserves outer joins, references and transactional history',
  {
    skip: !available && 'Local PostgreSQL binaries (initdb and pg_ctl) are required.',
  },
  async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ocd-sql-'));
    const data = path.join(directory, 'data');
    const migrations = path.join(directory, 'migrations');
    const client = new Client({
      host: directory,
      port: 55439,
      user: 'ocd_test',
      database: 'postgres',
    });
    let started = false;
    try {
      const init = spawnSync(
        'initdb',
        ['-D', data, '-U', 'ocd_test', '--auth=trust', '--no-locale'],
        { encoding: 'utf8' },
      );
      assert.equal(init.status, 0, init.stderr);
      const start = spawnSync(
        'pg_ctl',
        [
          '-D',
          data,
          '-l',
          path.join(directory, 'postgres.log'),
          '-o',
          `-k ${directory} -h '' -p 55439`,
          '-w',
          'start',
        ],
        { encoding: 'utf8' },
      );
      assert.equal(start.status, 0, start.stderr);
      started = true;
      await client.connect();
      await fs.cp(path.join(__dirname, '../backend/database/migrations'), migrations, {
        recursive: true,
      });
      assert.deepEqual(await migrate(client, migrations), ['001_initial_schema.sql']);
      assert.deepEqual(await migrate(client, migrations), []);

      await client.query(`
      INSERT INTO participants VALUES ('old', 'Older bookings only'), ('none', 'No bookings'), ('new', 'Upcoming bookings');
      INSERT INTO workers (id, name, role) VALUES ('worker', 'Demo worker', 'Cleaner');
      INSERT INTO bookings (id, participant_id, worker_id, service_date, start_time, status) VALUES
        ('past', 'old', 'worker', '2026-05-04', '09:00', 'Completed'),
        ('boundary', 'new', 'worker', '2026-05-05', '09:00', 'Confirmed'),
        ('later', 'new', 'worker', '2026-05-06', '09:00', 'Confirmed');
    `);
      const result = await client.query(
        'SELECT participant_id, booking_id FROM participant_bookings_from($1)',
        ['2026-05-05'],
      );
      assert.deepEqual(result.rows, [
        { participant_id: 'new', booking_id: 'boundary' },
        { participant_id: 'new', booking_id: 'later' },
        { participant_id: 'none', booking_id: null },
        { participant_id: 'old', booking_id: null },
      ]);
      await assert.rejects(
        client.query(
          "INSERT INTO bookings VALUES ('orphan', 'missing', NULL, '2026-05-05', '09:00', 'Confirmed', false)",
        ),
        { code: '23503' },
      );
      await client.query(
        "INSERT INTO workers (id, name, role) VALUES ('other', 'Other worker', 'Nurse')",
      );
      await assert.rejects(
        client.query(
          "INSERT INTO journeys VALUES ('boundary', 'other', 'session', true, 'en-route', 10, 0.5, now())",
        ),
        { code: '23503' },
      );
      await client.query(
        "INSERT INTO journeys VALUES ('boundary', 'worker', 'session', true, 'en-route', 10, 0.5, now())",
      );
      await assert.rejects(client.query('UPDATE journeys SET progress = 2'), {
        code: '23514',
      });
      const record = {
        id: 'REQ-1',
        creationKey: 'owner:request',
        onboarding: { serviceVideos: [{ id: 'private-reference' }] },
        history: [{ event: 'Reviewed' }],
      };
      await client.query('INSERT INTO intakes VALUES ($1, $2, $3)', [
        record.id,
        'revision',
        record,
      ]);
      assert.deepEqual((await client.query('SELECT record FROM intakes')).rows[0].record, record);
      await assert.rejects(
        client.query('INSERT INTO intakes VALUES ($1, $2, $3)', [
          'REQ-null',
          'revision',
          { id: null },
        ]),
        { code: '23514' },
      );
      await assert.rejects(
        client.query('INSERT INTO intakes VALUES ($1, $2, $3)', [
          'REQ-2',
          'revision',
          { ...record, id: 'REQ-2' },
        ]),
        { code: '23505' },
      );

      await fs.writeFile(
        path.join(migrations, '002_failure.sql'),
        'CREATE TABLE rolled_back (id text); SELECT * FROM missing_table;',
      );
      await assert.rejects(migrate(client, migrations), { code: '42P01' });
      assert.equal(
        (await client.query("SELECT to_regclass('rolled_back') AS name")).rows[0].name,
        null,
      );
      assert.equal(
        (await client.query('SELECT count(*)::integer AS count FROM schema_migrations')).rows[0]
          .count,
        1,
      );
      await fs.unlink(path.join(migrations, '002_failure.sql'));
      await fs.writeFile(
        path.join(migrations, '10_later.sql'),
        'CREATE TABLE later_child (id text REFERENCES earlier_parent(id));',
      );
      await fs.writeFile(
        path.join(migrations, '2_earlier.sql'),
        'CREATE TABLE earlier_parent (id text PRIMARY KEY);',
      );
      assert.deepEqual(await migrate(client, migrations), ['2_earlier.sql', '10_later.sql']);
      await fs.appendFile(path.join(migrations, '001_initial_schema.sql'), '\n-- changed\n');
      await assert.rejects(migrate(client, migrations), /Applied migration changed/);
      assert.equal(
        (await client.query('SELECT count(*)::integer AS count FROM participants')).rows[0].count,
        3,
      );
    } finally {
      await client.end();
      if (started)
        spawnSync('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop'], {
          encoding: 'utf8',
        });
      await fs.rm(directory, { recursive: true, force: true });
    }
  },
);
