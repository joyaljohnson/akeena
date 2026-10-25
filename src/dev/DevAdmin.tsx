import { useMemo } from 'react';
import { AdminRoot } from '../admin/AdminRoot';
import { createMockApi } from '../admin/mockApi';
import type { TemplateRecord } from '../admin/types';
import { FixtureGate, useFixture } from './useFixture';

const WHATSAPP =
  "Hey {name} \u{1F48C} I've got something special for you…\n\nOpen it here: {link}\nYour secret PIN: {pin}";

function Mock({ template }: { template: TemplateRecord }) {
  const api = useMemo(() => createMockApi(template), [template]);
  return <AdminRoot api={api} base="/dev/admin" />;
}

/** The admin screens against an in-memory backend: nothing is saved, no sign-in needed. */
export default function DevAdmin() {
  const state = useFixture();
  return (
    <FixtureGate state={state}>
      {(fixture) => (
        <Mock
          template={{
            content: fixture.content,
            defaultFont: 'parisienne',
            whatsappTemplate: WHATSAPP,
          }}
        />
      )}
    </FixtureGate>
  );
}
