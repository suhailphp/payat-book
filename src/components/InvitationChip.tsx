import React from 'react';
import { useData } from '../data';
import { relativeInvLabel, today } from '../lib';
import { StatusChip } from './UI';

/* Relative chip for an invitation date: gold today/tomorrow/days-left,
   red overdue (shared by the Payments tab and the dashboard). */
export function InvitationChip({ date }: { date: string }) {
  const { t, tp } = useData();
  const rel = relativeInvLabel(date, today());
  if (rel.kind === 'overdue') return <StatusChip kind="neg" label={tp('daysAgo', { d: rel.d })} />;
  if (rel.kind === 'today') return <StatusChip kind="gold" label={t('today')} />;
  if (rel.kind === 'tomorrow') return <StatusChip kind="gold" label={t('tomorrow')} />;
  return <StatusChip kind="gold" label={tp('daysLeft', { d: rel.d })} />;
}
