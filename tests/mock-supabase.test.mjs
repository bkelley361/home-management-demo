import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockSupabaseClient, mockStore } from '../lib/mock-supabase.ts';
import { DEMO_HOME_ID, DEMO_USER_ID } from '../lib/mock-data.ts';

test('mockSupabase initializes and queries homes and assets correctly', async () => {
  const client = createMockSupabaseClient();

  const { data: home, error: homeError } = await client
    .from('homes')
    .select('*')
    .eq('id', DEMO_HOME_ID)
    .single();

  assert.equal(homeError, null);
  assert.equal(home.id, DEMO_HOME_ID);
  assert.equal(home.street, '123 Maple Street');

  const { data: assets } = await client.from('assets').select('*').eq('home_id', DEMO_HOME_ID);

  assert.ok(Array.isArray(assets));
  assert.ok(assets.length >= 3);
});

test('mockSupabase supports inner join query on home_members', async () => {
  const client = createMockSupabaseClient();

  const { data: member, error } = await client
    .from('home_members')
    .select('profile_id, homes!inner(*)')
    .eq('profile_id', DEMO_USER_ID)
    .limit(1)
    .maybeSingle();

  assert.equal(error, null);
  assert.equal(member.profile_id, DEMO_USER_ID);
  assert.ok(member.homes);
  assert.equal(member.homes.id, DEMO_HOME_ID);
});

test('mockSupabase handles insert, update, and delete in mock store', async () => {
  const client = createMockSupabaseClient();

  // Insert
  const { data: newReminder, error: insertError } = await client
    .from('reminders')
    .insert({
      home_id: DEMO_HOME_ID,
      title: 'Test Filter Replacement',
      due_date: Date.now() + 100000,
      recurrence_rule: 'INTERVAL=30;UNIT=day',
      status: 'pending',
    })
    .single();

  assert.equal(insertError, null);
  assert.ok(newReminder.id);
  assert.equal(newReminder.title, 'Test Filter Replacement');

  // Update
  const { error: updateError } = await client
    .from('reminders')
    .update({ title: 'Updated Filter Replacement' })
    .eq('id', newReminder.id);

  assert.equal(updateError, null);

  const { data: queried } = await client
    .from('reminders')
    .select('*')
    .eq('id', newReminder.id)
    .single();

  assert.equal(queried.title, 'Updated Filter Replacement');

  // Delete
  const { error: deleteError } = await client.from('reminders').delete().eq('id', newReminder.id);

  assert.equal(deleteError, null);

  const { data: afterDelete } = await client
    .from('reminders')
    .select('*')
    .eq('id', newReminder.id)
    .maybeSingle();

  assert.equal(afterDelete, null);
});

test('mockSupabase auth returns session and handles sign out and sign in', async () => {
  const client = createMockSupabaseClient();

  const { data: initialSession } = await client.auth.getSession();
  assert.ok(initialSession.session);
  assert.equal(initialSession.session.user.id, DEMO_USER_ID);

  await client.auth.signOut();
  const { data: signedOutSession } = await client.auth.getSession();
  assert.equal(signedOutSession.session, null);

  await client.auth.signInWithOtp({ email: 'new.user@example.com' });
  const { data: signedInSession } = await client.auth.getSession();
  assert.ok(signedInSession.session);
  assert.equal(signedInSession.session.user.email, 'new.user@example.com');
});

test('mockSupabase channel subscribe and removeChannel work without errors', async () => {
  const client = createMockSupabaseClient();

  let notified = false;
  const channel = client.channel('test-channel');
  channel.on('postgres_changes', {}, () => {
    notified = true;
  });
  const subResult = channel.subscribe();
  assert.ok(subResult);

  // Trigger notification
  mockStore.notify();
  assert.equal(notified, true);

  // Verify removeChannel
  const removeResult = await client.removeChannel(channel);
  assert.equal(removeResult, 'ok');
});

test('mockSupabase supports upsert', async () => {
  const client = createMockSupabaseClient();

  const { data: inserted, error: insertError } = await client
    .from('subscriptions')
    .upsert(
      {
        user_id: 'upsert-user-test',
        status: 'active',
        product_id: 'test_plan',
      },
      { onConflict: 'user_id' }
    )
    .single();

  assert.equal(insertError, null);
  assert.equal(inserted.user_id, 'upsert-user-test');
  assert.equal(inserted.status, 'active');

  const { data: updated, error: updateError } = await client
    .from('subscriptions')
    .upsert(
      {
        user_id: 'upsert-user-test',
        status: 'expired',
      },
      { onConflict: 'user_id' }
    )
    .single();

  assert.equal(updateError, null);
  assert.equal(updated.status, 'expired');
});
